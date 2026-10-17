/**
 * Safe serialization for JSON-LD injected into <script type="application/ld+json">.
 *
 * JSON.stringify does not escape "<", so any user-controlled string reaching
 * structured data can close the script element and inject markup:
 *
 *   ring.name = '</script><img src=x onerror=...>'
 *
 * A <script> is an HTML raw-text element: the parser looks for the literal
 * "</script" and nothing else, so escaping "<" is what actually closes the hole.
 * ">" and "&" are escaped too (cheap, and covers "<!--" style parser confusion),
 * and U+2028/U+2029 are escaped because they are raw line terminators in older
 * JS parsers that consume JSON-LD.
 *
 * Every replacement emits a standard JSON \uXXXX escape, so the output is still
 * valid JSON and still parses to the identical object — crawlers see no
 * difference. Order is safe: the \uXXXX replacements introduce no new "<", ">"
 * or "&" characters, so no pass can re-trigger a later one.
 */

const LINE_SEPARATOR = "\u2028";
const PARAGRAPH_SEPARATOR = "\u2029";

const JSON_LD_ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

const JSON_LD_UNSAFE = /[<>&\u2028\u2029]/g;

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data ?? null).replace(
    JSON_LD_UNSAFE,
    (char) => JSON_LD_ESCAPES[char]
  );
}
