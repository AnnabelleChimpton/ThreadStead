import React from 'react';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { PixelIcon } from '@/components/ui/PixelIcon';

/** "Gravitation - Glaring Dream (Mix)" → title "Glaring Dream (Mix)", by "Gravitation" */
export function splitSongName(name: string | null): { title: string; by: string | null } {
  if (!name) return { title: 'Welcome music', by: null };
  const dash = name.indexOf(' - ');
  if (dash <= 0) return { title: name, by: null };
  return { title: name.slice(dash + 3).trim() || name, by: name.slice(0, dash).trim() };
}

/**
 * The music that starts at the end of signup: its name, Play/Pause and Mute.
 * Shown in the signup finale and on the page signup lands on, only while
 * the song is really there (playing, paused, or loaded but waiting for a
 * tap the browser asked for). Render it early in the page so it's one of
 * the first stops for Tab; it's fixed to the bottom corner either way.
 */
export default function WelcomeMusicControl() {
  const { welcome, playWelcome, pauseWelcome, setWelcomeMuted } = useGlobalAudio();
  if (!welcome) return null;

  const { title, by } = splitSongName(welcome.name);
  const playing = welcome.status === 'playing';
  const action = playing ? 'Pause' : 'Play';

  return (
    <section aria-label="Welcome music" className="ts-welcome-music">
      <button
        type="button"
        onClick={playing ? pauseWelcome : playWelcome}
        aria-label={`${action} the welcome music, ${welcome.name ?? title}`}
        className="ts-bare ts-welcome-music-main"
      >
        <span className="ts-welcome-music-icon" aria-hidden="true">
          <PixelIcon name={playing ? 'pause' : 'play'} size={16} />
        </span>
        <span className="ts-welcome-music-text">
          <span className="ts-welcome-music-line font-semibold" title={welcome.name ?? undefined}>{title}</span>
          <span className="ts-welcome-music-line text-xs text-nb-ink-mid">
            {welcome.status === 'blocked' ? (
              <>
                <span className="ts-hint-tap">Tap to play</span>
                <span className="ts-hint-click">Click to play</span>
              </>
            ) : (
              <>{by ? `${by} · ` : ''}welcome music</>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => setWelcomeMuted(!welcome.muted)}
        aria-label="Mute the welcome music"
        aria-pressed={welcome.muted}
        className="ts-icon-button ts-welcome-music-mute"
      >
        <PixelIcon name={welcome.muted ? 'volume-x' : 'volume'} size={20} />
      </button>
    </section>
  );
}
