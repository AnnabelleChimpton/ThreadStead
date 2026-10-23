/**
 * Link-preview pictures (og:image), each kind built in one place so every
 * page showing the same thing previews it the same way. Safe in the
 * browser; the ones that read the database are in ./server.
 */

/** A link preview's picture (PageMeta's image). Width and height are the file's own, when known. */
export interface PageImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

/** Every card drawn for previews is this size: the shape apps show large. */
export const SHARE_CARD = { width: 1200, height: 630 } as const;

/**
 * A ring's card: its badge, big (pages/api/share/ring/[file].ts). A new
 * badge is a new file name, so previews cached elsewhere refresh.
 */
export function ringShareImage(ring: { slug: string; name: string; badgeImageUrl?: string | null }): PageImage {
  const badgeFile = ring.badgeImageUrl?.startsWith('http') ? ring.badgeImageUrl.split('/').pop() : undefined;
  const version = badgeFile ? `?v=${encodeURIComponent(badgeFile)}` : '';
  return {
    url: `/api/share/ring/${encodeURIComponent(ring.slug)}.png${version}`,
    ...SHARE_CARD,
    alt: `The ${ring.name} ring's badge`,
  };
}
