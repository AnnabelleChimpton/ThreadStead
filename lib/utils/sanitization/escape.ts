/**
 * Escape a string for use as HTML text or a quoted attribute value.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Turn user-written plain text into safe HTML: escape it, then keep line
 * breaks as <br>. Use this anywhere plain text ends up in innerHTML.
 */
export function plainTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}
