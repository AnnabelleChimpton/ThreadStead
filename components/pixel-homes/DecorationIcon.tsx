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
}

export default function DecorationIcon({
  type,
  id,
  size = 32,
  className = '',
  color,
  iconSvg,
  palette = 'thread_sage',
  customAssetUrl
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
    // Special handling for atmosphere/sky items
    switch (id) {
      case 'sunny_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
            <circle cx="12" cy="12" r="5" fill="#FCD34D" />
            <g stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1v2" />
              <path d="M12 21v2" />
              <path d="M4.22 4.22l1.42 1.42" />
              <path d="M18.36 18.36l1.42 1.42" />
              <path d="M1 12h2" />
              <path d="M21 12h2" />
              <path d="M4.22 19.78l1.42-1.42" />
              <path d="M18.36 5.64l1.42-1.42" />
            </g>
          </svg>
        )
      case 'sunset_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
            <defs>
              <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FF6B6B', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#FFB347', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#4ECDC4', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <rect width="24" height="24" fill="url(#sunsetGrad)" rx="2" />
            <circle cx="6" cy="8" r="3" fill="#FF4444" opacity="0.8" />
          </svg>
        )
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
            <circle cx="12" cy="12" r="10" fill="#87CEEB" />
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
        />
      )
  }
}