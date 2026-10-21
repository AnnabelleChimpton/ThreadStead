/**
 * A member's song's sound bank, made and stored (MIDI plan Phases 3–4).
 * Upload makes it straight away; this makes it for a song that doesn't have
 * one yet, the first time someone plays it, and for the backfill. Server
 * only.
 */
import { db } from '@/lib/config/database/connection';
import { keyFromPublicUrl, putObject, readStoredObject } from '@/lib/storage/r2';
import { trimSoundBank } from './trim-sound-bank';

/** media/<user>/<time>.mid → media/<user>/<time>.sf2, beside the song (as upload names it) */
export function soundBankKeyFor(songUrl: string): string | null {
  const key = keyFromPublicUrl(songUrl);
  return key ? `${key.replace(/\.[^./]+$/, '')}.sf2` : null;
}

// One at a time per song: two first plays at once make it once
const making = new Map<string, Promise<{ url: string; bank: Buffer }>>();

/**
 * Trim, store and record the bank for one song. Throws when the song isn't
 * in our storage, is missing, or isn't a MIDI that can be read.
 */
export function makeSongSoundBank(
  song: { id: string; fullUrl: string },
  source?: Buffer
): Promise<{ url: string; bank: Buffer }> {
  const running = making.get(song.id);
  if (running) return running;
  const job = (async () => {
    const key = soundBankKeyFor(song.fullUrl);
    if (!key) throw new Error(`Not in our storage: ${song.fullUrl}`);
    const midi = await readStoredObject(song.fullUrl);
    if (!midi) throw new Error('The song file is missing');
    const bank = await trimSoundBank(midi, source);
    const url = await putObject({ key, body: bank, contentType: 'application/octet-stream' });
    await db.media.update({ where: { id: song.id }, data: { soundBankUrl: url } });
    return { url, bank };
  })().finally(() => making.delete(song.id));
  making.set(song.id, job);
  return job;
}
