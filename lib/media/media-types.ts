/**
 * Media rows that are pictures. GIFs are stored as mediaType 'gif' (so they
 * can be told apart from re-encoded images), MIDI files as 'midi'. Galleries
 * and the editor's image picker show both picture kinds. Safe on the client.
 */
export const PICTURE_MEDIA_TYPES: string[] = ['image', 'gif'];

/**
 * Pictures the upload routes keep in their own format, so the browser sends
 * them as they are: GIFs keep their animation, PNG and WebP their
 * transparency and exact pixels (pixel art). The server re-renders the sizes
 * it needs and enforces its own byte limit. Everything else (JPEG photos,
 * HEIC, which browsers can't show) is compressed to JPEG in the browser first.
 * Goes by the MIME type only: a file without one is compressed as before.
 */
export const UPLOAD_AS_IS_TYPES: readonly string[] = ['image/png', 'image/webp', 'image/gif'];

export function uploadsAsIs(file: { type: string }): boolean {
  return UPLOAD_AS_IS_TYPES.includes(file.type);
}

/**
 * Avatars: PNG and WebP go up as they are and come back as transparent PNGs
 * (renderAvatarSizes). Avatars are never animated, so a GIF is still
 * flattened to a JPEG still in the browser where it's allowed at all.
 */
export function avatarUploadsAsIs(file: { type: string }): boolean {
  return file.type === 'image/png' || file.type === 'image/webp';
}
