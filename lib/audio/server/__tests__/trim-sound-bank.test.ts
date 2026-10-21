/**
 * @jest-environment node
 *
 * A song's own sound bank: GeneralUser GS trimmed to what the song plays.
 */
import fs from 'fs';
import { Midi } from '@tonejs/midi';
import { SoundBankLoader } from 'spessasynth_core';
import { isSoundBank, SOURCE_SOUND_BANK, trimSoundBank } from '../trim-sound-bank';

function song(): Buffer {
  const midi = new Midi();
  const strings = midi.addTrack();
  strings.instrument.number = 48; // String Ensemble 1
  strings.addNote({ midi: 60, time: 0, duration: 1 });
  strings.addNote({ midi: 64, time: 1, duration: 1 });
  const drums = midi.addTrack();
  drums.channel = 9;
  drums.addNote({ midi: 36, time: 0, duration: 0.2 }); // kick
  return Buffer.from(midi.toArray());
}

const source = fs.readFileSync(SOURCE_SOUND_BANK);

test('the source bank is in the repo (GeneralUser GS, 32 MB)', () => {
  expect(isSoundBank(source)).toBe(true);
  expect(source.length).toBeGreaterThan(30e6);
});

test('a song gets a small bank with just its instruments', async () => {
  const bank = await trimSoundBank(song(), source);
  expect(isSoundBank(bank)).toBe(true);
  expect(bank.length).toBeLessThan(source.length / 10);

  const loaded = SoundBankLoader.fromArrayBuffer(bank.buffer.slice(bank.byteOffset, bank.byteOffset + bank.byteLength) as ArrayBuffer);
  const programs = loaded.presets.map((p) => `${p.isGMGSDrum ? 'drums' : p.program}`);
  expect(programs).toEqual(expect.arrayContaining(['48', 'drums']));
  expect(loaded.presets.length).toBeLessThan(5);
});

test('reads the source bank itself when not handed one', async () => {
  const bank = await trimSoundBank(song());
  expect(isSoundBank(bank)).toBe(true);
});

test('a file that isn’t MIDI is refused', async () => {
  await expect(trimSoundBank(Buffer.from('<html>not a song</html>'), source)).rejects.toThrow();
});

test('isSoundBank wants RIFF … sfbk', () => {
  expect(isSoundBank(Buffer.from('RIFF\0\0\0\0sfbk'))).toBe(true);
  expect(isSoundBank(Buffer.from('RIFF\0\0\0\0WAVE'))).toBe(false);
  expect(isSoundBank(Buffer.from('MThd'))).toBe(false);
});
