import React from 'react'
import DecorationSVG from './DecorationSVG'
import HouseSVG, { HouseTemplate, ColorPalette } from './HouseSVG'
import { SKY_COLORS } from './DitherPatternDefs'
import { PALETTE_RAMPS } from '@/lib/pixel-homes/palette'

/**
 * A sky icon's bands, top to horizon, in equal rows of the 24 px icon, with a
 * 1 px checker row where one band meets the next (as the yard's seams do).
 */
function SkyIconBands({ colors }: { colors: string[] }) {
  const band = 24 / colors.length
  return (
    <>
      {colors.map((color, i) => (
        <rect key={color} x="0" y={i * band} width="24" height={band} fill={color} />
      ))}
      {colors.slice(1).map((next, i) => (
        <g key={next} fill={next}>
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={k * 2 + (i % 2)} y={(i + 1) * band - 1} width="1" height="1" />
          ))}
        </g>
      ))}
    </>
  )
}

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
  pngWidth?: number | null
  pngHeight?: number | null
  pngFrames?: number | null
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
  pngUrl,
  pngWidth,
  pngHeight,
  pngFrames
}: DecorationIconProps) {
  // If custom icon SVG is provided from database, use it
  // BUT ignore it for types that we have fully refactored to pixel art
  const refactoredTypes = ['plant', 'path', 'feature', 'seasonal', 'sky', 'house_custom', 'furniture', 'lighting', 'water', 'structure']

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
    // The yard's own sky bands (SKY_COLORS), pixel art in threadstead-44
    const R = PALETTE_RAMPS
    switch (id) {
      case 'sunny_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <SkyIconBands colors={SKY_COLORS.sunny} />
            {/* Pixel sun */}
            <rect x="14" y="4" width="6" height="6" fill={R.butter[1]} />
            <rect x="15" y="5" width="4" height="4" fill={R.butter[2]} />
            {/* Sun rays */}
            <rect x="16" y="2" width="2" height="1" fill={R.butter[1]} />
            <rect x="16" y="11" width="2" height="1" fill={R.butter[1]} />
            <rect x="12" y="6" width="1" height="2" fill={R.butter[1]} />
            <rect x="21" y="6" width="1" height="2" fill={R.butter[1]} />
          </svg>
        )
      case 'cloudy_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <SkyIconBands colors={SKY_COLORS.cloudy} />
            {/* Pixel clouds */}
            <g fill={R.ink[4]}>
              <rect x="3" y="8" width="8" height="4" />
              <rect x="5" y="6" width="4" height="2" />
              <rect x="14" y="12" width="6" height="3" />
              <rect x="15" y="10" width="4" height="2" />
            </g>
            <g fill={R.ink[5]}>
              <rect x="4" y="9" width="6" height="2" />
              <rect x="15" y="12" width="4" height="2" />
            </g>
          </svg>
        )
      case 'sunset_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <SkyIconBands colors={SKY_COLORS.sunset} />
            {/* Setting sun */}
            <rect x="2" y="14" width="6" height="4" fill={R.butter[1]} />
            <rect x="3" y="15" width="4" height="2" fill={R.butter[2]} />
          </svg>
        )
      case 'night_sky':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <SkyIconBands colors={SKY_COLORS.night} />
            {/* Pixel stars */}
            <g fill={R.ink[5]}>
              <rect x="3" y="3" width="1" height="1" />
              <rect x="8" y="7" width="1" height="1" />
              <rect x="15" y="2" width="1" height="1" />
              <rect x="20" y="5" width="1" height="1" />
              <rect x="5" y="12" width="1" height="1" />
              <rect x="12" y="9" width="1" height="1" />
              <rect x="18" y="14" width="1" height="1" />
            </g>
            {/* Brighter stars */}
            <g fill={R.butter[2]}>
              <rect x="10" y="4" width="2" height="2" />
              <rect x="19" y="10" width="2" height="2" />
            </g>
            {/* Moon, with a bite of sky out of it */}
            <rect x="16" y="16" width="5" height="5" fill={R.ink[4]} />
            <rect x="17" y="17" width="3" height="3" fill={R.ink[5]} />
            <rect x="18" y="16" width="2" height="1" fill={SKY_COLORS.night[SKY_COLORS.night.length - 1]} />
          </svg>
        )
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <rect x="0" y="0" width="24" height="24" fill={SKY_COLORS.sunny[1]} />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill={R.ink[5]}>?</text>
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
          pngWidth={pngWidth}
          pngHeight={pngHeight}
          pngFrames={pngFrames}
        />
      )
  }
}