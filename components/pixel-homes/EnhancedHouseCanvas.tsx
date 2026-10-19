import React, { useRef, useEffect, useState } from 'react'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations, AtmosphereSettings } from './HouseSVG'
import DecorationSVG from './DecorationSVG'
import AnimatedDecoration from './DecorationAnimations'
import { SkyGradientDefs, GroundGradientDefs, TerrainDitherDefs, GrassTextureDefs, getSkyPatternCount, getGroundPatternCount, layoutDitherBands } from './DitherPatternDefs'
import { useSvgIdPrefix } from './useSvgIdPrefix'
import { DecorationItem, TERRAIN_TILES, TerrainTile } from '@/lib/pixel-homes/decoration-data'
import { DEFAULT_DECORATION_GRID, getDecorationGridSize } from '@/lib/pixel-homes/decoration-grid-utils'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'

interface EnhancedHouseCanvasProps {
  template: HouseTemplate
  palette: ColorPalette
  className?: string
  decorations?: DecorationItem[]
  houseCustomizations?: HouseCustomizations
  atmosphere?: AtmosphereSettings
  terrain?: Record<string, string> // Map of "x,y" grid coords to terrainId
  isDecorationMode?: boolean
  onDecorationClick?: (decorationId: string, event: React.MouseEvent) => void
  onDecorationMouseDown?: (decorationId: string, event: React.MouseEvent) => void
  // Animation props
  animatedDecorations?: Map<string, 'place' | 'remove' | 'select' | 'hover'>
  recentlyPlaced?: Set<string>
  selectedDecorations?: Set<string>
  onAnimationComplete?: (decorationId: string) => void
  // Interaction props
  isPlacing?: boolean
  isDeleting?: boolean
  previewPosition?: { x: number; y: number } | null
  previewItem?: DecorationItem | null
  onClick?: (x: number, y: number, event: React.MouseEvent) => void
  onMouseDown?: (x: number, y: number, event: React.MouseEvent) => void
  onMouseMove?: (x: number, y: number, event: React.MouseEvent) => void
  onMouseLeave?: () => void
  onScaleChange?: (scale: number) => void
  /**
   * Show the scene at a whole number of device pixels per art pixel (2x, 1.5x,
   * 1x…) so hand-drawn sprites stay crisp. When even 1x doesn't fit, the scene
   * keeps 1x and crops evenly on both sides (the house is at its centre)
   * instead of shrinking.
   * Off by default: the editor and small previews still fit to their box.
   */
  pixelPerfect?: boolean
  /** Makes the drawn front door a link (the way inside). */
  door?: { href: string; label: string }
  /** Makes a placed mailbox decoration open the guestbook. */
  onMailboxClick?: () => void
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

// CSS scales tried for pixelPerfect, largest first. A scale only counts when
// scale x devicePixelRatio is a whole number, so art pixels map to device pixels.
const PIXEL_SCALES = [3, 2, 1.5, 1]

export function pickPixelScale(
  availableWidth: number,
  devicePixelRatio: number,
  availableHeight: number = Infinity
): number {
  for (const k of PIXEL_SCALES) {
    if (
      CANVAS_WIDTH * k <= availableWidth &&
      CANVAS_HEIGHT * k <= availableHeight &&
      Number.isInteger(k * devicePixelRatio)
    ) return k
  }
  return 1
}

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
const HOUSE_POSITION = {
  x: 156, // Centered: (512 - 200) / 2 = 156
  y: 32, // 2 grid cells from top
  width: 200, // Larger house
  height: 180 // Proportional height - back to original house proportions
}

export default function EnhancedHouseCanvas({
  template,
  palette,
  className = '',
  decorations = [],
  houseCustomizations = {},
  atmosphere = { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' },
  terrain = {},
  isDecorationMode = false,
  onDecorationClick,
  onDecorationMouseDown,
  animatedDecorations,
  recentlyPlaced,
  selectedDecorations,
  onAnimationComplete,
  isPlacing,
  isDeleting,
  previewPosition,
  previewItem,
  onClick,
  onMouseDown,
  onMouseMove,
  onMouseLeave,
  onScaleChange,
  pixelPerfect = false,
  door,
  onMailboxClick
}: EnhancedHouseCanvasProps) {
  // Refs and state for responsive scaling
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // Scopes this canvas's sky, ground and terrain pattern ids (several canvases can share a page)
  const idPrefix = useSvgIdPrefix()

  // pixelPerfect: pick a whole-number scale from the frame's width
  useEffect(() => {
    if (!pixelPerfect || !frameRef.current) return
    const frame = frameRef.current
    const update = (width: number) => {
      const k = pickPixelScale(width, window.devicePixelRatio || 1, window.innerHeight - SCENE_HEIGHT_RESERVE)
      setScale(k)
      onScaleChange?.(k)
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) update(entry.contentRect.width)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [pixelPerfect, onScaleChange])

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

  const handleInteraction = (
    event: React.MouseEvent,
    handler?: (x: number, y: number, event: React.MouseEvent) => void
  ) => {
    if (!handler) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
    handler(x, y, event)
  }

  const renderBackground = () => {
    const zone = DECORATION_ZONES.background

    // Pixel-perfect band heights for this sky type
    const patternCount = getSkyPatternCount(atmosphere.sky)
    const bands = layoutDitherBands(patternCount, zone.height).map(band => ({
      ...band,
      pattern: `${idPrefix}-sky-${atmosphere.sky}-${band.index}`
    }))

    // Base sky colors for fallback fill (last/bottom color of each sky type)
    const baseSkyColors: Record<string, string> = {
      sunny: '#C8F0FF',
      cloudy: '#E0E8F0',
      sunset: '#FFD090',
      night: '#1A1A60'
    }

    return (
      <svg
        className="absolute"
        style={{
          left: zone.x,
          top: zone.y,
          width: zone.width,
          height: zone.height,
          zIndex: 1
        }}
        viewBox={`0 0 ${zone.width} ${zone.height}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        <SkyGradientDefs prefix={idPrefix} sky={atmosphere.sky} />
        {/* Base fill to prevent any gaps */}
        <rect x="0" y="0" width={zone.width} height={zone.height} fill={baseSkyColors[atmosphere.sky] || '#87CEEB'} />
        {/* Dithered sky bands with pixel-perfect heights */}
        {bands.map((band, i) => (
          <rect
            key={i}
            x="0"
            y={band.y}
            width={zone.width}
            height={band.height}
            fill={`url(#${band.pattern})`}
          />
        ))}
        {/* Stars for night sky */}
        {atmosphere.sky === 'night' && (
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
  }

  const renderFrontYard = () => {
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
        style={{
          left: zone.x,
          top: zone.y,
          width: zone.width,
          height: zone.height,
          zIndex: 2
        }}
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
          <rect
            key={i}
            x="0"
            y={band.y}
            width={zone.width}
            height={band.height}
            fill={`url(#${band.pattern})`}
          />
        ))}
        {/* Grass blade texture overlay - sparse at horizon, denser in foreground */}
        <rect
          x="0"
          y="0"
          width={zone.width}
          height={halfHeight}
          fill={`url(#${idPrefix}-grass-blades)`}
        />
        <rect
          x="0"
          y={halfHeight}
          width={zone.width}
          height={zone.height - halfHeight}
          fill={`url(#${idPrefix}-grass-blades-dense)`}
        />
      </svg>
    )
  }

  // The terrain <svg> stays mounted even with no tiles: unmounting it re-created
  // its patterns whenever the first tile was painted or the last one erased.
  const renderTerrain = () => {
    // Map terrain IDs to dither pattern IDs
    const terrainPatternMap: Record<string, string> = {
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

    return (
      <svg
        className="absolute inset-0"
        style={{ zIndex: 3 }}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        <TerrainDitherDefs prefix={idPrefix} />
        {Object.entries(terrain || {}).map(([key, tileId]) => {
          const [gridX, gridY] = key.split(',').map(Number)
          const tile = TERRAIN_TILES.find(t => t.id === tileId)
          if (!tile) return null

          const patternId = terrainPatternMap[tileId]
          const x = gridX * DEFAULT_DECORATION_GRID.cellSize
          const y = gridY * DEFAULT_DECORATION_GRID.cellSize
          const size = DEFAULT_DECORATION_GRID.cellSize + 1

          // Skip grass tiles - they're already in the ground layer
          if (tileId === 'grass') return null

          return (
            <rect
              key={key}
              x={x}
              y={y}
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
  }

  const renderDecorations = () => {
    return (
      <div className="absolute inset-0" style={{ zIndex: 10 }}>
        {decorations.map(item => {
          // Determine if this decoration should be animated
          const hasAnimations = animatedDecorations || recentlyPlaced || selectedDecorations
          const animationType = recentlyPlaced?.has(item.id) ? 'place' :
            selectedDecorations?.has(item.id) ? 'select' :
              animatedDecorations?.get(item.id) || undefined

          // Calculate actual dimensions for proper alignment and sizing
          const dimensions = getDecorationDimensions(item.decorationId || item.id, item.type, item.size || 'medium')
          const pixelWidth = dimensions.width
          const pixelHeight = dimensions.height

          // Wrapper style for bottom alignment
          const wrapperStyle: React.CSSProperties = {
            left: item.position?.x || 0,
            top: item.position?.y || 0,
            width: pixelWidth,
            height: pixelHeight,
            zIndex: item.position?.layer || 10,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pointerEvents: 'none' // Allow clicks to pass through wrapper
          }

          // Use AnimatedDecoration if animations are available and this decoration needs animation
          if (hasAnimations && animationType) {
            return (
              <div
                key={item.id}
                className="absolute"
                style={wrapperStyle}
              >
                <div
                  className={`pointer-events-auto transition-all duration-150 ${isDeleting ? 'cursor-pointer hover:outline hover:outline-3 hover:outline-red-500 hover:outline-offset-2 rounded hover:scale-110 hover:brightness-90' : ''}`}
                  onClick={onDecorationClick ? (e) => onDecorationClick(item.id, e) : undefined}
                  onMouseDown={onDecorationMouseDown ? (e) => onDecorationMouseDown(item.id, e) : undefined}
                >
                  <AnimatedDecoration
                    decorationType={item.type}
                    decorationId={item.decorationId || item.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')}
                    variant={item.variant}
                    size={item.size}
                    position={{ x: 0, y: 0 }} // Position handled by wrapper
                    animationType={animationType}
                    onAnimationComplete={() => onAnimationComplete?.(item.id)}
                    className="cursor-pointer block"
                  />
                </div>
              </div>
            )
          }

          const decorationKey = item.decorationId || item.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')

          // A placed mailbox is the guestbook, for visitors
          if (onMailboxClick && !isDecorationMode && decorationKey === 'mailbox') {
            return (
              <div key={item.id} className="absolute" style={wrapperStyle}>
                <button
                  type="button"
                  onClick={onMailboxClick}
                  aria-label="Mailbox (guestbook)"
                  className="ts-bare ts-scene-hotspot pointer-events-auto block cursor-pointer bg-transparent p-0 border-0"
                >
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
                  />
                </button>
              </div>
            )
          }

          // Use static decoration for non-animated items
          return (
            <div
              key={item.id}
              className="absolute"
              style={wrapperStyle}
            >
              <div
                className={`pointer-events-auto transition-all duration-150 ${onDecorationClick || onDecorationMouseDown ? 'cursor-pointer' : ''} ${isDeleting ? 'hover:outline hover:outline-3 hover:outline-red-500 hover:outline-offset-2 rounded hover:scale-110 hover:brightness-90' : ''}`}
                onClick={onDecorationClick ? (e) => onDecorationClick(item.id, e) : undefined}
                onMouseDown={onDecorationMouseDown ? (e) => onDecorationMouseDown(item.id, e) : undefined}
              >
                <DecorationSVG
                  decorationType={item.type}
                  decorationId={item.decorationId || item.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')}
                  variant={item.variant}
                  size={item.size}
                  className="drop-shadow-sm block max-w-none"
                  renderSvg={item.renderSvg}
                  text={item.text || item.data?.text}
                  customAssetUrl={item.customAssetUrl}
                  pngUrl={item.pngUrl}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const sceneStyle: React.CSSProperties = pixelPerfect
    ? {
        // Exactly 512k x 352k, nothing inside the box to shave a pixel off
        width: CANVAS_WIDTH * scale,
        height: CANVAS_HEIGHT * scale,
        // Left-aligned when it fits; when the frame is narrower, a negative
        // margin centres it, so the house (at the scene's centre) stays in view.
        // Pure CSS, so it's right before any measuring runs.
        marginLeft: `min(0px, calc((100% - ${CANVAS_WIDTH * scale}px) / 2))`,
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
      className={`relative ${className}`}
      style={pixelPerfect ? { overflow: 'hidden' } : undefined}
    >
      <div
        ref={containerRef}
        className={pixelPerfect ? 'relative overflow-hidden' : 'relative border-2 border-gray-300 rounded-lg overflow-hidden'}
        style={sceneStyle}
        onClick={(e) => handleInteraction(e, onClick)}
        onMouseDown={(e) => handleInteraction(e, onMouseDown)}
        onMouseMove={(e) => handleInteraction(e, onMouseMove)}
        onMouseLeave={onMouseLeave}
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
          {/* Background Layer (Sky, weather effects) */}
          {renderBackground()}

          {/* Front Yard Layer (Grass, decorations) */}
          {renderFrontYard()}

          {/* Terrain Layer (Painted tiles) */}
          {renderTerrain()}

          {/* Decorations Layer (Above grass, below house) */}
          {renderDecorations()}

          {/* House Layer (Centered in canvas) */}
          <div
            className="absolute"
            style={{
              left: HOUSE_POSITION.x,
              top: HOUSE_POSITION.y,
              width: HOUSE_POSITION.width,
              height: HOUSE_POSITION.height,
              zIndex: 5
            }}
          >
            <HouseSVG
              template={template}
              palette={palette}
              customizations={houseCustomizations}
              className="w-full h-full drop-shadow-lg"
            />
          </div>

          {/* The drawn front door is the way inside. No visible chrome: the
              cursor changes, and keyboard focus gets a dotted ring. */}
          {door && !isDecorationMode && (() => {
            const rect = DOOR_RECTS[template] ?? DOOR_RECTS.cottage_v1
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
                  zIndex: 6
                }}
              />
            )
          })()}

          {/* Preview Item (Ghost) */}
          {previewPosition && previewItem && (
            <div
              className="absolute pointer-events-none opacity-70 animate-pulse"
              style={{
                left: previewPosition.x,
                top: previewPosition.y,
                width: (() => {
                  const dimensions = getDecorationDimensions(previewItem.id, previewItem.type, previewItem.size || 'medium')
                  return dimensions.width
                })(),
                height: (() => {
                  const dimensions = getDecorationDimensions(previewItem.id, previewItem.type, previewItem.size || 'medium')
                  return dimensions.height
                })(),
                zIndex: (() => {
                  let baseLayer = 300000
                  if (previewItem.type === 'path') baseLayer = 100000
                  else if (previewItem.type === 'water') baseLayer = 200000

                  // Calculate actual height for sorting
                  const dimensions = getDecorationDimensions(previewItem.id, previewItem.type, previewItem.size || 'medium')
                  const pixelHeight = dimensions.height
                  const bottomY = Math.round(previewPosition.y + pixelHeight)

                  return baseLayer + (bottomY * 1000) + Math.round(previewPosition.x)
                })(),
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}
            >
              <DecorationSVG
                decorationType={previewItem.type}
                decorationId={previewItem.decorationId || previewItem.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')}
                variant={previewItem.variant}
                size={previewItem.size}
                className="block max-w-none"
                customAssetUrl={previewItem.customAssetUrl}
                pngUrl={previewItem.pngUrl}
              />
            </div>
          )}

          {/* Decoration Mode Overlay */}
          {isDecorationMode && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
              {/* Zone guides */}
              <div
                className="absolute border-2 border-dashed border-blue-300 opacity-50"
                style={{
                  left: DECORATION_ZONES.background.x,
                  top: DECORATION_ZONES.background.y,
                  width: DECORATION_ZONES.background.width,
                  height: DECORATION_ZONES.background.height
                }}
              >
                <div className="absolute top-1 left-1 text-xs text-blue-600 font-medium bg-white/80 px-1 rounded">
                  {DECORATION_ZONES.background.label}
                </div>
              </div>

              <div
                className="absolute border-2 border-dashed border-green-300 opacity-50"
                style={{
                  left: DECORATION_ZONES.front_yard.x,
                  top: DECORATION_ZONES.front_yard.y,
                  width: DECORATION_ZONES.front_yard.width,
                  height: DECORATION_ZONES.front_yard.height
                }}
              >
                <div className="absolute top-1 left-1 text-xs text-green-600 font-medium bg-white/80 px-1 rounded">
                  {DECORATION_ZONES.front_yard.label}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}