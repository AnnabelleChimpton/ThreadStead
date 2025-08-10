import DOMPurify from "isomorphic-dompurify";

export function cleanHtml(input: string) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "b","i","em","strong","a","p","ul","ol","li","blockquote","code","pre","br","img","h1","h2","h3"
    ],
    ALLOWED_ATTR: ["href","title","alt","src"],
    ALLOW_DATA_ATTR: false,
  });
}
