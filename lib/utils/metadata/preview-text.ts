const PREVIEW_CHARS = 200;

/** One line, short enough for a link preview's description. */
export function previewText(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > PREVIEW_CHARS ? `${line.slice(0, PREVIEW_CHARS - 1).trimEnd()}…` : line;
}
