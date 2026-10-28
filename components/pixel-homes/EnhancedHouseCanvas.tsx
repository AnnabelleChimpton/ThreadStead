import React, { memo, useMemo, useRef, useEffect, useState } from 'react'
import type { HouseTemplate, ColorPalette, HouseCustomizations, AtmosphereSettings } from './HouseSVG'
import DecorationSVG from './DecorationSVG'
import HouseSprite from './HouseSprite'
import { houseLayerSet, spriteDoorRect, spriteDrawable } from '@/lib/pixel-homes/house-layers'
import { SkyGradientDefs, GroundGradientDefs, TerrainDitherDefs, GrassTextureDefs, getSkyPatternCount, getGroundPatternCount, layoutDitherBands } from './DitherPatternDefs'
import { useSvgIdPrefix } from './useSvgIdPrefix'
import { DecorationItem, TERRAIN_TILES, isFlipped } from '@/lib/pixel-homes/decoration-data'
import { DEFAULT_DECORATION_GRID } from '@/lib/pixel-homes/decoration-grid-utils'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'
import type { ScenePointer } from '@/lib/pixel-homes/editor-interaction'
import { pickPixelScale } from '@/lib/pixel-homes/pixel-scale'
import { decorationDepth, houseDepth, HOUSE_BOX } from '@/lib/pixel-homes/depth'
import { animatedSpriteIds } from '@/lib/pixel-homes/sprite-animation'
import { canHaveNote, decorationNote } from '@/lib/pixel-homes/decoration-note'

/** A pointer event over the scene, in scene coordinates (see lib/pixel-homes/editor-interaction.ts). */
export type ScenePointerKind = 'down' | 'move' | 'up' | 'cancel' | 'leave'

interface EnhancedHouseCanvasProps {
  template: HouseTemplate
  palette: ColorPalette
  className?: string
  decorations?: DecorationItem[]
  houseCustomizations?: HouseCustomizations
  atmosphere?: AtmosphereSettings
  terrain?: Record<string, string> // Map of "x,y" grid coords to terrainId
  isDecorationMode?: boolean
  selectedDecorations?: Set<string>
  isDeleting?: boolean
  /**
   * Every pointer event over the scene (mouse, pen and touch alike). A press
   * captures the pointer, so the move and release arrive even off the scene.
   * Passing this makes the scene an editing surface (no touch scrolling).
   */
  onScenePointer?: (kind: ScenePointerKind, pointer: ScenePointer, event: React.PointerEvent) => void
  /** Drawn on top of the scene, in scene coordinates (the editor's placement ghost). */
  overlay?: React.ReactNode
  onScaleChange?: (scale: number) => void
  /**
   * Show the scene at a whole number of device pixels per art pixel (2x, 1.5x,
   * 1x…) so hand-drawn sprites stay crisp. When even 1x doesn't fit, the scene
   * keeps 1x and crops evenly on both sides (the house is at its centre)
   * instead of shrinking.
   * Off by default: the editor and small previews still fit to their box.
   */
  pixelPerfect?: boolean
  /**
   * With pixelPerfect: fit the scene inside the parent's box (width and
   * height), centred, instead of the page's width. The parent must have a
   * definite height. Used by the editor, which also allows scales under 1x.
   */
  fitBox?: boolean
  /** With pixelPerfect: centred in a frame wider than the scene, instead of at its left */
  centered?: boolean
  /**
   * With pixelPerfect: always this whole-number scale, never measured (admin
   * previews of a sprite at exactly 1x and 2x). The frame crops what doesn't fit.
   */
  fixedScale?: number
  /** Extra attributes for the scene element (keyboard focus, labels). */
  sceneProps?: React.HTMLAttributes<HTMLDivElement>
  /** Makes the drawn front door a link (the way inside). */
  door?: { href: string; label: string }
  /** Makes a placed mailbox decoration open the guestbook. */
  onMailboxClick?: () => void
  /**
   * Makes decorations with an owner's note clickable (lib/pixel-homes/
   * decoration-note.ts). The page shows the note beside the scene; nothing
   * is drawn over the art except a dotted outline on hover and focus.
   */
  onNoteClick?: (item: DecorationItem) => void
  /** The decoration whose note is showing, so it keeps its outline. */
  openNoteId?: string | null
}

