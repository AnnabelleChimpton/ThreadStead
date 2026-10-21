/**
 * The signup music's sound bank sits beside the admin-uploaded MIDI as
 * <file>.sf2 (lib/audio/sound-bank-url.ts). Made when the music is uploaded,
 * or the first time the signup page asks for it. Server only.
 */
import fs from 'fs';
import { trimSoundBank } from './trim-sound-bank';

// One at a time per file
const making = new Map<string, Promise<boolean>>();

/** Make <midiPath>.sf2 unless it's there. False when it couldn't. */
export function ensureSignupSoundBank(midiPath: string, { remake = false } = {}): Promise<boolean> {
  if (!/\.midi?$/i.test(midiPath)) return Promise.resolve(false);
  if (!remake && fs.existsSync(`${midiPath}.sf2`)) return Promise.resolve(true);
  const running = making.get(midiPath);
  if (running) return running;
  const job = (async () => {
    try {
      const bank = await trimSoundBank(await fs.promises.readFile(midiPath));
      await fs.promises.writeFile(`${midiPath}.sf2`, bank);
      return true;
    } catch (error) {
      console.error("Could not make the signup music's sound bank:", error);
      return false;
    }
  })().finally(() => making.delete(midiPath));
  making.set(midiPath, job);
  return job;
}
