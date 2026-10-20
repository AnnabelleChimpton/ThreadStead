/**
 * Media rows that are pictures. GIFs are stored as mediaType 'gif' (so they
 * can be told apart from re-encoded images), MIDI files as 'midi'. Galleries
 * and the editor's image picker show both picture kinds. Safe on the client.
 */
export const PICTURE_MEDIA_TYPES: string[] = ['image', 'gif'];