// Enhanced canvas dimensions - grid-aligned (divisible by 16px cell size)
const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 352

// Zone definitions for decoration placement (grid-aligned to 16px)
const DECORATION_ZONES = {
  background: {
    x: 0, y: 0,
    width: CANVAS_WIDTH, height: 96, // 6 grid cells, sky area
    label: 'Background & Sky'
  },
  front_yard: {
    x: 0, y: 96,
    width: CANVAS_WIDTH, height: 256, // 16 grid cells, decoration area to bottom
    label: 'Front Yard'
  },
  house_facade: {
    x: 156, y: 152,
    width: 200, height: 120, // House area
    label: 'House'
  }
}

export { pickPixelScale }

// Room kept below the scene for the page header and the row of actions, so
// a big scene doesn't push them off a laptop screen
const SCENE_HEIGHT_RESERVE = 240

// The front door of each template, in house coordinates (HouseSVG's 200x180 viewBox)
const DOOR_RECTS: Record<string, { x: number; y: number; width: number; height: number }> = {
  cottage_v1: { x: 90, y: 135, width: 20, height: 35 },
  townhouse_v1: { x: 90, y: 135, width: 20, height: 35 },
  loft_v1: { x: 90, y: 140, width: 20, height: 30 },
  cabin_v1: { x: 90, y: 120, width: 20, height: 30 },
}

// House positioning within the larger canvas (centered for 512px width)
const HOUSE_POSITION = HOUSE_BOX

// Each layer below is memoized, so a change to one (a painted cell, a moved
// sprite, a new selection) redraws only that layer, and nothing redraws while
// the pointer just moves.

const BASE_SKY_COLORS: Record<string, string> = {
  sunny: '#C8F0FF',
  cloudy: '#E0E8F0',
  sunset: '#FFD090',
  night: '#1A1A60'
}

const SkyLayer = memo(function SkyLayer({ sky, idPrefix }: { sky: AtmosphereSettings['sky']; idPrefix: string }) {
  const zone = DECORATION_ZONES.background

  // Pixel-perfect band heights for this sky type
  const bands = layoutDitherBands(getSkyPatternCount(sky), zone.height).map(band => ({
    ...band,
    pattern: `${idPrefix}-sky-${sky}-${band.index}`
  }))

  return (
    <svg
      className="absolute"
      style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height, zIndex: 1 }}
      viewBox={`0 0 ${zone.width} ${zone.height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      <SkyGradientDefs prefix={idPrefix} sky={sky} />
      {/* Base fill to prevent any gaps */}
      <rect x="0" y="0" width={zone.width} height={zone.height} fill={BASE_SKY_COLORS[sky] || '#87CEEB'} />
      {/* Dithered sky bands with pixel-perfect heights */}
      {bands.map((band, i) => (
        <rect key={i} x="0" y={band.y} width={zone.width} height={band.height} fill={`url(#${band.pattern})`} />
      ))}
      {/* Stars for night sky */}
      {sky === 'night' && (
        <g>
          <rect x="32" y="16" width="2" height="2" fill="#FFFFFF" opacity="0.8" />
          <rect x="120" y="32" width="2" height="2" fill="#FFFFFF" opacity="0.6" />
          <rect x="200" y="12" width="2" height="2" fill="#FFFFFF" opacity="0.9" />
          <rect x="350" y="24" width="2" height="2" fill="#FFFFFF" opacity="0.7" />
          <rect x="420" y="48" width="2" height="2" fill="#FFFFFF" opacity="0.8" />
          <rect x="80" y="60" width="1" height="1" fill="#FFFFFF" opacity="0.5" />
          <rect x="280" y="40" width="1" height="1" fill="#FFFFFF" opacity="0.6" />
          <rect x="380" y="8" width="1" height="1" fill="#FFFFFF" opacity="0.7" />
        </g>
      )}
    </svg>
  )
})

