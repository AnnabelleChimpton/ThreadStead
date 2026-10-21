/**
 * What a visitor has said about profile music, remembered in this browser:
 * volume, mute, and "don't play music automatically for me". A signed-in
 * visitor's autoplay choice is also kept on their account (Profile
 * .playProfileMusicAutomatically, /api/user/music-preferences), so it follows
 * them to another browser. Every read and write survives storage being
 * blocked (private windows), falling back to the defaults.
 */

import { csrfFetch } from '@/lib/api/client/csrf-fetch';

// Shared with the signup welcome music (contexts/GlobalAudioContext.tsx): 0–1
const VOLUME_KEY = 'threadstead-audio-volume';
const MUTED_KEY = 'threadstead-audio-muted';
const AUTOPLAY_KEY = 'threadstead-music-autoplay';

const DEFAULT_VOLUME = 0.5;

function read(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* not remembered, that's all */
  }
}

/** 0–100 */
export function savedVolume(): number {
  const v = parseFloat(read(VOLUME_KEY) ?? '');
  return Math.round((Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME) * 100);
}

export function saveVolume(percent: number) {
  write(VOLUME_KEY, String(Math.min(100, Math.max(0, percent)) / 100));
}

export function savedMuted(): boolean {
  return read(MUTED_KEY) === 'true';
}

export function saveMuted(muted: boolean) {
  write(MUTED_KEY, muted ? 'true' : null);
}

/** False once the visitor has said no in this browser */
export function savedAutoplay(): boolean {
  return read(AUTOPLAY_KEY) !== 'off';
}

/**
 * Remember the visitor's autoplay choice here, and on their account when
 * they're signed in (a signed-out visitor's request is refused, which is
 * fine: the browser still remembers).
 */
export async function saveAutoplay(on: boolean) {
  write(AUTOPLAY_KEY, on ? null : 'off');
  try {
    await csrfFetch('/api/user/music-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoplay: on }),
    });
  } catch {
    /* the browser still remembers */
  }
}
