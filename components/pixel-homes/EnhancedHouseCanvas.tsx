import React, { useRef, useEffect, useState } from 'react'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import DecorationSVG from './DecorationSVG'
import AnimatedDecoration from './DecorationAnimations'
import { DecorationItem } from '@/lib/pixel-homes/decoration-data'

interface EnhancedHouseCanvasProps {
  template: HouseTemplate
  palette: ColorPalette
  className?: string
  decorations?: DecorationItem[]
  houseCustomizations?: HouseCustomizations
  atmosphere?: AtmosphereSettings
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
  previewPosition?: { x: number; y: number } | null
  previewItem?: DecorationItem | null
  onClick?: (x: number, y: number, event: React.MouseEvent) => void
  onMouseMove?: (x: number, y: number, event: React.MouseEvent) => void
  onMouseLeave?: () => void
  onScaleChange?: (scale: number) => void
}

interface AtmosphereSettings {
  sky: 'sunny' | 'cloudy' | 'sunset' | 'night'
  weather: 'clear' | 'light_rain' | 'light_snow'
  timeOfDay: 'morning' | 'midday' | 'evening' | 'night'
}

// Enhanced canvas dimensions - much larger than original 200x180
const CANVAS_WIDTH = 500
const CANVAS_HEIGHT = 350

// Zone definitions for decoration placement
const DECORATION_ZONES = {
  background: {
    x: 0, y: 0,
    width: CANVAS_WIDTH, height: 100, // A bit more sky area
    label: 'Background & Sky'
  },
  front_yard: {
    x: 0, y: 100,
    width: CANVAS_WIDTH, height: 250, // Decoration area to bottom
    label: 'Front Yard'
  },
  house_facade: {
    x: 150, y: 160,
    width: 200, height: 120, // House area
    label: 'House'
  }
}

// House positioning within the larger canvas
const HOUSE_POSITION = {
  x: 150, // Centered for larger house: (500 - 200) / 2 = 150
  y: 40, // Very high in the viewing area
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
  isDecorationMode = false,
  onDecorationClick,
  onDecorationMouseDown,
  animatedDecorations,
  recentlyPlaced,
  selectedDecorations,
  onAnimationComplete,
  isPlacing,
  previewPosition,
  previewItem,
  onClick,
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

  useEffect(() => {
    console.log('EnhancedHouseCanvas decorations updated:', decorations.length)
  }, [decorations])

  const handleInteraction = (
    event: React.MouseEvent,
    handler?: (x: number, y: number, event: React.MouseEvent) => void
  ) => {
    console.log('EnhancedHouseCanvas: handleInteraction', event.type, 'handler exists:', !!handler)
    if (!handler) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
    console.log('EnhancedHouseCanvas: normalized coords', x, y)
    handler(x, y, event)
  }

  const renderBackground = () => {
    const zone = DECORATION_ZONES.background

    // Sky gradient based on atmosphere
    const skyGradients = {
      sunny: 'linear-gradient(to bottom, #87CEEB 0%, #98D8E8 100%)',
      cloudy: 'linear-gradient(to bottom, #B0C4DE 0%, #D3D3D3 100%)',
      sunset: 'linear-gradient(to bottom, #FFB347 0%, #FF6B6B 50%, #4ECDC4 100%)',
      night: 'linear-gradient(to bottom, #191970 0%, #000080 100%)'
    }

    return (
      <div
        className="absolute"
        style={{
          left: zone.x,
          top: zone.y,
          width: zone.width,
          height: zone.height,
          background: skyGradients[atmosphere.sky],
          borderRadius: '8px 8px 0 0',
          zIndex: 1
        }}
      >
        {/* Future: Cloud SVGs, stars, sun/moon */}
        {atmosphere.sky === 'night' && (
          <div className="absolute inset-0">
            {/* Simple stars */}
            <div className="absolute top-4 left-8 w-1 h-1 bg-white rounded-full opacity-80"></div>
            <div className="absolute top-8 right-12 w-1 h-1 bg-white rounded-full opacity-60"></div>
            <div className="absolute top-12 left-1/3 w-1 h-1 bg-white rounded-full opacity-90"></div>
            <div className="absolute top-6 right-1/4 w-1 h-1 bg-white rounded-full opacity-70"></div>
          </div>
        )}
      </div>
    )
  }

  const renderFrontYard = () => {
    const zone = DECORATION_ZONES.front_yard

    return (
      <div
        className="absolute"
        style={{
          left: zone.x,
          top: zone.y,
          width: zone.width,
          height: zone.height,
          background: 'linear-gradient(to bottom, #90EE90 0%, #228B22 100%)', // Grass gradient
          zIndex: 2
        }}
      />
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

          // Use AnimatedDecoration if animations are available and this decoration needs animation
          if (hasAnimations && animationType) {
            return (
              <div
                key={item.id}
                className="absolute"
                style={{
                  left: item.position?.x || 0,
                  top: item.position?.y || 0,
                  zIndex: item.position?.layer || 10
                }}
                onClick={onDecorationClick ? (e) => onDecorationClick(item.id, e) : undefined}
                onMouseDown={onDecorationMouseDown ? (e) => onDecorationMouseDown(item.id, e) : undefined}
              >
                <AnimatedDecoration
                  decorationType={item.type}
                  decorationId={item.decorationId || item.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')}
                  variant={item.variant}
                  size={item.size}
                  position={{ x: 0, y: 0 }} // Position is handled by parent div
                  animationType={animationType}
                  onAnimationComplete={() => onAnimationComplete?.(item.id)}
                  className={`cursor-pointer ${onDecorationClick || onDecorationMouseDown ? 'hover:scale-110 transition-transform' : ''}`}
                />
              </div>
            )
          }

          // Use static decoration for non-animated items
          return (
            <div
              key={item.id}
              className={`absolute ${onDecorationClick || onDecorationMouseDown ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
              style={{
                left: item.position?.x || 0,
                top: item.position?.y || 0,
                zIndex: item.position?.layer || 10
              }}
              onClick={onDecorationClick ? (e) => onDecorationClick(item.id, e) : undefined}
              onMouseDown={onDecorationMouseDown ? (e) => onDecorationMouseDown(item.id, e) : undefined}
            >
              <DecorationSVG
                decorationType={item.type}
                decorationId={item.decorationId || item.id.replace(/_(\d+)_[a-z0-9]+$|_\d+$/, '')}
                variant={item.variant}
                size={item.size}
                className="drop-shadow-sm"
                renderSvg={item.renderSvg}
              />
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
          {isPlacing && previewPosition && previewItem && (
            <div
              className="absolute pointer-events-none opacity-50"
              style={{
                left: previewPosition.x,
                top: previewPosition.y,
                zIndex: 20
              }}
            >
              <DecorationSVG
                decorationType={previewItem.type}
                decorationId={previewItem.id}
                variant={previewItem.variant}
                size={previewItem.size}
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