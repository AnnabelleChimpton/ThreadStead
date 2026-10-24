import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { FORM_ACTION_REMOVED, postsToApi } from './form-action';
import { find, html as htmlSchema } from 'property-information';
import type { Root } from 'hast';
import { componentRegistry } from '../core/template-registry';
import { coercePropValue, findPropSchema, propNameKey, type PropSchema } from '../core/template-registry-types';
import { getAllowedAttributes } from '../core/attribute-mappings';
import { TEMPLATE_LIMITS, formatLimitError } from './template-limits';
import {
  COMPONENT_TAG_PREFIX,
  lineAt,
  looksLikeComponentName,
  prepareSourceForParse,
  tokenizeSource,
} from './source-scan';
import { extractDocument, type DocumentHead } from './document-head';
import { isThemeOptionMeta } from './theme-options';
import { whyNoEmbed } from '../embeds';
import { COMPONENT_NICKNAMES } from '../editor/component-nicknames';
import {
  ELEMENT_ATTRIBUTES,
  GLOBAL_ATTRIBUTES,
  HTML_AUTHORING_TAGS,
  ID_REFERENCE_ATTRIBUTES,
  STRIPPED_WITH_CONTENT,
  SVG_ATTRIBUTES,
  SVG_TAGS,
} from './html-allowlist';
import { paragraphSafe } from './paragraph-safe';

// QUICK WIN #2: Cache schema to avoid recreating on every parse
// Schema is only rebuilt when component registry changes
let cachedSchema: any = null;
let lastRegistrySize: number = 0;

/** Every aria-* property name property-information knows (ariaLabel, ariaHidden, …). */
const ARIA_ATTRIBUTES = Object.keys(htmlSchema.property).filter((name) => /^aria[A-Z]/.test(name));

/**
 * The sanitizer schema. Plain HTML follows html-allowlist.ts (how people
 * write pages); component tags arrive as `ts-component-<name>` (see
 * source-scan.ts) and take the registry's props. Exported for the
 * blocklist golden test, which asserts what never gets in.
 */
export function createCustomSchema() {
  // Check if we can reuse cached schema
  const currentRegistrySize = componentRegistry.size;

  if (cachedSchema && currentRegistrySize === lastRegistrySize) {
    return cachedSchema;
  }

  const svgTags: readonly string[] = SVG_TAGS;
  const tagNames = Array.from(new Set([
    ...(defaultSchema.tagNames || []),
    ...HTML_AUTHORING_TAGS,
    ...svgTags,
  ]));

  // Deep copy so nothing writes into defaultSchema's arrays
  const attributes: Record<string, unknown[]> = {};
  for (const [tag, attrs] of Object.entries(defaultSchema.attributes || {})) {
    attributes[tag] = Array.isArray(attrs)
      // defaultSchema pins className to GitHub's own values (task lists,
      // footnotes) and allows its footnote data-* markers; pages use any
      // class they like, and data-* stays out (island markers are ours)
      ? attrs.filter((attr) => {
          const name = Array.isArray(attr) ? String(attr[0]) : String(attr);
          return name !== 'className' && !/^data[A-Z]/.test(name);
        })
      : attrs;
  }
  attributes['*'] = Array.from(new Set([...(attributes['*'] || []), ...GLOBAL_ATTRIBUTES, ...ARIA_ATTRIBUTES]));
  for (const [tag, attrs] of Object.entries(ELEMENT_ATTRIBUTES)) {
    // A tag's own list replaces defaultSchema's (input's checkbox-only rule goes)
    attributes[tag] = [...attrs];
  }
  for (const tag of svgTags) {
    attributes[tag] = [...SVG_ATTRIBUTES];
  }

  const schema = {
    tagNames,
    attributes,
    ancestors: { ...(defaultSchema.ancestors || {}) },
    protocols: { ...(defaultSchema.protocols || {}) } as Record<string, string[]>,
    // defaultSchema forces every <input> to `disabled type="checkbox"` (GitHub task lists)
    required: {},
    // These go with their content: a stray <style> or <title> must not turn into visible text
    strip: [...STRIPPED_WITH_CONTENT],
    // Ids, and every attribute that points at an id, get the same prefix
    clobber: [...ID_REFERENCE_ATTRIBUTES],
    clobberPrefix: 'user-content-',
    // CRITICAL: Allow inline CSS properties in style attributes
    // Without this, rehype-sanitize strips ALL inline styles
    properties: {
      style: ['*'] // Allow all CSS properties
    }
  };

  // Allow placeholder URLs like "#"
  schema.protocols.src = ['http', 'https', 'mailto', 'tel', 'data', '#'];
  schema.protocols.href = ['http', 'https', 'mailto', 'tel', '#'];

  // defaultSchema only protocol-checks href/src/cite/longDesc, but allows
  // `action` on every tag, so `<form action="javascript:…">` used to survive
  // into the AST (React 19 blocks it at render; we shouldn't rely on that).
  // Keys are hast property names, and a key here applies to every tag.
  // Relative URLs pass (no scheme); javascript:/vbscript:/data: don't.
  // Not listed: `data` and `icon` — the If/When/UserImage `data` and icon
  // props reuse those names for non-URL values, and the elements where they
  // are URLs (object, command) aren't allowed tags.
  for (const key of ['action', 'formAction', 'poster', 'background', 'ping', 'xLinkHref', 'codeBase', 'manifest', 'profile', 'archive']) {
    schema.protocols[key] = schema.protocols.href;
  }
  schema.protocols.srcSet = schema.protocols.src;

  // Component tags, as prepareSourceForParse spells them. Only PascalCase
  // source tags become components; `<button>`, `<select>`, `<var>` and SVG
  // `<filter>` stay HTML even though a component shares their name.
  if (componentRegistry) {
    const allowedTags = componentRegistry.getAllowedTags();

    // Get all allowed attributes from centralized mapping system
    // This eliminates ~166 lines of manually listed attributes
    const allAttributes = getAllowedAttributes();

    for (const tagName of allowedTags) {
      const componentTag = COMPONENT_TAG_PREFIX + tagName.toLowerCase();
      if (!schema.tagNames.includes(componentTag)) {
        schema.tagNames.push(componentTag);
      }

      // Apply centralized allowed attributes list, PLUS every prop the
      // registry declares for this component. The hand-maintained
      // ATTRIBUTE_MAP drifts (BlogPosts mode="count" was silently stripped
      // for months) — the registry is the source of truth for what a
      // component accepts, so its prop names are always allowed through.
      const registration = componentRegistry.get(tagName);
      let attrs = allAttributes;
      if (registration?.props) {
        const propAttrs: string[] = [];
        // The implementation's own name works too (`neonColor` for `color`)
        const propNames = Object.entries(registration.props).flatMap(
          ([name, propSchema]) => (propSchema.componentProp ? [name, propSchema.componentProp] : [name])
        );
        for (const propName of propNames) {
          const lower = propName.toLowerCase();
          const kebab = propName.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
          // hast keys known HTML attributes by property name: a prop called
          // autoplay arrives as autoPlay, maxlength as maxLength
          const property = find(htmlSchema, lower).property;
          propAttrs.push(propName);
          if (lower !== propName) propAttrs.push(lower);
          if (kebab !== propName && kebab !== lower) propAttrs.push(kebab);
          if (property !== propName && property !== lower) propAttrs.push(property);
        }
        attrs = [...allAttributes, ...propAttrs];
      }
      // Components get class/className/style/id like every element
      schema.attributes[componentTag] = [...attrs, 'className', 'class'];
    }
  }

  // Cache the schema for future use
  cachedSchema = schema;
  lastRegistrySize = currentRegistrySize;

  return schema;
}

