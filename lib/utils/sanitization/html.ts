// lib/sanitize.ts
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ breaks: true });

export function cleanHtml(input: string) {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "b","i","em","strong","a","p","ul","ol","li","blockquote","code","pre","br",
      "h1","h2","h3","h4","h5","h6","img","span"
    ],
    ALLOWED_ATTR: ["href","title","alt","src","class"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#|data:image\/[a-zA-Z]+;base64,)/i,
    FORBID_TAGS: ["style","script","iframe"],
  });
}

export function normalizeLinks(html: string) {
  return html.replace(
    /<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi,
    (_m, attrs) => `<a ${attrs} target="_blank" rel="noopener noreferrer">`
  );
}

export function cleanAndNormalizeHtml(input: string) {
  return normalizeLinks(cleanHtml(input));
}

export function markdownToSafeHtml(md: string) {
  const rawHtml = marked.parse(md ?? "", { async: false }) as string;
  return cleanAndNormalizeHtml(rawHtml);
}
