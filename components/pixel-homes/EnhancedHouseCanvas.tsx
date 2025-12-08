import React, { useRef, useEffect, useState } from 'react'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations, AtmosphereSettings } from './HouseSVG'
import DecorationSVG from './DecorationSVG'
import AnimatedDecoration from './DecorationAnimations'
import { SkyDitherDefs, TerrainDitherDefs, GrassTextureDefs, getSkyPatternCount, getGroundPatternCount } from './DitherPatternDefs'
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
  onScaleChange
}: EnhancedHouseCanvasProps) {
  // Refs and state for responsive scaling
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // ResizeObserver to calculate scale based on container width
  useEffect(() => {
    if (!containerRef.current) return

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
  }, [onScaleChange])

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

    // Get the number of pattern bands for this sky type
    const patternCount = getSkyPatternCount(atmosphere.sky)

    // Calculate pixel-perfect band heights (distribute remainder evenly)
    const baseHeight = Math.floor(zone.height / patternCount)
    const extraPixels = zone.height % patternCount

    // Generate pattern IDs with calculated positions
    const skyPrefix = `sky-${atmosphere.sky}`
    const bands: Array<{ pattern: string; y: number; height: number }> = []
    let currentY = 0
    for (let i = 0; i < patternCount; i++) {
      // Distribute extra pixels to first N bands for even distribution
      const height = baseHeight + (i < extraPixels ? 1 : 0)
      bands.push({ pattern: `${skyPrefix}-${i}`, y: currentY, height })
      currentY += height
    }

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
        <SkyDitherDefs />
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

    // Get the number of pattern bands for ground gradient
    const patternCount = getGroundPatternCount()

    // Calculate pixel-perfect band heights (distribute remainder evenly)
    const baseHeight = Math.floor(zone.height / patternCount)
    const extraPixels = zone.height % patternCount

    // Generate pattern IDs with calculated positions
    const bands: Array<{ pattern: string; y: number; height: number }> = []
    let currentY = 0
    for (let i = 0; i < patternCount; i++) {
      // Distribute extra pixels to first N bands for even distribution
      const height = baseHeight + (i < extraPixels ? 1 : 0)
      bands.push({ pattern: `ground-${i}`, y: currentY, height })
      currentY += height
    }

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
        <SkyDitherDefs />
        <GrassTextureDefs />
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
          fill="url(#grass-blades)"
        />
        <rect
          x="0"
          y={halfHeight}
          width={zone.width}
          height={zone.height - halfHeight}
          fill="url(#grass-blades-dense)"
        />
      </svg>
    )
  }

  const renderTerrain = () => {
    if (!terrain || Object.keys(terrain).length === 0) return null

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
        <TerrainDitherDefs />
        {Object.entries(terrain).map(([key, tileId]) => {
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
              fill={patternId ? `url(#${patternId})` : tile.color}
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

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="relative border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{
          width: '100%',
          maxWidth: CANVAS_WIDTH,
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          background: '#f0f8ff' // Light sky blue base
        }}
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

      {/* Canvas Info (for development) */}
      {isDecorationMode && (
        <div className="mt-2 text-xs text-gray-500">
          Canvas: {CANVAS_WIDTH}×{CANVAS_HEIGHT} • House: {HOUSE_POSITION.x},{HOUSE_POSITION.y}
        </div>
      )}
    </div>
  )
}