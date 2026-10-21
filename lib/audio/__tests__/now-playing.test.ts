/**
 * The page's one song (MIDI plan Phase 2): players share it, a new song
 * replaces the old one cleanly, and nothing hangs waiting on a browser that
 * hasn't let audio start.
 */
import * as nowPlaying from '../now-playing';
import { __resetAudioContextForTests } from '../context';
import type { MidiEngine } from '../engine';

// ---- a small fake AudioContext: just what the store and context touch ----
class FakeParam {
  value = 1;
  setValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  cancelScheduledValues() {}
}
let allowStart = true;
const contexts: FakeContext[] = [];
class FakeContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  constructor() { contexts.push(this); }
  resume() {
    // Outside a gesture a real browser leaves this pending forever
    if (!allowStart) return new Promise<void>(() => {});
    this.state = 'running';
    return Promise.resolve();
  }
  createGain() { return { gain: new FakeParam(), connect: jest.fn(), context: this }; }
  createBuffer() { return {}; }
  createBufferSource() { return { connect: jest.fn(), start: jest.fn(), buffer: null }; }
}

// ---- a fake engine that records what the store asks of it ----
// A test can hold the next load open (a slow download or parse)
const heldLoads: Array<Promise<void>> = [];
function holdNextLoad() {
  let finish: () => void = () => {};
  heldLoads.push(new Promise<void>((resolve) => { finish = resolve; }));
  return () => finish();
}

function fakeEngine(duration = 60) {
  let at = 0;
  let playing = false;
  const engine = {
    load: jest.fn(async () => {
      const held = heldLoads.shift();
      if (held) await held;
      if (failSampler) throw new Error('This browser can’t play the music');
    }),
    duration,
    play: jest.fn(async (from: number) => { at = from; playing = true; return true; }),
    // Like the real engine: remembers where it stopped (a second in)
    pause: jest.fn(() => { at = at + 1; playing = false; return at; }),
    position: () => (playing ? at + 1 : at),
    setLoop: jest.fn(),
    onEnded: jest.fn(),
    dispose: jest.fn(),
  };
  return engine;
}

let engines: ReturnType<typeof fakeEngine>[];
let failSampler = false;
// What the server answers, when it isn't 200 with a song or a bank
let files: Record<string, number>;

beforeEach(() => {
  allowStart = true;
  contexts.length = 0;
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeContext;
  __resetAudioContextForTests();
  engines = [];
  failSampler = false;
  heldLoads.length = 0;
  files = {};
  nowPlaying.__setupForTests({
    engine: () => {
      const e = fakeEngine();
      engines.push(e);
      return e as unknown as MidiEngine;
    },
  });
  global.fetch = jest.fn(async (url: string) => {
    const status = files[url] ?? 200;
    // A bank answers with a SoundFont header; a song with anything else
    const body = url.includes('bank=1') && !url.includes('not-a-bank')
      ? Uint8Array.from('RIFF\0\0\0\0sfbk', (c) => c.charCodeAt(0)).buffer
      : new ArrayBuffer(8);
    return { ok: status === 200, status, arrayBuffer: async () => body };
  }) as unknown as typeof fetch;
});

const settle = () => new Promise((r) => setTimeout(r, 0));
/** A member's song, as players get it */
const song = (id: string) => `/api/media/serve/${id}`;

test('two players of one song share it: one load, one engine', async () => {
  const releaseA = nowPlaying.claim(song('a'), { owner: 'profile' });
  const releaseB = nowPlaying.claim(song('a'), { owner: 'profile' });
  await settle();
  expect(engines).toHaveLength(1);
  expect(engines[0].load).toHaveBeenCalledTimes(1);
  expect(nowPlaying.getSnapshot().status).toBe('ready');

  // One player leaving keeps it; the last one leaving stops it
  releaseA();
  expect(engines[0].dispose).not.toHaveBeenCalled();
  releaseB();
  expect(engines[0].dispose).toHaveBeenCalled();
  expect(nowPlaying.getSnapshot()).toMatchObject({ url: null, status: 'idle' });
});

test('one AudioContext for every song (each player used to make its own)', async () => {
  for (const url of [song('a'), song('b'), song('c')]) {
    const release = nowPlaying.claim(url, { owner: 'profile' });
    await settle();
    release();
  }
  expect(contexts).toHaveLength(1);
});

test('going to another profile swaps the song: the old engine goes', async () => {
  const releaseA = nowPlaying.claim(song('a'), { owner: 'profile' });
  await settle();
  await nowPlaying.play();
  expect(nowPlaying.getSnapshot().status).toBe('playing');

  releaseA();
  nowPlaying.claim(song('b'), { owner: 'profile' });
  await settle();
  expect(engines[0].dispose).toHaveBeenCalled();
  expect(nowPlaying.getSnapshot()).toMatchObject({ url: song('b'), status: 'ready' });
  expect(await nowPlaying.play()).toBe(true);
  expect(engines[1].play).toHaveBeenCalledTimes(1);
});

