/**
 * Owner notes on a placed decoration (pixel homes Phase 5): a few lines the
 * owner writes in the editor's inspector, kept in the decoration's `data` as
 * `note`. On the house page that decoration becomes clickable and the note
 * shows in a panel under the scene.
 *
 * Stored as plain text and shown through the guestbook's renderer
 * (CommentMarkupWithEmojis), so it gets the same sanitising as guestbook
 * entries. The save API cleans it with cleanNote before it's written.
 */

/** Most characters a note keeps. */
export const NOTE_MAX = 200

/** Decorations that already do something when clicked, so they don't take a note. */
export const NO_NOTE_DECORATIONS = new Set(['mailbox'])

// Control characters except newline and tab, and invisible formatting
// characters (zero-width spaces, bidi overrides, line separators)
const CONTROL = new RegExp('[\\u0000-\\u0008\\u000b-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff]', 'g')

/**
 * A note as it's stored: newlines kept (at most one blank line in a row),
 * control and invisible formatting characters dropped, trimmed, at most
 * NOTE_MAX characters. null when nothing is left.
 */
export function cleanNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(CONTROL, '')
    .replace(/[  ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) return null
  const chars = Array.from(text)
  return chars.length > NOTE_MAX ? chars.slice(0, NOTE_MAX).join('').trimEnd() : text
}

/** A placed decoration's note, from the editor's copy or its stored data. */
export function decorationNote(d: { note?: unknown; data?: unknown } | null | undefined): string | undefined {
  if (!d) return undefined
  const raw = d.note ?? (d.data && typeof d.data === 'object' ? (d.data as { note?: unknown }).note : undefined)
  return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined
}

/** Whether this kind of decoration may carry a note. */
export function canHaveNote(decorationId: string): boolean {
  return !NO_NOTE_DECORATIONS.has(decorationId)
}
