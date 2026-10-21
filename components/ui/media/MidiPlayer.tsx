import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useMidiPlayer } from '@/hooks/useMidiPlayer';
import * as nowPlaying from '@/lib/audio/now-playing';
import { audioCanStartNow, unlockOnNextGesture } from '@/lib/audio/context';
import {
  saveAutoplay,
  saveMuted,
  saveVolume,
  savedAutoplay,
  savedMuted,
  savedVolume,
} from '@/lib/audio/music-preferences';

interface MidiPlayerProps {
  midiUrl: string;
  title?: string;
  /** The owner's choice; the visitor's own "no" (music-preferences) wins */
  autoplay?: boolean;
  loop?: boolean;
  className?: string;
  /**
   * 'floating': the profile's song, as site chrome in the corner, out of the
   * page's reach, with a close button. 'inline': where it's put
   * (<ProfileMusic />, the Settings preview), part of the page.
   */
  placement?: 'floating' | 'inline';
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * The music player: a remote for the page's one song (lib/audio/now-playing
 * .ts), which owns the sound. Two players of the same song share it; going
 * to another profile swaps the song under the same player.
 */
export default function MidiPlayer({
  midiUrl,
  title = 'Profile song',
  autoplay: ownerAutoplay = false,
  loop = false,
  className = '',
  placement = 'floating',
}: MidiPlayerProps) {
  const song = useMidiPlayer(midiUrl, { title, loop });
  const status = song.mine ? song.status : 'loading';
  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const isPaused = status === 'paused';
  const error = song.mine && status === 'error' ? song.error : null;
  const duration = song.mine ? song.duration : 0;

  // The player is client-only (loaded with ssr: false), so the visitor's
  // remembered choices can be read straight away
  const [volume, setVolume] = useState(savedVolume);
  const [muted, setMuted] = useState(savedMuted);
  const [autoplayAllowed, setAutoplayAllowed] = useState(savedAutoplay);
  const [expanded, setExpanded] = useState(false);
  // Closed for this visit: the song stops, a small Music button stays
  const [closed, setClosed] = useState(false);
  // Autoplay is armed but the browser wants a click first
  const [waitingForClick, setWaitingForClick] = useState(false);
  const [mounted, setMounted] = useState(false);
  const autoplay = ownerAutoplay && autoplayAllowed;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const elapsedRef = useRef<HTMLSpanElement | null>(null);
  const autoplayDoneRef = useRef(false);

  // Volume and mute are the page's (every player of the song shares them)
  useEffect(() => { nowPlaying.setVolume(volume / 100); }, [volume]);
  useEffect(() => { nowPlaying.setMuted(muted); }, [muted]);

  // A new song (another profile, same player): a fresh visit
  useEffect(() => {
    setClosed(false);
    setExpanded(false);
    setWaitingForClick(false);
    autoplayDoneRef.current = false;
  }, [midiUrl]);

  useEffect(() => setMounted(true), []);

  // Autoplay. Browsers only let audio start inside a click, tap or key
  // press. If the visitor has already used the page, start now; otherwise
  // their first click, tap or key press anywhere starts the music, the way
  // old homepages did it, and the player says so.
  const canAutoplay = status === 'loading' || status === 'ready';
  useEffect(() => {
    if (!autoplay || closed || !song.mine || !canAutoplay || autoplayDoneRef.current) return;
    let cancelled = false;
    let removeGesture: (() => void) | null = null;
    const start = async () => {
      const ok = await nowPlaying.play();
      if (cancelled) return;
      if (ok) {
        autoplayDoneRef.current = true;
        setWaitingForClick(false);
      } else {
        arm();
      }
    };
    const arm = () => {
      setWaitingForClick(true);
      removeGesture = unlockOnNextGesture(() => {
        if (!cancelled) void start();
      });
    };
    if (audioCanStartNow()) void start();
    else arm();
    return () => {
      cancelled = true;
      removeGesture?.();
    };
  }, [autoplay, closed, song.mine, canAutoplay, midiUrl]);

  useEffect(() => {
    if (isPlaying || !autoplay) setWaitingForClick(false);
  }, [isPlaying, autoplay]);

  // Progress from the audio clock, four times a second while playing (it
  // used to re-render the whole player ten times a second). The bar moves by
  // transform and only changed values are written, so the page isn't laid
  // out again for it.
  useEffect(() => {
    let lastScale = '';
    let lastTime = '';
    const paintProgress = () => {
      const at = song.mine ? nowPlaying.position() : 0;
      const fraction = duration > 0 ? Math.min(1, at / duration) : 0;
      const scale = `scaleX(${fraction.toFixed(3)})`;
      if (scale !== lastScale) {
        lastScale = scale;
        sectionRef.current?.querySelectorAll<HTMLElement>('.ts-music-progress').forEach((bar) => {
          bar.style.transform = scale;
        });
      }
      const time = formatTime(at);
      if (time !== lastTime && elapsedRef.current) {
        lastTime = time;
        elapsedRef.current.textContent = time;
      }
    };
    paintProgress();
    if (!isPlaying) return;
    const timer = setInterval(paintProgress, 250);
    return () => clearInterval(timer);
  }, [isPlaying, duration, expanded, closed, song.mine]);

  // The floating player's height, so scroll-to-top can sit above it
  // (styles/chrome-layers.css)
  useEffect(() => {
    const el = frameRef.current;
    if (placement !== 'floating' || !el || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty('--ts-music-height', `${Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight)}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--ts-music-height');
    };
  }, [placement, mounted, closed]);

  const togglePlay = () => {
    if (isPlaying) nowPlaying.pause();
    else void nowPlaying.play();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    saveVolume(newVolume);
    // Moving the slider is a clear "I want to hear it"
    if (muted && newVolume > 0) {
      setMuted(false);
      saveMuted(false);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    saveMuted(next);
  };

  const close = () => {
    nowPlaying.pause();
    setExpanded(false);
    setClosed(true);
  };

  const panelId = `ts-music-panel-${placement}`;

  // A short line under the title when there's no progress bar to show
  const statusLine = error
    ? `This song won't play. ${error}`
    : isLoading
      ? 'Loading the song…'
      : waitingForClick
        ? 'Click anywhere on the page for music'
        : isPaused
          ? 'Paused'
          : '';

  // What a screen reader hears when it changes
  const liveText = closed
    ? 'Music player closed'
    : error
      ? `This song won't play. ${error}`
      : isPlaying
        ? `Playing ${title}`
        : waitingForClick
          ? 'Click anywhere on the page to start the music'
          : isPaused
            ? 'Paused'
            : '';

  const progressBar = (
    <div className="w-full bg-nb-ink-mid/20 rounded-full h-1 mt-1 overflow-hidden" aria-hidden="true">
      {/* Scaled from the audio clock (paintProgress) */}
      <div className="ts-music-progress bg-nb-ink h-1 w-full origin-left" style={{ transform: 'scaleX(0)' }} />
    </div>
  );

  const frame = (
    <section
      ref={sectionRef}
      aria-label={`Music: ${title}`}
      className={`ts-music bg-nb-paper text-nb-ink rounded-cozy shadow-nb border-2 border-nb-ink-mid ${placement === 'inline' ? 'w-full' : ''} ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && expanded) {
          e.stopPropagation();
          setExpanded(false);
        }
      }}
    >
      {expanded && (
        <div id={panelId} className="px-3 pt-3 pb-2 space-y-3 border-b border-nb-ink-mid/30 text-sm">
          {duration > 0 && (
            <div>
              <div className="flex justify-between text-xs text-nb-ink-mid">
                <span ref={elapsedRef}>{formatTime(0)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              {progressBar}
            </div>
          )}
          <label className="flex items-center gap-2">
            <span>Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-valuetext={muted ? 'Muted' : `${volume}%`}
              className="flex-1 min-w-0"
            />
            <span className="w-12 text-right text-xs text-nb-ink-mid tabular-nums">{muted ? 'Muted' : `${volume}%`}</span>
          </label>
          {loop && (
            <p className="m-0 flex items-center gap-1.5 text-xs text-nb-ink-mid">
              <PixelIcon name="repeat" size={12} /> Plays on repeat
            </p>
          )}
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoplayAllowed}
              onChange={(e) => {
                setAutoplayAllowed(e.target.checked);
                void saveAutoplay(e.target.checked);
              }}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <span>Play music automatically when I visit a profile</span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading}
          className="ts-music-btn ts-music-btn--primary"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <PixelIcon name={isPlaying ? 'pause' : 'play'} size={16} />
        </button>

        <div className="flex-1 min-w-0 px-1">
          <div className="text-sm font-semibold truncate" title={title}>{title}</div>
          {isPlaying
            ? progressBar
            : statusLine && <div className="text-xs text-nb-ink-mid truncate" title={statusLine}>{statusLine}</div>}
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className="ts-music-btn"
          aria-label="Mute"
          aria-pressed={muted}
          title={muted ? 'Unmute' : 'Mute'}
        >
          <PixelIcon name={muted ? 'volume-x' : 'volume'} size={16} />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ts-music-btn"
          aria-label="More music controls"
          aria-expanded={expanded}
          aria-controls={panelId}
          title={expanded ? 'Fewer controls' : 'More controls'}
        >
          <PixelIcon name={expanded ? 'chevron-down' : 'chevron-up'} size={16} />
        </button>
        {placement === 'floating' && (
          <button
            type="button"
            onClick={close}
            className="ts-music-btn"
            aria-label="Close the music player"
            title="Close"
          >
            <PixelIcon name="close" size={16} />
          </button>
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite">{liveText}</span>
    </section>
  );

  if (placement === 'inline') return frame;

  // The profile's own song: site chrome, outside the page, so the page's CSS
  // can't move, cover or hide it (it used to sit inside the profile card,
  // where a theme's transform pinned it to the card and page CSS reached it)
  if (!mounted) return null;
  return createPortal(
    <div ref={frameRef} data-site-chrome="true" className="ts-music-dock">
      {closed ? (
        <div className="ts-music">
          <button
            type="button"
            onClick={() => setClosed(false)}
            className="ts-music-btn ts-music-pill"
            aria-label={`Show the music player: ${title}`}
          >
            <PixelIcon name="music" size={14} /> Music
          </button>
        </div>
      ) : (
        frame
      )}
      {closed && <span className="sr-only" role="status" aria-live="polite">Music player closed</span>}
    </div>,
    document.body
  );
}
