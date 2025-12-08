import React, { useState, useEffect } from 'react'
import { PlantSVGs } from './assets/PlantSVGs'
import { PathSVGs } from './assets/PathSVGs'
import { FeatureSVGs } from './assets/FeatureSVGs'
import { FurnitureSVGs } from './assets/FurnitureSVGs'
import { LightingSVGs } from './assets/LightingSVGs'
import { WaterSVGs } from './assets/WaterSVGs'
import { StructureSVGs } from './assets/StructureSVGs'
import { SeasonalSVGs } from './assets/SeasonalSVGs'
import { HouseCustomSVGs } from './assets/HouseCustomSVGs'
import {
  getDecorationPngUrl,
  isPngLoadingEnabled,
  hasPngFailed,
  markPngFailed,
} from '@/lib/pixel-homes/decoration-assets'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'

interface DecorationSVGProps {
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal' | 'house_custom' | 'furniture' | 'lighting' | 'water' | 'structure' | 'sky' | 'house_template' | 'house_color' | 'custom'
  decorationId: string
  variant?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
  renderSvg?: string | null  // Custom SVG from database
  customScale?: number
  text?: string
  customAssetUrl?: string  // URL to user's uploaded custom pixel art
  pngUrl?: string  // Direct PNG URL from database (overrides R2 lookup)
}

// Size multipliers for different decoration sizes
const SIZE_SCALES = {
  small: 0.7,
  medium: 1.0,
  large: 1.4
}

// Decoration types that support PNG loading from R2
const PNG_SUPPORTED_TYPES = new Set([
  'plant', 'path', 'feature', 'furniture', 'lighting',
  'water', 'structure', 'seasonal', 'house_custom'
])

export default function DecorationSVG({
  decorationType,
  decorationId,
  variant = 'default',
  size = 'medium',
  className = '',
  renderSvg,
  customScale,
  text,
  customAssetUrl,
  pngUrl
}: DecorationSVGProps) {
  const scale = customScale || SIZE_SCALES[size]
  const props = { id: decorationId, variant, scale, className, text }

  // Track whether PNG failed to load (triggers SVG fallback)
  const [pngError, setPngError] = useState(false)

  // Reset error state when decorationId changes
  useEffect(() => {
    setPngError(false)
  }, [decorationId])

  // Determine if we should try PNG loading
  const shouldTryPng = (
    PNG_SUPPORTED_TYPES.has(decorationType) &&
    !pngError &&
    !hasPngFailed(decorationId) &&
    (pngUrl || isPngLoadingEnabled())
  )

  // Get PNG URL (direct URL takes priority over R2 lookup)
  const resolvedPngUrl = pngUrl || getDecorationPngUrl(decorationId)

  // Try PNG first if supported
  if (shouldTryPng && resolvedPngUrl) {
    const dimensions = getDecorationDimensions(decorationId, decorationType, size)

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedPngUrl}
        alt=""
        width={dimensions.width}
        height={dimensions.height}
        className={className}
        style={{
          imageRendering: 'pixelated',
          display: 'block',
        }}
        onError={() => {
          markPngFailed(decorationId)
          setPngError(true)
        }}
      />
    )
  }

  switch (decorationType) {
    case 'plant':
      return <PlantSVGs {...props} />
    case 'path':
      return <PathSVGs {...props} />
    case 'feature':
      return <FeatureSVGs {...props} />
    case 'furniture':
      return <FurnitureSVGs {...props} />
    case 'lighting':
      return <LightingSVGs {...props} />
    case 'water':
      return <WaterSVGs {...props} />
    case 'structure':
      return <StructureSVGs {...props} />
    case 'seasonal':
      return <SeasonalSVGs {...props} />
    case 'house_custom':
      return <HouseCustomSVGs {...props} />
    case 'custom':
      // Render user's custom uploaded pixel art at actual pixel size
      if (customAssetUrl) {
        // Container is 64x64 (4 grid cells), image displays at natural size
        const containerSize = 64 * scale
        return (
          <div
            className={className}
            style={{
              width: containerSize,
              height: containerSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={customAssetUrl}
              alt="Custom pixel art"
              style={{
                maxWidth: containerSize,
                maxHeight: containerSize,
                imageRendering: 'pixelated'
              }}
            />
          </div>
        )
      }
      // Fallback if no URL
      return (
        <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
          <rect x="2" y="2" width="28" height="28" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 2" />
          <text x="16" y="20" textAnchor="middle" fontSize="10" fill="#6B7280">+</text>
        </svg>
      )
    default:
      return (
        <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
          <rect x="2" y="2" width="12" height="12" fill="#A18463" rx="2" />
          <text x="8" y="11" textAnchor="middle" fontSize="6" fill="white">🏠</text>
        </svg>
      )
  }
}
