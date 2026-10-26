import { sanitizeCss } from '@/lib/utils/sanitization/css';

/**
 * What in a page's CSS won't work, for the list under the CSS pane: what the
 * sanitizer takes out, files by an old site's address or http://, and an
 * unclosed { or comment, which silently swallows the rest of the file, and
 * property names the browser doesn't know (text-color).
 * Messages start "Line N:" when there's a line to point at.
 */
export function cssProblems(css: string, knows: (property: string) => boolean | undefined = browserKnows): string[] {
  if (!css.trim()) return [];
  const lineAt = (index: number) => css.slice(0, index).split('\n').length;
  const problems: string[] = [];

  for (const what of sanitizeCss(css).removed) {
    const url = what.match(/^@import from (\S+)/)?.[1];
    const at = url ? css.indexOf(url) : -1;
    problems.push(`${at >= 0 ? `Line ${lineAt(at)}: ` : ''}${what} is taken out when you save.`);
  }

  // Pictures and fonts by old-site address (url(bg.gif), url(../img/x.png))
  // or http://, which the site asks for as https:// (CSP upgrade-insecure-
  // requests): said once each, with the first line (template audit 01 #5, 08)
  const urls = [...css.matchAll(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/gi)].filter((m) => !/^(?:data:|#|var\()/i.test(m[2]))
  const oldSite = urls.filter((m) => !/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(m[2]))
  const http = urls.filter((m) => /^http:\/\//i.test(m[2]))
  const more = (n: number) => (n > 1 ? ` (${n - 1} more like it too.)` : '');
  if (oldSite.length) {
    problems.push(
      `Line ${lineAt(oldSite[0].index!)}: "${oldSite[0][2]}" is an address on your old site, and here it points at a file that isn't there. ` +
      `Upload it with Insert image and it goes in by its file name (several at once work too).${more(oldSite.length)}`
    );
  }
  if (http.length) {
    problems.push(
      `Line ${lineAt(http[0].index!)}: "${http[0][2]}" starts with http://, so browsers ask for https:// instead, and it won't load if that site has none. ` +
      `Use its https:// address.${more(http.length)}`
    );
  }

  // Braces and comments, skipping strings
  const open: number[] = [];
  let strayClose = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) {
        problems.push(`Line ${lineAt(i)}: this /* comment is never closed, so everything after it is ignored.`);
        break;
      }
      i = end + 1;
    } else if (c === '"' || c === "'") {
      while (++i < css.length && css[i] !== c && css[i] !== '\n') if (css[i] === '\\') i++;
    } else if (c === '{') {
      open.push(i);
    } else if (c === '}' && open.pop() === undefined && !strayClose) {
      strayClose = true;
      problems.push(`Line ${lineAt(i)}: this } has no { to close, so the rule after it is skipped.`);
    }
  }
  if (open.length > 0) {
    problems.push(`Line ${lineAt(open[open.length - 1])}: this { is never closed, so everything after it counts as part of this rule.`);
  }

  // Property names the browser doesn't know do nothing, without a word:
  // text-color looked right and the text stayed the same colour. Said once
  // per name, with its first line
  const unknown = new Map<string, { index: number; count: number }>();
  for (const { property, index } of declaredProperties(css)) {
    if (knows(property) !== false) continue;
    const seen = unknown.get(property);
    if (seen) seen.count++;
    else unknown.set(property, { index, count: 1 });
  }
  for (const [property, { index, count }] of unknown) {
    const meant = MEANT[property] ?? (property.includes('colour') && knows(property.replace(/colour/g, 'color')) ? property.replace(/colour/g, 'color') : undefined);
    problems.push(
      `Line ${lineAt(index)}: your browser doesn't know "${property}", so that line does nothing.` +
      `${meant ? ` Did you mean "${meant}"?` : ''}${more(count)}`
    );
  }
  return problems;
}

/** Names people reach for that CSS spells another way */
const MEANT: Record<string, string> = {
  'text-color': 'color',
  'font-color': 'color',
  'text-colour': 'color',
  'font-colour': 'color',
  'colour': 'color',
  'text-size': 'font-size',
  'font-bold': 'font-weight',
  'text-font': 'font-family',
  'bgcolor': 'background-color',
  'background-colour': 'background-color',
  'align': 'text-align',
  'valign': 'vertical-align',
};

/**
 * Whether this browser knows a property, the way the CSS pane's autocomplete
 * does (@codemirror/lang-css reads document.body.style). Undefined where
 * there's no browser to ask (the server, tests), so nothing is said.
 */
function browserKnows(property: string): boolean | undefined {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return undefined;
  return CSS.supports(property, 'inherit');
}

/** Blocks of descriptors, not properties (src, unicode-range, syntax…) */
const DESCRIPTOR_BLOCKS = /^@(?:font-face|font-feature-values|font-palette-values|counter-style|property|page|view-transition|-?[\w-]*viewport)\b/i;

/**
 * Every declaration's property name and where it is, in rules at any depth
 * (CSS nesting, @media), skipping comments, strings, descriptor blocks,
 * custom properties (--x), vendor prefixes (another browser's) and old IE
 * hacks (*zoom, _height).
 */
function declaredProperties(css: string): { property: string; index: number }[] {
  const found: { property: string; index: number }[] = [];
  const skipping: boolean[] = []; // per open block: inside a descriptor block
  let start = 0; // where the current declaration or prelude starts
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 1;
      if (css.slice(start, i + 1).trim().startsWith('/*')) start = i + 1;
    } else if (c === '"' || c === "'") {
      while (++i < css.length && css[i] !== c && css[i] !== '\n') if (css[i] === '\\') i++;
    } else if (c === '(') {
      let depth = 1;
      while (++i < css.length && depth > 0) if (css[i] === '(') depth++; else if (css[i] === ')') depth--;
      i--;
    } else if (c === '{') {
      const prelude = css.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, '').trim();
      skipping.push((skipping.length > 0 && skipping[skipping.length - 1]) || DESCRIPTOR_BLOCKS.test(prelude));
      start = i + 1;
    } else if (c === ';' || c === '}') {
      if (skipping.length > 0 && !skipping[skipping.length - 1]) {
        const text = css.slice(start, i);
        const m = text.match(/^(\s*(?:\/\*[\s\S]*?\*\/\s*)*)([a-zA-Z][a-zA-Z-]*)\s*:/);
        if (m) found.push({ property: m[2].toLowerCase(), index: start + m[1].length });
      }
      if (c === '}') skipping.pop();
      start = i + 1;
    }
  }
  return found;
}
