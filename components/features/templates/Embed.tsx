import React, { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import { embedFor, whyNoEmbed, EMBED_HOSTS, clampHeight } from '@/lib/templates/embeds';

interface EmbedProps extends Omit<UniversalCSSProps, 'height'> {
  /** A YouTube, Vimeo, Bandcamp, SoundCloud or Spotify link (lib/templates/embeds.ts) */
  src?: string;
  /** What's playing, for visitors: on the placeholder and as the player's title */
  title?: string;
  /** Player height in px, instead of the host's own */
  height?: number;
  className?: string;
}

/**
 * A video or music player from one of five hosts, loaded only when a
 * visitor clicks Play. Until then it's a plain box drawn here: no iframe,
 * no thumbnail, no script, nothing the other site can see. The server and
 * the first browser render both draw that box, so it hydrates cleanly.
 */
export default function Embed(props: EmbedProps) {
  const { src, title, height: heightProp, ...rest } = props;
  const { cssProps, componentProps } = separateCSSProps(rest);
  const { className } = componentProps;
  const { owner, viewer } = useResidentData();
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Keyboard focus follows the click into the player
  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  const player = embedFor(src);
  if (!player) {
    // Only the owner hears about a link it can't play; visitors see nothing
    if (!viewer?.id || viewer.id !== owner?.id) return null;
    return (
      <p
        className={`ts-embed ts-embed--unknown ts-owner-note text-sm text-thread-sage border border-dashed border-thread-sage/60 rounded p-2 ${className ?? ''}`}
        style={applyCSSProps(cssProps)}
      >
        {whyNoEmbed(src)} Only you see this note.
      </p>
    );
  }

  const host = EMBED_HOSTS[player.host];
  const height =
    typeof heightProp === 'number' && Number.isFinite(heightProp) ? clampHeight(heightProp) : player.height;
  // Without a fixed height, a video keeps the 16:9 shape at any width
  const shape = height === null ? 'aspect-video' : '';
  const box: React.CSSProperties = height === null ? {} : { height };

  return (
    <div
      className={`ts-embed ts-embed--${player.host} w-full ${className ?? ''}`}
      style={{ ...(player.maxWidth ? { maxWidth: player.maxWidth } : {}), ...applyCSSProps(cssProps) }}
    >
      {playing ? (
        <iframe
          ref={frameRef}
          src={player.playUrl}
          title={title || `${player.label} player`}
          loading="lazy"
          allow={host.allow}
          allowFullScreen={player.height === null}
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={host.sandbox}
          className={`ts-embed-player block w-full border-0 rounded ${shape}`}
          style={box}
        />
      ) : (
        <div
          className={`ts-embed-placeholder flex flex-wrap items-center justify-center gap-x-3 gap-y-1 p-2 text-center border border-thread-sage/40 bg-thread-cream rounded text-thread-charcoal ${shape}`}
          style={height === null ? undefined : { minHeight: height }}
        >
          {title && <span className="ts-embed-title font-semibold text-thread-pine">{title}</span>}
          <Button variant="secondary" size="sm" className="ts-embed-button" onClick={() => setPlaying(true)}>
            <PixelIcon name="play" size={14} className="inline-block align-[-2px] mr-1.5" />
            {`Play from ${player.label}`}
          </Button>
        </div>
      )}
    </div>
  );
}
