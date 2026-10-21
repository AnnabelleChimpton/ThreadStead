/**
 * @jest-environment node
 *
 * The sampler, rendered offline (MIDI plan Phase 4): spessasynth_core is the
 * same engine the browser runs in its audio worklet, here with a song's own
 * trimmed bank. Checks what the old synth got wrong: drums that sound like
 * drums, on the beat, and a loop that comes round on time.
 */
import fs from 'fs';
import { Midi } from '@tonejs/midi';
import { BasicMIDI, SoundBankLoader, SpessaSynthProcessor, SpessaSynthSequencer } from 'spessasynth_core';
import { SOURCE_SOUND_BANK, trimSoundBank } from '../trim-sound-bank';

const RATE = 44100;
const source = fs.readFileSync(SOURCE_SOUND_BANK);
const arrayBufferOf = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

/** Render `seconds` of the song through its own trimmed bank; mono mix */
async function render(midi: Buffer, seconds: number, { loop = false } = {}): Promise<Float32Array> {
  const bank = await trimSoundBank(midi, source);
  const synth = new SpessaSynthProcessor(RATE, { effectsEnabled: false });
  synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(arrayBufferOf(bank)), 'main');
  await synth.processorInitialized;
  const sequencer = new SpessaSynthSequencer(synth);
  sequencer.loopCount = loop ? Infinity : 0;
  sequencer.loadNewSongList([BasicMIDI.fromArrayBuffer(arrayBufferOf(midi))]);
  sequencer.play();
  const length = Math.round(RATE * seconds);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i += 128) {
    sequencer.processTick();
    synth.process(left, right, i, Math.min(128, length - i));
  }
  return left.map((l, i) => (l + right[i]) / 2);
}

/** Loudness (RMS) of [from, to) seconds */
function level(audio: Float32Array, from: number, to: number) {
  const a = Math.max(0, Math.round(from * RATE));
  const b = Math.min(audio.length, Math.round(to * RATE));
  let sum = 0;
  for (let i = a; i < b; i++) sum += audio[i] * audio[i];
  return Math.sqrt(sum / Math.max(1, b - a));
}

/** When the hit near `t` starts: the first 2 ms frame above a third of the hit's peak */
function onsetNear(audio: Float32Array, t: number) {
  const frame = 0.002;
  const peak = Math.max(...Array.from({ length: 50 }, (_, k) => level(audio, t + k * frame, t + (k + 1) * frame)));
  for (let x = t - 0.03; x < t + 0.1; x += frame) {
    if (level(audio, x, x + frame) > peak / 3) return x;
  }
  return Infinity;
}

/** Hits on the GM drum channel (10), one a second; the song ends at `end` */
function drumSong(hits: Array<[number, number]>, end: number) {
  const midi = new Midi();
  midi.header.setTempo(120);
  const drums = midi.addTrack();
  drums.channel = 9;
  for (const [time, key] of hits) drums.addNote({ midi: key, time, duration: 0.1, velocity: 0.9 });
  // A silent note that marks where the song ends (where a loop comes round)
  midi.addTrack().addNote({ midi: 60, time: end - 0.01, duration: 0.01, velocity: 0.001 });
  return Buffer.from(midi.toArray());
}

test('drums sound, on the beat (kick, snare, hi-hat)', async () => {
  // Starts on its first hit: the sequencer skips leading silence, as in the browser
  const hits: Array<[number, number]> = [[0, 36], [1, 38], [2, 42]];
  const audio = await render(drumSong(hits, 3), 3);
  for (const [time] of hits) {
    expect(level(audio, time, time + 0.05)).toBeGreaterThan(0.01);
    expect(Math.abs(onsetNear(audio, time) - time)).toBeLessThan(0.01);
    // Each hit dies away before the next: drums, not held tones
    if (time > 0) expect(level(audio, time - 0.06, time - 0.02)).toBeLessThan(level(audio, time, time + 0.05) / 4);
  }
});

test('a looping song comes round on time, again and again', async () => {
  // Two kicks in a 2-second song, played for 6 seconds: the loop seams are at 2 s and 4 s
  const audio = await render(drumSong([[0, 36], [1, 36]], 2), 6, { loop: true });
  for (const time of [0, 1, 2, 3, 4, 5]) {
    expect(level(audio, time, time + 0.05)).toBeGreaterThan(0.01);
    expect(Math.abs(onsetNear(audio, time) - time)).toBeLessThan(0.01);
  }
});

test('a song that doesn’t loop goes quiet after its end', async () => {
  const audio = await render(drumSong([[0, 36], [1, 36]], 2), 4);
  expect(level(audio, 0, 0.05)).toBeGreaterThan(0.01);
  expect(level(audio, 3, 4)).toBeLessThan(0.001);
});

test('a melody keeps its pitch (no drift, no vibrato sweep)', async () => {
  const midi = new Midi();
  const piano = midi.addTrack();
  piano.instrument.number = 0;
  piano.addNote({ midi: 69, time: 0, duration: 2 }); // A4, 440 Hz
  const audio = await render(Buffer.from(midi.toArray()), 2);
  // Autocorrelation over 0.1 s: the lag that best matches the wave is one period
  const pitch = (from: number) => {
    const a = Math.round(from * RATE);
    const n = Math.round(0.1 * RATE);
    let best = 0;
    let bestLag = 0;
    for (let lag = Math.floor(RATE / 600); lag <= Math.ceil(RATE / 300); lag++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += audio[a + i] * audio[a + i + lag];
      if (sum > best) { best = sum; bestLag = lag; }
    }
    return RATE / bestLag;
  };
  const early = pitch(0.3);
  const late = pitch(1.5);
  expect(Math.abs(early - 440)).toBeLessThan(440 * 0.03);
  expect(Math.abs(late - early)).toBeLessThan(440 * 0.01);
});
