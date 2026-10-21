/**
 * The music player's controls (MIDI plan Phase 1). The floating player is
 * site chrome, so page CSS can't reach it; it can always be closed; Mute,
 * volume and "play automatically" are remembered. No sound is played here:
 * nothing presses Play.
 */
import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';

jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn(async () => ({ ok: true })) }));
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
import MidiPlayer from '../MidiPlayer';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import * as nowPlaying from '@/lib/audio/now-playing';
import { __resetAudioContextForTests } from '@/lib/audio/context';
import type { MidiEngine } from '@/lib/audio/engine';

// The song loads through the page's one song (lib/audio/now-playing.ts):
// a stand-in engine and AudioContext, so nothing makes a sound
class FakeContext {
  state = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() {
    const gain = { value: 1, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} };
    return { gain, connect() {}, context: this };
  }
  createBuffer() { return {}; }
  createBufferSource() { return { connect() {}, start() {}, buffer: null }; }
}

beforeEach(() => {
  window.localStorage.clear();
  (csrfFetch as jest.Mock).mockClear();
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeContext;
  __resetAudioContextForTests();
  nowPlaying.__setupForTests({
    engine: () => ({
      load: async () => {}, duration: 30, play: async () => true, pause: () => 0, position: () => 0,
      setLoop() {}, onEnded() {}, dispose() {},
    }) as MidiEngine,
  });
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof fetch;
});

test('the floating player is site chrome, outside the page', () => {
  const { container } = render(<div className="profile-card"><MidiPlayer midiUrl="/song.mid" title="Little tune" /></div>);
  const player = screen.getByRole('region', { name: 'Music: Little tune' });
  // Portaled to <body>, not inside the profile card (a theme's transform
  // pinned it to the card there, and page CSS could hide it)
  expect(container.querySelector('.profile-card')).not.toContainElement(player);
  expect(player.closest('[data-site-chrome]')).toHaveClass('ts-music-dock');
});

test('Close stops the music and leaves a Music button that brings it back', () => {
  render(<MidiPlayer midiUrl="/song.mid" title="Little tune" />);
  fireEvent.click(screen.getByRole('button', { name: 'Close the music player' }));
  expect(screen.queryByRole('region', { name: 'Music: Little tune' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Show the music player: Little tune' }));
  expect(screen.getByRole('region', { name: 'Music: Little tune' })).toBeInTheDocument();
});

test('Play says Play, not Stop', () => {
  render(<MidiPlayer midiUrl="/song.mid" title="Little tune" />);
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
});

test('Mute is a toggle, and remembered', () => {
  const { unmount } = render(<MidiPlayer midiUrl="/song.mid" />);
  const mute = screen.getByRole('button', { name: 'Mute' });
  expect(mute).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(mute);
  expect(mute).toHaveAttribute('aria-pressed', 'true');
  unmount();

  render(<MidiPlayer midiUrl="/song.mid" />);
  expect(screen.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true');
});

test('More shows volume and the autoplay switch; Escape folds it away', () => {
  render(<MidiPlayer midiUrl="/song.mid" title="Little tune" />);
  const more = screen.getByRole('button', { name: 'More music controls' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(more);
  expect(more).toHaveAttribute('aria-expanded', 'true');

  const player = screen.getByRole('region', { name: 'Music: Little tune' });
  const volume = within(player).getByRole('slider', { name: /Volume/ });
  fireEvent.change(volume, { target: { value: '20' } });
  expect(window.localStorage.getItem('threadstead-audio-volume')).toBe('0.2');

  fireEvent.keyDown(volume, { key: 'Escape' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
});

test('"Play music automatically" off is kept in the browser and sent to the account', async () => {
  render(<MidiPlayer midiUrl="/song.mid" />);
  fireEvent.click(screen.getByRole('button', { name: 'More music controls' }));
  const box = screen.getByRole('checkbox', { name: 'Play music automatically when I visit a profile' });
  expect(box).toBeChecked();
  fireEvent.click(box);
  expect(box).not.toBeChecked();
  expect(window.localStorage.getItem('threadstead-music-autoplay')).toBe('off');
  await waitFor(() =>
    expect(csrfFetch).toHaveBeenCalledWith('/api/user/music-preferences', expect.objectContaining({ method: 'POST', body: JSON.stringify({ autoplay: false }) }))
  );
});

test('a visitor who said no gets no "click anywhere" hint, even when the owner wants autoplay', () => {
  window.localStorage.setItem('threadstead-music-autoplay', 'off');
  render(<MidiPlayer midiUrl="/song.mid" autoplay />);
  expect(screen.queryByText('Click anywhere on the page for music')).not.toBeInTheDocument();
});

test('in the page (<ProfileMusic />, previews) it stays where it was put, with no Close', () => {
  const { container } = render(<div className="page"><MidiPlayer midiUrl="/song.mid" title="Little tune" placement="inline" /></div>);
  const player = screen.getByRole('region', { name: 'Music: Little tune' });
  expect(container.querySelector('.page')).toContainElement(player);
  expect(player.closest('[data-site-chrome]')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Close the music player' })).not.toBeInTheDocument();
});

test('two players of the same song are one song: Play on one shows Pause on both', async () => {
  render(
    <>
      <MidiPlayer midiUrl="/song.mid" title="Little tune" placement="inline" />
      <MidiPlayer midiUrl="/song.mid" title="Little tune" placement="inline" />
    </>
  );
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Play' })[0]).not.toBeDisabled());
  fireEvent.click(screen.getAllByRole('button', { name: 'Play' })[0]);
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Pause' })).toHaveLength(2));
});

test('an autoplayed song that ends stays ended (it used to start over, forever)', async () => {
  let ended: () => void = () => {};
  const play = jest.fn(async () => true);
  nowPlaying.__setupForTests({
    engine: () => ({
      load: async () => {}, duration: 30, play, pause: () => 30, position: () => 30,
      setLoop() {}, onEnded(cb: () => void) { ended = cb; }, dispose() {},
    }) as MidiEngine,
  });
  render(<MidiPlayer midiUrl="/song.mid" title="Little tune" autoplay />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument());
  expect(play).toHaveBeenCalledTimes(1);

  act(() => ended());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument());
  await new Promise((r) => setTimeout(r, 50));
  expect(play).toHaveBeenCalledTimes(1);
});
