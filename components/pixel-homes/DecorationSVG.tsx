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
import { getDecorationDimensions, sizeScale } from '@/lib/pixel-homes/decoration-dimensions'
import { bundledDecorationPngUrl } from '@/lib/pixel-homes/bundled-decoration-art'
import Sprite from './Sprite'

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
  /** The PNG's own size (one frame) and frame count, stored when it was uploaded */
  pngWidth?: number | null
  pngHeight?: number | null
  pngFrames?: number | null
  /** Loop a frame strip (the scene allows a few per home); otherwise it holds its first frame */
  animate?: boolean
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
  pngUrl,
  pngWidth,
  pngHeight,
  pngFrames,
  animate = false
}: DecorationSVGProps) {
  const scale = customScale || sizeScale(size)
  const props = { id: decorationId, variant, scale, className, text }

  // Track whether PNG failed to load (triggers SVG fallback)
  const [pngError, setPngError] = useState(false)

  // Reset error state when decorationId changes
  useEffect(() => {
    setPngError(false)
  }, [decorationId])

  // The site's own default art for decorations without an uploaded PNG
  const bundledPng = bundledDecorationPngUrl(decorationId)

  // Determine if we should try PNG loading
  const shouldTryPng = (
    PNG_SUPPORTED_TYPES.has(decorationType) &&
    !pngError &&
    !hasPngFailed(decorationId) &&
    (pngUrl || bundledPng || isPngLoadingEnabled())
  )

  // An uploaded PNG wins, then the site's own default art, then the R2 lookup
  const resolvedPngUrl = pngUrl || bundledPng || getDecorationPngUrl(decorationId)

  // Try PNG first if supported
  if (shouldTryPng && resolvedPngUrl) {
    // At its own size when it has one (x a whole-number size scale), else the old table
    const dimensions = getDecorationDimensions(decorationId, decorationType, size, { pngUrl: resolvedPngUrl, pngWidth, pngHeight })
    const onError = () => {
      markPngFailed(decorationId)
      setPngError(true)
    }

    // A strip of frames: one frame showing, stepped through when allowed to play
    if (pngFrames && pngFrames > 1 && pngWidth && pngHeight) {
      return (
        <Sprite
          src={resolvedPngUrl}
          frameWidth={pngWidth}
          height={pngHeight}
          frames={pngFrames}
          scale={dimensions.width / pngWidth}
          playing={animate}
          className={className}
          onError={onError}
        />
      )
    }

    return (
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
        onError={onError}
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
        </svg>
      )
  }
}
