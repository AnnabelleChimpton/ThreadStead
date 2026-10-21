/**
 * The soundfont sampler (MIDI plan Phase 3): spessasynth plays the song
 * through GeneralUser GS, trimmed at upload to the instruments the song uses
 * (lib/audio/server/trim-sound-bank.ts). It's the same kind of sound as the
 * 1990s Windows/Roland GS wavetable that web MIDI used to play through:
 * samples, GS drum kits, reverb and chorus, and the whole MIDI file
 * (volume, pan, expression, sustain, pitch bend).
 *
 * Synthesis and sequencing run on the audio thread (an AudioWorklet), so
 * a busy page can't make notes late, and there's nothing to build before
 * the first note.
 */
import type { MidiEngine, SongFiles } from '../engine';

/**
 * The audio-thread half of spessasynth_lib, copied from the package into
 * public/ (a test keeps the copy identical to the installed version).
 */
export const SAMPLER_PROCESSOR_URL = '/audio/spessasynth_processor-4.3.14.min.js';

/**
 * GeneralUser GS plays 4–11 dB quieter than the old synth did at the same
 * volume. +3.5 dB closes most of that while the loudest test song still
 * peaks at 0.84 at full volume, short of clipping.
 */
export const SAMPLER_MAKEUP_GAIN = 1.5;

/** How long the sampler gets to start before the old synth plays the song instead */
export const SAMPLER_START_TIMEOUT_MS = 10000;

function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The sampler didn’t start')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

// A worklet module is registered once per context
const registered = new WeakMap<BaseAudioContext, Promise<void>>();

function registerProcessor(ctx: BaseAudioContext): Promise<void> {
  let ready = registered.get(ctx);
  if (!ready) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('This browser can’t play the sampler'));
    ready = ctx.audioWorklet.addModule(SAMPLER_PROCESSOR_URL);
    ready.catch(() => registered.delete(ctx));
    registered.set(ctx, ready);
  }
  return ready;
}

export async function createSampler(ctx: AudioContext, output: AudioNode): Promise<MidiEngine> {
  const { WorkletSynthesizer, Sequencer } = await import('spessasynth_lib');
  const { BasicMIDI } = await import('spessasynth_core');
  await within(registerProcessor(ctx), SAMPLER_START_TIMEOUT_MS);

  const synth = new WorkletSynthesizer(ctx);
  const makeup = ctx.createGain();
  makeup.gain.value = SAMPLER_MAKEUP_GAIN;
  makeup.connect(output);
  synth.connect(makeup);
  let sequencer: InstanceType<typeof Sequencer> | null = null;
  let duration = 0;
  let loop = false;
  let playing = false;
  let pausedAt = 0;
  let ended: (() => void) | null = null;
  let disposed = false;
  // The library's docs say -1 loops forever, but its audio thread only
  // loops while the count is above 0 (and counts down unless Infinity)
  const loopCount = () => (loop ? Infinity : 0);

  const position = () => {
    if (!sequencer || !playing) return pausedAt;
    return Math.min(duration, Math.max(0, sequencer.currentHighResolutionTime));
  };

  return {
    async load({ midi, bank }: SongFiles) {
      if (!bank) throw new Error('This song has no sound bank');
      // Read it here first: a broken file says so before anything reaches
      // the audio thread, and the length is known straight away
      let song: InstanceType<typeof BasicMIDI>;
      try {
        song = BasicMIDI.fromArrayBuffer(midi);
      } catch {
        throw new Error('This file isn’t a MIDI song we can read');
      }
      if (!song.tracks.length || !(song.duration > 0)) throw new Error('This file has no playable tracks');
      // If the audio thread never answers (a page whose security policy
      // blocks its decoder, say), the store falls back to the old synth
      await within(
        synth.soundBankManager.addSoundBank(bank, 'main').then(() => synth.isReady),
        SAMPLER_START_TIMEOUT_MS
      );
      if (disposed) return;
      sequencer = new Sequencer(synth);
      sequencer.loopCount = loopCount();
      sequencer.eventHandler.addEvent('songEnded', 'threadstead', () => {
        playing = false;
        pausedAt = duration;
        ended?.();
      });
      sequencer.loadNewSongList([song]);
      sequencer.pause();
      duration = song.duration;
      pausedAt = 0;
    },
    get duration() {
      return duration;
    },
    async play(from: number) {
      if (!sequencer || disposed || ctx.state !== 'running') return false;
      sequencer.currentTime = from;
      sequencer.play();
      playing = true;
      return true;
    },
    pause() {
      const at = position();
      sequencer?.pause();
      playing = false;
      pausedAt = at;
      return at;
    },
    position,
    setLoop(next: boolean) {
      loop = next;
      if (sequencer) sequencer.loopCount = loopCount();
    },
    onEnded(callback: () => void) {
      ended = callback;
    },
    dispose() {
      disposed = true;
      playing = false;
      sequencer?.pause();
      try {
        synth.disconnect();
        makeup.disconnect();
      } catch { /* already gone */ }
      synth.destroy();
    },
  };
}
