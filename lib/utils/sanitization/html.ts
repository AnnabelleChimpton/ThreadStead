// lib/sanitize.ts
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({
  breaks: true,
  gfm: true // Enable GitHub Flavored Markdown for better features
});

export function cleanHtml(input: string) {
  if (!input) return "";
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

function preserveCustomNumbering(text: string): string {
  // Pattern to match lines that start with a number followed by a period (custom numbering)
  // This prevents markdown from auto-renumbering intentional custom sequences
  const customNumberPattern = /^(\d+)\.\s/gm;

  return text.replace(customNumberPattern, (match, number) => {
    // Escape the period to prevent markdown list processing
    return `${number}\\. `;
  });
}

function normalizeBulletLists(text: string): string {
  // Ensure bullet lists have consistent spacing and formatting
  const lines = text.split('\n');
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if this line is a bullet point
    if (trimmedLine.match(/^[-*+]\s+/)) {
      // Ensure there's a blank line before the list if the previous line isn't empty or a bullet
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      if (prevLine && !prevLine.match(/^[-*+]\s+/) && processedLines.length > 0) {
        const lastProcessed = processedLines[processedLines.length - 1].trim();
        if (lastProcessed && !lastProcessed.match(/^[-*+]\s+/)) {
          processedLines.push(''); // Add blank line before list
        }
      }

      // Normalize the bullet point (use consistent '-' and single space)
      const content = trimmedLine.replace(/^[-*+]\s+/, '');
      processedLines.push(`- ${content}`);
    } else {
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
}

function autoLinkUrls(text: string): string {
  // Pattern to match URLs that aren't already in markdown link format
  const urlPattern = /(?<![\[(])(https?:\/\/[^\s\)]+)(?![\])])/gi;

  return text.replace(urlPattern, (url) => {
    // Remove trailing punctuation that's probably not part of the URL
    const cleanUrl = url.replace(/[.,!?;:]+$/, '');
    return `[${cleanUrl}](${cleanUrl})`;
  });
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
  // First preserve custom numbering to prevent auto-renumbering
  let processedMd = preserveCustomNumbering(md ?? "");

  // Normalize bullet lists for consistent formatting
  processedMd = normalizeBulletLists(processedMd);

  // Process footnotes before markdown parsing
  processedMd = processFootnotes(processedMd);

  // Then apply auto-linking to plain URLs
  processedMd = autoLinkUrls(processedMd);

  const rawHtml = marked.parse(processedMd, { async: false }) as string;
  const cleanedHtml = cleanAndNormalizeHtml(rawHtml);

  // Post-process task lists to fix checkbox rendering
  return postProcessTaskLists(cleanedHtml);
}
