import React from 'react'

interface DecorationSVGProps {
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal' | 'house_custom' | 'furniture' | 'lighting' | 'water' | 'structure'
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

  const renderPlant = (id: string, variant: string) => {
    // Color variants for roses
    const getRoseColors = (variant: string) => {
      switch (variant) {
        case 'red':
        default:
          return { primary: '#DC2626', secondary: '#EF4444', tertiary: '#B91C1C', center: '#7F1D1D' }
        case 'pink':
          return { primary: '#EC4899', secondary: '#F472B6', tertiary: '#DB2777', center: '#9D174D' }
        case 'white':
          return { primary: '#F9FAFB', secondary: '#FFFFFF', tertiary: '#F3F4F6', center: '#FCD34D' }
        case 'yellow':
          return { primary: '#FBBF24', secondary: '#FCD34D', tertiary: '#F59E0B', center: '#D97706' }
      }
    }

    // Color variants for daisies
    const getDaisyColors = (variant: string) => {
      switch (variant) {
        case 'white':
        default:
          return { petals: '#FFFFFF', center: '#FCD34D', petalsAlt: '#F9FAFB', centerAlt: '#F59E0B' }
        case 'yellow':
          return { petals: '#FEF3C7', center: '#F59E0B', petalsAlt: '#FCD34D', centerAlt: '#D97706' }
        case 'purple':
          return { petals: '#DDD6FE', center: '#FCD34D', petalsAlt: '#C4B5FD', centerAlt: '#F59E0B' }
      }
    }

    // Tree variants
    const getTreeColors = (variant: string) => {
      switch (variant) {
        case 'oak':
        default:
          return {
            foliage: ['#22543D', '#2D5016', '#4A7C59', '#22C55E', '#34D399', '#6EE7B7'],
            trunk: '#8B4513'
          }
        case 'maple':
          return {
            foliage: ['#DC2626', '#EF4444', '#F97316', '#FBBF24', '#FCD34D', '#FEF3C7'],
            trunk: '#8B4513'
          }
        case 'pine':
          return {
            foliage: ['#1E3A8A', '#1E40AF', '#2563EB', '#059669', '#10B981', '#34D399'],
            trunk: '#654321'
          }
        case 'cherry':
          return {
            foliage: ['#EC4899', '#F472B6', '#FBBF24', '#22C55E', '#34D399', '#6EE7B7'],
            trunk: '#8B4513'
          }
      }
    }

    switch (id) {
      case 'roses_red':
      case 'roses_pink':
      case 'roses_white':
      case 'roses_yellow':
        const roseVariant = id.split('_')[1] || 'red'
        const roseColors = getRoseColors(roseVariant)
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <rect x="4" y="18" width="16" height="4" fill="#4A5D23" />
            <rect x="6" y="16" width="12" height="2" fill="#4A5D23" />
            <rect x="8" y="22" width="8" height="1" fill="#4A5D23" />
            <rect x="10" y="12" width="1" height="6" fill="#2D5016" />
            <rect x="13" y="10" width="1" height="8" fill="#2D5016" />
            <rect x="7" y="14" width="1" height="4" fill="#2D5016" />
            <rect x="8" y="13" width="2" height="1" fill="#4A7C59" />
            <rect x="9" y="14" width="1" height="1" fill="#4A7C59" />
            <rect x="14" y="11" width="2" height="1" fill="#4A7C59" />
            <rect x="14" y="12" width="1" height="1" fill="#4A7C59" />
            <rect x="10" y="9" width="3" height="3" fill={roseColors.primary} />
            <rect x="11" y="10" width="1" height="1" fill={roseColors.center} />
            <rect x="10" y="8" width="3" height="1" fill={roseColors.secondary} />
            <rect x="9" y="9" width="1" height="3" fill={roseColors.secondary} />
            <rect x="13" y="9" width="1" height="3" fill={roseColors.secondary} />
            <rect x="10" y="12" width="3" height="1" fill={roseColors.secondary} />
            <rect x="13" y="7" width="2" height="2" fill={roseColors.primary} />
            <rect x="13" y="6" width="2" height="1" fill={roseColors.secondary} />
            <rect x="12" y="7" width="1" height="2" fill={roseColors.secondary} />
            <rect x="15" y="7" width="1" height="2" fill={roseColors.secondary} />
            <rect x="13" y="9" width="2" height="1" fill={roseColors.secondary} />
            <rect x="7" y="11" width="2" height="2" fill={roseColors.tertiary} />
            <rect x="7" y="10" width="2" height="1" fill={roseColors.secondary} />
            <rect x="6" y="11" width="1" height="2" fill={roseColors.secondary} />
            <rect x="9" y="11" width="1" height="2" fill={roseColors.secondary} />
            <rect x="7" y="13" width="2" height="1" fill={roseColors.secondary} />
          </svg>
        )

      case 'daisies_white':
      case 'daisies_yellow':
      case 'daisies_purple':
        const daisyVariant = id.split('_')[1] || 'white'
        const daisyColors = getDaisyColors(daisyVariant)
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className} shapeRendering="crispEdges">
            <rect x="4" y="17" width="12" height="2" fill="#4A5D23" />
            <rect x="6" y="16" width="8" height="1" fill="#4A5D23" />
            <rect x="6" y="19" width="8" height="1" fill="#4A5D23" />
            <rect x="7" y="10" width="1" height="7" fill="#2D5016" />
            <rect x="11" y="8" width="1" height="9" fill="#2D5016" />
            <rect x="13" y="12" width="1" height="5" fill="#2D5016" />
            <rect x="10" y="7" width="3" height="3" fill={daisyColors.petals} />
            <rect x="11" y="6" width="1" height="1" fill={daisyColors.petals} />
            <rect x="11" y="10" width="1" height="1" fill={daisyColors.petals} />
            <rect x="9" y="8" width="1" height="1" fill={daisyColors.petals} />
            <rect x="13" y="8" width="1" height="1" fill={daisyColors.petals} />
            <rect x="11" y="8" width="1" height="1" fill={daisyColors.center} />
            <rect x="6" y="9" width="3" height="3" fill={daisyColors.petals} />
            <rect x="7" y="8" width="1" height="1" fill={daisyColors.petals} />
            <rect x="7" y="12" width="1" height="1" fill={daisyColors.petals} />
            <rect x="5" y="10" width="1" height="1" fill={daisyColors.petals} />
            <rect x="9" y="10" width="1" height="1" fill={daisyColors.petals} />
            <rect x="7" y="10" width="1" height="1" fill={daisyColors.center} />
            <rect x="12" y="11" width="3" height="3" fill={daisyColors.petalsAlt} />
            <rect x="13" y="10" width="1" height="1" fill={daisyColors.petalsAlt} />
            <rect x="13" y="14" width="1" height="1" fill={daisyColors.petalsAlt} />
            <rect x="11" y="12" width="1" height="1" fill={daisyColors.petalsAlt} />
            <rect x="15" y="12" width="1" height="1" fill={daisyColors.petalsAlt} />
            <rect x="13" y="12" width="1" height="1" fill={daisyColors.centerAlt} />
          </svg>
        )

      case 'tree_oak':
        const treeOakColors = getTreeColors('oak')
        return (
          <svg width={32 * scale} height={40 * scale} viewBox="0 0 32 40" className={className} shapeRendering="crispEdges">
            <rect x="14" y="28" width="4" height="12" fill={treeOakColors.trunk} />
            <rect x="13" y="38" width="6" height="2" fill={treeOakColors.trunk} />
            <rect x="8" y="16" width="16" height="14" fill={treeOakColors.foliage[0]} />
            <rect x="6" y="18" width="20" height="10" fill={treeOakColors.foliage[0]} />
            <rect x="10" y="14" width="12" height="18" fill={treeOakColors.foliage[0]} />
            <rect x="10" y="16" width="12" height="10" fill={treeOakColors.foliage[1]} />
            <rect x="8" y="18" width="16" height="6" fill={treeOakColors.foliage[1]} />
            <rect x="12" y="14" width="8" height="8" fill={treeOakColors.foliage[2]} />
            <rect x="14" y="12" width="4" height="4" fill={treeOakColors.foliage[3]} />
            <rect x="9" y="20" width="2" height="2" fill={treeOakColors.foliage[4]} />
            <rect x="22" y="19" width="2" height="2" fill={treeOakColors.foliage[5]} />
            <rect x="18" y="24" width="2" height="2" fill={treeOakColors.foliage[4]} />
          </svg>
        )

      case 'tree_pine':
        const treePineColors = getTreeColors('pine')
        return (
          <svg width={20 * scale} height={44 * scale} viewBox="0 0 20 44" className={className} shapeRendering="crispEdges">
            <rect x="9" y="32" width="2" height="12" fill={treePineColors.trunk} />
            <rect x="8" y="42" width="4" height="2" fill={treePineColors.trunk} />
            <rect x="4" y="26" width="12" height="6" fill={treePineColors.foliage[0]} />
            <rect x="2" y="28" width="16" height="4" fill={treePineColors.foliage[0]} />
            <rect x="5" y="18" width="10" height="8" fill={treePineColors.foliage[1]} />
            <rect x="3" y="22" width="14" height="4" fill={treePineColors.foliage[1]} />
            <rect x="6" y="10" width="8" height="8" fill={treePineColors.foliage[2]} />
            <rect x="8" y="6" width="4" height="4" fill={treePineColors.foliage[3]} />
            <rect x="9" y="4" width="2" height="2" fill={treePineColors.foliage[3]} />
            <rect x="6" y="20" width="2" height="2" fill={treePineColors.foliage[4]} />
            <rect x="12" y="24" width="2" height="2" fill={treePineColors.foliage[5]} />
            <rect x="8" y="12" width="2" height="2" fill={treePineColors.foliage[5]} />
          </svg>
        )

      case 'small_tree':
        const treeColors = getTreeColors(variant)
        return (
          <svg width={32 * scale} height={40 * scale} viewBox="0 0 32 40" className={className} shapeRendering="crispEdges">
            <rect x="14" y="28" width="4" height="12" fill={treeColors.trunk} />
            <rect x="10" y="18" width="12" height="12" fill={treeColors.foliage[0]} />
            <rect x="8" y="20" width="16" height="8" fill={treeColors.foliage[0]} />
            <rect x="12" y="16" width="8" height="16" fill={treeColors.foliage[0]} />
            <rect x="12" y="20" width="4" height="4" fill={treeColors.foliage[2]} />
            <rect x="18" y="22" width="2" height="2" fill={treeColors.foliage[4]} />
          </svg>
        )

      case 'sunflowers':
        return (
          <svg width={28 * scale} height={36 * scale} viewBox="0 0 28 36" className={className} shapeRendering="crispEdges">
            <rect x="6" y="32" width="16" height="3" fill="#4A5D23" />
            <rect x="10" y="18" width="2" height="14" fill="#2D5016" />
            <rect x="16" y="16" width="2" height="16" fill="#2D5016" />
            <rect x="13" y="20" width="2" height="12" fill="#2D5016" />
            <rect x="9" y="10" width="4" height="4" fill="#8B4513" />
            <rect x="9" y="9" width="4" height="1" fill="#FCD34D" />
            <rect x="9" y="14" width="4" height="1" fill="#FCD34D" />
            <rect x="8" y="10" width="1" height="4" fill="#FCD34D" />
            <rect x="13" y="10" width="1" height="4" fill="#FCD34D" />
            <rect x="8" y="9" width="1" height="1" fill="#FCD34D" />
            <rect x="13" y="9" width="1" height="1" fill="#FCD34D" />
            <rect x="8" y="14" width="1" height="1" fill="#FCD34D" />
            <rect x="13" y="14" width="1" height="1" fill="#FCD34D" />
            <rect x="16" y="7" width="2" height="2" fill="#8B4513" />
            <rect x="15" y="6" width="4" height="4" fill="#F59E0B" opacity="0.5" />
            <rect x="16" y="6" width="2" height="1" fill="#F59E0B" />
            <rect x="16" y="9" width="2" height="1" fill="#F59E0B" />
            <rect x="15" y="7" width="1" height="2" fill="#F59E0B" />
            <rect x="18" y="7" width="1" height="2" fill="#F59E0B" />
            <rect x="13" y="13" width="2" height="2" fill="#8B4513" />
            <rect x="12" y="12" width="4" height="4" fill="#FBBF24" opacity="0.5" />
            <rect x="13" y="12" width="2" height="1" fill="#FBBF24" />
            <rect x="13" y="15" width="2" height="1" fill="#FBBF24" />
            <rect x="12" y="13" width="1" height="2" fill="#FBBF24" />
            <rect x="15" y="13" width="1" height="2" fill="#FBBF24" />
            <rect x="8" y="22" width="2" height="1" fill="#16A34A" />
            <rect x="7" y="23" width="2" height="1" fill="#16A34A" />
            <rect x="18" y="20" width="2" height="1" fill="#16A34A" />
            <rect x="19" y="21" width="2" height="1" fill="#16A34A" />
          </svg>
        )

      case 'lavender':
        return (
          <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className} shapeRendering="crispEdges">
            <rect x="6" y="28" width="12" height="3" fill="#4A5D23" />
            <rect x="8" y="16" width="1" height="12" fill="#16A34A" />
            <rect x="11" y="14" width="1" height="14" fill="#16A34A" />
            <rect x="14" y="15" width="1" height="13" fill="#16A34A" />
            <rect x="17" y="17" width="1" height="11" fill="#16A34A" />
            <rect x="5" y="18" width="1" height="10" fill="#16A34A" />
            <rect x="7" y="12" width="3" height="4" fill="#8B5CF6" />
            <rect x="8" y="11" width="1" height="1" fill="#A855F7" />
            <rect x="8" y="13" width="1" height="1" fill="#7C3AED" />
            <rect x="10" y="10" width="3" height="5" fill="#8B5CF6" />
            <rect x="11" y="9" width="1" height="1" fill="#A855F7" />
            <rect x="11" y="11" width="1" height="1" fill="#7C3AED" />
            <rect x="13" y="11" width="3" height="4" fill="#8B5CF6" />
            <rect x="14" y="10" width="1" height="1" fill="#A855F7" />
            <rect x="16" y="14" width="3" height="3" fill="#8B5CF6" />
            <rect x="17" y="13" width="1" height="1" fill="#A855F7" />
            <rect x="4" y="15" width="3" height="3" fill="#8B5CF6" />
            <rect x="5" y="14" width="1" height="1" fill="#A855F7" />
          </svg>
        )

      case 'flower_pot':
        return (
          <svg width={18 * scale} height={22 * scale} viewBox="0 0 18 22" className={className} shapeRendering="crispEdges">
            <rect x="4" y="20" width="10" height="2" fill="#4A5D23" />
            <rect x="5" y="14" width="8" height="6" fill="#8B4513" />
            <rect x="4" y="14" width="10" height="2" fill="#92400E" />
            <rect x="6" y="16" width="6" height="1" fill="#A16207" />
            <rect x="7" y="8" width="1" height="6" fill="#16A34A" />
            <rect x="6" y="7" width="3" height="3" fill="#EF4444" />
            <rect x="7" y="8" width="1" height="1" fill="#FCD34D" />
            <rect x="10" y="6" width="1" height="8" fill="#16A34A" />
            <rect x="9" y="5" width="3" height="3" fill="#8B5CF6" />
            <rect x="10" y="6" width="1" height="1" fill="#FBBF24" />
            <rect x="8" y="4" width="1" height="10" fill="#16A34A" />
            <rect x="7" y="3" width="3" height="3" fill="#F97316" />
            <rect x="8" y="4" width="1" height="1" fill="#FEF3C7" />
          </svg>
        )

      default:
        return (
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
            <rect x="2" y="2" width="12" height="12" fill="#22C55E" />
            <rect x="6" y="6" width="4" height="4" fill="#FFFFFF" />
          </svg>
        )
    }
  }

  const renderPath = (id: string, variant: string) => {
    switch (id) {
      case 'stone_path':
        return (
          <svg width={48 * scale} height={16 * scale} viewBox="0 0 48 16" className={className} shapeRendering="crispEdges">
            <rect x="2" y="5" width="12" height="6" fill="#9CA3AF" />
            <rect x="3" y="6" width="10" height="4" fill="#D1D5DB" opacity="0.5" />
            <rect x="16" y="4" width="10" height="5" fill="#6B7280" />
            <rect x="17" y="5" width="8" height="3" fill="#9CA3AF" opacity="0.5" />
            <rect x="28" y="6" width="12" height="7" fill="#9CA3AF" />
            <rect x="29" y="7" width="10" height="5" fill="#D1D5DB" opacity="0.5" />
            <rect x="41" y="5" width="6" height="4" fill="#6B7280" />
          </svg>
        )

      case 'brick_path':
        return (
          <svg width={48 * scale} height={12 * scale} viewBox="0 0 48 12" className={className} shapeRendering="crispEdges">
            <rect x="0" y="0" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
            <rect x="12" y="0" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
            <rect x="24" y="0" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
            <rect x="36" y="0" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
            <rect x="-6" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
            <rect x="6" y="6" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
            <rect x="18" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
            <rect x="30" y="6" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
            <rect x="42" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
          </svg>
        )

      case 'stepping_stones':
        return (
          <svg width={36 * scale} height={24 * scale} viewBox="0 0 36 24" className={className} shapeRendering="crispEdges">
            <rect x="4" y="8" width="8" height="6" fill="#8B7355" />
            <rect x="5" y="9" width="6" height="4" fill="#A3A3A3" />
            <rect x="16" y="5" width="7" height="5" fill="#78716C" />
            <rect x="17" y="6" width="5" height="3" fill="#9CA3AF" />
            <rect x="24" y="12" width="9" height="7" fill="#8B7355" />
            <rect x="25" y="13" width="7" height="5" fill="#A3A3A3" />
            <rect x="6" y="10" width="1" height="1" fill="#16A34A" opacity="0.6" />
            <rect x="20" y="6" width="1" height="1" fill="#16A34A" opacity="0.5" />
            <rect x="28" y="14" width="1" height="1" fill="#16A34A" opacity="0.7" />
          </svg>
        )

      case 'gravel_path':
        return (
          <svg width={40 * scale} height={16 * scale} viewBox="0 0 40 16" className={className} shapeRendering="crispEdges">
            <rect x="0" y="4" width="40" height="8" fill="#A8A29E" />
            <rect x="0" y="5" width="40" height="6" fill="#D6D3D1" />
            <rect x="3" y="7" width="1" height="1" fill="#78716C" />
            <rect x="6" y="9" width="1" height="1" fill="#8B7355" />
            <rect x="9" y="6" width="1" height="1" fill="#A3A3A3" />
            <rect x="12" y="8" width="1" height="1" fill="#78716C" />
            <rect x="15" y="7" width="1" height="1" fill="#8B7355" />
            <rect x="18" y="6" width="1" height="1" fill="#A3A3A3" />
            <rect x="21" y="9" width="1" height="1" fill="#78716C" />
            <rect x="24" y="7" width="1" height="1" fill="#8B7355" />
            <rect x="27" y="8" width="1" height="1" fill="#A3A3A3" />
            <rect x="30" y="6" width="1" height="1" fill="#78716C" />
            <rect x="33" y="8" width="1" height="1" fill="#8B7355" />
            <rect x="36" y="7" width="1" height="1" fill="#A3A3A3" />
            <rect x="4" y="8" width="1" height="1" fill="#57534E" />
            <rect x="7" y="6" width="1" height="1" fill="#57534E" />
            <rect x="10" y="9" width="1" height="1" fill="#57534E" />
            <rect x="13" y="6" width="1" height="1" fill="#57534E" />
            <rect x="16" y="8" width="1" height="1" fill="#57534E" />
            <rect x="19" y="7" width="1" height="1" fill="#57534E" />
            <rect x="22" y="6" width="1" height="1" fill="#57534E" />
            <rect x="25" y="9" width="1" height="1" fill="#57534E" />
            <rect x="28" y="6" width="1" height="1" fill="#57534E" />
            <rect x="31" y="8" width="1" height="1" fill="#57534E" />
            <rect x="34" y="7" width="1" height="1" fill="#57534E" />
            <rect x="37" y="6" width="1" height="1" fill="#57534E" />
          </svg>
        )

      default:
        return (
          <svg width={32 * scale} height={8 * scale} viewBox="0 0 32 8" className={className} shapeRendering="crispEdges">
            <rect x="0" y="2" width="32" height="4" fill="#8B5CF6" />
          </svg>
        )
    }
  }

  const renderFeature = (id: string, variant: string) => {
    switch (id) {
      case 'bird_bath':
        return (
          <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className} shapeRendering="crispEdges">
            <rect x="4" y="28" width="16" height="3" fill="#6B7280" />
            <rect x="6" y="27" width="12" height="1" fill="#6B7280" />
            <rect x="10" y="18" width="4" height="10" fill="#9CA3AF" />
            <rect x="9" y="26" width="6" height="1" fill="#9CA3AF" />
            <rect x="9" y="19" width="6" height="1" fill="#9CA3AF" />
            <rect x="2" y="16" width="20" height="4" fill="#D1D5DB" />
            <rect x="3" y="19" width="18" height="2" fill="#9CA3AF" />
            <rect x="4" y="16" width="16" height="2" fill="#3B82F6" opacity="0.7" />
            <rect x="6" y="16" width="4" height="1" fill="#60A5FA" opacity="0.5" />
            <rect x="14" y="17" width="3" height="1" fill="#93C5FD" opacity="0.6" />
            <rect x="8" y="14" width="3" height="2" fill="#8B5A2B" />
            <rect x="7" y="13" width="2" height="2" fill="#A0522D" />
            <rect x="7" y="14" width="1" height="1" fill="#000" />
            <rect x="6" y="14" width="1" height="1" fill="#F59E0B" />
          </svg>
        )

      case 'garden_gnome':
        return (
          <svg width={16 * scale} height={24 * scale} viewBox="0 0 16 24" className={className} shapeRendering="crispEdges">
            <rect x="2" y="22" width="12" height="2" fill="#4A5D23" />
            <rect x="4" y="16" width="8" height="6" fill="#DC2626" />
            <rect x="5" y="17" width="6" height="4" fill="#B91C1C" />
            <rect x="3" y="16" width="2" height="4" fill="#F3E8FF" />
            <rect x="11" y="16" width="2" height="4" fill="#F3E8FF" />
            <rect x="5" y="10" width="6" height="6" fill="#FBBF24" />
            <rect x="4" y="8" width="8" height="2" fill="#DC2626" />
            <rect x="5" y="6" width="6" height="2" fill="#DC2626" />
            <rect x="6" y="4" width="4" height="2" fill="#DC2626" />
            <rect x="7" y="2" width="2" height="2" fill="#DC2626" />
            <rect x="5" y="13" width="6" height="4" fill="#F3F4F6" />
            <rect x="6" y="16" width="4" height="2" fill="#F3F4F6" />
            <rect x="6" y="11" width="1" height="1" fill="#000" />
            <rect x="9" y="11" width="1" height="1" fill="#000" />
            <rect x="7" y="12" width="2" height="1" fill="#F97316" />
          </svg>
        )

      case 'decorative_fence':
        return (
          <svg width={48 * scale} height={20 * scale} viewBox="0 0 48 20" className={className} shapeRendering="crispEdges">
            <rect x="2" y="8" width="3" height="10" fill="#8B4513" />
            <rect x="14" y="8" width="3" height="10" fill="#8B4513" />
            <rect x="26" y="8" width="3" height="10" fill="#8B4513" />
            <rect x="38" y="8" width="3" height="10" fill="#8B4513" />
            <rect x="2" y="6" width="3" height="2" fill="#A16207" />
            <rect x="3" y="5" width="1" height="1" fill="#A16207" />
            <rect x="14" y="6" width="3" height="2" fill="#A16207" />
            <rect x="15" y="5" width="1" height="1" fill="#A16207" />
            <rect x="26" y="6" width="3" height="2" fill="#A16207" />
            <rect x="27" y="5" width="1" height="1" fill="#A16207" />
            <rect x="38" y="6" width="3" height="2" fill="#A16207" />
            <rect x="39" y="5" width="1" height="1" fill="#A16207" />
            <rect x="0" y="11" width="48" height="2" fill="#92400E" />
            <rect x="0" y="15" width="48" height="2" fill="#92400E" />
            <rect x="8" y="12" width="1" height="1" fill="#451A03" />
            <rect x="20" y="12" width="1" height="1" fill="#451A03" />
            <rect x="32" y="12" width="1" height="1" fill="#451A03" />
            <rect x="44" y="12" width="1" height="1" fill="#451A03" />
            <rect x="8" y="16" width="1" height="1" fill="#451A03" />
            <rect x="20" y="16" width="1" height="1" fill="#451A03" />
            <rect x="32" y="16" width="1" height="1" fill="#451A03" />
            <rect x="44" y="16" width="1" height="1" fill="#451A03" />
          </svg>
        )

      case 'wind_chimes':
        return (
          <svg width={16 * scale} height={28 * scale} viewBox="0 0 16 28" className={className} shapeRendering="crispEdges">
            <rect x="4" y="26" width="8" height="2" fill="#4A5D23" />
            <rect x="7" y="4" width="2" height="6" fill="#8B4513" />
            <rect x="7" y="3" width="2" height="1" fill="#A16207" />
            <rect x="4" y="10" width="8" height="1" fill="#F3E8FF" />
            <rect x="6" y="11" width="1" height="9" fill="#D1D5DB" />
            <rect x="8" y="11" width="1" height="11" fill="#D1D5DB" />
            <rect x="10" y="11" width="1" height="8" fill="#D1D5DB" />
            <rect x="4" y="11" width="1" height="7" fill="#D1D5DB" />
            <rect x="12" y="11" width="1" height="10" fill="#D1D5DB" />
            <rect x="5" y="20" width="2" height="4" fill="#E5E7EB" />
            <rect x="7" y="22" width="2" height="3" fill="#E5E7EB" />
            <rect x="9" y="19" width="2" height="4" fill="#E5E7EB" />
            <rect x="3" y="18" width="2" height="3" fill="#E5E7EB" />
            <rect x="11" y="21" width="2" height="4" fill="#E5E7EB" />
            <rect x="6" y="20" width="1" height="4" fill="#F9FAFB" opacity="0.5" />
            <rect x="8" y="22" width="1" height="3" fill="#F9FAFB" opacity="0.5" />
            <rect x="10" y="19" width="1" height="4" fill="#F9FAFB" opacity="0.5" />
            <rect x="4" y="18" width="1" height="3" fill="#F9FAFB" opacity="0.5" />
            <rect x="12" y="21" width="1" height="4" fill="#F9FAFB" opacity="0.5" />
            <rect x="7" y="15" width="2" height="2" fill="#92400E" />
          </svg>
        )

      default:
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className} shapeRendering="crispEdges">
            <rect x="2" y="2" width="16" height="16" fill="#8B5CF6" />
            <text x="10" y="14" textAnchor="middle" fontSize="10" fill="white">★</text>
          </svg>
        )
    }
  }

  const renderSeasonal = (id: string, variant: string) => {
    switch (id) {
      case 'pumpkin':
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className} shapeRendering="crispEdges">
            <rect x="2" y="8" width="16" height="10" fill="#EA580C" />
            <rect x="3" y="7" width="14" height="12" fill="#EA580C" />
            <rect x="5" y="8" width="2" height="10" fill="#C2410C" opacity="0.5" />
            <rect x="9" y="8" width="2" height="11" fill="#DC2626" opacity="0.5" />
            <rect x="13" y="8" width="2" height="10" fill="#C2410C" opacity="0.5" />
            <rect x="9" y="5" width="2" height="3" fill="#16A34A" />
            <rect x="10" y="4" width="2" height="1" fill="#16A34A" />
            <rect x="11" y="5" width="1" height="1" fill="#22C55E" />
            <rect x="12" y="4" width="1" height="1" fill="#22C55E" />
            <rect x="13" y="4" width="1" height="1" fill="#22C55E" />
            <rect x="13" y="5" width="1" height="1" fill="#22C55E" />
          </svg>
        )

      default:
        return (
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
            <rect x="2" y="2" width="12" height="12" fill="#F97316" />
            <text x="8" y="12" textAnchor="middle" fontSize="8" fill="white">🎃</text>
          </svg>
        )
    }
  }

  const renderHouseCustom = (id: string, variant: string) => {
    switch (id) {
      case 'round_windows':
        return (
          <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className} shapeRendering="crispEdges">
            <rect x="8" y="8" width="14" height="14" fill="#A8E6CF" />
            <rect x="9" y="9" width="12" height="12" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
            <rect x="28" y="8" width="14" height="14" fill="#A8E6CF" />
            <rect x="29" y="9" width="12" height="12" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
            <rect x="14" y="8" width="2" height="14" fill="#2E4B3F" />
            <rect x="8" y="14" width="14" height="2" fill="#2E4B3F" />
            <rect x="34" y="8" width="2" height="14" fill="#2E4B3F" />
            <rect x="28" y="14" width="14" height="2" fill="#2E4B3F" />
          </svg>
        )
      case 'arched_windows':
        return (
          <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className} shapeRendering="crispEdges">
            <rect x="8" y="12" width="14" height="10" fill="#A8E6CF" />
            <rect x="9" y="10" width="12" height="2" fill="#A8E6CF" />
            <rect x="11" y="8" width="8" height="2" fill="#A8E6CF" />
            <rect x="28" y="12" width="14" height="10" fill="#A8E6CF" />
            <rect x="29" y="10" width="12" height="2" fill="#A8E6CF" />
            <rect x="31" y="8" width="8" height="2" fill="#A8E6CF" />
            <rect x="14" y="8" width="2" height="14" fill="#2E4B3F" />
            <rect x="34" y="8" width="2" height="14" fill="#2E4B3F" />
          </svg>
        )
      case 'bay_windows':
        return (
          <svg width={60 * scale} height={35 * scale} viewBox="0 0 60 35" className={className} shapeRendering="crispEdges">
            <rect x="10" y="12" width="10" height="8" fill="#F5E9D4" stroke="#A18463" strokeWidth="1" />
            <rect x="40" y="12" width="10" height="8" fill="#F5E9D4" stroke="#A18463" strokeWidth="1" />
            <rect x="12" y="13" width="6" height="6" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
            <rect x="42" y="13" width="6" height="6" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
            <rect x="14" y="13" width="2" height="6" fill="#2E4B3F" />
            <rect x="44" y="13" width="2" height="6" fill="#2E4B3F" />
          </svg>
        )
      case 'arched_door':
        return (
          <svg width={25 * scale} height={35 * scale} viewBox="0 0 25 35" className={className} shapeRendering="crispEdges">
            <rect x="5" y="10" width="15" height="25" fill="#8B4513" />
            <rect x="6" y="8" width="13" height="2" fill="#8B4513" />
            <rect x="8" y="6" width="9" height="2" fill="#8B4513" />
            <rect x="7" y="12" width="11" height="8" fill="none" stroke="#654321" strokeWidth="1" />
            <rect x="7" y="22" width="11" height="8" fill="none" stroke="#654321" strokeWidth="1" />
            <rect x="16" y="20" width="2" height="2" fill="#FFD700" />
          </svg>
        )
      case 'double_door':
        return (
          <svg width={35 * scale} height={35 * scale} viewBox="0 0 35 35" className={className} shapeRendering="crispEdges">
            <rect x="5" y="10" width="12" height="25" fill="#8B4513" stroke="#654321" strokeWidth="1" />
            <rect x="18" y="10" width="12" height="25" fill="#8B4513" stroke="#654321" strokeWidth="1" />
            <rect x="7" y="15" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
            <rect x="7" y="24" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
            <rect x="20" y="15" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
            <rect x="20" y="24" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
            <rect x="14" y="22" width="2" height="2" fill="#FFD700" />
            <rect x="19" y="22" width="2" height="2" fill="#FFD700" />
          </svg>
        )
      case 'cottage_door':
        return (
          <svg width={25 * scale} height={35 * scale} viewBox="0 0 25 35" className={className} shapeRendering="crispEdges">
            <rect x="5" y="10" width="15" height="25" fill="#D2691E" stroke="#8B4513" strokeWidth="1" />
            <rect x="6" y="11" width="13" height="2" fill="#8B4513" />
            <rect x="6" y="32" width="13" height="2" fill="#8B4513" />
            <rect x="6" y="11" width="2" height="23" fill="#8B4513" />
            <rect x="17" y="11" width="2" height="23" fill="#8B4513" />
            <rect x="6" y="21" width="13" height="2" fill="#8B4513" />
            <rect x="17" y="22" width="2" height="2" fill="#2F2F2F" />
          </svg>
        )
      case 'ornate_trim':
        return (
          <svg width={60 * scale} height={25 * scale} viewBox="0 0 60 25" className={className} shapeRendering="crispEdges">
            <rect x="5" y="15" width="50" height="2" fill="#A18463" />
            <rect x="15" y="12" width="4" height="4" fill="none" stroke="#A18463" strokeWidth="1" />
            <rect x="30" y="12" width="4" height="4" fill="none" stroke="#A18463" strokeWidth="1" />
            <rect x="45" y="12" width="4" height="4" fill="none" stroke="#A18463" strokeWidth="1" />
            <rect x="5" y="18" width="50" height="3" fill="#A18463" />
          </svg>
        )
      case 'scalloped_trim':
        return (
          <svg width={60 * scale} height={20 * scale} viewBox="0 0 60 20" className={className} shapeRendering="crispEdges">
            <rect x="5" y="15" width="50" height="3" fill="#A18463" />
            <rect x="10" y="18" width="4" height="2" fill="#A18463" />
            <rect x="20" y="18" width="4" height="2" fill="#A18463" />
            <rect x="30" y="18" width="4" height="2" fill="#A18463" />
            <rect x="40" y="18" width="4" height="2" fill="#A18463" />
            <rect x="50" y="18" width="4" height="2" fill="#A18463" />
          </svg>
        )
      case 'gabled_trim':
        return (
          <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className} shapeRendering="crispEdges">
            <rect x="5" y="23" width="40" height="4" fill="#A18463" stroke="#2E4B3F" strokeWidth="1" />
            <rect x="24" y="5" width="2" height="18" fill="#A18463" />
            <rect x="22" y="10" width="6" height="2" fill="#A18463" />
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
  const renderFurniture = (id: string, variant: string) => {
    // Color variants for garden bench
    const getBenchColors = (variant: string) => {
      switch (variant) {
        case 'wood':
        default:
          return { primary: '#A0522D', secondary: '#8B4513', grain: '#654321' }
        case 'painted_white':
          return { primary: '#F9FAFB', secondary: '#E5E7EB', grain: '#D1D5DB' }
        case 'painted_green':
          return { primary: '#22C55E', secondary: '#16A34A', grain: '#15803D' }
        case 'weathered':
          return { primary: '#9CA3AF', secondary: '#6B7280', grain: '#4B5563' }
      }
    }

    // Color variants for mailbox
    const getMailboxColors = (variant: string) => {
      switch (variant) {
        case 'red':
        default:
          return { primary: '#FF6347', secondary: '#FF4500', accent: '#B22222' }
        case 'blue':
          return { primary: '#3B82F6', secondary: '#2563EB', accent: '#1D4ED8' }
        case 'black':
          return { primary: '#374151', secondary: '#1F2937', accent: '#111827' }
        case 'green':
          return { primary: '#22C55E', secondary: '#16A34A', accent: '#15803D' }
      }
    }

    switch (id) {
      case 'garden_bench':
        const benchColors = getBenchColors(variant)
        return (
          <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className} shapeRendering="crispEdges">
            <rect x="6" y="12" width="3" height="8" fill={benchColors.secondary} />
            <rect x="39" y="12" width="3" height="8" fill={benchColors.secondary} />
            <rect x="4" y="10" width="40" height="6" fill={benchColors.primary} />
            <rect x="4" y="6" width="40" height="4" fill={benchColors.primary} />
            <rect x="4" y="8" width="4" height="2" fill={benchColors.secondary} />
            <rect x="40" y="8" width="4" height="2" fill={benchColors.secondary} />
            <rect x="8" y="11" width="32" height="1" fill={benchColors.grain} />
            <rect x="8" y="13" width="32" height="1" fill={benchColors.grain} />
            <rect x="8" y="7" width="32" height="1" fill={benchColors.grain} />
          </svg>
        )
      case 'outdoor_table':
        return (
          <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
            <rect x="6" y="18" width="2" height="10" fill="#8B4513" />
            <rect x="24" y="18" width="2" height="10" fill="#8B4513" />
            <rect x="6" y="24" width="2" height="4" fill="#8B4513" />
            <rect x="24" y="24" width="2" height="4" fill="#8B4513" />
            <rect x="4" y="14" width="24" height="4" fill="#D2B48C" />
            <rect x="5" y="13" width="22" height="6" fill="#DEB887" />
            <rect x="12" y="12" width="2" height="2" fill="#FFE4E1" />
            <rect x="18" y="11" width="4" height="6" fill="#8FBC8F" />
          </svg>
        )
      case 'mailbox':
        const mailboxColors = getMailboxColors(variant)
        return (
          <svg width={20 * scale} height={32 * scale} viewBox="0 0 20 32" className={className} shapeRendering="crispEdges">
            <rect x="8" y="16" width="4" height="14" fill="#8B4513" />
            <rect x="4" y="8" width="12" height="10" fill={mailboxColors.primary} />
            <rect x="5" y="10" width="8" height="6" fill={mailboxColors.secondary} />
            <rect x="12" y="13" width="2" height="2" fill="#FFD700" />
            <rect x="16" y="10" width="3" height="2" fill="#FFD700" />
            <rect x="9" y="15" width="3" height="1" fill="white" />
          </svg>
        )
      case 'planter_box':
        return (
          <svg width={32 * scale} height={20 * scale} viewBox="0 0 32 20" className={className} shapeRendering="crispEdges">
            <rect x="4" y="12" width="24" height="6" fill="#8B4513" />
            <rect x="2" y="14" width="28" height="4" fill="#A0522D" />
            <rect x="3" y="13" width="26" height="3" fill="#654321" />
            <rect x="8" y="8" width="3" height="4" fill="#228B22" />
            <rect x="16" y="6" width="4" height="5" fill="#32CD32" />
            <rect x="24" y="8" width="3" height="4" fill="#228B22" />
            <rect x="12" y="8" width="2" height="2" fill="#FF69B4" />
            <rect x="20" y="7" width="2" height="2" fill="#FF1493" />
          </svg>
        )
      case 'picnic_table':
        return (
          <svg width={40 * scale} height={28 * scale} viewBox="0 0 40 28" className={className} shapeRendering="crispEdges">
            <rect x="8" y="12" width="4" height="12" fill="#8B4513" />
            <rect x="28" y="12" width="4" height="12" fill="#8B4513" />
            <rect x="4" y="10" width="32" height="4" fill="#D2B48C" />
            <rect x="2" y="18" width="2" height="6" fill="#8B4513" />
            <rect x="36" y="18" width="2" height="6" fill="#8B4513" />
            <rect x="0" y="16" width="16" height="3" fill="#D2B48C" />
            <rect x="24" y="16" width="16" height="3" fill="#D2B48C" />
          </svg>
        )
      default:
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <rect x="4" y="4" width="16" height="16" fill="#8B4513" rx="2" />
            <text x="12" y="14" textAnchor="middle" fontSize="8" fill="white">🪑</text>
          </svg>
        )
    }
  }
  const renderLighting = (id: string, variant: string) => {
    switch (id) {
      case 'garden_lantern':
        return (
          <svg width={16 * scale} height={32 * scale} viewBox="0 0 16 32" className={className} shapeRendering="crispEdges">
            <rect x="7" y="16" width="2" height="14" fill="#2F2F2F" />
            <rect x="4" y="14" width="8" height="2" fill="#4A4A4A" />
            <rect x="5" y="6" width="6" height="8" fill="#FFF8DC" fillOpacity="0.8" />
            <rect x="6" y="4" width="4" height="2" fill="#2F2F2F" />
            <rect x="7" y="2" width="2" height="2" fill="#2F2F2F" />
            <rect x="7" y="9" width="2" height="2" fill="#FFD700" />
          </svg>
        )
      case 'string_lights':
        return (
          <svg width={64 * scale} height={16 * scale} viewBox="0 0 64 16" className={className} shapeRendering="crispEdges">
            <path d="M2 8 Q16 4 32 8 Q48 4 62 8" stroke="#2F2F2F" strokeWidth="1" fill="none" />
            <rect x="7" y="5" width="2" height="2" fill="#FFD700" />
            <rect x="19" y="8" width="2" height="2" fill="#FF6347" />
            <rect x="31" y="5" width="2" height="2" fill="#32CD32" />
            <rect x="43" y="8" width="2" height="2" fill="#87CEEB" />
            <rect x="55" y="5" width="2" height="2" fill="#DA70D6" />
          </svg>
        )
      case 'torch':
        return (
          <svg width={12 * scale} height={36 * scale} viewBox="0 0 12 36" className={className} shapeRendering="crispEdges">
            <rect x="5" y="20" width="2" height="14" fill="#8B4513" />
            <rect x="4" y="18" width="4" height="2" fill="#2F2F2F" />
            <rect x="5" y="12" width="2" height="6" fill="#FF4500" />
            <rect x="5" y="10" width="2" height="4" fill="#FF6347" />
            <rect x="6" y="8" width="1" height="3" fill="#FFD700" />
          </svg>
        )
      case 'spotlight':
        return (
          <svg width={20 * scale} height={24 * scale} viewBox="0 0 20 24" className={className} shapeRendering="crispEdges">
            <rect x="9" y="18" width="2" height="4" fill="#2F2F2F" />
            <rect x="8" y="22" width="4" height="1" fill="#4A4A4A" />
            <rect x="7" y="11" width="6" height="4" fill="#4A4A4A" />
            <rect x="8" y="11" width="4" height="4" fill="#E6E6FA" />
            <rect x="8" y="15" width="4" height="3" fill="#2F2F2F" />
          </svg>
        )
      default:
        return (
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
            <circle cx="8" cy="8" r="6" fill="#FFD700" />
            <text x="8" y="12" textAnchor="middle" fontSize="8" fill="white">💡</text>
          </svg>
        )
    }
  }
  const renderWater = (id: string, variant: string) => {
    switch (id) {
      case 'fountain':
        return (
          <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
            <rect x="4" y="24" width="24" height="6" fill="#4682B4" />
            <rect x="6" y="22" width="20" height="4" fill="#87CEEB" />
            <rect x="8" y="22" width="16" height="3" fill="#B0E0E6" opacity="0.8" />
            <rect x="14" y="14" width="4" height="8" fill="#A9A9A9" />
            <rect x="15" y="12" width="2" height="4" fill="#87CEEB" />
            <rect x="15" y="8" width="2" height="3" fill="#B0E0E6" />
            <rect x="15" y="5" width="2" height="2" fill="#E0F6FF" />
          </svg>
        )
      case 'pond':
        return (
          <svg width={40 * scale} height={24 * scale} viewBox="0 0 40 24" className={className} shapeRendering="crispEdges">
            <rect x="4" y="16" width="32" height="6" fill="#4682B4" />
            <rect x="6" y="14" width="28" height="4" fill="#87CEEB" />
            <rect x="8" y="14" width="24" height="3" fill="#B0E0E6" opacity="0.8" />
            <rect x="12" y="13" width="4" height="2" fill="#228B22" />
            <rect x="28" y="15" width="3" height="2" fill="#32CD32" />
            <rect x="22" y="12" width="3" height="2" fill="#228B22" />
          </svg>
        )
      case 'rain_barrel':
        return (
          <svg width={20 * scale} height={28 * scale} viewBox="0 0 20 28" className={className} shapeRendering="crispEdges">
            <rect x="2" y="10" width="16" height="16" fill="#8B4513" />
            <rect x="2" y="10" width="16" height="10" fill="#A0522D" />
            <rect x="2" y="12" width="16" height="1" fill="#654321" />
            <rect x="2" y="18" width="16" height="1" fill="#654321" />
            <rect x="18" y="16" width="3" height="2" fill="#2F2F2F" />
            <rect x="3" y="14" width="14" height="4" fill="#4682B4" opacity="0.6" />
          </svg>
        )
      default:
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
            <circle cx="12" cy="12" r="8" fill="#87CEEB" />
            <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white">💧</text>
          </svg>
        )
    }
  }
  const renderStructure = (id: string, variant: string) => {
    switch (id) {
      case 'gazebo':
        return (
          <svg width={48 * scale} height={40 * scale} viewBox="0 0 48 40" className={className} shapeRendering="crispEdges">
            <rect x="4" y="36" width="40" height="3" fill="#4A5D23" />
            <rect x="6" y="32" width="36" height="6" fill="#D2B48C" />
            <rect x="8" y="20" width="2" height="12" fill="#8B4513" />
            <rect x="22" y="20" width="2" height="12" fill="#8B4513" />
            <rect x="24" y="20" width="2" height="12" fill="#8B4513" />
            <rect x="38" y="20" width="2" height="12" fill="#8B4513" />
            <polygon points="24,8 8,20 40,20" fill="#8B4513" />
            <rect x="8" y="24" width="32" height="2" fill="#A0522D" />
          </svg>
        )
      case 'trellis':
        return (
          <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className} shapeRendering="crispEdges">
            <rect x="6" y="8" width="2" height="20" fill="#8B4513" />
            <rect x="16" y="8" width="2" height="20" fill="#8B4513" />
            <rect x="6" y="10" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="14" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="18" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="22" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="26" width="12" height="1" fill="#A0522D" />
            <rect x="8" y="12" width="2" height="16" fill="#228B22" opacity="0.6" />
            <rect x="14" y="10" width="2" height="16" fill="#32CD32" opacity="0.6" />
          </svg>
        )
      case 'garden_arch':
        return (
          <svg width={32 * scale} height={36 * scale} viewBox="0 0 32 36" className={className} shapeRendering="crispEdges">
            <rect x="4" y="20" width="3" height="14" fill="#8B4513" />
            <rect x="25" y="20" width="3" height="14" fill="#8B4513" />
            <path d="M4 20 Q16 8 28 20" stroke="#A0522D" strokeWidth="3" fill="none" />
            <rect x="4" y="18" width="24" height="1" fill="#A0522D" />
            <rect x="4" y="24" width="24" height="1" fill="#A0522D" />
            <rect x="6" y="22" width="2" height="2" fill="#FF69B4" />
            <rect x="26" y="20" width="2" height="2" fill="#FF1493" />
          </svg>
        )
      default:
        return (
          <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
            <rect x="6" y="6" width="20" height="20" fill="#8B4513" rx="2" />
            <text x="16" y="20" textAnchor="middle" fontSize="8" fill="white">🏗️</text>
          </svg>
        )
    }
  }

  switch (decorationType) {
    case 'plant': return renderPlant(decorationId, variant)
    case 'path': return renderPath(decorationId, variant)
    case 'feature': return renderFeature(decorationId, variant)
    case 'seasonal': return renderSeasonal(decorationId, variant)
    case 'house_custom': return renderHouseCustom(decorationId, variant)
    case 'furniture': return renderFurniture(decorationId, variant)
    case 'lighting': return renderLighting(decorationId, variant)
    case 'water': return renderWater(decorationId, variant)
    case 'structure': return renderStructure(decorationId, variant)
    default:
      if (renderSvg) {
        return (
          <div
            className={className}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
            dangerouslySetInnerHTML={{ __html: renderSvg }}
          />
        )
      }
      return (
        <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className}>
          <rect x="2" y="2" width="12" height="12" fill="#9CA3AF" rx="2" />
          <text x="8" y="11" textAnchor="middle" fontSize="8" fill="white">?</text>
        </svg>
      )
  }
}

