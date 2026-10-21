import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { WelcomeMusic } from '@/contexts/GlobalAudioContext';

const audio = {
  welcome: null as WelcomeMusic | null,
  playWelcome: jest.fn(),
  pauseWelcome: jest.fn(),
  setWelcomeMuted: jest.fn(),
};
jest.mock('@/contexts/GlobalAudioContext', () => ({ useGlobalAudio: () => audio }));
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />,
}));

import WelcomeMusicControl, { splitSongName } from '../WelcomeMusicControl';

const NAME = 'Gravitation - Glaring Dream (Secret Dream Air Mix)';

beforeEach(() => {
  jest.clearAllMocks();
  audio.welcome = { name: NAME, status: 'playing', muted: false };
});

describe('WelcomeMusicControl', () => {
  it('shows nothing when no welcome song is there', () => {
    audio.welcome = null;
    const { container } = render(<WelcomeMusicControl />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the song, and pauses it', () => {
    render(<WelcomeMusicControl />);
    expect(screen.getByRole('region', { name: 'Welcome music' })).toBeInTheDocument();
    expect(screen.getByText('Glaring Dream (Secret Dream Air Mix)')).toBeInTheDocument();
    expect(screen.getByText(/Gravitation/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: `Pause the welcome music, ${NAME}` }));
    expect(audio.pauseWelcome).toHaveBeenCalled();
  });

  it('plays it again when paused', () => {
    audio.welcome = { name: NAME, status: 'paused', muted: false };
    render(<WelcomeMusicControl />);
    fireEvent.click(screen.getByRole('button', { name: /^Play the welcome music/ }));
    expect(audio.playWelcome).toHaveBeenCalled();
  });

  it('mutes with a labelled toggle', () => {
    const { rerender } = render(<WelcomeMusicControl />);
    const mute = screen.getByRole('button', { name: 'Mute the welcome music' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(audio.setWelcomeMuted).toHaveBeenCalledWith(true);

    audio.welcome = { name: NAME, status: 'playing', muted: true };
    rerender(<WelcomeMusicControl />);
    expect(screen.getByRole('button', { name: 'Mute the welcome music' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('says tap on touch screens and click with a mouse when the browser held it back', () => {
    audio.welcome = { name: NAME, status: 'blocked', muted: false };
    render(<WelcomeMusicControl />);
    // Which one shows is CSS (pointer: coarse); both are in the page
    expect(screen.getByText('Tap to play')).toHaveClass('ts-hint-tap');
    expect(screen.getByText('Click to play')).toHaveClass('ts-hint-click');
  });

  it('splits "Artist - Title"', () => {
    expect(splitSongName(NAME)).toEqual({ title: 'Glaring Dream (Secret Dream Air Mix)', by: 'Gravitation' });
    expect(splitSongName('Just a tune')).toEqual({ title: 'Just a tune', by: null });
    expect(splitSongName(null)).toEqual({ title: 'Welcome music', by: null });
  });
});
