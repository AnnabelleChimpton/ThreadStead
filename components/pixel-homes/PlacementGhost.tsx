import React, { forwardRef, memo, useImperativeHandle, useState } from 'react'
import DecorationSVG from './DecorationSVG'
import { isFlipped, type DecorationItem } from '@/lib/pixel-homes/decoration-data'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'
import type { Point } from '@/lib/pixel-homes/editor-interaction'
import { OVERLAY_DEPTH } from '@/lib/pixel-homes/depth'

export interface PlacementGhostHandle {
  /** Show `item` with its top-left at `topLeft` (scene coordinates). */
  show: (item: DecorationItem, topLeft: Point) => void
  hide: () => void
}

/** The ghost's art, redrawn only when the item changes, not when it moves. */
const GhostArt = memo(function GhostArt({ item }: { item: DecorationItem }) {
  return (
    <DecorationSVG
      decorationType={item.type}
      decorationId={item.decorationId || item.id}
      variant={item.variant}
      size={item.size}
      className="block max-w-none"
      renderSvg={item.renderSvg}
      text={item.text || item.data?.text}
      customAssetUrl={item.customAssetUrl}
      pngUrl={item.pngUrl}
      pngWidth={item.pngWidth}
      pngHeight={item.pngHeight}
      pngFrames={item.pngFrames}
    />
  )
})

/**
 * Where an armed or dragged item will land. It keeps its own state and is
 * moved through a ref, so following the pointer redraws only this, not the
 * editor or the scene.
 */
const PlacementGhost = forwardRef<PlacementGhostHandle>(function PlacementGhost(_props, ref) {
  const [ghost, setGhost] = useState<{ item: DecorationItem; x: number; y: number } | null>(null)

  useImperativeHandle(ref, () => ({
    show: (item, { x, y }) =>
      setGhost((prev) => (prev && prev.item === item && prev.x === x && prev.y === y ? prev : { item, x, y })),
    hide: () => setGhost(null),
  }), [])

  if (!ghost) return null
  const { item, x, y } = ghost
  const { width, height } = getDecorationDimensions(item.decorationId || item.id, item.type, item.size || 'medium', item)
  // Always on top, even where it will land behind the house: you can see what you're carrying
  const layer = OVERLAY_DEPTH - 1

  return (
    <div
      className="absolute pointer-events-none opacity-70"
      data-placement-ghost=""
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex: layer,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        transform: isFlipped(item) ? 'scaleX(-1)' : undefined,
      }}
    >
      <GhostArt item={item} />
    </div>
  )
})

export default PlacementGhost