export const DECORATION_LIBRARY = {
  plants: [
    { id: 'roses_red', name: 'Red Roses', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_white', name: 'White Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'small_tree', name: 'Small Tree', type: 'plant', zone: 'front_yard' },
    { id: 'sunflowers', name: 'Sunflowers', type: 'plant', zone: 'front_yard' },
    { id: 'lavender', name: 'Lavender', type: 'plant', zone: 'front_yard' },
    { id: 'flower_pot', name: 'Flower Pot', type: 'plant', zone: 'front_yard' }
  ],
  paths: [
    { id: 'stone_path', name: 'Stone Path', type: 'path', zone: 'front_yard' },
    { id: 'brick_path', name: 'Brick Path', type: 'path', zone: 'front_yard' },
    { id: 'stepping_stones', name: 'Stepping Stones', type: 'path', zone: 'front_yard' },
    { id: 'gravel_path', name: 'Gravel Path', type: 'path', zone: 'front_yard' }
  ],
  features: [
    { id: 'bird_bath', name: 'Bird Bath', type: 'feature', zone: 'front_yard' },
    { id: 'garden_gnome', name: 'Garden Gnome', type: 'feature', zone: 'front_yard' },
    { id: 'decorative_fence', name: 'Decorative Fence', type: 'feature', zone: 'front_yard' },
    { id: 'wind_chimes', name: 'Wind Chimes', type: 'feature', zone: 'front_yard' }
  ],
  furniture: [
    { id: 'garden_bench', name: 'Garden Bench', type: 'furniture', zone: 'front_yard' },
    { id: 'outdoor_table', name: 'Outdoor Table', type: 'furniture', zone: 'front_yard' },
    { id: 'mailbox', name: 'Mailbox', type: 'furniture', zone: 'front_yard' },
    { id: 'planter_box', name: 'Planter Box', type: 'furniture', zone: 'front_yard' },
    { id: 'picnic_table', name: 'Picnic Table', type: 'furniture', zone: 'front_yard' }
  ],
  lighting: [
    { id: 'garden_lantern', name: 'Garden Lantern', type: 'lighting', zone: 'front_yard' },
    { id: 'string_lights', name: 'String Lights', type: 'lighting', zone: 'front_yard' },
    { id: 'torch', name: 'Torch', type: 'lighting', zone: 'front_yard' },
    { id: 'spotlight', name: 'Spotlight', type: 'lighting', zone: 'front_yard' }
  ],
  water: [
    { id: 'fountain', name: 'Fountain', type: 'water', zone: 'front_yard' },
    { id: 'pond', name: 'Pond', type: 'water', zone: 'front_yard' },
    { id: 'rain_barrel', name: 'Rain Barrel', type: 'water', zone: 'front_yard' }
  ],
  structure: [
    { id: 'gazebo', name: 'Gazebo', type: 'structure', zone: 'front_yard' },
    { id: 'trellis', name: 'Trellis', type: 'structure', zone: 'front_yard' },
    { id: 'garden_arch', name: 'Garden Arch', type: 'structure', zone: 'front_yard' }
  ],
  atmosphere: [
    { id: 'sunny_sky', name: 'Sunny Day', type: 'sky', zone: 'background' },
    { id: 'sunset_sky', name: 'Sunset', type: 'sky', zone: 'background' }
  ]
}