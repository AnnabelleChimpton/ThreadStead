import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { html as htmlSchema } from 'property-information';
import type { Root } from 'hast';
import { componentRegistry } from '../core/template-registry';
import { getAllowedAttributes } from '../core/attribute-mappings';
import { TEMPLATE_LIMITS, formatLimitError, checkWarningThresholds } from './template-limits';
import {
  COMPONENT_TAG_PREFIX,
  lineAt,
  looksLikeComponentName,
  prepareSourceForParse,
  tokenizeSource,
} from './source-scan';
import { extractDocument, type DocumentHead } from './document-head';
import {
  ELEMENT_ATTRIBUTES,
  GLOBAL_ATTRIBUTES,
  HTML_AUTHORING_TAGS,
  ID_REFERENCE_ATTRIBUTES,
  STRIPPED_WITH_CONTENT,
  SVG_ATTRIBUTES,
  SVG_TAGS,
} from './html-allowlist';

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
        for (const propName of Object.keys(registration.props)) {
          const lower = propName.toLowerCase();
          const kebab = propName.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
          propAttrs.push(propName);
          if (lower !== propName) propAttrs.push(lower);
          if (kebab !== propName && kebab !== lower) propAttrs.push(kebab);
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

  for (const token of tokenizeSource(htmlString)) {
    if (token.type !== 'open' && token.type !== 'close') continue;
    const line = lineAt(htmlString, token.start);

    if (token.type === 'open' && (token.unterminated || token.strayQuote)) {
      errors.push(
        `Line ${line}: Unclosed quote in <${token.name}> attributes.\n` +
        `  ${lineText(line)}\n` +
        `Tip: Make sure all attribute values have matching quotes`
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
        : lower === 'iframe' || lower === 'frame' || lower === 'frameset' || lower === 'embed' || lower === 'object' || lower === 'applet'
          ? 'Removed for safety: pages here can’t embed other sites or plugins.'
          : 'Removed for safety.';
    return { category: 'safety', reason };
  }
  if (looksLikeComponentName(name)) {
    return {
      category: 'unsupported',
      reason: 'Unknown component (not registered in template system). Check the spelling; component names are case-sensitive.',
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
 *  - autoplay only survives on muted media.
 */
function finishSanitizedTree(node: HastLike): void {
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
    }
  }
  node.children?.forEach(finishSanitizedTree);
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
  let processedHtml = prepareSourceForParse(document.body, isRegisteredComponent);

  // Detect if we have multiple root-level components after conversion and wrap them
  const trimmedHtml = processedHtml.trim();
  const hasMultipleRootElements = /<[^>]+><\/[^>]+>[\s\S]*<[^>]+><\/[^>]+>/.test(trimmedHtml) &&
                                  !trimmedHtml.startsWith('<div') &&
                                  !trimmedHtml.startsWith('<section') &&
                                  !trimmedHtml.startsWith('<main');

  if (hasMultipleRootElements) {
    processedHtml = `<div>${processedHtml}</div>`;
  }

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
  finishSanitizedTree(processed as HastLike);

  const strippedComponents = reportStrippedTags(htmlString, processed, document.head);

  // Validate component attributes against registry
  const attributeWarnings = validateComponentAttributes(processed);

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

  if (document.isFullDocument || document.head.fontImports.length > 0) {
    result._documentHead = document.head;
  }

  return result;
}

// Validate component attributes against registry definitions
function validateComponentAttributes(node: any, warnings: string[] = [], lineNumber = 0): string[] {
  if (node.tagName && node.data?.component) {
    // Only component tags (marked by finishSanitizedTree); <select> is HTML
    const componentDef = componentRegistry.get(node.tagName);

    if (componentDef && componentDef.props) {
      const props = node.properties || {};

      // Validate each attribute
      Object.entries(props).forEach(([attrName, attrValue]) => {
        const propDef = componentDef.props![attrName];

        if (!propDef) {
          // Unknown attribute - skip (might be universal props like class, id, style)
          return;
        }

        // Validate enum values
        if (propDef.type === 'enum' && propDef.values) {
          const value = String(attrValue);
          if (!propDef.values.includes(value)) {
            // Use the original component name for display (capitalize if needed)
            const displayName = componentDef.name || node.tagName;
            warnings.push(
              `<${displayName}> has invalid "${attrName}" value: "${value}".\n` +
              `  Valid values are: ${propDef.values.join(', ')}\n` +
              `  Tip: Check the component documentation for allowed values`
            );
          }
        }

        // Validate required attributes
        if (propDef.required && (attrValue === undefined || attrValue === null || attrValue === '')) {
          const displayName = componentDef.name || node.tagName;
          warnings.push(
            `<${displayName}> is missing required attribute "${attrName}"`
          );
        }
      });

      // Check for missing required attributes
      if (componentDef.props) {
        Object.entries(componentDef.props).forEach(([propName, propDef]) => {
          if (propDef.required && !(propName in props)) {
            const displayName = componentDef.name || node.tagName;
            warnings.push(
              `<${displayName}> is missing required attribute "${propName}"`
            );
          }
        });
      }
    }
  }

  // Recursively validate children
  if (node.children) {
    node.children.forEach((child: any) => {
      validateComponentAttributes(child, warnings, lineNumber);
    });
  }

  return warnings;
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
    const children = typedNode.children?.map(astToJson) || [];

    // Check if we have a single auto-added div wrapper to unwrap
    if (children.length === 1 &&
        children[0].type === 'element' &&
        children[0].tagName === 'div' &&
        !children[0].component) {

      const divElement = children[0];
      const hasEmptyProperties = !divElement.properties || Object.keys(divElement.properties).length === 0;
      const hasMultipleChildren = divElement.children && divElement.children.length > 1;

      if (hasEmptyProperties && hasMultipleChildren) {
        // This looks like our auto-added wrapper, unwrap it
        const divChildren = divElement.children?.filter((child) =>
          child.type !== 'text' || (child.value && child.value.trim())
        ) || [];

        return {
          type: 'root',
          children: divChildren
        };
      }
    }
    
    return {
      type: 'root',
      children: children
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
    nodeCount: number;
    maxDepth: number;
    componentCounts: Record<string, number>;
  };
}

function countNodes(node: TemplateNode, depth = 0): { count: number; maxDepth: number } {
  let count = 1;
  let maxDepth = depth;

  if (node.children) {
    for (const child of node.children) {
      const childResult = countNodes(child, depth + 1);
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

  // Count nodes and depth
  const { count: nodeCount, maxDepth } = countNodes(ast);

  // Count components
  const componentCounts = countComponents(ast);
  const totalComponents = Object.values(componentCounts).reduce((sum, count) => sum + count, 0);

  // Check hard limits (Phase 3: Using centralized limit management)
  if (nodeCount > TEMPLATE_LIMITS.maxNodes) {
    errors.push(formatLimitError('nodes', nodeCount, TEMPLATE_LIMITS.maxNodes));
  }

  if (maxDepth > TEMPLATE_LIMITS.maxDepth) {
    errors.push(formatLimitError('depth', maxDepth, TEMPLATE_LIMITS.maxDepth));
  }

  if (totalComponents > TEMPLATE_LIMITS.maxComponents) {
    errors.push(formatLimitError('components', totalComponents, TEMPLATE_LIMITS.maxComponents));
  }

  // Check warning thresholds (Phase 3: Soft limits)
  const thresholdWarnings = checkWarningThresholds({
    nodes: nodeCount,
    depth: maxDepth,
    components: totalComponents,
  });
  warnings.push(...thresholdWarnings);

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
    // Check size limit (Phase 3: Using centralized limit management)
    const sizeBytes = new Blob([htmlString]).size;
    const sizeKB = sizeBytes / 1024;
    const maxKB = TEMPLATE_LIMITS.maxSizeBytes / 1024;

    if (sizeBytes > TEMPLATE_LIMITS.maxSizeBytes) {
      return {
        success: false,
        errors: [formatLimitError('size', Math.round(sizeKB), Math.round(maxKB))]
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

    // Add size warning check (Phase 3)
    const sizeWarnings = checkWarningThresholds({ sizeBytes });
    if (sizeWarnings.length > 0 && validation.warnings) {
      validation.warnings.push(...sizeWarnings);
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