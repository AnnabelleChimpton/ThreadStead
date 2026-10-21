/**
 * The sampler engine against a stand-in spessasynth: looping, and falling
 * back when the audio thread never answers.
 */
const sequencers: Array<{ loopCount: number; play: jest.Mock; pause: jest.Mock; currentTime: number; loadNewSongList: jest.Mock }> = [];
let bankLoads: () => Promise<void> = async () => {};

jest.mock('spessasynth_lib', () => ({
  WorkletSynthesizer: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    destroy: jest.fn(),
    isReady: Promise.resolve(),
    soundBankManager: { addSoundBank: jest.fn(() => bankLoads()) },
  })),
  Sequencer: jest.fn().mockImplementation(() => {
    const seq = {
      loopCount: -1,
      currentTime: 0,
      currentHighResolutionTime: 0,
      play: jest.fn(),
      pause: jest.fn(),
      loadNewSongList: jest.fn(),
      eventHandler: { addEvent: jest.fn() },
    };
    sequencers.push(seq);
    return seq;
  }),
}));
jest.mock('spessasynth_core', () => ({
  BasicMIDI: { fromArrayBuffer: () => ({ tracks: [{}], duration: 30 }) },
}));

import { createSampler, SAMPLER_START_TIMEOUT_MS } from '../engines/sampler';

function context() {
  return {
    state: 'running',
    audioWorklet: { addModule: jest.fn(async () => {}) },
    createGain: () => ({ gain: { value: 1 }, connect: jest.fn(), disconnect: jest.fn() }),
  } as unknown as AudioContext;
}
const song = { midi: new ArrayBuffer(8), bank: new ArrayBuffer(8) };

beforeEach(() => {
  sequencers.length = 0;
  bankLoads = async () => {};
});

test('looping sets a count the audio thread loops on (Infinity: -1 never loops)', async () => {
  const engine = await createSampler(context(), {} as AudioNode);
  engine.setLoop(true);
  await engine.load(song);
  expect(sequencers[0].loopCount).toBe(Infinity);
  engine.setLoop(false);
  expect(sequencers[0].loopCount).toBe(0);
  expect(engine.duration).toBe(30);
});

test('when the audio thread never answers, loading gives up so the old synth can play', async () => {
  jest.useFakeTimers();
  bankLoads = () => new Promise<void>(() => {});
  const engine = await createSampler(context(), {} as AudioNode);
  const loading = engine.load(song);
  const failed = expect(loading).rejects.toThrow('The sampler didn’t start');
  jest.advanceTimersByTime(SAMPLER_START_TIMEOUT_MS + 1);
  await failed;
  jest.useRealTimers();
});

test('a song without a bank is refused (the store plays it on the old synth)', async () => {
  const engine = await createSampler(context(), {} as AudioNode);
  await expect(engine.load({ midi: song.midi, bank: null })).rejects.toThrow('no sound bank');
});

test('play from a point, pause there', async () => {
  const engine = await createSampler(context(), {} as AudioNode);
  await engine.load(song);
  expect(await engine.play(12)).toBe(true);
  expect(sequencers[0].currentTime).toBe(12);
  expect(sequencers[0].play).toHaveBeenCalled();
  engine.pause();
  expect(sequencers[0].pause).toHaveBeenCalled();
});
