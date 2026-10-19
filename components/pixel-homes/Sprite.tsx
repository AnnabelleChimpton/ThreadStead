import React, { useEffect, useRef, useState } from 'react'
import { SPRITE_FRAME_MS } from '@/lib/pixel-homes/sprite-animation'

interface SpriteProps {
  /** A horizontal strip of `frames` frames, each frameWidth×height art px */
  src: string
  frameWidth: number
  height: number
  frames: number
  /** Whole-number size multiplier (decoration size variants) */
  scale?: number
  frameMs?: number
  /** Loop the frames. Off: hold the first frame. */
  playing?: boolean
  className?: string
  onError?: () => void
}

/**
 * Frame animation for pixel art (art-direction T9): the strip is a
 * background, stepped one whole frame at a time with steps(), so nothing
 * is ever drawn between pixels. Reduced motion holds the first frame (CSS),
 * and it pauses while scrolled out of view.
 */
export default function Sprite({
  src,
  frameWidth,
  height,
  frames,
  scale = 1,
  frameMs = SPRITE_FRAME_MS,
  playing = false,
  className = '',
  onError,
}: SpriteProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const animated = playing && frames > 1

  useEffect(() => {
    if (!animated || !ref.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [animated])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-sprite-frames={frames}
      className={`ts-sprite ${className}`}
      style={{
        width: frameWidth * scale,
        height: height * scale,
        backgroundImage: `url("${src}")`,
        backgroundSize: `${frameWidth * frames * scale}px ${height * scale}px`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '0 0',
        imageRendering: 'pixelated',
        ...(animated && {
          // jump-none: `frames` equal holds from the first frame (0%) to the last (100%)
          animation: `ts-sprite-strip ${frames * frameMs}ms steps(${frames}, jump-none) infinite`,
          animationPlayState: visible ? 'running' : 'paused',
        }),
      }}
    >
      {/* A background image can't report a failed load; this does, so the caller can fall back */}
      {onError && <img src={src} alt="" hidden onError={onError} />}
    </div>
  )
}
