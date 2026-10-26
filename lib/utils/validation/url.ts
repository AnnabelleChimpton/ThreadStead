/**
 * Whether text is a web address a link can point at: http or https, and
 * nothing else. new URL() alone takes javascript:, data: and the rest, so
 * a crafted blogroll entry or bookmark was stored as a link.
 */
export const URL_MAX_LENGTH = 500;

export function isHttpUrl(text: unknown): text is string {
  if (typeof text !== 'string' || text.length > URL_MAX_LENGTH) return false;
  try {
    const { protocol } = new URL(text);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
