/**
 * @jest-environment node
 *
 * The signup music's bank beside its MIDI, made with the real trim.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Midi } from '@tonejs/midi';
import { ensureSignupSoundBank } from '../signup-sound-bank';
import { isSoundBank } from '../../is-sound-bank';

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signup-bank-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

function writeSong(name: string) {
  const midi = new Midi();
  midi.addTrack().addNote({ midi: 60, time: 0, duration: 1 });
  const file = path.join(dir, name);
  fs.writeFileSync(file, Buffer.from(midi.toArray()));
  return file;
}

test('makes <file>.sf2 beside the MIDI, once', async () => {
  const song = writeSong('welcome.mid');
  expect(await ensureSignupSoundBank(song)).toBe(true);
  const bank = fs.readFileSync(`${song}.sf2`);
  expect(isSoundBank(bank)).toBe(true);

  const made = fs.statSync(`${song}.sf2`).mtimeMs;
  expect(await ensureSignupSoundBank(song)).toBe(true);
  expect(fs.statSync(`${song}.sf2`).mtimeMs).toBe(made);
});

test('an MP3 needs no bank', async () => {
  expect(await ensureSignupSoundBank(path.join(dir, 'welcome.mp3'))).toBe(false);
});

test('a file that isn’t really MIDI gets no bank, and says so', async () => {
  const fake = path.join(dir, 'fake.mid');
  fs.writeFileSync(fake, '<html>');
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(await ensureSignupSoundBank(fake)).toBe(false);
  expect(fs.existsSync(`${fake}.sf2`)).toBe(false);
  error.mockRestore();
});