/** Is `name` (as written in the source) a registered component? */
function isRegisteredComponent(name: string): boolean {
  return !!componentRegistry.get(name);
}

// Pre-parse syntax check. HTML itself is the parser's job: parse5 reads
// `<p>` without `</p>`, `<P>…</p>`, `<li>` lists and table cells exactly as
// browsers do, so none of that is an error here. What this checks is what
// the parser can't recover sensibly:
//  - component tags (PascalCase), where a missing or misspelled closing tag
//    changes which content a component wraps;
//  - a tag whose attribute quote never closes, which swallows the page;
//  - invalid JSON in a component's `initial` attribute.
// Comments, doctypes and raw-text content (textarea, title…) are skipped.
//
// History: this used to demand XML strictness for ALL tags, so most
// pre-2010 pages and any page with a tag inside a comment could not be
// saved at all ("9 Errors (Must Fix)" on a 13-line page).
function detectSyntaxErrors(htmlString: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = htmlString.split('\n');
  const lineText = (line: number) => (lines[line - 1] || '').trim();

  // Open components, innermost last
  const stack: Array<{ name: string; line: number }> = [];

  // onclick="…" and javascript: links are taken out by the sanitizer; say so
  // once per kind (with the first line), so a pasted old page doesn't just
  // quietly have dead buttons.
  const scriptAttributes = new Map<string, { line: number; tag: string; count: number }>();
  const noteScriptAttributes = (token: { name: string; attributes: Array<{ name: string; value?: string }> }, line: number) => {
    for (const attr of token.attributes) {
      const name = attr.name.toLowerCase();
      const key = /^on[a-z]+$/.test(name)
        ? name
        : /^\s*javascript:/i.test(attr.value ?? '') ? 'javascript:' : undefined;
      if (!key) continue;
      const seen = scriptAttributes.get(key);
      if (seen) seen.count++;
      else scriptAttributes.set(key, { line, tag: token.name, count: 1 });
    }
  };

  for (const token of tokenizeSource(htmlString)) {
    if (token.type !== 'open' && token.type !== 'close') continue;
    const line = lineAt(htmlString, token.start);

    if (token.type === 'open' && (token.unterminated || token.strayQuote)) {
      errors.push(
        `Line ${line}: Unclosed quote in <${token.name}> attributes.\n` +
        `  ${lineText(line)}\n` +
        `Tip: Every value needs a quote at each end, like src="me.png". If a value has double quotes inside it, put single quotes around it: initial='["a", "b"]'`
      );
      continue;
    }
    if (token.type === 'open' && token.strayLessThan) {
      warnings.push(
        `Line ${line}: "<${token.name}" reads as the start of a <${token.name}> tag, the way a browser reads it.\n` +
        `  ${lineText(line)}\n` +
        `Tip: To show a less-than sign as text, write &lt;`
      );
    }
    if (token.type === 'close' && token.unterminated) {
      errors.push(
        `Line ${line}: Malformed tag — found '</${token.name}' that never closes with '>'.\n` +
        `  ${lineText(line)}\n` +
        `Tip: Check for a missing '>'`
      );
      continue;
    }

    if (token.type === 'open' && !looksLikeComponentName(token.name)) noteScriptAttributes(token, line);

    if (!looksLikeComponentName(token.name)) {
      // </if> for an open <If>: the parser would never close the component
      const innermost = stack[stack.length - 1];
      if (token.type === 'close' && innermost && innermost.name.toLowerCase() === token.name.toLowerCase()) {
        errors.push(
          `Line ${line}: Mismatched closing tag </${token.name}>.\n` +
          `  Expected </${innermost.name}> (opened on line ${innermost.line})\n` +
          `  ${lineText(line)}\n` +
          `Tip: Component names are case-sensitive. Close <${innermost.name}> with </${innermost.name}>`
        );
        stack.pop();
      }
      continue;
    }

    if (token.type === 'open') {
      // Invalid JSON in a component's initial attribute (entities decoded first)
      const initial = token.attributes.find((a) => a.name.toLowerCase() === 'initial')?.value;
      if (initial !== undefined && initial.trim().startsWith('{')) {
        const jsonStr = initial
          .replace(/&quot;/g, '"')
          .replace(/&#0*39;|&apos;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        try {
          JSON.parse(jsonStr);
        } catch {
          errors.push(
            `Invalid JSON in 'initial' attribute on line ${line}.\n` +
            `  ${jsonStr}\n` +
            `Tip: Use double quotes for JSON property names and string values`
          );
        }
      }
      if (!token.selfClosing) stack.push({ name: token.name, line });
      continue;
    }

    // Closing component tag
    const innermost = stack[stack.length - 1];
    if (!innermost) {
      errors.push(
        `Line ${line}: Unexpected closing tag </${token.name}>.\n` +
        `  ${lineText(line)}\n` +
        `Tip: This closing tag has no matching opening tag`
      );
    } else if (innermost.name === token.name) {
      stack.pop();
    } else {
      const sameNameOtherCase = innermost.name.toLowerCase() === token.name.toLowerCase();
      errors.push(
        `Line ${line}: Mismatched closing tag </${token.name}>.\n` +
        `  Expected </${innermost.name}> (opened on line ${innermost.line})\n` +
        `  ${lineText(line)}\n` +
        (sameNameOtherCase
          ? `Tip: Component names are case-sensitive. Close <${innermost.name}> with </${innermost.name}>`
          : `Tip: Close the inner component before the outer one`)
      );
      // Recover like the parser would: close up to a matching component if there is one
      const match = stack.map((s) => s.name).lastIndexOf(token.name);
      if (match !== -1) stack.length = match;
    }
  }

  for (const [key, { line, tag, count }] of scriptAttributes) {
    const more = count > 1 ? ` (and ${count - 1} more like it)` : '';
    warnings.push(
      key === 'javascript:'
        ? `Line ${line}: A javascript: link on <${tag}> was taken out${more}. Scripts don’t run on pages here.`
        : `Line ${line}: ${key}="…" on <${tag}> was taken out${more}. Scripts don’t run on pages here.` +
          (key === 'onclick' ? ' For something to happen on a click, put an <OnClick> inside a <Button>.' : '')
    );
  }

  // A component left open runs to the end of the page
  for (const open of stack) {
    errors.push(
      `Line ${open.line}: Unclosed tag <${open.name}>.\n` +
      `Tip: Every component needs a closing tag or a self-closing slash. Add </${open.name}> where it should end, or write <${open.name} />.`
    );
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Stripped-tag report
// ---------------------------------------------------------------------------

/** The parts of a hast node the walkers below read and write. */
interface HastLike {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastLike[];
  data?: Record<string, unknown>;
}

export type StrippedCategory = 'document' | 'unsupported' | 'safety';

export interface StrippedTag {
  name: string;
  line?: number;
  reason?: string;
  /** How the editor groups it: expected wrappers, not supported here, removed for safety */
  category?: StrippedCategory;
  /** Occurrences after the first */
  count?: number;
}

const DOCUMENT_WRAPPERS = new Set(['html', 'head', 'body', 'title', 'meta', '!doctype']);
const SAFETY_TAGS = new Set([
  'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'base', 'portal',
  'foreignobject', 'set', 'animate', 'animatemotion', 'animatetransform', 'use', 'image', 'feimage',
]);

function strippedReason(
  name: string,
  head: DocumentHead
): { category: StrippedCategory; reason: string } {
  const lower = name.toLowerCase();

  if (lower === 'link') {
    if (head.fontImports.length > 0 && head.otherStylesheets.length === 0) {
      return {
        category: 'document',
        reason: 'Document wrapper (expected): your Google Fonts load for you as an @import.',
      };
    }
    return {
      category: 'unsupported',
      reason:
        'Not supported here: stylesheets from other files can’t load. Paste the CSS into the CSS tab. ' +
        '(Google Fonts links still work; they load as an @import.)',
    };
  }
  if (DOCUMENT_WRAPPERS.has(lower)) {
    return {
      category: 'document',
      reason: lower === 'title'
        ? 'Document wrapper (expected): the title isn’t shown on the page itself.'
        : 'Document wrapper (expected): only what’s inside <body> becomes your page.',
    };
  }
  if (lower === 'style') {
    return { category: 'unsupported', reason: 'Not supported here: <style> blocks belong in the CSS tab.' };
  }
  if (SAFETY_TAGS.has(lower)) {
    const reason =
      lower === 'script'
        ? 'Removed for safety: scripts don’t run on pages here. Components like Toggle, Var and OnClick do most script jobs.'
        : lower === 'iframe' || lower === 'embed'
          ? 'Removed for safety: pages here can’t run other sites inside them. For YouTube, Vimeo, Bandcamp, SoundCloud or Spotify, use <Embed src="…" /> with the same link.'
          : lower === 'frame' || lower === 'frameset' || lower === 'object' || lower === 'applet'
            ? 'Removed for safety: pages here can’t embed other sites or plugins.'
            : 'Removed for safety.';
    return { category: 'safety', reason };
  }
  if (looksLikeComponentName(name)) {
    const meant = suggestComponent(name);
    return {
      category: 'unsupported',
      reason: meant
        ? `There’s no component called <${name}>. Did you mean <${meant}>?`
        : `There’s no component called <${name}>. The components page lists every one.`,
    };
  }
  const component = componentRegistry.get(name);
  if (component) {
    return {
      category: 'unsupported',
      reason: `Not supported here as written: components start with a capital letter. Write <${component.name}>.`,
    };
  }
  return { category: 'unsupported', reason: 'Not supported here: this tag isn’t one pages can use, so its contents were kept without it.' };
}

const CATEGORY_ORDER: Record<StrippedCategory, number> = { document: 0, unsupported: 1, safety: 2 };

/** Source tags that didn't make it into the sanitized tree, one entry per tag name. */
function reportStrippedTags(source: string, tree: Root, head: DocumentHead): StrippedTag[] {
  // What survived: component nodes by name, everything else by lowercase tag
  const survived = new Set<string>();
  const walk = (node: HastLike) => {
    if (node.tagName) {
      survived.add(node.data?.component ? `component:${node.tagName}` : node.tagName.toLowerCase());
    }
    node.children?.forEach(walk);
  };
  walk(tree as HastLike);

  const byKey = new Map<string, StrippedTag>();
  for (const token of tokenizeSource(source)) {
    let key: string | undefined;
    let name: string | undefined;
    if (token.type === 'open') {
      name = token.name;
      const component = looksLikeComponentName(name) && isRegisteredComponent(name);
      key = component ? `component:${name.toLowerCase()}` : name.toLowerCase();
    } else if (token.type === 'doctype' && /^<!doctype/i.test(source.slice(token.start, token.start + 9))) {
      continue; // a doctype isn't a tag anyone expects to see
    }
    // Theme options report their own problems (theme-options.ts)
    if (isThemeOptionMeta(token)) continue;
    if (!key || !name || survived.has(key)) continue;

    const existing = byKey.get(key);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      continue;
    }
    const { category, reason } = strippedReason(name, head);
    byKey.set(key, { name, line: lineAt(source, token.start), reason, category });
  }
  return Array.from(byKey.values()).sort(
    (a, b) => CATEGORY_ORDER[a.category!] - CATEGORY_ORDER[b.category!] || (a.line || 0) - (b.line || 0)
  );
}

// ---------------------------------------------------------------------------
// After sanitizing
// ---------------------------------------------------------------------------

const PREFIX = 'user-content-';
/** Attributes whose values may hold `url(#id)` (SVG paint servers, filters, clip paths) */
const URL_REFERENCE_PROPERTIES = ['fill', 'stroke', 'filter', 'clipPath', 'mask', 'style'];

function prefixFragment(value: unknown): unknown {
  return typeof value === 'string' && value.length > 1 && value.startsWith('#') && !value.startsWith('#' + PREFIX)
    ? '#' + PREFIX + value.slice(1)
    : value;
}

/**
 * Finish what the sanitizer started, on plain HTML elements:
 *  - `ts-component-x` tags become `x`, marked as components (data.component);
 *  - in-page references follow the user-content- id prefix: `href="#about"`,
 *    `usemap="#m"` and `url(#blur)` in SVG attributes and inline styles
 *    (htmlFor, list and the aria id lists are prefixed by the sanitizer);
 *  - links that open a new tab get rel="noopener";
 *  - autoplay only survives on muted media;
 *  - a form's action can't point at /api/ (form-action.ts).
 * Returns whether it took out any form action.
 */
function finishSanitizedTree(node: HastLike): boolean {
  let removedFormAction = false;
  if (node.type === 'element') {
    if (typeof node.tagName === 'string' && node.tagName.startsWith(COMPONENT_TAG_PREFIX)) {
      node.tagName = node.tagName.slice(COMPONENT_TAG_PREFIX.length);
      node.data = { ...(node.data || {}), component: true };
    } else {
      const props = node.properties || (node.properties = {});
      if ('href' in props) props.href = prefixFragment(props.href);
      if ('useMap' in props) props.useMap = prefixFragment(props.useMap);
      for (const key of URL_REFERENCE_PROPERTIES) {
        const value = props[key];
        if (typeof value === 'string' && value.includes('#')) {
          props[key] = value.replace(
            /url\(\s*(['"]?)#(?!user-content-)([^'")\s]+)\1\s*\)/g,
            (_m: string, quote: string, id: string) => `url(${quote}#${PREFIX}${id}${quote})`
          );
        }
      }
      if ((node.tagName === 'a' || node.tagName === 'area') && props.target) {
        const rel: string[] = Array.isArray(props.rel) ? props.rel : props.rel ? String(props.rel).split(/\s+/) : [];
        if (!rel.includes('noopener')) rel.push('noopener');
        props.rel = rel;
      }
      if ((node.tagName === 'audio' || node.tagName === 'video') && props.autoPlay && !props.muted) {
        delete props.autoPlay;
      }
      if (node.tagName === 'form' && postsToApi(props.action)) {
        delete props.action;
        removedFormAction = true;
      }
    }
  }
  for (const child of node.children ?? []) {
    if (finishSanitizedTree(child)) removedFormAction = true;
  }
  return removedFormAction;
}

/**
 * A <p> holding a component that draws a box becomes a <div> with the same
 * attributes. A browser ends a paragraph at the first box inside it, so the
 * page it built didn't match the server's and hydration failed for the
 * whole page (template audit 01 #4). Returns the components that did it.
 */
function boxesOutOfParagraphs(node: HastLike, found = new Set<string>()): Set<string> {
  if (node.type === 'element' && node.tagName === 'p') {
    const boxes = componentsIn(node).filter(({ name, attributes }) => !paragraphSafe(name, attributes));
    if (boxes.length > 0) {
      node.tagName = 'div';
      boxes.forEach(({ name }) => found.add(name));
    }
  }
  for (const child of node.children ?? []) boxesOutOfParagraphs(child, found);
  return found;
}

/** The components inside a node: registered name and attributes as written */
function componentsIn(node: HastLike): Array<{ name: string; attributes: Record<string, unknown> }> {
  return (node.children ?? []).flatMap((child) => [
    ...(child.type === 'element' && child.data?.component
      ? [{ name: componentRegistry.get(String(child.tagName))?.name ?? String(child.tagName), attributes: child.properties ?? {} }]
      : []),
    ...componentsIn(child),
  ]);
}

function paragraphBoxesNote(components: Set<string>): string {
  const names = [...components].map((name) => `<${name}>`).join(', ');
  return `A paragraph (<p>) holding ${names} is a <div> on your page: things that draw a box can't sit inside a paragraph. Your p { } CSS doesn't reach it; use div, or give it a class.`;
}

/** How many images load straight away; the rest as they're scrolled to */
const EAGER_IMAGES = 3;

/**
 * Images past the first few get loading="lazy", unless the page says how
 * they load: fifty at once pushed a page's start on slow 3G from 3.9 s to
 * 6.7 s (template audit 12).
 */
function lazyLoadLaterImages(node: HastLike, seen = { images: 0 }): void {
  if (node.type === 'element' && node.tagName === 'img') {
    seen.images++;
    const props = node.properties || (node.properties = {});
    if (seen.images > EAGER_IMAGES && props.loading === undefined) props.loading = 'lazy';
  }
  for (const child of node.children ?? []) lazyLoadLaterImages(child, seen);
}

// Parse HTML to HAST (Hypertext Abstract Syntax Tree)
// Returns both the parsed tree and information about stripped components
export function parseTemplate(htmlString: string): Root & {
  _strippedComponents?: StrippedTag[];
  _documentHead?: DocumentHead;
} {
  // A whole pasted page: only the body becomes the page; the head's title
  // and Google Fonts links are kept aside (document-head.ts)
  const document = extractDocument(htmlString.trim());

  // No entity pre-decoding: parse5 decodes entities itself, in text and in
  // attributes, exactly once. Decoding the whole source first turned
  // `&lt;div&gt;` in a code sample into a real <div>, `&lt;Guestbook /&gt;`
  // into a second working guestbook, and cut `title="said &quot;hi&quot;"` short.
  // A fragment parse takes any number of top-level elements as they are. A
  // leftover step used to wrap them in a <div> and unwrap any lone plain
  // <div> afterwards, deleting the spaces between them ("home about" became
  // "homeabout") and the author's own wrapper (template audit 01 #2).
  const processedHtml = prepareSourceForParse(document.body, isRegisteredComponent);

  // Parse as fragment (now we have clean body content)
  const processor = unified()
    .use(rehypeParse, {
      fragment: true,
      emitParseErrors: false,
      duplicateAttribute: false
    })
    .use(rehypeSanitize, createCustomSchema());

  const tree = processor.parse(processedHtml);
  const processed = processor.runSync(tree) as Root;
  const removedFormAction = finishSanitizedTree(processed as HastLike);
  lazyLoadLaterImages(processed as HastLike);
  const boxedParagraphs = boxesOutOfParagraphs(processed as HastLike);

  const strippedComponents = reportStrippedTags(htmlString, processed, document.head);

  // Component props that won't do what the author meant, for the editor
  const attributeWarnings = [
    ...reportComponentProps(htmlString),
    ...reportPageProblems(htmlString),
    ...(document.warnings ?? []),
    ...(removedFormAction ? [FORM_ACTION_REMOVED] : []),
    ...(boxedParagraphs.size > 0 ? [paragraphBoxesNote(boxedParagraphs)] : []),
  ];

  // Attach stripped components and attribute warnings to the result
  const result = processed as Root & {
    _strippedComponents?: StrippedTag[];
    _attributeWarnings?: string[];
    _documentHead?: DocumentHead;
  };

  if (strippedComponents.length > 0) {
    result._strippedComponents = strippedComponents;
  }

  if (attributeWarnings.length > 0) {
    result._attributeWarnings = attributeWarnings;
  }

  if (document.isFullDocument || document.head.fontImports.length > 0 || document.head.options) {
    result._documentHead = document.head;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Component props the author should hear about
// ---------------------------------------------------------------------------

/** Past this many, one line says how many more there are. */
const MAX_PROP_MESSAGES = 50;

/** Attribute values as written, with the entities people write in them decoded. */
function decodeAttributeValue(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Does the sanitizer keep this attribute on this tag? Mirrors hast-util-sanitize's lookup. */
function keptBySanitizer(attrName: string, allowed: readonly unknown[]): boolean {
  // parse5 lowercases the name; hast keys it by property name (class → className)
  const property = find(htmlSchema, attrName.toLowerCase()).property;
  return allowed.some((entry) => {
    const name = Array.isArray(entry) ? String(entry[0]) : String(entry);
    return name === property || (name === 'data*' && property.length > 4 && property.slice(0, 4).toLowerCase() === 'data');
  });
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}


/** The component an unknown tag name was probably meant to be (a typo or a nickname). */
function suggestComponent(written: string): string | undefined {
  const key = written.toLowerCase().replace(/[-_]/g, '');
  const names = Array.from(componentRegistry.getAllRegistrations().values(), (r) => r.name);
  const nickname = COMPONENT_NICKNAMES[key];
  if (nickname && names.includes(nickname)) return nickname;
  let best: { name: string; distance: number } | undefined;
  for (const name of names) {
    const distance = editDistance(key, name.toLowerCase());
    if (distance <= 2 && distance < key.length - 1 && (!best || distance < best.distance)) best = { name, distance };
  }
  return best?.name;
}

/** The declared prop a misspelt attribute was probably meant to be. */
function closestProp(attrName: string, props: Record<string, PropSchema>): string | undefined {
  const wanted = propNameKey(attrName);
  let best: { name: string; distance: number } | undefined;
  for (const name of Object.keys(props)) {
    const distance = editDistance(wanted, propNameKey(name));
    if (distance <= 2 && distance < wanted.length && (!best || distance < best.distance)) best = { name, distance };
  }
  return best?.name;
}

/** What `<Break when>` understands: the loop count compared with a number (ForEach evaluateWhenCondition). */
const BREAK_WHEN = /^\s*(i|index|\d+)\s*(>=|<=|>|<|===|!==|==|!=)\s*(i|index|\d+)\s*$/;

/**
 * Values a component would quietly give up on when the page runs (a
 * pattern that isn't a pattern, a list that isn't JSON, a Break condition
 * it can't read), checked here instead, where the author hears about it.
 */
function valueProblem(
  component: string,
  prop: string,
  value: string,
  attributes: Array<{ name: string; value?: string }>
): string | undefined {
  if (prop === 'matches' || (component === 'Validate' && prop === 'pattern')) {
    try {
      new RegExp(value);
    } catch (error) {
      const reason = error instanceof Error ? error.message.replace(/^Invalid regular expression: /, '') : '';
      return `${prop} isn't a pattern this can read${reason ? ` (${reason})` : ''}, so it never matches.`;
    }
  }
  if (component === 'Var' && prop === 'initial') {
    const type = attributes.find((a) => a.name.toLowerCase() === 'type')?.value?.toLowerCase();
    if (type === 'array' || type === 'object') {
      const kind = type === 'array' ? 'a list like ["a", "b"]' : 'an object like {"a": 1}';
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        return `initial needs to be ${kind} in JSON, so it starts empty.`;
      }
      const fits = type === 'array' ? Array.isArray(parsed) : typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
      if (!fits) return `initial needs to be ${kind}, so it starts empty.`;
    }
  }
  if (component === 'Embed' && prop === 'src') {
    const why = whyNoEmbed(value);
    if (why) return `${why} Visitors see nothing there.`;
  }
  if (component === 'Break' && prop === 'when' && !BREAK_WHEN.test(value)) {
    return 'when compares the loop count with a number, like when="i >= 5". To stop on anything else, put <Break /> inside an <If>.';
  }
  return undefined;
}

/**
 * Every component attribute that won't do what its author meant, said to
 * the page's owner (these become validation warnings, which only the editor
 * shows; visitors never see them):
 *  - an attribute the component doesn't have (a typo, or another
 *    component's prop): the sanitizer drops it;
 *  - a value that doesn't fit (not one of the choices, not true/false, not a
 *    number, out of range): the component gets its default instead;
 *  - a required prop left out.
 * Read from the source as written, so each message has its line. The
 * compiler coerces the same values with the same function (island-detector
 * via validateAndCoerceProps), so what this says is what happens.
 */
function reportComponentProps(source: string): string[] {
  const schema = createCustomSchema();
  const globalAttributes: unknown[] = schema.attributes['*'] || [];
  const messages: string[] = [];

  for (const token of tokenizeSource(source)) {
    if (token.type !== 'open' || !looksLikeComponentName(token.name)) continue;
    // Unregistered names are in the stripped report
    const registration = componentRegistry.get(token.name);
    if (!registration) continue;

    const name = registration.name;
    const line = lineAt(source, token.start);
    const allowed = [...(schema.attributes[COMPONENT_TAG_PREFIX + name.toLowerCase()] || []), ...globalAttributes];
    const written = new Set<string>();

    for (const attr of token.attributes) {
      const asWritten = `Line ${line}: <${name} ${attr.name}${attr.value !== undefined ? `="${attr.value}"` : ''}>`;
      const declared = findPropSchema(registration.props, attr.name);
      if (declared) {
        const [propName, propSchema] = declared;
        written.add(propName);
        const value = decodeAttributeValue(attr.value ?? '');
        const problem =
          coercePropValue(value, propSchema, propName).problem ??
          valueProblem(name, propName, value, token.attributes);
        if (problem) messages.push(`${asWritten} ${problem}`);
        continue;
      }
      // name= and var= both mean "which variable", on different tags
      const other = attr.name.toLowerCase() === 'name' ? 'var' : attr.name.toLowerCase() === 'var' ? 'name' : null;
      if (other && registration.props[other]) {
        written.add(other);
        messages.push(`${asWritten} ${name} says which variable with ${other}="…", not ${attr.name}=. Write ${other}="${attr.value ?? ''}".`);
        continue;
      }
      if (!keptBySanitizer(attr.name, allowed)) {
        const meant = closestProp(attr.name, registration.props);
        messages.push(
          `${asWritten} ${name} has no ${attr.name} setting, so it's left out.` +
          (meant ? ` Did you mean ${meant}?` : '')
        );
      }
    }

    for (const [propName, propSchema] of Object.entries(registration.props)) {
      if (propSchema.required && !written.has(propName)) {
        messages.push(`Line ${line}: <${name}> needs ${propName}="…" to work.`);
      }
    }
  }

  if (messages.length > MAX_PROP_MESSAGES) {
    const more = messages.length - MAX_PROP_MESSAGES;
    return [...messages.slice(0, MAX_PROP_MESSAGES), `…and ${more} more like these.`];
  }
  return messages;
}

/**
 * Whether an editor warning is one of reportPageProblems' (how the page fits
 * together) rather than about one tag's own settings. Tests that compile a
 * single tag on its own leave these out.
 */
export function isPageProblem(message: string): boolean {
  return /uses a variable called|only works (straight )?inside|reads (condition|data|when) as a name|needs name="…" \(or var="…"\)/.test(message);
}

/** Components that run what's inside them when something happens (OnClick, OnChange, OnMount…) */
const isEvent = (name: string) => /^On[A-Z]/.test(name);

/** A prop that makes a page variable for you ("Made for you if it doesn't exist") */
function declaresVariable(prop: PropSchema | undefined): boolean {
  return !!prop?.description && /made for you/i.test(prop.description);
}

/** The JavaScript people write in an If and expect to work: ==, !=, <, >, && and || */
const SCRIPT_IN_CONDITION = /==|!=|<=|>=|&&|\|\||(?<![\w-])[<>](?!=)/;

/**
 * Mistakes that compile fine and then do nothing on the page, found from the
 * source with its lines:
 *  - a variable that's used but never made (setVariable ignores unknown
 *    names, so <Increment var="cuont"> just does nothing), with the
 *    closest name that is made;
 *  - JavaScript in an If's condition (it's read as a name, so
 *    condition="mood == 'happy'" is never true);
 *  - Else or ElseIf outside an event (on the page they do nothing);
 *  - OnClick anywhere but straight inside a Button, and a component outside
 *    the one it has to sit in (Tab outside Tabs, Case outside Switch);
 *  - ShowVar with nothing to show.
 */
function reportPageProblems(source: string): string[] {
  const messages: string[] = [];
  const declared = new Set<string>();
  const used: Array<{ name: string; line: number; tag: string; attr: string }> = [];
  const stack: string[] = [];

  for (const token of tokenizeSource(source)) {
    if (token.type === 'close') {
      if (!looksLikeComponentName(token.name)) continue;
      const at = stack.lastIndexOf(token.name);
      if (at !== -1) stack.length = at;
      continue;
    }
    if (token.type !== 'open' || !looksLikeComponentName(token.name)) continue;
    const registration = componentRegistry.get(token.name);
    if (!registration) continue;
    const name = registration.name;
    const line = lineAt(source, token.start);
    const parent = stack[stack.length - 1];
    const attrs = new Map(token.attributes.map((a) => [a.name.toLowerCase(), decodeAttributeValue(a.value ?? '')]));

    // Where it sits
    if (name === 'OnClick' && parent !== 'Button') {
      messages.push(
        `Line ${line}: <OnClick> only works straight inside a <Button>, so here nothing happens on a click.` +
        (parent ? ` It's inside <${parent}>.` : '')
      );
    }
    const needs = registration.relationship?.requiresParent;
    if (needs && parent !== needs && name !== 'OnClick') {
      messages.push(`Line ${line}: <${name}> only works inside a <${needs}>.`);
    }
    if ((name === 'Else' || name === 'ElseIf') && !stack.some(isEvent)) {
      messages.push(
        `Line ${line}: <${name}> only works inside an event like <OnClick>. On the page it does nothing; use another <If> for the other case.`
      );
    }

    // JavaScript in a condition
    if (['If', 'ElseIf', 'When', 'Show'].includes(name)) {
      for (const key of ['condition', 'data', 'when']) {
        const value = attrs.get(key);
        if (value && SCRIPT_IN_CONDITION.test(value)) {
          messages.push(
            `Line ${line}: <${name} ${key}="${value}"> reads ${key} as a name, not a sum, so it's never true. ` +
            `Write the name and what to compare with, like <If condition="mood" equals="happy">.`
          );
          break;
        }
      }
    }

    // Variables made and used
    if (name === 'Var' && attrs.get('name')) declared.add(attrs.get('name')!);
    if (name === 'ForEach') {
      for (const key of ['item', 'index']) if (attrs.get(key)) declared.add(attrs.get(key)!);
    }
    // Validate makes <var>_valid, <var>_error and <var>_errors
    if (name === 'Validate' && attrs.get('var')) {
      for (const suffix of ['_valid', '_error', '_errors']) declared.add(attrs.get('var') + suffix);
    }
    for (const [propName, prop] of Object.entries(registration.props)) {
      const value = attrs.get(propName.toLowerCase());
      if (value && declaresVariable(prop)) declared.add(value);
    }
    if (attrs.get('var')) used.push({ name: attrs.get('var')!, line, tag: name, attr: 'var' });
    if ((name === 'ShowVar' || name === 'DebugValue') && attrs.get('name')) {
      used.push({ name: attrs.get('name')!, line, tag: name, attr: 'name' });
    }
    for (const value of attrs.values()) {
      for (const m of value.matchAll(/\$vars\.([A-Za-z_][\w-]*)/g)) used.push({ name: m[1], line, tag: name, attr: '$vars' });
    }
    if (name === 'ShowVar' && !attrs.get('name') && !attrs.get('var')) {
      messages.push(`Line ${line}: <ShowVar> needs name="…" (or var="…") to know which variable to show.`);
    }

    if (!token.selfClosing) stack.push(name);
  }

  const reported = new Set<string>();
  for (const use of used) {
    if (declared.has(use.name) || reported.has(use.name)) continue;
    reported.add(use.name);
    let best: { name: string; distance: number } | undefined;
    for (const candidate of declared) {
      const distance = editDistance(use.name.toLowerCase(), candidate.toLowerCase());
      if (distance <= 2 && (!best || distance < best.distance)) best = { name: candidate, distance };
    }
    messages.push(
      `Line ${use.line}: <${use.tag}> uses a variable called ${use.name}, but nothing makes one, so it does nothing.` +
      (best ? ` Did you mean ${best.name}?` : ` Add <Var name="${use.name}" initial="…" /> near the top.`)
    );
  }

  return messages.length > MAX_PROP_MESSAGES
    ? [...messages.slice(0, MAX_PROP_MESSAGES), `…and ${messages.length - MAX_PROP_MESSAGES} more like these.`]
    : messages;
}

// Convert HAST to a serializable AST for storage
export interface TemplateNode {
  type: 'element' | 'text' | 'root';
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: TemplateNode[];
  value?: string;
  /** A component tag (written PascalCase). Plain HTML that shares a name, like <button>, isn't. */
  component?: boolean;
  /**
   * Root only, for a pasted whole document: its title and Google Fonts.
   * Kept on the AST because the save API stores the AST as-is; _app.tsx
   * reads the font imports from it (fontImportsFromCompiledTemplate).
   */
  head?: DocumentHead;
}

export function astToJson(node: unknown): TemplateNode {
  const typedNode = node as { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: unknown[]; data?: { component?: boolean } };

  if (typedNode.type === 'text') {
    return {
      type: 'text',
      value: typedNode.value
    };
  }

  if (typedNode.type === 'element') {
    const result: TemplateNode = {
      type: 'element' as const,
      tagName: typedNode.tagName,
      properties: typedNode.properties || {},
      children: typedNode.children?.map(astToJson) || []
    };
    if (typedNode.data?.component) result.component = true;

    return result;
  }

  if (typedNode.type === 'root') {
    return {
      type: 'root',
      children: typedNode.children?.map(astToJson) || []
    };
  }

  return {
    type: 'text',
    value: ''
  };
}

// Validation and limits
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    /** Tags (elements), not text; see countElements */
    nodeCount: number;
    maxDepth: number;
    componentCounts: Record<string, number>;
  };
}

/**
 * Tags on the page and how deeply they nest. Text between tags isn't counted
 * (a 150-row table is mostly whitespace nodes), and neither is the <tbody>
 * the parser adds to every table, so twelve nested layout tables are 36
 * deep, not 50.
 */
function countElements(node: TemplateNode, depth = 0): { count: number; maxDepth: number } {
  const counted = node.type === 'element' && node.tagName !== 'tbody';
  const here = counted ? depth + 1 : depth;
  let count = counted ? 1 : 0;
  let maxDepth = here;

  if (node.children) {
    for (const child of node.children) {
      const childResult = countElements(child, here);
      count += childResult.count;
      maxDepth = Math.max(maxDepth, childResult.maxDepth);
    }
  }

  return { count, maxDepth };
}

function countComponents(node: TemplateNode, counts: Record<string, number> = {}): Record<string, number> {
  if (node.type === 'element' && node.tagName && node.component) {
    const isComponent = componentRegistry.get(node.tagName);
    if (isComponent) {
      counts[node.tagName] = (counts[node.tagName] || 0) + 1;
    }
  }

  if (node.children) {
    for (const child of node.children) {
      countComponents(child, counts);
    }
  }

  return counts;
}

export function validateTemplate(ast: TemplateNode): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { count: nodeCount, maxDepth } = countElements(ast);

  const componentCounts = countComponents(ast);
  const totalComponents = Object.values(componentCounts).reduce((sum, count) => sum + count, 0);

  if (nodeCount > TEMPLATE_LIMITS.maxElements) {
    errors.push(formatLimitError('elements', nodeCount, TEMPLATE_LIMITS.maxElements));
  }

  if (maxDepth > TEMPLATE_LIMITS.maxDepth) {
    errors.push(formatLimitError('depth', maxDepth, TEMPLATE_LIMITS.maxDepth));
  }

  if (totalComponents > TEMPLATE_LIMITS.maxComponents) {
    errors.push(formatLimitError('components', totalComponents, TEMPLATE_LIMITS.maxComponents));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      nodeCount,
      maxDepth,
      componentCounts
    }
  };
}

// Main compilation function
export interface CompilationResult {
  success: boolean;
  ast?: TemplateNode;
  validation?: ValidationResult;
  errors: string[];
  strippedComponents?: StrippedTag[];
}

export function compileTemplate(htmlString: string): CompilationResult {
  try {
    // Characters, like the save check, so the two agree on the same page
    if (htmlString.length > TEMPLATE_LIMITS.maxChars) {
      return {
        success: false,
        errors: [formatLimitError('size', htmlString.length, TEMPLATE_LIMITS.maxChars)]
      };
    }

    // Pre-validate syntax before parsing
    const syntaxCheck = detectSyntaxErrors(htmlString);
    if (syntaxCheck.errors.length > 0) {
      return {
        success: false,
        errors: syntaxCheck.errors
      };
    }

    // Parse and sanitize
    const hast = parseTemplate(htmlString);

    // Extract stripped components and attribute warnings from the HAST result
    const strippedComponents = (hast as any)._strippedComponents;
    const attributeWarnings = (hast as any)._attributeWarnings || [];

    // Convert to JSON AST
    const ast = astToJson(hast);
    const documentHead = (hast as any)._documentHead as DocumentHead | undefined;
    if (documentHead) ast.head = documentHead;

    // Validate
    const validation = validateTemplate(ast);
    validation.warnings.push(...syntaxCheck.warnings);

    // Merge attribute warnings into validation warnings
    if (attributeWarnings.length > 0 && validation.warnings) {
      validation.warnings.push(...attributeWarnings);
    }

    return {
      success: validation.isValid,
      ast: validation.isValid ? ast : undefined,
      validation,
      errors: validation.errors,
      strippedComponents: strippedComponents || undefined
    };
  } catch (error) {
    // Extract meaningful error details from rehype/parser errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try to extract line number if available
    const lineMatch = errorMessage.match(/line (\d+)/i) || errorMessage.match(/(\d+):/);
    const locationInfo = lineMatch ? ` (near line ${lineMatch[1]})` : '';

    // Provide context-aware error messages based on error type
    let friendlyError = `Template parsing failed${locationInfo}`;
    const detailsPrefix = 'Parser details: ';

    if (errorMessage.toLowerCase().includes('unexpected end')) {
      friendlyError = `Unclosed tag detected${locationInfo}.\nCheck that all tags are properly closed with /> or matching closing tags.`;
    } else if (errorMessage.toLowerCase().includes('invalid character') || errorMessage.toLowerCase().includes('unexpected character')) {
      friendlyError = `Invalid character in template${locationInfo}.\nCheck for special characters or unclosed quotes in attribute values.`;
    } else if (errorMessage.toLowerCase().includes('missing')) {
      friendlyError = `Missing required element${locationInfo}.\n${errorMessage}`;
    }

    // Return both friendly and technical error messages
    const errors = [friendlyError];
    if (!errorMessage.includes(friendlyError)) {
      errors.push(`${detailsPrefix}${errorMessage}`);
    }

    return {
      success: false,
      errors
    };
  }
}