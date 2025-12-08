import React from 'react'
import DecorationSVG from './DecorationSVG'
import HouseSVG, { HouseTemplate, ColorPalette } from './HouseSVG'

interface DecorationIconProps {
  type: 'plant' | 'path' | 'feature' | 'seasonal' | 'sky' | 'house_custom' | 'house_template' | 'house_color' | 'furniture' | 'lighting' | 'water' | 'structure' | 'custom'
  id: string
  size?: number
  className?: string
  color?: string  // For house color items
  iconSvg?: string  // Custom icon SVG from database
  palette?: ColorPalette
  customAssetUrl?: string  // URL to user's uploaded custom pixel art
  pngUrl?: string  // PNG URL from database (preferred over SVG)
}

export default function DecorationIcon({
  type,
  id,
  size = 32,
  className = '',
  color,
  iconSvg,
  palette = 'thread_sage',
  customAssetUrl,
  pngUrl
}: DecorationIconProps) {
  // If custom icon SVG is provided from database, use it
  // BUT ignore it for types that we have fully refactored to pixel art
  const refactoredTypes = ['plant', 'path', 'feature', 'seasonal', 'house_custom', 'furniture', 'lighting', 'water', 'structure']

  if (iconSvg && !refactoredTypes.includes(type)) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    )
  }

  if (type === 'sky') {
    // Special handling for atmosphere/sky items - pixel art style with dithering
    switch (id) {
      case 'sunny_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            {/* Sky gradient bands */}
            <rect x="0" y="0" width="24" height="6" fill="#5BA3D0" />
            <rect x="0" y="6" width="24" height="6" fill="#6BB5DC" />
            <rect x="0" y="12" width="24" height="6" fill="#87CEEB" />
            <rect x="0" y="18" width="24" height="6" fill="#A8E4F0" />
            {/* Dither transitions */}
            <g fill="#6BB5DC">
              <rect x="1" y="5" width="1" height="1" /><rect x="3" y="5" width="1" height="1" />
              <rect x="5" y="5" width="1" height="1" /><rect x="7" y="5" width="1" height="1" />
            </g>
            {/* Pixel sun */}
            <rect x="14" y="4" width="6" height="6" fill="#FFD93D" />
            <rect x="15" y="5" width="4" height="4" fill="#FFF176" />
            {/* Sun rays */}
            <rect x="16" y="2" width="2" height="1" fill="#FFD93D" />
            <rect x="16" y="11" width="2" height="1" fill="#FFD93D" />
            <rect x="12" y="6" width="1" height="2" fill="#FFD93D" />
            <rect x="21" y="6" width="1" height="2" fill="#FFD93D" />
          </svg>
        )
      case 'cloudy_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            {/* Overcast sky gradient */}
            <rect x="0" y="0" width="24" height="6" fill="#8899AA" />
            <rect x="0" y="6" width="24" height="6" fill="#9DAAB8" />
            <rect x="0" y="12" width="24" height="6" fill="#B0C4DE" />
            <rect x="0" y="18" width="24" height="6" fill="#C8D4E8" />
            {/* Dither between bands */}
            <g fill="#9DAAB8">
              <rect x="0" y="5" width="1" height="1" /><rect x="2" y="5" width="1" height="1" />
              <rect x="4" y="5" width="1" height="1" /><rect x="6" y="5" width="1" height="1" />
            </g>
            {/* Pixel clouds */}
            <g fill="#E8E8E8">
              <rect x="3" y="8" width="8" height="4" />
              <rect x="5" y="6" width="4" height="2" />
              <rect x="14" y="12" width="6" height="3" />
              <rect x="15" y="10" width="4" height="2" />
            </g>
            <g fill="#FFFFFF">
              <rect x="4" y="9" width="6" height="2" />
              <rect x="15" y="12" width="4" height="2" />
            </g>
          </svg>
        )
      case 'sunset_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            {/* Sunset gradient bands */}
            <rect x="0" y="0" width="24" height="4" fill="#4A3070" />
            <rect x="0" y="4" width="24" height="4" fill="#7B4090" />
            <rect x="0" y="8" width="24" height="4" fill="#C85A80" />
            <rect x="0" y="12" width="24" height="4" fill="#FF7060" />
            <rect x="0" y="16" width="24" height="4" fill="#FFB060" />
            <rect x="0" y="20" width="24" height="4" fill="#FFD090" />
            {/* Dither transitions */}
            <g fill="#7B4090">
              <rect x="1" y="3" width="1" height="1" /><rect x="3" y="3" width="1" height="1" />
              <rect x="5" y="3" width="1" height="1" /><rect x="7" y="3" width="1" height="1" />
            </g>
            <g fill="#FF7060">
              <rect x="0" y="11" width="1" height="1" /><rect x="2" y="11" width="1" height="1" />
              <rect x="4" y="11" width="1" height="1" /><rect x="6" y="11" width="1" height="1" />
            </g>
            {/* Setting sun */}
            <rect x="2" y="14" width="6" height="4" fill="#FF4444" />
            <rect x="3" y="15" width="4" height="2" fill="#FF6B6B" />
          </svg>
        )
      case 'night_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            {/* Night sky gradient */}
            <rect x="0" y="0" width="24" height="6" fill="#050510" />
            <rect x="0" y="6" width="24" height="6" fill="#0A0A20" />
            <rect x="0" y="12" width="24" height="6" fill="#101035" />
            <rect x="0" y="18" width="24" height="6" fill="#151550" />
            {/* Dither transitions */}
            <g fill="#0A0A20">
              <rect x="1" y="5" width="1" height="1" /><rect x="3" y="5" width="1" height="1" />
              <rect x="5" y="5" width="1" height="1" /><rect x="7" y="5" width="1" height="1" />
            </g>
            {/* Pixel stars */}
            <g fill="#FFFFFF">
              <rect x="3" y="3" width="1" height="1" />
              <rect x="8" y="7" width="1" height="1" />
              <rect x="15" y="2" width="1" height="1" />
              <rect x="20" y="5" width="1" height="1" />
              <rect x="5" y="12" width="1" height="1" />
              <rect x="12" y="9" width="1" height="1" />
              <rect x="18" y="14" width="1" height="1" />
            </g>
            {/* Brighter stars */}
            <g fill="#FFFFAA">
              <rect x="10" y="4" width="2" height="2" />
              <rect x="19" y="10" width="2" height="2" />
            </g>
            {/* Moon */}
            <rect x="16" y="16" width="5" height="5" fill="#E8E8C8" />
            <rect x="17" y="17" width="3" height="3" fill="#FFFFD0" />
            <rect x="18" y="16" width="2" height="1" fill="#101035" />
          </svg>
        )
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <rect x="0" y="0" width="24" height="24" fill="#87CEEB" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white">?</text>
          </svg>
        )
    }
  }

  switch (type) {
    case 'house_template':
      return (
        <div style={{ width: size, height: size }} className={className}>
          <HouseSVG
            template={id as HouseTemplate}
            palette={palette}
            className="w-full h-full"
          />
        </div>
      )

    case 'house_color':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <rect x="4" y="4" width="16" height="16" fill="#F5F5F5" stroke="#CCCCCC" strokeWidth="1" rx="2" />
          {/* Color swatch */}
          <rect x="6" y="6" width="12" height="12" fill={color || '#A18463'} stroke="#333333" strokeWidth="1" rx="1" />
          {/* Color picker icon */}
          <circle cx="18" cy="6" r="2.5" fill="#FFFFFF" stroke="#333333" strokeWidth="0.5" />
          <circle cx="18" cy="6" r="1" fill={color || '#A18463'} />
        </svg>
      )

    default:
      // For all other decoration types, use DecorationSVG
      // Calculate scale to fit roughly within the requested size
      // We use a divisor of 40 to ensure larger pixel art fits
      const customScale = size / 40

      return (
        <DecorationSVG
          decorationType={type as any}
          decorationId={id}
          size="medium"
          customScale={customScale}
          className={className}
          renderSvg={iconSvg}
          customAssetUrl={customAssetUrl}
          pngUrl={pngUrl}
        />
      )
  }
}