const GroundLayer = memo(function GroundLayer({ idPrefix }: { idPrefix: string }) {
  const zone = DECORATION_ZONES.front_yard

  // Pixel-perfect band heights for the ground gradient
  const bands = layoutDitherBands(getGroundPatternCount(), zone.height).map(band => ({
    ...band,
    pattern: `${idPrefix}-ground-${band.index}`
  }))

  // Calculate grass texture overlay positions (integer division)
  const halfHeight = Math.floor(zone.height / 2)

  return (
    <svg
      className="absolute"
      style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height, zIndex: 2 }}
      viewBox={`0 0 ${zone.width} ${zone.height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      <GroundGradientDefs prefix={idPrefix} />
      <GrassTextureDefs prefix={idPrefix} />
      {/* Base fill to prevent any gaps (top grass color) */}
      <rect x="0" y="0" width={zone.width} height={zone.height} fill="#90EE90" />
      {/* Dithered grass bands with pixel-perfect heights */}
      {bands.map((band, i) => (
        <rect key={i} x="0" y={band.y} width={zone.width} height={band.height} fill={`url(#${band.pattern})`} />
      ))}
      {/* Grass blade texture overlay - sparse at horizon, denser in foreground */}
      <rect x="0" y="0" width={zone.width} height={halfHeight} fill={`url(#${idPrefix}-grass-blades)`} />
      <rect x="0" y={halfHeight} width={zone.width} height={zone.height - halfHeight} fill={`url(#${idPrefix}-grass-blades-dense)`} />
    </svg>
  )
})

// Map terrain IDs to dither pattern IDs
const TERRAIN_PATTERNS: Record<string, string> = {
  'dirt': 'terrain-dirt',
  'stone_path': 'terrain-stone',
  'brick_path': 'terrain-brick',
  'water': 'terrain-water',
  'sand': 'terrain-sand',
  'gravel': 'terrain-gravel',
  'flower_bed': 'terrain-flowerbed',
  'wood_deck': 'terrain-wood',
  'cobblestone': 'terrain-cobble',
  'mulch': 'terrain-dirt',
  'moss': 'terrain-flowerbed',
  'pebbles': 'terrain-gravel'
}

// The terrain <svg> stays mounted even with no tiles: unmounting it re-created
// its patterns whenever the first tile was painted or the last one erased.
const TerrainLayer = memo(function TerrainLayer({ terrain, idPrefix }: { terrain: Record<string, string>; idPrefix: string }) {
  return (
    <svg
      className="absolute inset-0"
      style={{ zIndex: 3 }}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      <TerrainDitherDefs prefix={idPrefix} />
      {Object.entries(terrain).map(([key, tileId]) => {
        // Grass is already the ground layer
        if (tileId === 'grass') return null
        const tile = TERRAIN_TILES.find(t => t.id === tileId)
        if (!tile) return null

        const [gridX, gridY] = key.split(',').map(Number)
        const patternId = TERRAIN_PATTERNS[tileId]
        const size = DEFAULT_DECORATION_GRID.cellSize + 1

        return (
          <rect
            key={key}
            x={gridX * DEFAULT_DECORATION_GRID.cellSize}
            y={gridY * DEFAULT_DECORATION_GRID.cellSize}
            width={size}
            height={size}
            fill={patternId ? `url(#${idPrefix}-${patternId})` : tile.color}
          >
            <title>{tile.name}</title>
          </rect>
        )
      })}
    </svg>
  )
})

