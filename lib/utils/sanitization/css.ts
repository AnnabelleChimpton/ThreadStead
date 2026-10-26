// CSS sanitizer for user and admin CSS, with safe @import support.
//
// Two jobs, used together:
//  - sanitizeCss / cleanCss run on every save path. They take out what a
//    stylesheet must never do (load CSS from untrusted hosts, old IE script
//    hooks, javascript: urls, closing the <style> tag it will sit in) and keep
//    everything else. One bad line never costs the rest of the stylesheet.
//  - escapeCssForStyleTag runs at every place CSS is written into a <style>
//    tag. It protects rows saved before sanitizing covered every path.

// Hosts whose stylesheets may be @imported: Google Fonts only, for now.
const SAFE_IMPORT_HOST = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//i;

// One @import statement: url(...) or a quoted string, then optional media
// queries, up to the semicolon. Quoted URLs may contain ";" (Google Fonts
// weights do), so they're matched as a whole.
const IMPORT_STATEMENT =
  /@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)|"([^"]*)"|'([^']*)')[^;{}]*;?/gi;

export interface CssSanitizeResult {
  css: string;
  /** What was taken out or disabled, in plain words, for the editor to show */
  removed: string[];
}

export function sanitizeCss(input: string): CssSanitizeResult {
  if (!input) return { css: "", removed: [] };

  const removed: string[] = [];
  const imports: string[] = [];

  let rest = input.replace(IMPORT_STATEMENT, (statement, u1, u2, u3, s1, s2) => {
    const url = (u1 ?? u2 ?? u3 ?? s1 ?? s2 ?? "").trim();
    if (SAFE_IMPORT_HOST.test(url)) {
      imports.push(statement.trim().endsWith(";") ? statement.trim() : `${statement.trim()};`);
    } else {
      removed.push(`@import from ${url || "an unknown place"} (only Google Fonts can be imported)`);
    }
    return "";
  });

  // Anything still spelled @import didn't parse as a statement above; the
  // browser would still try it, so turn it into an unknown at-rule it skips.
  rest = rest.replace(/@import\b/gi, () => {
    removed.push("an @import the sanitizer couldn't read");
    return "@x-removed-import";
  });

  const disable = (pattern: RegExp, replacement: string, what: string) => {
    rest = rest.replace(pattern, (...args) => {
      removed.push(what);
      return replacement.replace(/\$1/g, String(args[1] ?? ""));
    });
  };
  disable(/expression\s*\(/gi, "x-removed(", "an expression() (old Internet Explorer scripting)");
  disable(/(?<![\w-])behavior\s*:/gi, "x-removed-ie:", "a behavior: property (old Internet Explorer scripting)");
  disable(/-moz-binding\s*:/gi, "x-removed-moz:", "a -moz-binding property (old Firefox scripting)");
  // Dots or discs over ordinary text: a look-alike password box (template audit 04 L3)
  disable(/-webkit-text-security\s*:/gi, "x-removed-text-security:", "-webkit-text-security (it makes text look like a password box)");
  disable(/url\(\s*(["']?)\s*javascript\s*:/gi, "url($1x-removed:", "a javascript: url");

  // CSS is written into a <style> tag, and the HTML parser ends that tag at
  // the first "</style" no matter where it sits in the CSS. "<\/style" means
  // the same thing to CSS (a backslash-escaped "/"), and nothing to HTML.
  rest = rest.replace(/<\/(style)/gi, "<\\/$1");

  // The imports' own lines went with them: at most one blank line before
  // the rest, so saving again doesn't add another each time (bug bash 2026-10-26)
  const css = imports.length > 0 ? `${imports.join("\n")}\n${rest.replace(/^\n+/, "\n")}` : rest;
  return { css, removed };
}

export function cleanCss(input: string): string {
  return sanitizeCss(input).css;
}

/**
 * Make CSS safe to place inside a <style> tag. HTML ends a style element at
 * "</style" (any case), wherever it appears, and nothing else in a style
 * element means anything to HTML. So only that "<" becomes the CSS escape
 * "\3c " (with its terminating space), which CSS reads as "<" inside strings,
 * urls and content. Every other "<" stays: range media queries need it
 * (`@media (width < 40em)`), and escaping it there made them never match.
 * Use it at every dangerouslySetInnerHTML for a <style>.
 */
export function escapeCssForStyleTag(css: string | null | undefined): string {
  if (!css) return "";
  return css.replace(/<(?=\/style)/gi, "\\3c ");
}
