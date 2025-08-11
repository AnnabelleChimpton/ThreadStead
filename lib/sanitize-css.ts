// Extremely conservative CSS sanitizer.
// Strips @import, javascript: URLs, expression(), and IE behavior.
// (Good enough for now; we can upgrade with a PostCSS allowlist later.)
export function cleanCss(input: string) {
  if (!input) return "";
  const banned = /(expression\s*\(|@import|url\(\s*(['"]?)\s*javascript:|behavior\s*:)/i;
  return banned.test(input) ? "" : input;
}