const HouseLayer = memo(function HouseLayer({
  template,
  palette,
  customizations
}: {
  template: HouseTemplate
  palette: ColorPalette
  customizations: HouseCustomizations
}) {
  return (
    <div
      className="absolute"
      style={{
        left: HOUSE_POSITION.x,
        top: HOUSE_POSITION.y,
        width: HOUSE_POSITION.width,
        height: HOUSE_POSITION.height,
        // In the same sort as the decorations: things whose feet are above
        // its sort line stand behind it (lib/pixel-homes/depth.ts)
        zIndex: houseDepth()
      }}
    >
      <HouseSprite template={template} palette={palette} customizations={customizations} className="w-full h-full" />
    </div>
  )
})

interface DecorationSpriteProps {
  item: DecorationItem
  selected: boolean
  /** The editor's surface: sprites show a pointer and carry their id for hit-testing. */
  editable: boolean
  deleting: boolean
  /** One of the few frame strips on this home allowed to play */
  animate: boolean
  onMailboxClick?: () => void
  onNoteClick?: (item: DecorationItem) => void
  noteOpen: boolean
}

/** One placed decoration, redrawn only when it or its selection changes. */
const DecorationSprite = memo(function DecorationSprite({ item, selected, editable, deleting, animate, onMailboxClick, onNoteClick, noteOpen }: DecorationSpriteProps) {
  const decorationKey = item.decorationId || item.id
  const { width, height } = getDecorationDimensions(decorationKey, item.type, item.size || 'medium', item)

  // Bottom-aligned in its box, so sprites stand on the same line
  const wrapperStyle: React.CSSProperties = {
    left: item.position?.x || 0,
    top: item.position?.y || 0,
    width,
    height,
    zIndex: decorationDepth(item),
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    pointerEvents: 'none' // only the art itself takes the pointer
  }

  const art = (
    <DecorationSVG
      decorationType={item.type}
      decorationId={decorationKey}
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
      animate={animate}
    />
  )

  // A placed mailbox is the guestbook, for visitors
  if (onMailboxClick && decorationKey === 'mailbox') {
    return (
      <div className="absolute ts-pixel-hop" style={wrapperStyle}>
        <button
          type="button"
          onClick={onMailboxClick}
          aria-label="Mailbox (guestbook)"
          className="ts-bare ts-scene-hotspot pointer-events-auto block cursor-pointer bg-transparent p-0 border-0"
        >
          {art}
        </button>
      </div>
    )
  }

  // A decoration the owner wrote a note on opens it, for visitors
  if (onNoteClick && canHaveNote(decorationKey) && decorationNote(item)) {
    return (
      <div className="absolute ts-pixel-hop" style={wrapperStyle}>
        <button
          type="button"
          onClick={() => onNoteClick(item)}
          aria-expanded={noteOpen}
          aria-controls="ts-decoration-note"
          aria-label="Read the owner's note"
          className={`ts-bare ts-scene-hotspot ts-scene-note pointer-events-auto block cursor-pointer bg-transparent p-0 border-0${noteOpen ? ' is-open' : ''}`}
          style={isFlipped(item) ? { transform: 'scaleX(-1)' } : undefined}
        >
          {art}
        </button>
      </div>
    )
  }

  // Appearing (the page loading, or just planted) is a 1-pixel hop.
  // In delete mode, hovering marks the art like selection does, in red,
  // and never scales or tints it.
  return (
    <div className="absolute ts-pixel-hop" style={wrapperStyle}>
      <div
        data-decoration-id={editable ? item.id : undefined}
        className={`pointer-events-auto ${editable ? 'cursor-pointer' : ''} ${deleting ? 'hover:outline-1 hover:outline-dotted hover:outline-offset-1 hover:outline-[#c4473a]' : ''}`}
        style={{
          ...(selected && { outline: '1px dotted #4a403d', outlineOffset: 1 }),
          ...(isFlipped(item) && { transform: 'scaleX(-1)' })
        }}
      >
        {art}
      </div>
    </div>
  )
})

