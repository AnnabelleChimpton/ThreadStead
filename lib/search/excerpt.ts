/**
 * Plain-text excerpts for search results.
 *
 * Post bodies are stored as HTML/markdown and bodyText isn't always clean, so
 * excerpts used to show `&nbsp;`, raw tags and image remnants like
 * `!IMG_0980.png`.
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  middot: '·',
  bull: '•',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      // Drop control characters and invalid code points rather than render them.
      return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? '';
  });
}

const IMAGE_EXT = '(?:png|jpe?g|gif|webp|avif|bmp|svg|heic)';

/** HTML or markdown (or already-plain text) → one line of readable text. */
export function toPlainText(input: string): string {
  return decodeEntities(
    input
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      // markdown images: ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      // image remnants left behind when markdown images were flattened: !IMG_0980.png
      .replace(new RegExp(`!?\\S+\\.${IMAGE_EXT}\\b`, 'gi'), ' ')
      // links: keep the text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/\*([^*\n]+)\*/g, '$1')
      // _italic_ only at word edges, so snake_case survives
      .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1$2')
      .replace(/`([^`]+)`/g, '$1')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** ~150 chars of context around the first match of `query`, else the start. */
export function buildExcerpt(text: string, query: string, radius = 75): string | undefined {
  const clean = toPlainText(text);
  if (!clean) return undefined;

  const max = radius * 2;
  const at = clean.toLowerCase().indexOf(query.toLowerCase());
  if (at !== -1 && clean.length > max) {
    const start = Math.max(0, at - radius);
    const end = Math.min(clean.length, at + query.length + radius);
    return (start > 0 ? '…' : '') + clean.slice(start, end).trim() + (end < clean.length ? '…' : '');
  }
  return clean.length > max ? clean.slice(0, max).trim() + '…' : clean;
}
