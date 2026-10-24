import { sanitizeCss } from '@/lib/utils/sanitization/css';

/**
 * What in a page's CSS won't work, for the list under the CSS pane: what the
 * sanitizer takes out, fonts the site won't load (CSP font-src), and an
 * unclosed { or comment, which silently swallows the rest of the file.
 * Messages start "Line N:" when there's a line to point at.
 */
export function cssProblems(css: string): string[] {
  if (!css.trim()) return [];
  const lineAt = (index: number) => css.slice(0, index).split('\n').length;
  const problems: string[] = [];

  for (const what of sanitizeCss(css).removed) {
    const url = what.match(/^@import from (\S+)/)?.[1];
    const at = url ? css.indexOf(url) : -1;
    problems.push(`${at >= 0 ? `Line ${lineAt(at)}: ` : ''}${what} is taken out when you save.`);
  }

  for (const face of css.matchAll(/@font-face\s*\{[^}]*\}/gi)) {
    for (const src of face[0].matchAll(/url\(\s*["']?\s*(?:https?:)?\/\/([^/"')\s]+)/gi)) {
      if (/^fonts\.gstatic\.com$/i.test(src[1])) continue;
      problems.push(
        `Line ${lineAt(face.index! + src.index!)}: the font from ${src[1]} won't load, because fonts here can only come from Google Fonts. ` +
        'Pick one at fonts.google.com and @import it.'
      );
    }
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
  return problems;
}
