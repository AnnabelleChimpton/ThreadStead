/**
 * Where a song's trimmed sound bank lives (MIDI plan Phase 3), worked out
 * from the song's own address so no player needs another prop:
 *
 * - a member's song, /api/media/serve/<id>, has /api/media/serve/<id>?bank=1
 * - the signup music, /uploads/admin/<file>.mid, has <file>.mid.sf2 beside it
 *
 * Anything else has none, and can't be played.
 */
export function soundBankUrlFor(midiUrl: string): string | null {
  if (/^\/api\/media\/serve\/[^/?#]+$/.test(midiUrl)) return `${midiUrl}?bank=1`;
  if (/^\/uploads\/admin\/[^/?#]+\.midi?$/i.test(midiUrl)) return `${midiUrl}.sf2`;
  return null;
}
