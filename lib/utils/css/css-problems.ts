import { sanitizeCss } from '@/lib/utils/sanitization/css';

/**
 * What in a page's CSS won't work, for the list under the CSS pane: what the
 * sanitizer takes out, files by an old site's address or http://, and an
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
      `Upload it and use its address (Insert image does this).${more(oldSite.length)}`
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
  return problems;
}
