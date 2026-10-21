/**
 * Each song gets its own small sound bank (MIDI plan Phase 3): GeneralUser
 * GS trimmed to just the instruments and notes the song uses. A visitor
 * downloads about 0.2 to 3 MB with the song instead of the whole 32 MB bank.
 *
 * Done once, when the song is uploaded (and by
 * scripts/backfill-midi-sound-banks.ts for older songs). Server only.
 */
import fs from 'fs/promises';
import path from 'path';
import { BasicMIDI, SoundBankLoader } from 'spessasynth_core';

export { isSoundBank } from '../is-sound-bank';

/** GeneralUser GS 2.0.3 by S. Christian Collins (licence beside it) */
export const SOURCE_SOUND_BANK = path.join(process.cwd(), 'assets', 'soundfonts', 'GeneralUser-GS.sf2');

function arrayBufferOf(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * The trimmed bank for one MIDI file, as an SF2. Throws when the MIDI
 * can't be read. `source` is for the backfill, which reads the big bank
 * once for many songs.
 */
export async function trimSoundBank(midi: Buffer, source?: Buffer): Promise<Buffer> {
  const song = BasicMIDI.fromArrayBuffer(arrayBufferOf(midi));
  const bank = SoundBankLoader.fromArrayBuffer(arrayBufferOf(source ?? (await fs.readFile(SOURCE_SOUND_BANK))));
  bank.trim(song.getUsedProgramsAndKeys(bank));
  const written = bank.writeSF2({ writeDefaultModulators: true, writeExtendedLimits: true });
  return Buffer.from(await written);
}
