import { unified } from 'unified';
import { defaultTreeAdapter, Parser, type DefaultTreeAdapterMap } from 'parse5';
import { fromParse5 } from 'hast-util-from-parse5';
import { VFile } from 'vfile';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { FORM_ACTION_REMOVED, offSiteHost, postsToApi } from './form-action';
import { find, html as htmlSchema } from 'property-information';
import type { Root } from 'hast';
import { componentRegistry } from '../core/template-registry';
import { coercePropValue, findPropSchema, propNameKey, UNIVERSAL_CSS_ATTRIBUTES, type PropSchema } from '../core/template-registry-types';
import { getAllowedAttributes } from '../core/attribute-mappings';
import { TEMPLATE_LIMITS, depthGuard, formatLimitError, runawayPageError, RunawayDepth } from './template-limits';
import {
  COMPONENT_TAG_PREFIX,
  lineAt,
  looksLikeComponentName,
  prepareSourceForParse,
  tokenizeSource,
} from './source-scan';
import { sourcePositions, type SourcePositions } from './source-positions';
import { extractDocument, type DocumentHead } from './document-head';
import { isThemeOptionMeta } from './theme-options';
import { whyNoEmbed } from '../embeds';
import { COMPONENT_NICKNAMES } from '../editor/component-nicknames';
import {
  ELEMENT_ATTRIBUTES,
  GLOBAL_ATTRIBUTES,
  HTML_AUTHORING_TAGS,
  ID_REFERENCE_ATTRIBUTES,
  isReservedDataAttribute,
  NEVER_ALLOWED_TAGS,
  STRIPPED_WITH_CONTENT,
  SVG_ATTRIBUTES,
  SVG_TAGS,
} from './html-allowlist';
import { paragraphSafe } from './paragraph-safe';
import { expressionProblem } from '../state/expression-evaluator';
import { isSafePageAttribute } from '@/components/features/templates/state/actions/page-targets';

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
      // class they like, and any data-* but the site's own (below)
      ? attrs.filter((attr) => {
          const name = Array.isArray(attr) ? String(attr[0]) : String(attr);
          return name !== 'className' && !/^data[A-Z]/.test(name);
        })
      : attrs;
  }
  attributes['*'] = Array.from(new Set([...(attributes['*'] || []), ...GLOBAL_ATTRIBUTES, ...ARIA_ATTRIBUTES, 'data*']));
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
  // Plus the small web's own: text-message, Gemini and IRC links (template audit 11 #5c)
  schema.protocols.href = ['http', 'https', 'mailto', 'tel', 'sms', 'gemini', 'irc', 'ircs', '#'];

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
      // Invalid JSON in a component's initial attribute (entities decoded first).
      // Only where it's read as an object: a type="string" Var can start with
      // "{" (initial="{hello}" was a save error: template audit 06 #12)
      const initial = token.attributes.find((a) => a.name.toLowerCase() === 'initial')?.value;
      const type = token.attributes.find((a) => a.name.toLowerCase() === 'type')?.value?.trim().toLowerCase();
      if (initial !== undefined && initial.trim().startsWith('{') && (type === undefined || type === 'object')) {
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
          (key === 'onclick'
            ? VOID_TAGS.has(tag.toLowerCase())
              ? ` For something to happen on a click, give the <${tag}> an id and put <OnClick target="#…"> on the page.`
              : ` For something to happen on a click, put an <OnClick> inside the <${tag}>.`
            : '')
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
  head: DocumentHead,
  where: { rel?: string; src?: string; inSvg?: boolean; inside?: string } = {}
): { category: StrippedCategory; reason: string } {
  const lower = name.toLowerCase();
  const src = (where.src ?? '').toLowerCase();

  // Inside something taken out with everything in it (<object>'s fallback <img>)
  if (where.inside) {
    return { category: 'unsupported', reason: `Taken out with the <${where.inside}> around it.` };
  }
  if (lower === 'title' && where.inSvg) {
    return {
      category: 'unsupported',
      reason: 'Not kept: an SVG’s <title> goes with page titles. To name the picture for screen readers, put role="img" and aria-label="…" on the <svg>.',
    };
  }
  // Inside an <svg>: what each does and what to do instead (template audit 11 #7)
  if (where.inSvg && lower === 'switch') {
    return { category: 'unsupported', reason: 'Not supported here: <switch> picks a version for old SVG viewers. Keep just the one you want.' };
  }
  if (lower === 'use') {
    return { category: 'safety', reason: 'Removed for safety: <use> can load shapes from other files. Copy the shape’s <path> in where you want it.' };
  }
  if (where.inSvg && lower === 'image') {
    return { category: 'safety', reason: 'Removed for safety: an SVG <image> can load from anywhere. Put the picture in an <img> next to the SVG.' };
  }
  if (['animate', 'set', 'animatemotion', 'animatetransform'].includes(lower)) {
    return { category: 'safety', reason: 'Removed for safety: SVG animation can rewrite links as it runs. Animate it with CSS @keyframes instead.' };
  }
  // Old ways to play music, and old widgets with a component of their own
  if (lower === 'bgsound' || (lower === 'embed' && /\.midi?(?:[?#]|$)/.test(src))) {
    return { category: 'unsupported', reason: 'Not supported here: for music, add a song in Settings and put <ProfileMusic /> where its player goes.' };
  }
  if (lower === 'script' && /onionring|webring|ring\.js/.test(src)) {
    return { category: 'safety', reason: 'Removed for safety: scripts don’t run on pages here. For a webring’s links, use <RingNav />.' };
  }
  if (lower === 'base') {
    return {
      category: 'unsupported',
      reason: 'Not supported here: <base> would send every link and picture on the page somewhere else. Use full addresses (https://…).',
    };
  }
  if (lower === 'noscript') {
    return {
      category: 'unsupported',
      reason: 'Taken out with what’s in it: pages here don’t run scripts, so there’s nothing for it to stand in for.',
    };
  }
  if (lower === 'link' && /(^|\s)me(\s|$)/i.test(where.rel ?? '')) {
    return {
      category: 'document',
      reason: 'Made for you: add your site in Settings and tick “This is my site”, and its rel="me" link goes in your page’s head.',
    };
  }
  if (lower === 'link' && /(^|\s)(icon|shortcut|apple-touch-icon)(\s|$)/i.test(where.rel ?? '')) {
    return { category: 'unsupported', reason: 'Not supported here: pages show the site’s icon in the tab.' };
  }
  // Feeds, canonical links, manifests, webmention endpoints: the site writes those
  if (lower === 'link' && where.rel && !/(^|\s)stylesheet(\s|$)/i.test(where.rel)) {
    return { category: 'document', reason: 'Document wrapper (expected): the site writes your page’s <head>, links like this one included.' };
  }
  // Taken out with everything in them (noscript has its own reason above)
  if (lower === 'template' || lower === 'noframes' || lower === 'noembed') {
    return { category: 'unsupported', reason: `Taken out with what’s in it: <${lower}> isn’t one pages can use.` };
  }

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
        ? 'Document wrapper (expected): the title goes in the browser tab, before your name.'
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

/** Tags with no closing tag, which don't open anything */
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'param', 'image']);
const STRIPPED_WITH_CONTENT_TAGS = new Set<string>(STRIPPED_WITH_CONTENT.map((tag) => tag.toLowerCase()));

/** Source tags that didn't make it into the sanitized tree, one entry per tag name. */
function reportStrippedTags(source: string, tree: Root, head: DocumentHead, renamed: ReadonlySet<string> = new Set()): StrippedTag[] {
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
  let svgDepth = 0;
  // An element taken out with everything in it, while we're inside it
  let container = null as { name: string; open: number } | null;
  for (const token of tokenizeSource(source)) {
    let key: string | undefined;
    let name: string | undefined;
    if (token.type === 'close') {
      const closing = token.name.toLowerCase();
      if (closing === 'svg') svgDepth = Math.max(0, svgDepth - 1);
      if (container && closing === container.name && --container.open === 0) container = null;
      continue;
    }
    if (token.type === 'open') {
      name = token.name;
      const component = looksLikeComponentName(name) && isRegisteredComponent(name);
      key = component ? `component:${name.toLowerCase()}` : name.toLowerCase();
      // The HTML parser reads <image> as <img>: kept, so nothing to say
      if (key === 'image' && svgDepth === 0) key = 'img';
    } else if (token.type === 'doctype' && /^<!doctype/i.test(source.slice(token.start, token.start + 9))) {
      continue; // a doctype isn't a tag anyone expects to see
    }
    // Theme options report their own problems (theme-options.ts)
    if (isThemeOptionMeta(token)) continue;
    if (!key || !name) continue;
    const lower = name.toLowerCase();
    const inside = container?.name;
    const inSvg = svgDepth > 0;
    if (token.type === 'open' && !token.selfClosing && !VOID_TAGS.has(lower)) {
      if (lower === 'svg') svgDepth++;
      if (container?.name === lower) container.open++;
      else if (!container && STRIPPED_WITH_CONTENT_TAGS.has(lower)) container = { name: lower, open: 1 };
    }
    // Anything inside a removed container is gone, even if the same tag survives elsewhere
    // A <p> made a <div> around a box component isn't gone (its own note says why)
    if (!inside && (survived.has(key) || renamed.has(key))) continue;

    const attr = (n: string) => (token.type === 'open' ? token.attributes.find((a) => a.name.toLowerCase() === n)?.value : undefined);
    const { category, reason } = strippedReason(name, head, { rel: attr('rel'), src: attr('src'), inSvg, inside });
    // One entry per tag and reason: a rel=me link and an icon link are told apart
    const existing = byKey.get(`${key} ${reason}`);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      continue;
    }
    byKey.set(`${key} ${reason}`, { name, line: lineAt(source, token.start), reason, category });
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
const URL_REFERENCE_PROPERTIES = ['fill', 'stroke', 'filter', 'clipPath', 'mask', 'markerStart', 'markerMid', 'markerEnd', 'style'];

/** SVG elements: an href may only point at an element in the page (`#id`) */
const SVG_TAG_NAMES = new Set<string>(SVG_TAGS);

function prefixFragment(value: unknown): unknown {
  // #top is the browser's own "back to the top", with or without an element
  // called top; prefixed, every back-to-top link did nothing
  return typeof value === 'string' && value.length > 1 && value.startsWith('#') && !value.startsWith('#' + PREFIX) && value !== '#top'
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
 *  - form fields keep their own names (the sanitizer prefixes every name);
 *  - autoplay only survives on muted media;
 *  - a form's action can't point at /api/ (form-action.ts).
 * Returns whether it took out an action pointing at this site's /api/.
 */
const FORM_FIELDS = new Set(['input', 'select', 'textarea', 'button', 'output']);

function finishSanitizedTree(node: HastLike): boolean {
  let removedFormAction = false;
  if (node.type === 'element') {
    // The site's own data-* names (island markers, the page root) aren't a page's to set
    for (const key of Object.keys(node.properties ?? {})) {
      if (/^data[A-Z]/.test(key) && isReservedDataAttribute(`data${key.slice(4).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`)) {
        delete node.properties![key];
      }
    }
    if (typeof node.tagName === 'string' && node.tagName.startsWith(COMPONENT_TAG_PREFIX)) {
      node.tagName = node.tagName.slice(COMPONENT_TAG_PREFIX.length);
      node.data = { ...(node.data || {}), component: true };
    } else {
      const props = node.properties || (node.properties = {});
      // A gradient, pattern or textPath may build on another one in the page, never a file elsewhere
      if (SVG_TAG_NAMES.has(node.tagName ?? '') && 'href' in props && !String(props.href).startsWith('#')) delete props.href;
      if ('href' in props) props.href = prefixFragment(props.href);
      // Inline, as in the CSS: no look-alike password text (sanitizeCss)
      if (typeof props.style === 'string' && /text-security/i.test(props.style)) {
        props.style = props.style.replace(/-webkit-text-security\s*:[^;]*;?/gi, '');
      }
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
      // A field's name is what its form sends (q=…, not user-content-q=…), and it
      // can't shadow anything on document the way a form's or image's name can
      if (FORM_FIELDS.has(node.tagName ?? '') && typeof props.name === 'string' && props.name.startsWith(PREFIX)) {
        props.name = props.name.slice(PREFIX.length);
      }
      if ((node.tagName === 'audio' || node.tagName === 'video') && props.autoPlay && !props.muted) {
        delete props.autoPlay;
        // <audio autoplay loop> with no controls was an invisible, silent box:
        // visitors can start it themselves (the editor says why, reportHtmlProblems)
        props.controls = true;
      }
      if (node.tagName === 'form' && postsToApi(props.action)) {
        // Another site's /api/ goes too, but reportHtmlProblems says why
        if (!offSiteHost(props.action)) removedFormAction = true;
        delete props.action;
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

/**
 * Old tags browsers still draw, as the tags that mean the same now: they
 * were unwrapped, losing an acronym's tooltip, a nobr's one line and an
 * xmp's monospace (template audit 11 #6a, 02 R14a).
 */
const OLD_TAG_NAMES: Record<string, string> = { acronym: 'abbr', nobr: 'span', xmp: 'pre', listing: 'pre', dir: 'ul' };
function renameOldTags(node: HastLike): void {
  const renamed = node.type === 'element' && node.tagName ? OLD_TAG_NAMES[node.tagName] : undefined;
  if (renamed) {
    if (node.tagName === 'nobr') {
      const props = node.properties || (node.properties = {});
      props.style = `white-space: nowrap;${typeof props.style === 'string' ? ` ${props.style}` : ''}`;
    }
    node.tagName = renamed;
  }
  for (const child of node.children ?? []) renameOldTags(child);
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

type ParentNode = DefaultTreeAdapterMap['parentNode'];

/**
 * parse5's parser, moving a node's children all at once. Its own move takes
 * them one at a time from the front of an array, and a fragment parse moves
 * every top-level node that way, so flat pages were quadratic (20,000 tags
 * in a row took 252 ms). Same nodes, same order, same tree: parse5 is pinned
 * for it, and parse-html.etest.ts holds the tree to parse5's own.
 */
class LinearParser extends Parser<DefaultTreeAdapterMap> {
  override _adoptNodes(donor: ParentNode, recipient: ParentNode): void {
    for (const child of donor.childNodes) {
      child.parentNode = recipient;
      recipient.childNodes.push(child);
    }
    donor.childNodes = [];
  }
}

/**
 * HTML as the browser parses a fragment of it (parseFragment's steps), in
 * one pass that also stops a runaway page (depthGuard). `positions`: each
 * node keeps where it was in `html` (hast-util-from-parse5 needs the file
 * for that, or it quietly keeps none).
 */
export function parseHtml(html: string, positions = false): Root {
  const parser = LinearParser.getFragmentParser<DefaultTreeAdapterMap>(null, {
    scriptingEnabled: false,
    sourceCodeLocationInfo: positions,
    treeAdapter: { ...defaultTreeAdapter, ...depthGuard() },
  });
  parser.tokenizer.write(html, true);
  return fromParse5(parser.getFragment(), positions ? { file: new VFile(html) } : undefined) as Root;
}

/**
 * Words on the preview (source-positions.ts): each text node gets
 * `tsRange`, where it is in the editor's source, and each element `tsAt`,
 * where its start tag is, components and the HTML handed to them
 * included. astToJson keeps both; treeFromHast turns them into the
 * preview's data-ts-text and data-ts-at. The preview edits only the
 * page's own HTML (not a component's own drawing), and the editor writes
 * nothing that doesn't read as the code does, so text a component
 * rewrites can't go back wrong.
 */
type Positioned = HastLike & {
  value?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  tsRange?: [number, number];
  tsAt?: number;
};

function markSourcePositions(node: Positioned, at: SourcePositions): void {
  for (const child of (node.children ?? []) as Positioned[]) {
    const start = child.position?.start.offset;
    const end = child.position?.end.offset;
    if (child.type === 'text') {
      const range = start !== undefined && end !== undefined ? at.text(start, end, child.value ?? '') : null;
      if (range) child.tsRange = range;
    } else if (child.type === 'element') {
      const tag = start !== undefined ? at.tag(start) : null;
      if (tag !== null) child.tsAt = tag;
      markSourcePositions(child, at);
    }
  }
}

// Parse HTML to HAST (Hypertext Abstract Syntax Tree)
// Returns both the parsed tree and information about stripped components.
// `positionsIn`: the editor's source this was made from (before the site
// navigation came out), to mark where the page's words are in it
export function parseTemplate(htmlString: string, positionsIn?: string): Root & {
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

  const tree = parseHtml(processedHtml, positionsIn !== undefined);
  renameOldTags(tree as HastLike);
  const processed = unified().use(rehypeSanitize, createCustomSchema()).runSync(tree) as Root;
  const removedFormAction = finishSanitizedTree(processed as HastLike);
  lazyLoadLaterImages(processed as HastLike);
  const boxedParagraphs = boxesOutOfParagraphs(processed as HastLike);
  if (positionsIn !== undefined) markSourcePositions(processed as Positioned, sourcePositions(positionsIn, processedHtml));

  // Renamed, not taken out: a boxed <p> (now a <div>) and the old tags
  const renamed = new Set([...Object.keys(OLD_TAG_NAMES), ...(boxedParagraphs.size > 0 ? ['p'] : [])]);
  const strippedComponents = reportStrippedTags(htmlString, processed, document.head, renamed);

  // Component props that won't do what the author meant, for the editor
  const attributeWarnings = [
    ...reportComponentProps(htmlString),
    ...reportPageProblems(htmlString),
    ...reportHtmlProblems(htmlString),
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

  // A <title> counts in a fragment too: it goes first in the tab (PageMeta)
  if (document.isFullDocument || document.head.fontImports.length > 0 || document.head.options || document.head.title) {
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
/** A style or HTML prop any component takes (className, backgroundColor, font-size…) */
function isUniversalProp(attrName: string): boolean {
  const camel = attrName.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  return attrName === 'class' || attrName === 'key' || UNIVERSAL_CSS_ATTRIBUTES.some((name) => name.toLowerCase() === camel.toLowerCase() || name === attrName);
}

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
  // value= goes in as written; a calculation is expression= (the lessons' own
  // book list pushed the words "$vars.newBook")
  if (prop === 'value' && /\$vars\./.test(value) && componentRegistry.get(component)?.props.expression) {
    return `value is used as written, so this puts in the words "${value}". For what the variable holds, write expression="${value}".`;
  }
  if (component === 'Var' && prop === 'initial') {
    const type = attributes.find((a) => a.name.toLowerCase() === 'type')?.value?.toLowerCase();
    if (type === 'number' && value.trim() !== '' && isNaN(Number(value))) {
      return `initial needs to be a number, so it starts at 0.`;
    }
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
  // A loop fills in src="{s.url}" when the page runs: it can't be judged here
  if (component === 'Embed' && prop === 'src' && !/\{[^}]+\}/.test(value)) {
    const why = whyNoEmbed(value);
    if (why) return `${why} Visitors see nothing there.`;
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
      // Not this component's, not an HTML attribute every tag takes, not a
      // style prop: left out. (The sanitizer keeps every component's props on
      // every component, so <ConditionalAttr not="…"> said nothing.)
      if (!keptBySanitizer(attr.name, globalAttributes) && !isUniversalProp(attr.name)) {
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
  return /uses a variable called|only works (straight )?inside|reads (condition|data|when) as a name|needs name="…" \(or var="…"\)|nothing for it to attach to|doesn't show what's put inside it|nothing on your page (has|is)|only runs inside an event|runs before <Var|there's already a <Var|can't reach into a loop's item|straight inside <ForEach>/.test(message);
}

/** Components that run what's inside them when something happens (OnClick, OnChange, OnMount…) */
const isEvent = (name: string) => /^On[A-Z]/.test(name);

/** Events that attach to the element they sit in, or to target="…" (element-events.tsx) */
const ELEMENT_EVENTS = new Set(['OnClick', 'OnMouseEnter', 'OnMouseLeave', 'OnSwipe']);

/** Actions: they run when an event does, and on their own do nothing */
const NEEDS_EVENT = new Set([
  'Set', 'Increment', 'Decrement', 'Toggle', 'Cycle', 'Reset', 'Push', 'Pop', 'Append', 'Prepend', 'RemoveAt', 'Merge',
  'Filter', 'Find', 'Sort', 'Transform', 'ObjectSet', 'AddClass', 'RemoveClass', 'ToggleClass', 'SetCSSVar',
  'SetURLHash', 'SetURLParam', 'ShowToast', 'CopyToClipboard', 'Delay', 'Sequence',
]);

/** What a browser calls keys (KeyboardEvent.key): one character, or one of these */
const KEY_NAMES = new Set([
  'Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'Insert', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
]);
const isKeyName = (key: string) => [...key].length === 1 || KEY_NAMES.has(key);

/** What people write for a key, and what the browser calls it */
const KEY_NAMES_MEANT: Record<string, string> = {
  space: ' ', spacebar: ' ', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  enter: 'Enter', return: 'Enter', esc: 'Escape', escape: 'Escape', tab: 'Tab', backspace: 'Backspace',
  delete: 'Delete', del: 'Delete', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
  pageup: 'PageUp', pagedown: 'PageDown', home: 'Home', end: 'End',
};

/**
 * A component that doesn't show what's put inside it: acceptsChildren false
 * or an empty list (ShowVar), or, with no relationship metadata, an example
 * that never wraps anything (Guestbook, DisplayName). An OnClick put in one
 * never mounted, without a word (bug bash 2026-10-26).
 */
function dropsChildren(registration: ReturnType<typeof componentRegistry.get>): boolean {
  if (!registration) return false;
  const accepts = registration.relationship?.acceptsChildren;
  if (registration.relationship) return accepts === false || (Array.isArray(accepts) && accepts.length === 0);
  return registration.group !== 'logic' && !registration.example?.includes(`</${registration.name}>`);
}
/** Where only rows and cells can sit: anything else is moved out of the table (warned about on its own) */
const TABLE_PARTS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup']);

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
 *  - an OnClick or mouse event with nothing to attach to (at the top of the
 *    page, or in a component that doesn't show what's inside it), or a
 *    target that matches nothing in the page;
 *  - a component outside the one it has to sit in (Tab outside Tabs, Case
 *    outside Switch);
 *  - ShowVar with nothing to show.
 */
/** Attributes that point at a file or page */
const ADDRESS_ATTRIBUTES = new Set(['src', 'href', 'background', 'poster', 'action']);

/** The site's own files, which a page may link to by path */
const SITE_FILE_PATHS = /^\/(?:assets|fonts|uploads|pixel-homes|starters|examples|audio)\/|^\/(?:favicon|og-image|image-icon)/i;
/** Link schemes a page keeps (template-parser's schema.protocols.href) */
const KEPT_SCHEMES = /^(?:https?|mailto|tel|sms|gemini|ircs?)$/i;
/** Taken out whole, with their own reason in the list: their addresses don't matter */
const REMOVED_TAGS = new Set<string>([...NEVER_ALLOWED_TAGS.filter((tag) => tag !== 'image'), 'bgsound'].map((tag) => tag.toLowerCase()));
/** Page data a loop can't go through, and the component that shows it */
const PAGE_DATA_COMPONENTS: Record<string, string> = {
  guestbook: 'Guestbook', posts: 'BlogPosts', images: 'MediaGrid', featuredFriends: 'FriendDisplay', websites: 'WebsiteDisplay',
};
/** Tags a component can't sit straight inside: the browser moves it out of the table */
const TABLE_ROWS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr']);

/**
 * What pasted pages get wrong without a word, said once each with the first
 * line and how many (template audit 01 #5, 08, 11, 14 #8, 16 #3):
 * addresses on an old site (images/me.gif, /about.html, url(bg.gif)), http://
 * pictures, pictures and picture links with no alt text, and what the page
 * loses quietly: popovers, editable areas, password boxes, autoplay, links
 * of a kind that isn't kept, a component straight inside a table row, a
 * stray </p>, a comment that never closes.
 */
function reportHtmlProblems(source: string): string[] {
  const relative: Array<{ line: number; value: string; link: boolean }> = [];
  const found = new Map<string, { line: number; count: number; detail: string }>();
  const note = (kind: string, line: number, detail = '') => {
    const seen = found.get(kind);
    if (seen) seen.count++;
    else found.set(kind, { line, count: 1, detail });
  };
  const addressProblem = (value: string, line: number, link: boolean) => {
    if (/^http:\/\//i.test(value)) {
      if (!link) note('http', line, value.slice(7).split(/[/?#]/)[0]);
      return;
    }
    // Web, site and in-page addresses, schemes, a query, a loop's {placeholder}
    const siteFile = value.startsWith('/') && !value.startsWith('//') && /\.[a-z0-9]{2,5}(?:[?#]|$)/i.test(value) && !SITE_FILE_PATHS.test(value);
    if (!siteFile && /^(?:[a-z][a-z0-9+.-]*:|\/|#|\?|\{)/i.test(value)) return;
    relative.push({ line, value, link });
  };

  const open: string[] = [];
  for (const token of tokenizeSource(source)) {
    const line = lineAt(source, token.start);
    if (token.type === 'comment') {
      if (!source.slice(token.start, token.end).endsWith('-->')) note('comment', line);
      continue;
    }
    if (token.type === 'close') {
      const name = token.name.toLowerCase();
      const at = open.lastIndexOf(name);
      if (at !== -1) open.length = at;
      else if (name === 'p') note('strayP', line);
      continue;
    }
    if (token.type !== 'open') continue;
    if (looksLikeComponentName(token.name)) {
      if (TABLE_ROWS.has(open[open.length - 1] ?? '') && isRegisteredComponent(token.name)) note('tableRow', line, `<${token.name}>|<${open[open.length - 1]}>`);
      continue;
    }
    const tag = token.name.toLowerCase();
    // Taken out anyway, and listed with their own reason
    if (REMOVED_TAGS.has(tag)) continue;
    const attrs = new Map(token.attributes.map((a) => [a.name.toLowerCase(), decodeAttributeValue(a.value ?? '').trim()]));

    const host = tag === 'form' && offSiteHost(attrs.get('action') ?? '');
    if (host) note('offSite', line, host);
    for (const [name, value] of attrs) {
      if (ADDRESS_ATTRIBUTES.has(name) && value) addressProblem(value, line, name === 'href' || name === 'action');
    }
    for (const match of (attrs.get('style') ?? '').matchAll(/url\(\s*['"]?([^'")\s]+)/gi)) addressProblem(match[1], line, false);

    if (attrs.has('popover') || attrs.has('popovertarget')) note('popover', line);
    if (attrs.has('contenteditable')) note('editable', line);
    if (attrs.has('autofocus')) note('autofocus', line);
    if (Number(attrs.get('tabindex')) > 0) note('tabindex', line, attrs.get('tabindex'));
    if (tag === 'input' && /^(?:password|file|image)$/i.test(attrs.get('type') ?? '')) note('inputType', line, attrs.get('type')!.toLowerCase());
    if ((tag === 'audio' || tag === 'video') && attrs.has('autoplay') && !attrs.has('muted')) note('autoplay', line, tag);
    const scheme = (attrs.get('href') ?? '').match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
    if (tag === 'a' && scheme && !KEPT_SCHEMES.test(scheme) && !/^(?:javascript|vbscript|data)$/i.test(scheme)) note('scheme', line, scheme);
    if (tag === 'img' && !attrs.has('alt')) note(open[open.length - 1] === 'a' ? 'linkNoAlt' : 'noAlt', line);

    if (!token.selfClosing && !VOID_TAGS.has(tag)) open.push(tag);
  }

  const more = (count: number, what: string) => (count > 1 ? ` (${count - 1} more ${what} too.)` : '');
  const messages: string[] = [];
  if (relative.length > 0) {
    const [first] = relative;
    messages.push(
      `Line ${first.line}: "${first.value}" is an address on your old site, and here it points at a page that isn't there. ` +
      (first.link
        ? 'Link to its full address (https://…), or bring that part onto this page.'
        : 'Upload it with Insert image and it goes in by its file name (several at once work too).') +
      more(relative.length, 'like it')
    );
  }
  const say: Record<string, (f: { line: number; count: number; detail: string }) => string> = {
    http: (f) => `this picture's address starts with http://, so browsers ask ${f.detail} for https:// instead, and it won't show if that site has none. Use its https:// address.${more(f.count, 'like it')}`,
    offSite: (f) => `this form sends to ${f.detail}, and forms here can only send to this site, so it won't go anywhere. Link to its page on ${f.detail} instead.${more(f.count, 'forms like it')}`,
    noAlt: (f) => `this picture has no alt text, so screen readers can't say what it shows. Add alt="what it shows", or alt="" if it's only decoration.${more(f.count, 'pictures need it')}`,
    linkNoAlt: (f) => `this link is only a picture with no alt text, so screen readers can't say where it goes. Give the <img> an alt saying where.${more(f.count, 'links like it')}`,
    popover: (f) => `popover isn't kept here, so this part always shows. A <details> opens and closes without it.${more(f.count, 'like it')}`,
    editable: (f) => `contenteditable isn't kept here: visitors can't change your page.${more(f.count, 'like it')}`,
    autofocus: () => `autofocus isn't kept here: your page doesn't take the cursor when it opens.`,
    tabindex: (f) => `tabindex="${f.detail}" changes the order the Tab key goes through your page. 0 (or leaving it out) keeps the order the page is written in.${more(f.count, 'like it')}`,
    inputType: (f) => `<input type="${f.detail}"> shows as a plain text box here${f.detail === 'password' ? ': pages can\'t ask for passwords' : f.detail === 'file' ? ': pages can\'t take uploads' : ''}.${more(f.count, 'like it')}`,
    autoplay: (f) => `autoplay only works on muted video here, so this <${f.detail}> gets controls and waits for a click.${more(f.count, 'like it')}`,
    scheme: (f) => `a ${f.detail}: link isn't kept here, so its text shows without the link.${more(f.count, 'like it')}`,
    tableRow: (f) => `${f.detail.split('|')[0]} can't sit straight inside a ${f.detail.split('|')[1]}: browsers move it out of the table, above it. Put it inside a <td>.${more(f.count, 'like it')}`,
    strayP: (f) => `this </p> has no <p> to close, so browsers add an empty paragraph there.${more(f.count, 'like it')}`,
    comment: () => `a comment opens here (<!--) and never closes (-->), so everything after it is hidden.`,
  };
  for (const [kind, f] of found) messages.push(`Line ${f.line}: ${say[kind](f)}`);
  return messages;
}

/** A JSON list or object, which Set and Push read as it is */
function isJson(value: string): boolean {
  if (!/^[[{]/.test(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function reportPageProblems(source: string): string[] {
  const messages: string[] = [];
  const declared = new Set<string>();
  const used: Array<{ name: string; line: number; tag: string; attr: string }> = [];
  const varLines = new Map<string, number>();
  const loopItems = new Set<string>();
  // Variables an OnMount changes before their <Var> is made
  const mountUses: Array<{ name: string; line: number }> = [];
  const stack: string[] = [];
  // Every open tag, HTML too: what an OnClick would attach to
  const elements: Array<{ name: string; component: boolean }> = [];
  // What a target="…" can match: the page's ids, classes and tags
  const ids = new Set<string>();
  const classes = new Set<string>();
  const tags = new Set<string>();
  const targets: Array<{ name: string; line: number; target: string }> = [];

  for (const token of tokenizeSource(source)) {
    if (token.type === 'close') {
      const open = elements.map((e) => e.name).lastIndexOf(looksLikeComponentName(token.name) ? token.name : token.name.toLowerCase());
      if (open !== -1) elements.length = open;
      if (!looksLikeComponentName(token.name)) continue;
      const at = stack.lastIndexOf(token.name);
      if (at !== -1) stack.length = at;
      continue;
    }
    if (token.type !== 'open') continue;
    for (const attribute of token.attributes) {
      const value = decodeAttributeValue(attribute.value ?? '');
      const key = attribute.name.toLowerCase();
      if (key === 'id') ids.add(value.trim().replace(/^user-content-/, ''));
      if (key === 'class' || key === 'classname') for (const name of value.split(/\s+/)) if (name) classes.add(name);
    }
    if (!looksLikeComponentName(token.name)) {
      const tag = token.name.toLowerCase();
      tags.add(tag);
      if (!token.selfClosing && !VOID_TAGS.has(tag)) elements.push({ name: tag, component: false });
      continue;
    }
    const registration = componentRegistry.get(token.name);
    if (!registration) continue;
    const name = registration.name;
    const line = lineAt(source, token.start);
    const parent = stack[stack.length - 1];
    const attrs = new Map(token.attributes.map((a) => [a.name.toLowerCase(), decodeAttributeValue(a.value ?? '')]));

    // Where it sits: an OnClick or mouse event attaches to the element
    // around it, past logic like If and ForEach (element-events.tsx)
    const target = attrs.get('target')?.trim();
    if (ELEMENT_EVENTS.has(name) && target) targets.push({ name, line, target });
    if (ELEMENT_EVENTS.has(name) && !target && !(name === 'OnClick' && parent === 'Button')) {
      const people = name === 'OnClick' ? 'click' : name === 'OnSwipe' ? 'swipe across' : 'point at';
      let around: { name: string; component: boolean } | undefined;
      let inLoop = false;
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        const holder = element.component ? componentRegistry.get(element.name) : undefined;
        if (!element.component || isEvent(element.name) || dropsChildren(holder) || holder?.group !== 'logic') {
          around = element;
          break;
        }
        if (element.name === 'ForEach') inLoop = true;
      }
      const holder = around?.component ? componentRegistry.get(around.name) : undefined;
      if (!around) {
        messages.push(
          `Line ${line}: <${name}> sits at the top of the page, not inside anything, so there's nothing for it to attach to. ` +
          `Put it inside the thing people ${people}, or point it at something with target="…".`
        );
      } else if (dropsChildren(holder) && !isEvent(around.name)) {
        messages.push(
          `Line ${line}: <${name}> is inside <${around.name}>, which doesn't show what's put inside it, so nothing happens. ` +
          `Put it in the element around the <${around.name}>, or point it at something with target="…".`
        );
      } else if (inLoop && !TABLE_PARTS.has(around.name)) {
        // Each item's lands on the same element, so one click ran them all
        messages.push(
          `Line ${line}: <${name}> is straight inside <ForEach>, so every item's lands on the <${around.name}> around the loop and one ${people} runs them all. ` +
          `Put it inside an element for each item, like <li>.`
        );
      }
    }
    const needs = registration.relationship?.requiresParent;
    if (needs && parent !== needs) {
      messages.push(`Line ${line}: <${name}> only works inside a <${needs}>.`);
    }
    if ((name === 'Else' || name === 'ElseIf') && !stack.some(isEvent)) {
      messages.push(
        `Line ${line}: <${name}> only works inside an event like <OnClick>. On the page it does nothing; use another <If> for the other case.`
      );
    }

    // A calculation the page can't run: said here, with its line, not only
    // in the console (a loop's {placeholders} are filled in at run time, and
    // a JSON list or object is read as it is)
    const calculations = name === 'ConditionalAttr' ? ['when'] : name === 'Break' ? ['when', 'condition'] : [];
    for (const key of ['expression', ...calculations]) {
      const value = attrs.get(key)?.trim();
      if (!value || /\{[\w$.]+\}/.test(value) || isJson(value)) continue;
      const problem = expressionProblem(value);
      if (problem) messages.push(`Line ${line}: <${name} ${key}="${value}"> ${problem}, so it does nothing.`);
    }

    // JavaScript in a condition
    if (['If', 'ElseIf', 'Show'].includes(name)) {
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

    // ConditionalAttr only sets state and accessibility attributes
    const attribute = attrs.get('attribute')?.trim();
    if (name === 'ConditionalAttr' && attribute && !isSafePageAttribute(attribute)) {
      const instead = /^class$/i.test(attribute) ? ' For a class, use <ToggleClass> or <AddClass>.' : /^style$/i.test(attribute) ? ' For a style, use <SetCSSVar>.' : '';
      messages.push(`Line ${line}: <ConditionalAttr attribute="${attribute}"> can't set ${attribute}, so it does nothing (aria-…, data-…, hidden, disabled, title and the like work).${instead}`);
    }

    // A key the browser never calls by that name
    const keyName = attrs.get('keyname');
    if ((name === 'OnKeyPress' || name === 'OnKeyUp') && keyName !== undefined && !isKeyName(keyName)) {
      const meant = KEY_NAMES_MEANT[keyName.trim().toLowerCase()];
      messages.push(`Line ${line}: <${name} keyName="${keyName}"> never goes off: no key is called that.${meant ? ` Did you mean keyName="${meant}"?` : ''}`);
    }

    // Actions only run inside an event (OnClick, OnMount…)
    if (NEEDS_EVENT.has(name) && !stack.some(isEvent)) {
      messages.push(`Line ${line}: <${name}> only runs inside an event like <OnClick> or <OnMount>; here it does nothing.`);
    }
    if (stack.includes('OnMount')) {
      for (const key of ['var', ...[...attrs.keys()].filter((k) => k === 'expression' || k === 'value')]) {
        const value = attrs.get(key) ?? '';
        const names = key === 'var' ? [value] : [...value.matchAll(/\$vars\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]);
        for (const used of names) if (used && !declared.has(used)) mountUses.push({ name: used, line });
      }
    }

    // Variables made and used
    if (name === 'Var' && attrs.get('name')) {
      const varName = attrs.get('name')!;
      const first = varLines.get(varName);
      if (first !== undefined) {
        messages.push(`Line ${line}: there's already a <Var name="${varName}"> on line ${first}. Two with one name are one variable, and only one starting value counts; give this one its own name.`);
      } else varLines.set(varName, line);
      declared.add(varName);
    }
    if (name === 'ForEach' && attrs.get('item')) loopItems.add(attrs.get('item')!);
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
    if (name === 'ShowVar' && attrs.get('name')) {
      used.push({ name: attrs.get('name')!, line, tag: name, attr: 'name' });
    }
    for (const value of attrs.values()) {
      for (const m of value.matchAll(/\$vars\.([A-Za-z_][\w-]*)/g)) used.push({ name: m[1], line, tag: name, attr: '$vars' });
    }
    if (name === 'ShowVar' && !attrs.get('name') && !attrs.get('var')) {
      messages.push(`Line ${line}: <ShowVar> needs name="…" (or var="…") to know which variable to show.`);
    }

    if (!token.selfClosing) {
      stack.push(name);
      elements.push({ name, component: true });
    }
  }

  // A target="…" that matches nothing in the page's source: simple
  // selectors only, and not where a loop makes the ids or classes
  for (const { name, line, target } of targets) {
    const id = target.match(/^#([\w-]+)$/)?.[1]?.replace(/^user-content-/, '');
    const className = target.match(/^\.([\w-]+)$/)?.[1];
    const tag = /^[a-z][a-z0-9]*$/i.test(target) ? target.toLowerCase() : undefined;
    const placeholders = (set: Set<string>) => [...set].some((value) => value.includes('{'));
    if (id && !ids.has(id) && !placeholders(ids)) {
      messages.push(`Line ${line}: <${name} target="${target}">: nothing on your page has id="${id}", so nothing happens.`);
    } else if (className && !classes.has(className) && !placeholders(classes)) {
      messages.push(`Line ${line}: <${name} target="${target}">: nothing on your page has class="${className}", so nothing happens.`);
    } else if (tag && !tags.has(tag)) {
      messages.push(`Line ${line}: <${name} target="${target}">: nothing on your page is a <${tag}>. For an id, write target="#${target}".`);
    }
  }

  const reported = new Set<string>();
  for (const use of used) {
    if (declared.has(use.name) || reported.has(use.name)) continue;
    reported.add(use.name);
    let best: { name: string; distance: number } | undefined;
    // Not for short names: an unknown l isn't the loop's i
    for (const candidate of use.name.length > 2 ? declared : []) {
      if (candidate.length <= 2) continue;
      const distance = editDistance(use.name.toLowerCase(), candidate.toLowerCase());
      if (distance <= 2 && (!best || distance < best.distance)) best = { name: candidate, distance };
    }
    // e.tags: a list inside a loop's item (or a Var's) isn't one this can use
    const root = use.name.split('.')[0];
    // The page's own data has components of its own (template audit 06 #9b)
    const shownBy = PAGE_DATA_COMPONENTS[root];
    if (shownBy && !declared.has(root)) {
      messages.push(
        `Line ${use.line}: <${use.tag}> goes through a page variable (a <Var>), not page data like ${root}. <${shownBy}> shows ${root}.`
      );
      continue;
    }
    if (root !== use.name && loopItems.has(root) && use.tag === 'ShowVar') {
      messages.push(`Line ${use.line}: <ShowVar name="${use.name}"> can't reach into a loop's item. Write {${use.name}} in the text instead.`);
      continue;
    }
    if (root !== use.name && declared.has(root)) {
      messages.push(
        `Line ${use.line}: <${use.tag}> can't use ${use.name}, a list inside ${root}. ` +
        `It works with a page variable's own list, like <Var name="tags" type="array" …>.`
      );
      continue;
    }
    messages.push(
      `Line ${use.line}: <${use.tag}> uses a variable called ${use.name}, but nothing makes one, so it does nothing.` +
      (best ? ` Did you mean ${best.name}?` : ` Add <Var name="${use.name}" initial="…" /> near the top.`)
    );
  }

  for (const { name, line } of mountUses) {
    const made = varLines.get(name);
    if (made !== undefined && made > line) {
      messages.push(`Line ${line}: <OnMount> runs before <Var name="${name}"> on line ${made} is made, so it does nothing to it. Put the <Var> above it.`);
    }
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
  /** Editor compiles only (Words on the preview): where this text is in the source */
  tsRange?: [number, number];
  /** Editor compiles only: where this element's start tag is in the source */
  tsAt?: number;
}

export function astToJson(node: unknown): TemplateNode {
  const typedNode = node as { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: unknown[]; data?: { component?: boolean } };

  if (typedNode.type === 'text') {
    const range = (node as { tsRange?: [number, number] }).tsRange;
    return {
      type: 'text',
      value: typedNode.value,
      ...(range && { tsRange: range }),
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
    const tagAt = (node as { tsAt?: number }).tsAt;
    if (tagAt !== undefined) result.tsAt = tagAt;

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
    // Logic tags render nothing of their own, so they don't count (TEMPLATE_LIMITS)
    const registration = componentRegistry.get(node.tagName);
    if (registration && registration.group !== 'logic') {
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

export function compileTemplate(htmlString: string, options: { positionsIn?: string } = {}): CompilationResult {
  try {
    // Characters, like the save check, so the two agree on the same page
    if (htmlString.length > TEMPLATE_LIMITS.maxChars) {
      return {
        success: false,
        errors: [formatLimitError('size', htmlString.length, TEMPLATE_LIMITS.maxChars)]
      };
    }

    const runaway = runawayPageError(htmlString);
    if (runaway) return { success: false, errors: [runaway] };

    // Pre-validate syntax before parsing
    const syntaxCheck = detectSyntaxErrors(htmlString);
    if (syntaxCheck.errors.length > 0) {
      return {
        success: false,
        errors: syntaxCheck.errors
      };
    }

    // Parse and sanitize
    const hast = parseTemplate(htmlString, options.positionsIn);

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
    if (error instanceof RunawayDepth) return { success: false, errors: [error.message] };
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