import React from 'react'
import { PlantSVGs } from './assets/PlantSVGs'
import { PathSVGs } from './assets/PathSVGs'
import { FeatureSVGs } from './assets/FeatureSVGs'
import { FurnitureSVGs } from './assets/FurnitureSVGs'
import { LightingSVGs } from './assets/LightingSVGs'
import { WaterSVGs } from './assets/WaterSVGs'
import { StructureSVGs } from './assets/StructureSVGs'
import { SeasonalSVGs } from './assets/SeasonalSVGs'
import { HouseCustomSVGs } from './assets/HouseCustomSVGs'

interface DecorationSVGProps {
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal' | 'house_custom' | 'furniture' | 'lighting' | 'water' | 'structure' | 'sky' | 'house_template' | 'house_color'
  decorationId: string
  variant?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
  renderSvg?: string | null  // Custom SVG from database
  customScale?: number
}

// Size multipliers for different decoration sizes
const SIZE_SCALES = {
  small: 0.7,
  medium: 1.0,
  large: 1.4
}

export default function DecorationSVG({
  decorationType,
  decorationId,
  variant = 'default',
  size = 'medium',
  className = '',
  renderSvg,
  customScale
}: DecorationSVGProps) {
  const scale = customScale || SIZE_SCALES[size]
  const props = { id: decorationId, variant, scale, className }

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
    default:
      return (
        <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
          <rect x="2" y="2" width="12" height="12" fill="#A18463" rx="2" />
          <text x="8" y="11" textAnchor="middle" fontSize="6" fill="white">🏠</text>
        </svg>
      )
  }
}