test('a song that finishes loading after another was picked is dropped', async () => {
  const finishA = holdNextLoad();
  nowPlaying.claim(song('a'), { owner: 'profile' });
  await settle();
  nowPlaying.claim(song('b'), { owner: 'profile' });
  await settle();
  finishA();
  await settle();
  expect(nowPlaying.getSnapshot().url).toBe(song('b'));
  // a's engine finished loading after b was picked and was thrown away
  expect(engines.filter((e) => e.dispose.mock.calls.length === 0)).toHaveLength(1);
});

test('an autoplay attempt and a click at once start the song once', async () => {
  nowPlaying.claim(song('a'), { owner: 'profile' });
  const [first, second] = await Promise.all([nowPlaying.play(), nowPlaying.play()]);
  expect(first && second).toBe(true);
  expect(engines[0].play).toHaveBeenCalledTimes(1);
});

test('a song claimed again while starting still starts (React mounts twice in development)', async () => {
  const finishFirst = holdNextLoad();
  const release = nowPlaying.claim(song('a'), { owner: 'profile' });
  const firstTry = nowPlaying.play();
  release();
  nowPlaying.claim(song('a'), { owner: 'profile' });
  const secondTry = nowPlaying.play();
  await settle();
  finishFirst();
  expect(await firstTry).toBe(false);
  expect(await secondTry).toBe(true);
  expect(nowPlaying.getSnapshot().status).toBe('playing');
});

test('before any click, play() gives up instead of hanging (it used to lock Play)', async () => {
  allowStart = false;
  nowPlaying.claim(song('a'), { owner: 'profile' });
  await settle();
  const started = await nowPlaying.play();
  expect(started).toBe(false);
  expect(engines[0].play).not.toHaveBeenCalled();
  expect(nowPlaying.getSnapshot().status).toBe('ready');

  // The next real gesture can start it
  allowStart = true;
  expect(await nowPlaying.play()).toBe(true);
});

test('pause, then play carries on from where it was', async () => {
  nowPlaying.claim(song('a'), { owner: 'profile' });
  await nowPlaying.play();
  nowPlaying.pause();
  expect(nowPlaying.getSnapshot().status).toBe('paused');
  await nowPlaying.play();
  expect(engines[0].play).toHaveBeenLastCalledWith(1);
});

test('the welcome music gives way to a profile song', async () => {
  nowPlaying.claim(song('welcome'), { owner: 'signup', loop: true });
  await settle();
  expect(nowPlaying.getSnapshot()).toMatchObject({ owner: 'signup', loop: true });
  nowPlaying.claim(song('song'), { owner: 'profile' });
  expect(nowPlaying.getSnapshot()).toMatchObject({ owner: 'profile', url: song('song') });
});

test('a song that will not load says why', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
  nowPlaying.claim(song('missing'), { owner: 'profile' });
  await settle();
  expect(nowPlaying.getSnapshot()).toMatchObject({ status: 'error', error: 'Could not fetch the song (HTTP 404)' });
});

test('the song and its sound bank are fetched together, and it plays on the sampler', async () => {
  nowPlaying.claim(song('s1'), { owner: 'profile' });
  await settle();
  const fetched = (global.fetch as jest.Mock).mock.calls.map((c) => c[0]);
  expect(fetched).toEqual(expect.arrayContaining([song('s1'), `${song('s1')}?bank=1`]));
  expect(nowPlaying.getSnapshot()).toMatchObject({ status: 'ready' });
});

test('when the sounds don’t arrive, the player says so', async () => {
  files[`${song('s2')}?bank=1`] = 404;
  nowPlaying.claim(song('s2'), { owner: 'profile' });
  await settle();
  expect(nowPlaying.getSnapshot()).toMatchObject({ status: 'error', error: 'The song’s sounds didn’t load' });
  expect(engines).toHaveLength(0);
});

test('a "bank" that isn’t a sound bank is refused the same way', async () => {
  nowPlaying.claim(song('not-a-bank'), { owner: 'profile' });
  await settle();
  expect(nowPlaying.getSnapshot()).toMatchObject({ status: 'error', error: 'The song’s sounds didn’t load' });
});

test('when this browser can’t run the sampler, the player says so and lets go of it', async () => {
  failSampler = true;
  nowPlaying.claim(song('s3'), { owner: 'profile' });
  await settle();
  await settle();
  expect(engines[0].dispose).toHaveBeenCalled();
  expect(nowPlaying.getSnapshot()).toMatchObject({ status: 'error', error: 'This browser can’t play the music' });
});

test('a song from anywhere else can’t be played (there’s no bank for it)', async () => {
  nowPlaying.claim('https://example.com/tune.mid', { owner: 'profile' });
  await settle();
  expect(nowPlaying.getSnapshot()).toMatchObject({ status: 'error', error: 'This song can’t be played here' });
});
