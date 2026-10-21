/**
 * The one song playing on this page (MIDI plan Phase 2). Every MidiPlayer
 * is a remote for it, and so is the signup music:
 *
 * - Two players of the same song (two <ProfileMusic /> tags) show the same
 *   state and never play it twice over each other.
 * - Going from one profile to another, the old song's engine is disposed
 *   and the new one loaded; there's no per-component audio graph left to go
 *   stale (that left a silent player saying "Stop").
 * - It plays through the tab's one AudioContext (lib/audio/context.ts).
 *
 * Players claim a song while they're on the page and release it when they
 * go; when nothing holds it any more it stops. The song's sound bank is
 * fetched alongside it (sound-bank-url.ts), and the engine loads only when a
 * song does, so it stays out of every other page.
 */
import type { MidiEngine, SongFiles } from './engine';
import { audioIsRunning, getAudioContext, unlockAudio } from './context';
import { soundBankUrlFor } from './sound-bank-url';
import { isSoundBank } from './is-sound-bank';

export type NowPlayingStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';
export type NowPlayingOwner = 'profile' | 'signup';
/** The soundfont sampler, or the old synth for a song without a sound bank */
export type EngineKind = 'sampler' | 'legacy';

export interface NowPlayingState {
  url: string | null;
  title: string;
  owner: NowPlayingOwner | null;
  status: NowPlayingStatus;
  error: string | null;
  /** Seconds; 0 until loaded */
  duration: number;
  loop: boolean;
  /** Which engine is playing it, once loaded */
  engine: EngineKind | null;
}

export type EngineFactory = (ctx: AudioContext, output: AudioNode, kind: EngineKind) => MidiEngine | Promise<MidiEngine>;

const IDLE: NowPlayingState = {
  url: null,
  title: '',
  owner: null,
  status: 'idle',
  error: null,
  duration: 0,
  loop: false,
  engine: null,
};

let state: NowPlayingState = IDLE;
const listeners = new Set<() => void>();
let engine: MidiEngine | null = null;
let loading: Promise<void> | null = null;
let starting: { promise: Promise<boolean>; generation: number } | null = null;
// Bumped by every new song or clear: a load that finishes late is dropped
let generation = 0;
let holders = 0;
let output: { fade: GainNode; out: GainNode } | null = null;
let volume = 0.5;
let muted = false;

let createEngine: EngineFactory = async (ctx, out, kind) => {
  if (kind === 'sampler') {
    const { createSampler } = await import('./engines/sampler');
    return createSampler(ctx, out);
  }
  const { createLegacySynth } = await import('./engines/legacy-synth');
  return createLegacySynth(ctx, out);
};

function set(patch: Partial<NowPlayingState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): NowPlayingState {
  return state;
}

export function getServerSnapshot(): NowPlayingState {
  return IDLE;
}

/** fade → out → speakers: fades for the signup music, volume and mute for everyone */
function outputNodes(ctx: AudioContext) {
  if (!output || output.out.context !== ctx) {
    const fade = ctx.createGain();
    const out = ctx.createGain();
    out.gain.value = muted ? 0 : volume;
    fade.connect(out);
    out.connect(ctx.destination);
    output = { fade, out };
  }
  return output;
}

function disposeEngine() {
  engine?.dispose();
  engine = null;
  loading = null;
}

async function fetchBank(url: string): Promise<ArrayBuffer | null> {
  const bankUrl = soundBankUrlFor(url);
  if (!bankUrl) return null;
  try {
    const response = await fetch(bankUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) return null;
    const bank = await response.arrayBuffer();
    // Only a real sound bank (an older server answers with the song itself)
    return isSoundBank(new Uint8Array(bank)) ? bank : null;
  } catch {
    // No bank, or too slow: the old synth plays it instead
    return null;
  }
}

async function loadEngine(song: SongFiles, token: number): Promise<{ engine: MidiEngine; kind: EngineKind } | null> {
  const ctx = getAudioContext();
  const out = outputNodes(ctx).fade;
  if (song.bank) {
    let sampler: MidiEngine | null = null;
    try {
      sampler = await createEngine(ctx, out, 'sampler');
      await sampler.load(song);
      return { engine: sampler, kind: 'sampler' };
    } catch (err) {
      sampler?.dispose();
      if (token !== generation) return null;
      // A browser without AudioWorklet, or a bank that won't load: the old
      // synth still plays the song. Its own error is the one shown.
      console.warn('Sampler could not play this song, using the old synth:', err);
    }
  }
  const legacy = await createEngine(ctx, out, 'legacy');
  try {
    await legacy.load(song);
  } catch (err) {
    legacy.dispose();
    throw err;
  }
  return { engine: legacy, kind: 'legacy' };
}

