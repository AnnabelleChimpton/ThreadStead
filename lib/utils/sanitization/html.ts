// lib/sanitize.ts
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({
  breaks: true,
  gfm: true // Enable GitHub Flavored Markdown for better features
});

const ALLOWED_DATA_URI = /^data:image\/[a-zA-Z+]+;base64,/i;

// DOMPurify exempts data: URIs on img/audio/video/image/track (DATA_URI_TAGS)
// from ALLOWED_URI_REGEXP, so e.g. <img src="data:text/html,..."> would survive
// sanitization. This hook enforces the base64-image-only policy on data: URIs.
function enforceDataUriPolicy(_node: unknown, data: { attrName: string; attrValue: string; keepAttr: boolean }) {
  if (data.attrName === "src" || data.attrName === "href") {
    const value = data.attrValue.trim();
    if (/^data:/i.test(value) && !ALLOWED_DATA_URI.test(value)) {
      data.keepAttr = false;
    }
  }
}

export function cleanHtml(input: string) {
  if (!input) return "";
  DOMPurify.addHook("uponSanitizeAttribute", enforceDataUriPolicy);
  try {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        "b","i","em","strong","a","p","ul","ol","li","blockquote","code","pre","br",
        "h1","h2","h3","h4","h5","h6","img","span",
        "table","thead","tbody","tr","th","td","input",
        "sup","sub","section","div"
      ],
      ALLOWED_ATTR: ["href","title","alt","src","class","align","type","checked","disabled","id"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#|data:image\/[a-zA-Z]+;base64,)/i,
      FORBID_TAGS: ["style","script","iframe"],
    });
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute");
  }
}

export function normalizeLinks(html: string) {
  return html.replace(
    /<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi,
    (_m, attrs) => {
      // Don't add target="_blank" to footnote links (internal anchors)
      if (attrs.includes('href="#footnote') || attrs.includes('class="footnote-')) {
        return `<a ${attrs}>`;
      }
      return `<a ${attrs} target="_blank" rel="noopener noreferrer">`;
    }
  );
}

export function cleanAndNormalizeHtml(input: string) {
  return normalizeLinks(cleanHtml(input));
}

function processFootnotes(text: string): string {
  // Process footnote references [^1] and footnote definitions [^1]: content
  let processedText = text;
  const footnoteDefinitions: { [key: string]: string } = {};

  // First, extract all footnote definitions
  const definitionPattern = /^\[\^([^\]]+)\]:\s*(.+)$/gm;
  let definitionMatch;

  while ((definitionMatch = definitionPattern.exec(text)) !== null) {
    const [fullMatch, id, content] = definitionMatch;
    footnoteDefinitions[id] = content.trim();
    // Remove the definition from the main text
    processedText = processedText.replace(fullMatch, '');
  }

  // Then replace footnote references with superscript links
  const referencePattern = /\[\^([^\]]+)\]/g;
  processedText = processedText.replace(referencePattern, (match, id) => {
    return `<sup><a href="#footnote-${id}" id="footnote-ref-${id}" class="footnote-ref">${id}</a></sup>`;
  });

  // Add footnotes section at the end if we have any definitions
  const footnoteIds = Object.keys(footnoteDefinitions);
  if (footnoteIds.length > 0) {
    let footnotesSection = '\n\n<div class="footnotes">\n<hr>\n<ol>\n';

    footnoteIds.forEach(id => {
      footnotesSection += `<li id="footnote-${id}">`;
      // Process the footnote content as markdown
      const processedContent = marked.parse(footnoteDefinitions[id], { async: false }) as string;
      // Remove the wrapping <p> tags for inline content
      const cleanContent = processedContent.replace(/^<p>(.*)<\/p>\s*$/s, '$1');
      footnotesSection += cleanContent;
      footnotesSection += ` <a href="#footnote-ref-${id}" class="footnote-backref">↩</a>`;
      footnotesSection += '</li>\n';
    });

    footnotesSection += '</ol>\n</div>';
    processedText += footnotesSection;
  }

  return processedText;
}

function postProcessTaskLists(html: string): string {
  // Fix task list checkboxes that marked.js doesn't handle properly
  return html
    // Fix unchecked task list items
    .replace(/<li><input disabled="">\s*/g, '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled> ')
    // Fix checked task list items
    .replace(/<li><input checked="" disabled="">\s*/g, '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" checked disabled> ')
    // Add task list class to containing ul
    .replace(/<ul>(\s*<li class="task-list-item">[\s\S]*?)<\/ul>/g, '<ul class="contains-task-list">$1</ul>');
}

export function markdownToSafeHtml(md: string) {
  // NOTE: the previous preserveCustomNumbering / normalizeBulletLists passes
  // were removed — they broke standard markdown. preserveCustomNumbering
  // escaped every "N. " line, so ordered lists never rendered as <ol>;
  // normalizeBulletLists trimmed leading whitespace, flattening nested lists
  // and destroying indentation (and code-block content). marked/GFM handles
  // ordered lists, nested bullets, and indented code correctly on its own.

  // Process footnotes before markdown parsing. Bare-URL auto-linking is left
  // to marked's native GFM autolinker (gfm: true), which correctly skips URLs
  // inside inline/fenced code — unlike the old string-replace pass, which
  // rewrote URLs inside code samples.
  const processedMd = processFootnotes(md ?? "");

  const rawHtml = marked.parse(processedMd, { async: false }) as string;
  const cleanedHtml = cleanAndNormalizeHtml(rawHtml);

  // Post-process task lists to fix checkbox rendering
  return postProcessTaskLists(cleanedHtml);
}
