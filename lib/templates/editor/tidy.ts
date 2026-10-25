/**
 * Tidy in the editors' More menu: the HTML or CSS re-indented, two spaces a
 * level. It only changes the spaces at the start of lines, never what's on
 * them, so the page looks the same: a run of spaces after a line break
 * shows as one space either way. Left exactly as written: whatever is
 * inside <pre>, <textarea>, <style> and <script>, comments, and tags whose
 * attributes run over several lines.
 *
 * Loaded only when someone presses Tidy.
 */
import { tokenizeSource, VOID_ELEMENTS, type SourceToken } from '@/lib/templates/compilation/source-scan';

const INDENT = '  ';

/** Their content is text to the browser, kept as written */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);
/** Where the spaces at the start of a line show */
const PREFORMATTED = new Set(['pre', 'listing', 'plaintext', 'textarea']);
const BLOCKS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul',
]);

/** Whether opening `next` closes an open `open` whose end tag was left out, as the browser does */
function closedBy(open: string, next: string): boolean {
  switch (open) {
    case 'li': return next === 'li';
    case 'dt': case 'dd': return next === 'dt' || next === 'dd';
    case 'td': case 'th': return next === 'td' || next === 'th' || next === 'tr';
    case 'tr': return next === 'tr';
    case 'option': return next === 'option' || next === 'optgroup';
    case 'p': return BLOCKS.has(next);
    default: return false;
  }
}

/** Each line's start and end, line break not included */
function lines(source: string): Array<{ start: number; text: string }> {
  let start = 0;
  return source.split('\n').map((text) => {
    const line = { start, text };
    start += text.length + 1;
    return line;
  });
}

export function tidyHtml(source: string): string {
  const tokens = tokenizeSource(source);
  const open: string[] = [];
  /** [start, end) of text that keeps its line starts: raw text, comments, tags over several lines */
  const kept: Array<[number, number]> = [];
  let t = 0;

  const apply = (token: SourceToken) => {
    if (token.type === 'comment' || ((token.type === 'open' || token.type === 'close') && token.unterminated)) {
      kept.push([token.start, token.end]);
    }
    if ((token.type === 'open' || token.type === 'close') && source.slice(token.start, token.end).includes('\n')) {
      kept.push([token.start, token.end]);
    }
    if (token.type === 'open') {
      const name = token.name.toLowerCase();
      const next = tokens[t];
      if (RAW_TEXT.has(name) && next?.type === 'text') kept.push([next.start, next.end]);
      while (open.length > 0 && closedBy(open[open.length - 1], name)) open.pop();
      if (!token.selfClosing && !VOID_ELEMENTS.has(name)) open.push(name);
    } else if (token.type === 'close') {
      const at = open.lastIndexOf(token.name.toLowerCase());
      if (at !== -1) open.length = at;
    }
  };

  return lines(source)
    .map(({ start, text }) => {
      while (t < tokens.length && tokens[t].start < start) apply(tokens[t++]);
      const inside = kept.some(([from, to]) => start > from && start < to) || open.some((name) => PREFORMATTED.has(name));
      if (inside) return text;
      const content = text.trimStart();
      if (!content) return '';
      // A line that starts by closing something, said or implied (a new <li>
      // closes the last), sits level with what it closes
      const first = tokens[t]?.start === start + text.length - content.length ? tokens[t] : undefined;
      let depth = open.length;
      if (first?.type === 'close') {
        const at = open.lastIndexOf(first.name.toLowerCase());
        if (at !== -1) depth = at;
      } else if (first?.type === 'open') {
        while (depth > 0 && closedBy(open[depth - 1], first.name.toLowerCase())) depth--;
      }
      return INDENT.repeat(depth) + content;
    })
    .join('\n');
}

export function tidyCss(source: string): string {
  let depth = 0;
  let comment = false;
  let quote: string | null = null;
  return lines(source)
    .map(({ text }) => {
      const startsInside = comment || quote !== null;
      const content = text.trimStart();
      const level = Math.max(0, content.startsWith('}') ? depth - 1 : depth);
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (comment) {
          if (c === '*' && text[i + 1] === '/') { comment = false; i++; }
        } else if (quote) {
          if (c === '\\') i++;
          else if (c === quote) quote = null;
        } else if (c === '/' && text[i + 1] === '*') { comment = true; i++; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '{') depth++;
        else if (c === '}') depth = Math.max(0, depth - 1);
      }
      if (startsInside) return text;
      return content ? INDENT.repeat(level) + content : '';
    })
    .join('\n');
}