async function load(url: string, token: number) {
  try {
    const [midi, bank] = await Promise.all([
      fetch(url, { signal: AbortSignal.timeout(15000) }).then(async (response) => {
        if (!response.ok) throw new Error(`Could not fetch the song (HTTP ${response.status})`);
        return response.arrayBuffer();
      }),
      fetchBank(url),
    ]);
    if (token !== generation) return;
    const loaded = await loadEngine({ midi, bank }, token);
    if (!loaded) return;
    const next = loaded.engine;
    if (token !== generation) {
      next.dispose();
      return;
    }
    next.setLoop(state.loop);
    next.onEnded(() => {
      if (token === generation) set({ status: 'ready' });
    });
    engine = next;
    set({ status: 'ready', duration: next.duration, engine: loaded.kind });
  } catch (err) {
    if (token !== generation) return;
    const reason =
      (err as { name?: string })?.name === 'TimeoutError'
        ? 'The song took too long to load'
        : err instanceof Error
          ? err.message
          : 'Failed to load the song';
    set({ status: 'error', error: reason });
  }
}

/**
 * Hold this song while you're on the page. A different song than the
 * current one replaces it. Returns the release.
 */
export function claim(url: string, options: { title?: string; loop?: boolean; owner: NowPlayingOwner }): () => void {
  const loop = options.loop ?? false;
  if (state.url !== url) {
    disposeEngine();
    generation++;
    holders = 0;
    if (output) output.fade.gain.setValueAtTime(1, output.fade.context.currentTime);
    set({ ...IDLE, url, title: options.title ?? '', owner: options.owner, loop, status: 'loading' });
    loading = load(url, generation);
  } else {
    set({ title: options.title ?? state.title, owner: options.owner, loop });
    engine?.setLoop(loop);
  }
  holders++;
  const token = generation;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (token !== generation) return;
    holders--;
    if (holders <= 0) clear();
  };
}

/** Stop and forget the song */
export function clear() {
  disposeEngine();
  generation++;
  holders = 0;
  set(IDLE);
}

/**
 * Play (or carry on). Call it from the click, tap or key handler itself:
 * the first thing it does is unlock audio, before anything awaits. False
 * when the browser hasn't let audio start, or there's nothing to play.
 */
export function play(): Promise<boolean> {
  unlockAudio();
  // An autoplay attempt and a click can overlap: one start, both answered.
  // A start for a song that has since been replaced (or claimed again, as
  // React does in development) answers no, so it isn't shared.
  if (starting?.generation !== generation) {
    const current = { generation, promise: Promise.resolve(false) };
    current.promise = start().finally(() => {
      if (starting === current) starting = null;
    });
    starting = current;
  }
  return starting.promise;
}

async function start(): Promise<boolean> {
  const token = generation;
  if (state.status === 'loading' && loading) await loading;
  if (token !== generation || !engine) return false;
  if (state.status === 'playing') return true;
  if (!(await audioIsRunning(500))) return false;
  if (token !== generation || !engine) return false;
  const at = engine.position();
  const started = await engine.play(at >= engine.duration ? 0 : at);
  if (started && token === generation) set({ status: 'playing' });
  return started && token === generation;
}

export function pause() {
  if (state.status !== 'playing' || !engine) return;
  engine.pause();
  set({ status: 'paused' });
}

/** Seconds into the song */
export function position(): number {
  return engine?.position() ?? 0;
}

export function setLoop(loop: boolean) {
  engine?.setLoop(loop);
  if (state.loop !== loop) set({ loop });
}

function applyOutput() {
  if (!output) return;
  const now = output.out.context.currentTime;
  output.out.gain.setTargetAtTime(muted ? 0 : volume, now, 0.015);
}

/** 0–1, for every song on the page */
export function setVolume(next: number) {
  volume = Math.min(1, Math.max(0, next));
  applyOutput();
}

export function setMuted(next: boolean) {
  muted = next;
  applyOutput();
}

/** Ramp the song's own fade (0–1) over `seconds`: the signup music's fade-in and fade-out */
export function fadeTo(value: number, seconds: number) {
  const ctx = getAudioContext();
  const { fade } = outputNodes(ctx);
  const now = ctx.currentTime;
  fade.gain.cancelScheduledValues(now);
  fade.gain.setValueAtTime(fade.gain.value, now);
  if (seconds <= 0) fade.gain.setValueAtTime(value, now);
  else fade.gain.linearRampToValueAtTime(value, now + seconds);
}

/** For tests: swap the engine, and start from nothing */
export function __setupForTests(options: { engine: EngineFactory }) {
  createEngine = options.engine;
  disposeEngine();
  generation++;
  holders = 0;
  starting = null;
  output = null;
  volume = 0.5;
  muted = false;
  state = IDLE;
  listeners.clear();
}
