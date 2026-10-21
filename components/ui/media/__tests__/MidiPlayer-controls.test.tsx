/**
 * The music player's controls (MIDI plan Phase 1). The floating player is
 * site chrome, so page CSS can't reach it, and it can always be closed. No
 * sound is played here: nothing presses Play.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/contexts/GlobalAudioContext', () => ({
  useGlobalAudio: () => ({
    state: { isPlaying: false },
    stopAudio: jest.fn(),
    setProfileMidiPlaying: jest.fn(),
  }),
}));

import MidiPlayer from '../MidiPlayer';

beforeEach(() => {
  window.localStorage.clear();
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

test('Mute is a toggle that says whether it is on', () => {
  render(<MidiPlayer midiUrl="/song.mid" />);
  const mute = screen.getByRole('button', { name: 'Mute' });
  expect(mute).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(mute);
  expect(mute).toHaveAttribute('aria-pressed', 'true');
});

test('More shows the volume; Escape folds it away', () => {
  render(<MidiPlayer midiUrl="/song.mid" title="Little tune" />);
  const more = screen.getByRole('button', { name: 'More music controls' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(more);
  expect(more).toHaveAttribute('aria-expanded', 'true');

  const player = screen.getByRole('region', { name: 'Music: Little tune' });
  const volume = within(player).getByRole('slider', { name: /Volume/ });
  fireEvent.change(volume, { target: { value: '20' } });
  expect(volume).toHaveValue('20');

  fireEvent.keyDown(volume, { key: 'Escape' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
});

test('in the page (<ProfileMusic />, previews) it stays where it was put, with no Close', () => {
  const { container } = render(<div className="page"><MidiPlayer midiUrl="/song.mid" title="Little tune" placement="inline" /></div>);
  const player = screen.getByRole('region', { name: 'Music: Little tune' });
  expect(container.querySelector('.page')).toContainElement(player);
  expect(player.closest('[data-site-chrome]')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Close the music player' })).not.toBeInTheDocument();
});