const NO_SELECTION: Set<string> = new Set()

const DecorationsLayer = memo(function DecorationsLayer({
  decorations,
  selected,
  editable,
  deleting,
  onMailboxClick,
  onNoteClick,
  openNoteId
}: {
  decorations: DecorationItem[]
  selected: Set<string>
  editable: boolean
  deleting: boolean
  onMailboxClick?: () => void
  onNoteClick?: (item: DecorationItem) => void
  openNoteId?: string | null
}) {
  // At most a few strips play at once on a home; the rest hold their first frame
  const playing = useMemo(() => animatedSpriteIds(decorations), [decorations])
  return (
    // No z-index of its own, so each sprite sorts against the house
    <div className="absolute inset-0">
      {decorations.map(item => (
        <DecorationSprite
          key={item.id}
          item={item}
          selected={selected.has(item.id)}
          editable={editable}
          deleting={deleting}
          animate={playing.has(item.id)}
          onMailboxClick={onMailboxClick}
          onNoteClick={onNoteClick}
          noteOpen={openNoteId === item.id}
        />
      ))}
    </div>
  )
})

export default function EnhancedHouseCanvas({
  template,
  palette,
  className = '',
  decorations = [],
  houseCustomizations,
  atmosphere,
  terrain,
  isDecorationMode = false,
  selectedDecorations = NO_SELECTION,
  isDeleting = false,
  onScenePointer,
  overlay,
  onScaleChange,
  pixelPerfect = false,
  fixedScale,
  fitBox = false,
  centered = false,
  sceneProps,
  door,
  onMailboxClick,
  onNoteClick,
  openNoteId
}: EnhancedHouseCanvasProps) {
  // Refs and state for responsive scaling
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(fixedScale ?? 1)

  // Scopes this canvas's sky, ground and terrain pattern ids (several canvases can share a page)
  const idPrefix = useSvgIdPrefix()

  // pixelPerfect: pick a whole-number scale from the frame's width
  useEffect(() => {
    if (!pixelPerfect || !frameRef.current) return
    if (fixedScale) {
      setScale(fixedScale)
      return
    }
    const frame = frameRef.current
    const update = (width: number, height: number) => {
      const k = fitBox
        ? pickPixelScale(width, window.devicePixelRatio || 1, height, { allowBelowOne: true })
        : pickPixelScale(width, window.devicePixelRatio || 1, window.innerHeight - SCENE_HEIGHT_RESERVE)
      setScale(k)
      onScaleChange?.(k)
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) update(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [pixelPerfect, fitBox, fixedScale, onScaleChange])

  // ResizeObserver to calculate scale based on container width
  useEffect(() => {
    if (pixelPerfect || !containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        const calculatedScale = width / CANVAS_WIDTH
        setScale(calculatedScale)
        onScaleChange?.(calculatedScale)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [onScaleChange, pixelPerfect])

  const editable = !!onScenePointer

  // One handler for mouse, pen and touch, in scene coordinates
  const handlePointer = (kind: ScenePointerKind) => (event: React.PointerEvent<HTMLDivElement>) => {
    // A second finger is not primary; it never moves or plants anything
    if (!onScenePointer || event.isPrimary === false) return
    if (kind === 'down') {
      if (event.button > 0) return // only the main button (touch and pen report 0)
      // Keep the move and release coming here even off the scene, and stop
      // the browser starting a text selection or image drag
      event.currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
    const hit = kind === 'down'
      ? (event.target as Element | null)?.closest?.('[data-decoration-id]')?.getAttribute('data-decoration-id') ?? null
      : null
    onScenePointer(kind, {
      x,
      y,
      inside: x >= 0 && y >= 0 && x <= CANVAS_WIDTH && y <= CANVAS_HEIGHT,
      decorationId: hit,
      screenScale: scale
    }, event)
  }

  const sceneStyle: React.CSSProperties = pixelPerfect
    ? {
        // Exactly 512k x 352k, nothing inside the box to shave a pixel off
        width: CANVAS_WIDTH * scale,
        height: CANVAS_HEIGHT * scale,
        // Left-aligned when it fits (or centred, with centered); when the frame
        // is narrower, a negative margin centres it, so the house (at the
        // scene's centre) stays in view. Pure CSS, so it's right before any
        // measuring runs.
        marginLeft: fitBox ? undefined : centered
          ? `calc((100% - ${CANVAS_WIDTH * scale}px) / 2)`
          : `min(0px, calc((100% - ${CANVAS_WIDTH * scale}px) / 2))`,
        flexShrink: 0,
        imageRendering: 'pixelated',
        background: '#f0f8ff'
      }
    : {
        width: '100%',
        maxWidth: CANVAS_WIDTH,
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        background: '#f0f8ff' // Light sky blue base
      }

  return (
    <div
      ref={frameRef}
      className={`relative ${pixelPerfect && fitBox ? 'flex items-center justify-center' : ''} ${className}`}
      style={pixelPerfect ? { overflow: 'hidden' } : undefined}
    >
      <div
        {...sceneProps}
        ref={containerRef}
        data-scene=""
        // An editing surface: touch drags edit instead of scrolling, and nothing gets text-selected
        className={`${pixelPerfect ? 'relative overflow-hidden' : 'relative border-2 border-gray-300 rounded-lg overflow-hidden'}${editable ? ' touch-none select-none' : ''}`}
        style={sceneStyle}
        onPointerDown={editable ? handlePointer('down') : undefined}
        onPointerMove={editable ? handlePointer('move') : undefined}
        onPointerUp={editable ? handlePointer('up') : undefined}
        onPointerCancel={editable ? handlePointer('cancel') : undefined}
        onPointerLeave={editable ? handlePointer('leave') : undefined}
        onDragStart={editable ? (e) => e.preventDefault() : undefined}
      >
        {/* Scaled content wrapper - scales all content proportionally */}
        <div
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'relative'
          }}
        >
          <SkyLayer sky={atmosphere?.sky ?? 'sunny'} idPrefix={idPrefix} />
          <GroundLayer idPrefix={idPrefix} />
          <TerrainLayer terrain={terrain ?? NO_TERRAIN} idPrefix={idPrefix} />
          <DecorationsLayer
            decorations={decorations}
            selected={selectedDecorations}
            editable={editable}
            deleting={isDeleting}
            onMailboxClick={isDecorationMode ? undefined : onMailboxClick}
            onNoteClick={isDecorationMode || editable ? undefined : onNoteClick}
            openNoteId={openNoteId}
          />
          <HouseLayer template={template} palette={palette} customizations={houseCustomizations ?? NO_CUSTOMIZATIONS} />

          {/* The drawn front door is the way inside. No visible chrome: the
              cursor changes, and keyboard focus gets a dotted ring. */}
          {door && !isDecorationMode && (() => {
            const sprite = houseLayerSet(template)
            const rect = sprite && spriteDrawable(sprite, houseCustomizations as Record<string, unknown> | undefined)
              ? spriteDoorRect(template)
              : DOOR_RECTS[template] ?? DOOR_RECTS.cottage_v1
            return (
              <a
                href={door.href}
                aria-label={door.label}
                title={door.label}
                className="ts-scene-hotspot absolute block cursor-pointer"
                style={{
                  left: HOUSE_POSITION.x + rect.x,
                  top: HOUSE_POSITION.y + rect.y,
                  width: rect.width,
                  height: rect.height,
                  zIndex: houseDepth() + 1
                }}
              />
            )
          })()}

          {overlay}

        </div>
      </div>

    </div>
  )
}

const NO_TERRAIN: Record<string, string> = {}
const NO_CUSTOMIZATIONS: HouseCustomizations = {}
