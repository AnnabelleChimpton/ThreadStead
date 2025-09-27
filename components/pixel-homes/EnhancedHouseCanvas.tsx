import React from 'react'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import DecorationSVG from './DecorationSVG'

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
}

interface DecorationItem {
  id: string
  type: 'plant' | 'path' | 'feature' | 'seasonal'
  zone: 'front_yard' | 'house_facade' | 'background'
  position: { x: number; y: number; layer?: number }
  variant?: string
  size?: 'small' | 'medium' | 'large'
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
  onDecorationMouseDown
}: EnhancedHouseCanvasProps) {

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
        {decorations.map(item => (
          <div
            key={item.id}
            className={`absolute ${onDecorationClick || onDecorationMouseDown ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            style={{
              left: item.position.x,
              top: item.position.y,
              zIndex: item.position.layer || 10
            }}
            onClick={onDecorationClick ? (e) => onDecorationClick(item.id, e) : undefined}
            onMouseDown={onDecorationMouseDown ? (e) => onDecorationMouseDown(item.id, e) : undefined}
          >
            <DecorationSVG
              decorationType={item.type}
              decorationId={item.id.split('_').slice(0, -1).join('_')} // Extract base decoration ID by removing timestamp
              variant={item.variant}
              size={item.size}
              className="drop-shadow-sm"
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        className="relative border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{ 
          width: CANVAS_WIDTH, 
          height: CANVAS_HEIGHT,
          background: '#f0f8ff' // Light sky blue base
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
      
      {/* Canvas Info (for development) */}
      {isDecorationMode && (
        <div className="mt-2 text-xs text-gray-500">
          Canvas: {CANVAS_WIDTH}×{CANVAS_HEIGHT} • House: {HOUSE_POSITION.x},{HOUSE_POSITION.y}
        </div>
      )}
    </div>
  )
}