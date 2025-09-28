import React from 'react'

interface DecorationSVGProps {
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal' | 'house_custom' | 'furniture' | 'lighting' | 'water' | 'structure'
  decorationId: string
  variant?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
  renderSvg?: string  // Custom SVG from database
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
  renderSvg
}: DecorationSVGProps) {
  const scale = SIZE_SCALES[size]

  // If custom SVG is provided from database, use it
  if (renderSvg) {
    return (
      <div
        className={className}
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        dangerouslySetInnerHTML={{ __html: renderSvg }}
      />
    )
  }
  
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
        const roseColors = getRoseColors(variant)
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className}>
            {/* Rose bush base */}
            <ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" />
            {/* Stems */}
            <rect x="10" y="12" width="1" height="8" fill="#2D5016" />
            <rect x="13" y="10" width="1" height="10" fill="#2D5016" />
            <rect x="7" y="14" width="1" height="6" fill="#2D5016" />
            {/* Leaves */}
            <ellipse cx="9" cy="14" rx="2" ry="1.5" fill="#4A7C59" transform="rotate(-20 9 14)" />
            <ellipse cx="15" cy="12" rx="2" ry="1.5" fill="#4A7C59" transform="rotate(20 15 12)" />
            {/* Rose flowers with variant colors */}
            <circle cx="11" cy="10" r="2.5" fill={roseColors.primary} />
            <circle cx="14" cy="8" r="2" fill={roseColors.secondary} />
            <circle cx="8" cy="12" r="1.8" fill={roseColors.tertiary} />
            {/* Flower centers */}
            <circle cx="11" cy="10" r="0.8" fill={roseColors.center} />
            <circle cx="14" cy="8" r="0.6" fill={roseColors.center} />
            <circle cx="8" cy="12" r="0.5" fill={roseColors.center} />
          </svg>
        )

      case 'roses_pink':
        const rosePinkColors = getRoseColors('pink')
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className}>
            {/* Rose bush base */}
            <ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" />
            {/* Stems */}
            <rect x="10" y="12" width="1" height="8" fill="#2D5016" />
            <rect x="13" y="10" width="1" height="10" fill="#2D5016" />
            <rect x="7" y="14" width="1" height="6" fill="#2D5016" />
            {/* Leaves */}
            <ellipse cx="9" cy="14" rx="2" ry="1.5" fill="#4A7C59" transform="rotate(-20 9 14)" />
            <ellipse cx="15" cy="12" rx="2" ry="1.5" fill="#4A7C59" transform="rotate(20 15 12)" />
            {/* Rose flowers with pink variant colors */}
            <circle cx="11" cy="10" r="2.5" fill={rosePinkColors.primary} />
            <circle cx="14" cy="8" r="2" fill={rosePinkColors.secondary} />
            <circle cx="8" cy="12" r="1.8" fill={rosePinkColors.tertiary} />
            {/* Flower centers */}
            <circle cx="11" cy="10" r="0.8" fill={rosePinkColors.center} />
            <circle cx="14" cy="8" r="0.6" fill={rosePinkColors.center} />
            <circle cx="8" cy="12" r="0.5" fill={rosePinkColors.center} />
          </svg>
        )

      case 'roses_white':
        const roseWhiteColors = getRoseColors('white')
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className}>
            {/* Rose bush base */}
            <ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" />
            {/* Stems */}
            <rect x="10" y="12" width="1" height="8" fill="#2D5016" />
            <rect x="13" y="10" width="1" height="10" fill="#2D5016" />
            <rect x="7" y="14" width="1" height="6" fill="#2D5016" />
            {/* Leaves */}
            <ellipse cx="9" cy="14" rx="2" ry="1.5" fill="#4A7C59" transform="rotate(-20 9 14)" />
            <ellipse cx="15" cy="12" rx="2" ry="1.5" fill="#4A7C59" transform="rotate(20 15 12)" />
            {/* Rose flowers with white variant colors */}
            <circle cx="11" cy="10" r="2.5" fill={roseWhiteColors.primary} />
            <circle cx="14" cy="8" r="2" fill={roseWhiteColors.secondary} />
            <circle cx="8" cy="12" r="1.8" fill={roseWhiteColors.tertiary} />
            {/* Flower centers */}
            <circle cx="11" cy="10" r="0.8" fill={roseWhiteColors.center} />
            <circle cx="14" cy="8" r="0.6" fill={roseWhiteColors.center} />
            <circle cx="8" cy="12" r="0.5" fill={roseWhiteColors.center} />
          </svg>
        )

      case 'daisies_white':
        const daisyColors = getDaisyColors(variant)
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className}>
            {/* Grass base */}
            <ellipse cx="10" cy="17" rx="6" ry="2" fill="#4A5D23" />
            {/* Stems */}
            <rect x="7" y="10" width="0.8" height="7" fill="#2D5016" />
            <rect x="11" y="8" width="0.8" height="9" fill="#2D5016" />
            <rect x="13" y="12" width="0.8" height="5" fill="#2D5016" />
            {/* Daisy flowers with variant colors */}
            <g>
              {/* Petals for first flower */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <ellipse
                  key={angle}
                  cx="8"
                  cy="8"
                  rx="1.5"
                  ry="0.6"
                  fill={daisyColors.petals}
                  transform={`rotate(${angle} 8 8)`}
                />
              ))}
              <circle cx="8" cy="8" r="1.2" fill={daisyColors.center} />
            </g>
            <g>
              {/* Petals for second flower */}
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <ellipse
                  key={angle}
                  cx="12"
                  cy="6"
                  rx="1.2"
                  ry="0.5"
                  fill={daisyColors.petalsAlt}
                  transform={`rotate(${angle} 12 6)`}
                />
              ))}
              <circle cx="12" cy="6" r="0.8" fill={daisyColors.centerAlt} />
            </g>
          </svg>
        )

      case 'daisies_yellow':
        const daisyYellowColors = getDaisyColors('yellow')
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className}>
            {/* Grass base */}
            <ellipse cx="10" cy="18" rx="6" ry="2" fill="#4A5D23" />
            {/* Multiple daisy flowers with yellow variant colors */}
            <g>
              {/* Main flower */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <ellipse
                  key={angle}
                  cx="10"
                  cy="8"
                  rx="2.5"
                  ry="0.8"
                  fill={daisyYellowColors.petals}
                  transform={`rotate(${angle} 10 8)`}
                />
              ))}
              <circle cx="10" cy="8" r="1.2" fill={daisyYellowColors.center} />
              {/* Flower stems */}
              <rect x="9.5" y="8" width="1" height="10" fill="#2D5016" />
            </g>
            {/* Secondary smaller flower */}
            <g>
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <ellipse
                  key={angle}
                  cx="12"
                  cy="6"
                  rx="1.5"
                  ry="0.5"
                  fill={daisyYellowColors.petalsAlt}
                  transform={`rotate(${angle} 12 6)`}
                />
              ))}
              <circle cx="12" cy="6" r="0.8" fill={daisyYellowColors.centerAlt} />
            </g>
          </svg>
        )

      case 'tree_oak':
        const treeOakColors = getTreeColors('oak')
        return (
          <svg width={32 * scale} height={40 * scale} viewBox="0 0 32 40" className={className}>
            {/* Tree trunk */}
            <rect x="14" y="28" width="4" height="12" fill={treeOakColors.trunk} />
            {/* Oak tree foliage with broader, fuller canopy */}
            <circle cx="16" cy="20" r="12" fill={treeOakColors.foliage[0]} opacity="0.8" />
            <circle cx="12" cy="18" r="8" fill={treeOakColors.foliage[1]} opacity="0.9" />
            <circle cx="20" cy="19" r="9" fill={treeOakColors.foliage[2]} />
            <circle cx="16" cy="14" r="7" fill={treeOakColors.foliage[3]} opacity="0.7" />
            <circle cx="10" cy="22" r="5" fill={treeOakColors.foliage[4]} opacity="0.6" />
            <circle cx="22" cy="22" r="6" fill={treeOakColors.foliage[5]} opacity="0.5" />
            {/* Oak tree characteristic irregular shape */}
            <circle cx="8" cy="16" r="4" fill={treeOakColors.foliage[1]} opacity="0.4" />
            <circle cx="24" cy="17" r="4" fill={treeOakColors.foliage[2]} opacity="0.4" />
          </svg>
        )

      case 'tree_pine':
        const treePineColors = getTreeColors('pine')
        return (
          <svg width={20 * scale} height={44 * scale} viewBox="0 0 20 44" className={className}>
            {/* Tree trunk */}
            <rect x="9" y="32" width="2" height="12" fill={treePineColors.trunk} />
            {/* Pine tree triangular layers */}
            <path d="M10 8 L4 20 L16 20 Z" fill={treePineColors.foliage[0]} />
            <path d="M10 14 L5 24 L15 24 Z" fill={treePineColors.foliage[1]} />
            <path d="M10 20 L6 28 L14 28 Z" fill={treePineColors.foliage[2]} />
            <path d="M10 26 L7 32 L13 32 Z" fill={treePineColors.foliage[3]} />
            {/* Pine needle texture details */}
            <path d="M10 8 L8 12 L12 12 Z" fill={treePineColors.foliage[4]} opacity="0.6" />
            <path d="M10 14 L8.5 18 L11.5 18 Z" fill={treePineColors.foliage[5]} opacity="0.6" />
          </svg>
        )

      case 'small_tree':
        const treeColors = getTreeColors(variant)
        return (
          <svg width={32 * scale} height={40 * scale} viewBox="0 0 32 40" className={className}>
            {/* Tree trunk */}
            <rect x="14" y="28" width="4" height="12" fill={treeColors.trunk} />
            {/* Tree foliage with variant colors - layered circles for natural look */}
            <circle cx="16" cy="20" r="12" fill={treeColors.foliage[0]} opacity="0.8" />
            <circle cx="13" cy="16" r="10" fill={treeColors.foliage[1]} opacity="0.9" />
            <circle cx="19" cy="18" r="9" fill={treeColors.foliage[2]} />
            <circle cx="16" cy="14" r="8" fill={treeColors.foliage[3]} opacity="0.7" />
            {/* Highlights with variant colors */}
            <circle cx="12" cy="12" r="3" fill={treeColors.foliage[4]} opacity="0.6" />
            <circle cx="20" cy="15" r="2.5" fill={treeColors.foliage[5]} opacity="0.5" />
          </svg>
        )
      
      case 'sunflowers':
        return (
          <svg width={28 * scale} height={36 * scale} viewBox="0 0 28 36" className={className}>
            {/* Grass base */}
            <ellipse cx="14" cy="32" rx="8" ry="3" fill="#4A5D23" />
            {/* Stems */}
            <rect x="10" y="18" width="2" height="14" fill="#2D5016" />
            <rect x="16" y="16" width="2" height="16" fill="#2D5016" />
            <rect x="13" y="20" width="2" height="12" fill="#2D5016" />
            
            {/* Sunflower 1 - Large */}
            <g>
              {/* Petals */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
                <ellipse
                  key={`sf1-${angle}`}
                  cx="11"
                  cy="12"
                  rx="3"
                  ry="1.2"
                  fill="#FCD34D"
                  transform={`rotate(${angle} 11 12)`}
                />
              ))}
              {/* Center */}
              <circle cx="11" cy="12" r="3" fill="#8B4513" />
              <circle cx="11" cy="12" r="2.2" fill="#A16207" />
              {/* Seeds pattern */}
              <circle cx="10" cy="11.5" r="0.3" fill="#451A03" />
              <circle cx="11.5" cy="11" r="0.3" fill="#451A03" />
              <circle cx="11" cy="12.5" r="0.3" fill="#451A03" />
              <circle cx="10.5" cy="12.8" r="0.3" fill="#451A03" />
            </g>
            
            {/* Sunflower 2 - Medium */}
            <g>
              {/* Petals */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <ellipse
                  key={`sf2-${angle}`}
                  cx="17"
                  cy="8"
                  rx="2.5"
                  ry="1"
                  fill="#F59E0B"
                  transform={`rotate(${angle} 17 8)`}
                />
              ))}
              {/* Center */}
              <circle cx="17" cy="8" r="2.2" fill="#8B4513" />
              <circle cx="17" cy="8" r="1.8" fill="#A16207" />
            </g>
            
            {/* Sunflower 3 - Small */}
            <g>
              {/* Petals */}
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <ellipse
                  key={`sf3-${angle}`}
                  cx="14"
                  cy="14"
                  rx="2"
                  ry="0.8"
                  fill="#FBBF24"
                  transform={`rotate(${angle} 14 14)`}
                />
              ))}
              {/* Center */}
              <circle cx="14" cy="14" r="1.5" fill="#8B4513" />
            </g>
            
            {/* Leaves */}
            <ellipse cx="8" cy="16" rx="2.5" ry="1.5" fill="#16A34A" transform="rotate(-30 8 16)" />
            <ellipse cx="20" cy="12" rx="2" ry="1.2" fill="#16A34A" transform="rotate(25 20 12)" />
            <ellipse cx="12" cy="18" rx="1.8" ry="1" fill="#22C55E" transform="rotate(-10 12 18)" />
          </svg>
        )
      
      case 'lavender':
        return (
          <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className}>
            {/* Grass base */}
            <ellipse cx="12" cy="28" rx="7" ry="2.5" fill="#4A5D23" />
            
            {/* Lavender stems */}
            <rect x="8" y="16" width="1" height="12" fill="#16A34A" />
            <rect x="11" y="14" width="1" height="14" fill="#16A34A" />
            <rect x="14" y="15" width="1" height="13" fill="#16A34A" />
            <rect x="17" y="17" width="1" height="11" fill="#16A34A" />
            <rect x="5" y="18" width="1" height="10" fill="#16A34A" />
            
            {/* Lavender flowers - spiky purple clusters */}
            <g>
              {/* Stem 1 */}
              <ellipse cx="8.5" cy="14" rx="1" ry="3" fill="#8B5CF6" />
              <ellipse cx="8.5" cy="11" rx="0.8" ry="2" fill="#A855F7" />
              <circle cx="8" cy="15" r="0.3" fill="#7C3AED" />
              <circle cx="9" cy="13.5" r="0.3" fill="#7C3AED" />
              <circle cx="8.2" cy="12" r="0.2" fill="#6D28D9" />
            </g>
            
            <g>
              {/* Stem 2 */}
              <ellipse cx="11.5" cy="12" rx="1" ry="3.5" fill="#8B5CF6" />
              <ellipse cx="11.5" cy="8.5" rx="0.8" ry="2.5" fill="#A855F7" />
              <circle cx="11" cy="13" r="0.3" fill="#7C3AED" />
              <circle cx="12" cy="11.5" r="0.3" fill="#7C3AED" />
              <circle cx="11.8" cy="9.5" r="0.2" fill="#6D28D9" />
            </g>
            
            <g>
              {/* Stem 3 */}
              <ellipse cx="14.5" cy="13" rx="1" ry="3" fill="#8B5CF6" />
              <ellipse cx="14.5" cy="10" rx="0.8" ry="2" fill="#A855F7" />
              <circle cx="14" cy="14" r="0.3" fill="#7C3AED" />
              <circle cx="15" cy="12.5" r="0.3" fill="#7C3AED" />
            </g>
            
            <g>
              {/* Stem 4 */}
              <ellipse cx="17.5" cy="15" rx="1" ry="2.5" fill="#8B5CF6" />
              <ellipse cx="17.5" cy="13" rx="0.8" ry="2" fill="#A855F7" />
              <circle cx="17" cy="16" r="0.3" fill="#7C3AED" />
              <circle cx="18" cy="14.5" r="0.3" fill="#7C3AED" />
            </g>
            
            <g>
              {/* Stem 5 */}
              <ellipse cx="5.5" cy="16" rx="1" ry="2.5" fill="#8B5CF6" />
              <ellipse cx="5.5" cy="14" rx="0.8" ry="2" fill="#A855F7" />
              <circle cx="5" cy="17" r="0.3" fill="#7C3AED" />
              <circle cx="6" cy="15.5" r="0.3" fill="#7C3AED" />
            </g>
            
            {/* Lavender leaves - thin and silvery */}
            <ellipse cx="10" cy="18" rx="3" ry="0.8" fill="#9CA3AF" transform="rotate(-15 10 18)" />
            <ellipse cx="15" cy="19" rx="2.5" ry="0.6" fill="#9CA3AF" transform="rotate(20 15 19)" />
            <ellipse cx="7" cy="20" rx="2" ry="0.5" fill="#D1D5DB" transform="rotate(-25 7 20)" />
          </svg>
        )
      
      case 'flower_pot':
        return (
          <svg width={18 * scale} height={22 * scale} viewBox="0 0 18 22" className={className}>
            {/* Base */}
            <ellipse cx="9" cy="20" rx="6" ry="1.5" fill="#4A5D23" />
            
            {/* Pot */}
            <path d="M 6 14 L 5 20 L 13 20 L 12 14 Z" fill="#8B4513" />
            <ellipse cx="9" cy="14" rx="3" ry="1" fill="#A16207" />
            <ellipse cx="9" cy="20" rx="4" ry="1.5" fill="#451A03" />
            
            {/* Pot rim */}
            <ellipse cx="9" cy="14" rx="3.5" ry="1.2" fill="#92400E" />
            <ellipse cx="9" cy="14" rx="3" ry="0.8" fill="#A16207" />
            
            {/* Flowers - colorful blooms */}
            <g>
              {/* Flower 1 */}
              <rect x="7" y="8" width="1" height="6" fill="#16A34A" />
              {[0, 72, 144, 216, 288].map(angle => (
                <ellipse
                  key={`f1-${angle}`}
                  cx="7.5"
                  cy="8"
                  rx="1.5"
                  ry="0.8"
                  fill="#EF4444"
                  transform={`rotate(${angle} 7.5 8)`}
                />
              ))}
              <circle cx="7.5" cy="8" r="0.6" fill="#FCD34D" />
            </g>
            
            <g>
              {/* Flower 2 */}
              <rect x="10" y="6" width="1" height="8" fill="#16A34A" />
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <ellipse
                  key={`f2-${angle}`}
                  cx="10.5"
                  cy="6"
                  rx="1.8"
                  ry="0.9"
                  fill="#8B5CF6"
                  transform={`rotate(${angle} 10.5 6)`}
                />
              ))}
              <circle cx="10.5" cy="6" r="0.7" fill="#FBBF24" />
            </g>
            
            <g>
              {/* Flower 3 */}
              <rect x="8.5" y="4" width="1" height="10" fill="#16A34A" />
              {[0, 51, 102, 153, 204, 255, 306].map(angle => (
                <ellipse
                  key={`f3-${angle}`}
                  cx="9"
                  cy="4"
                  rx="1.6"
                  ry="0.7"
                  fill="#F97316"
                  transform={`rotate(${angle} 9 4)`}
                />
              ))}
              <circle cx="9" cy="4" r="0.5" fill="#FEF3C7" />
            </g>
            
            {/* Leaves */}
            <ellipse cx="6" cy="10" rx="1.5" ry="0.8" fill="#22C55E" transform="rotate(-30 6 10)" />
            <ellipse cx="12" cy="9" rx="1.3" ry="0.7" fill="#22C55E" transform="rotate(35 12 9)" />
            <ellipse cx="8" cy="12" rx="1.2" ry="0.6" fill="#16A34A" transform="rotate(10 8 12)" />
          </svg>
        )
      
      default:
        return (
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className}>
            <circle cx="8" cy="8" r="6" fill="#22C55E" />
            <text x="8" y="12" textAnchor="middle" fontSize="8" fill="white">?</text>
          </svg>
        )
    }
  }
  
  const renderPath = (id: string, variant: string) => {
    switch (id) {
      case 'stone_path':
        return (
          <svg width={48 * scale} height={16 * scale} viewBox="0 0 48 16" className={className}>
            {/* Stone path segments */}
            <ellipse cx="8" cy="8" rx="6" ry="3" fill="#9CA3AF" />
            <ellipse cx="20" cy="6" rx="5" ry="2.5" fill="#6B7280" />
            <ellipse cx="32" cy="9" rx="6" ry="3.5" fill="#9CA3AF" />
            <ellipse cx="42" cy="7" rx="4" ry="2" fill="#6B7280" />
            {/* Stone texture */}
            <ellipse cx="7" cy="7" rx="2" ry="1" fill="#F3F4F6" opacity="0.6" />
            <ellipse cx="21" cy="6" rx="1.5" ry="0.8" fill="#F3F4F6" opacity="0.6" />
            <ellipse cx="33" cy="8" rx="2" ry="1.2" fill="#F3F4F6" opacity="0.6" />
          </svg>
        )
      
      case 'brick_path':
        return (
          <svg width={48 * scale} height={12 * scale} viewBox="0 0 48 12" className={className}>
            {/* Brick pattern */}
            <rect x="0" y="0" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.5" />
            <rect x="12" y="0" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
            <rect x="24" y="0" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.5" />
            <rect x="36" y="0" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
            {/* Second row offset */}
            <rect x="-6" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
            <rect x="6" y="6" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.5" />
            <rect x="18" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
            <rect x="30" y="6" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.5" />
            <rect x="42" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
          </svg>
        )
      
      case 'stepping_stones':
        return (
          <svg width={36 * scale} height={24 * scale} viewBox="0 0 36 24" className={className}>
            {/* Stepping stones with natural, organic shapes */}
            <ellipse cx="8" cy="12" rx="5" ry="4" fill="#8B7355" transform="rotate(15 8 12)" />
            <ellipse cx="8" cy="12" rx="4" ry="3" fill="#A3A3A3" transform="rotate(15 8 12)" />
            <ellipse cx="7.5" cy="11.5" rx="2" ry="1.5" fill="#F3F4F6" opacity="0.7" transform="rotate(15 7.5 11.5)" />
            
            <ellipse cx="20" cy="8" rx="4.5" ry="3.5" fill="#78716C" transform="rotate(-20 20 8)" />
            <ellipse cx="20" cy="8" rx="3.5" ry="2.8" fill="#9CA3AF" transform="rotate(-20 20 8)" />
            <ellipse cx="19.8" cy="7.8" rx="1.8" ry="1.2" fill="#F3F4F6" opacity="0.6" transform="rotate(-20 19.8 7.8)" />
            
            <ellipse cx="28" cy="16" rx="5.5" ry="4.2" fill="#8B7355" transform="rotate(25 28 16)" />
            <ellipse cx="28" cy="16" rx="4.2" ry="3.2" fill="#A3A3A3" transform="rotate(25 28 16)" />
            <ellipse cx="27.5" cy="15.5" rx="2.2" ry="1.6" fill="#F3F4F6" opacity="0.8" transform="rotate(25 27.5 15.5)" />
            
            {/* Small moss spots */}
            <ellipse cx="6" cy="10" rx="0.8" ry="0.5" fill="#16A34A" opacity="0.6" />
            <ellipse cx="21" cy="6" rx="0.6" ry="0.4" fill="#16A34A" opacity="0.5" />
            <ellipse cx="29" cy="14" rx="0.9" ry="0.6" fill="#16A34A" opacity="0.7" />
          </svg>
        )
      
      case 'gravel_path':
        return (
          <svg width={40 * scale} height={16 * scale} viewBox="0 0 40 16" className={className}>
            {/* Gravel path base */}
            <rect x="0" y="4" width="40" height="8" fill="#A8A29E" rx="1" />
            <rect x="0" y="5" width="40" height="6" fill="#D6D3D1" rx="0.5" />
            
            {/* Individual gravel pieces - small scattered circles */}
            <circle cx="3" cy="7" r="0.8" fill="#78716C" />
            <circle cx="6" cy="9" r="0.6" fill="#8B7355" />
            <circle cx="9" cy="6.5" r="0.7" fill="#A3A3A3" />
            <circle cx="12" cy="8.5" r="0.5" fill="#78716C" />
            <circle cx="15" cy="7.5" r="0.8" fill="#8B7355" />
            <circle cx="18" cy="6" r="0.6" fill="#A3A3A3" />
            <circle cx="21" cy="9" r="0.7" fill="#78716C" />
            <circle cx="24" cy="7" r="0.5" fill="#8B7355" />
            <circle cx="27" cy="8" r="0.8" fill="#A3A3A3" />
            <circle cx="30" cy="6.5" r="0.6" fill="#78716C" />
            <circle cx="33" cy="8.5" r="0.7" fill="#8B7355" />
            <circle cx="36" cy="7.5" r="0.5" fill="#A3A3A3" />
            
            {/* More gravel texture - smaller pieces */}
            <circle cx="4.5" cy="8.5" r="0.3" fill="#57534E" />
            <circle cx="7.2" cy="6.8" r="0.4" fill="#57534E" />
            <circle cx="10.8" cy="9.2" r="0.3" fill="#57534E" />
            <circle cx="13.5" cy="6.5" r="0.4" fill="#57534E" />
            <circle cx="16.8" cy="8.8" r="0.3" fill="#57534E" />
            <circle cx="19.2" cy="7.2" r="0.4" fill="#57534E" />
            <circle cx="22.5" cy="6.8" r="0.3" fill="#57534E" />
            <circle cx="25.8" cy="9" r="0.4" fill="#57534E" />
            <circle cx="28.2" cy="6.3" r="0.3" fill="#57534E" />
            <circle cx="31.5" cy="8.7" r="0.4" fill="#57534E" />
            <circle cx="34.8" cy="7.8" r="0.3" fill="#57534E" />
            <circle cx="37.2" cy="6.5" r="0.4" fill="#57534E" />
          </svg>
        )
      
      default:
        return (
          <svg width={32 * scale} height={8 * scale} viewBox="0 0 32 8" className={className}>
            <rect x="0" y="2" width="32" height="4" fill="#8B5CF6" rx="2" />
          </svg>
        )
    }
  }
  
  const renderFeature = (id: string, variant: string) => {
    switch (id) {
      case 'bird_bath':
        return (
          <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className}>
            {/* Base */}
            <ellipse cx="12" cy="28" rx="8" ry="3" fill="#6B7280" />
            {/* Pedestal */}
            <rect x="10" y="18" width="4" height="10" fill="#9CA3AF" />
            {/* Bowl */}
            <ellipse cx="12" cy="18" rx="10" ry="4" fill="#D1D5DB" />
            <ellipse cx="12" cy="16" rx="8" ry="3" fill="#E5E7EB" />
            {/* Water */}
            <ellipse cx="12" cy="16" rx="6" ry="2" fill="#3B82F6" opacity="0.7" />
            {/* Water ripples */}
            <ellipse cx="10" cy="16" rx="2" ry="0.5" fill="#60A5FA" opacity="0.5" />
            <ellipse cx="14" cy="15.5" rx="1.5" ry="0.3" fill="#93C5FD" opacity="0.6" />
            {/* Small bird */}
            <ellipse cx="8" cy="14" rx="1.5" ry="1" fill="#8B5A2B" />
            <circle cx="7" cy="13.5" r="0.8" fill="#A0522D" />
            <circle cx="6.5" cy="13.2" r="0.2" fill="#000" />
          </svg>
        )
      
      case 'garden_gnome':
        return (
          <svg width={16 * scale} height={24 * scale} viewBox="0 0 16 24" className={className}>
            {/* Base */}
            <ellipse cx="8" cy="22" rx="6" ry="2" fill="#4A5D23" />
            {/* Body */}
            <ellipse cx="8" cy="18" rx="4" ry="6" fill="#DC2626" />
            {/* Arms */}
            <ellipse cx="5" cy="16" rx="1" ry="2" fill="#F3E8FF" />
            <ellipse cx="11" cy="16" rx="1" ry="2" fill="#F3E8FF" />
            {/* Head */}
            <circle cx="8" cy="10" r="3.5" fill="#FBBF24" />
            {/* Hat */}
            <path d="M 4 8 L 8 2 L 12 8 Z" fill="#DC2626" />
            <ellipse cx="8" cy="8" rx="4.5" ry="1" fill="#B91C1C" />
            {/* Beard */}
            <ellipse cx="8" cy="12" rx="2" ry="2.5" fill="#F3F4F6" />
            {/* Eyes */}
            <circle cx="6.5" cy="9" r="0.4" fill="#000" />
            <circle cx="9.5" cy="9" r="0.4" fill="#000" />
            {/* Nose */}
            <circle cx="8" cy="10.5" r="0.3" fill="#F97316" />
          </svg>
        )
      
      case 'decorative_fence':
        return (
          <svg width={48 * scale} height={20 * scale} viewBox="0 0 48 20" className={className}>
            {/* Fence posts */}
            <rect x="2" y="8" width="3" height="10" fill="#8B4513" />
            <rect x="14" y="8" width="3" height="10" fill="#8B4513" />
            <rect x="26" y="8" width="3" height="10" fill="#8B4513" />
            <rect x="38" y="8" width="3" height="10" fill="#8B4513" />
            
            {/* Post tops - decorative */}
            <circle cx="3.5" cy="8" r="2" fill="#A16207" />
            <circle cx="15.5" cy="8" r="2" fill="#A16207" />
            <circle cx="27.5" cy="8" r="2" fill="#A16207" />
            <circle cx="39.5" cy="8" r="2" fill="#A16207" />
            
            {/* Horizontal rails */}
            <rect x="0" y="11" width="48" height="2" fill="#92400E" />
            <rect x="0" y="15" width="48" height="2" fill="#92400E" />
            
            {/* Decorative pattern on rails */}
            <circle cx="8" cy="12" r="0.5" fill="#451A03" />
            <circle cx="20" cy="12" r="0.5" fill="#451A03" />
            <circle cx="32" cy="12" r="0.5" fill="#451A03" />
            <circle cx="44" cy="12" r="0.5" fill="#451A03" />
            
            <circle cx="8" cy="16" r="0.5" fill="#451A03" />
            <circle cx="20" cy="16" r="0.5" fill="#451A03" />
            <circle cx="32" cy="16" r="0.5" fill="#451A03" />
            <circle cx="44" cy="16" r="0.5" fill="#451A03" />
          </svg>
        )
      
      case 'wind_chimes':
        return (
          <svg width={16 * scale} height={28 * scale} viewBox="0 0 16 28" className={className}>
            {/* Base/ground */}
            <ellipse cx="8" cy="26" rx="4" ry="1.5" fill="#4A5D23" />
            
            {/* Hanging post/hook */}
            <rect x="7" y="4" width="2" height="6" fill="#8B4513" />
            <circle cx="8" cy="4" r="1.5" fill="#A16207" />
            
            {/* Top disc */}
            <ellipse cx="8" cy="10" rx="4" ry="1" fill="#F3E8FF" />
            <ellipse cx="8" cy="10" rx="3" ry="0.7" fill="#E5E7EB" />
            
            {/* Chime strings */}
            <line x1="6" y1="10" x2="6" y2="20" stroke="#D1D5DB" strokeWidth="0.3" />
            <line x1="8" y1="10" x2="8" y2="22" stroke="#D1D5DB" strokeWidth="0.3" />
            <line x1="10" y1="10" x2="10" y2="19" stroke="#D1D5DB" strokeWidth="0.3" />
            <line x1="4.5" y1="10" x2="4.5" y2="18" stroke="#D1D5DB" strokeWidth="0.3" />
            <line x1="11.5" y1="10" x2="11.5" y2="21" stroke="#D1D5DB" strokeWidth="0.3" />
            
            {/* Chime tubes */}
            <rect x="5.7" y="20" width="0.6" height="4" fill="#E5E7EB" rx="0.3" />
            <rect x="7.7" y="22" width="0.6" height="3.5" fill="#E5E7EB" rx="0.3" />
            <rect x="9.7" y="19" width="0.6" height="4.5" fill="#E5E7EB" rx="0.3" />
            <rect x="4.2" y="18" width="0.6" height="3" fill="#E5E7EB" rx="0.3" />
            <rect x="11.2" y="21" width="0.6" height="3.8" fill="#E5E7EB" rx="0.3" />
            
            {/* Tube highlights */}
            <line x1="5.9" y1="20.2" x2="5.9" y2="23.8" stroke="#F9FAFB" strokeWidth="0.2" />
            <line x1="7.9" y1="22.2" x2="7.9" y2="25.3" stroke="#F9FAFB" strokeWidth="0.2" />
            <line x1="9.9" y1="19.2" x2="9.9" y2="23.3" stroke="#F9FAFB" strokeWidth="0.2" />
            <line x1="4.4" y1="18.2" x2="4.4" y2="20.8" stroke="#F9FAFB" strokeWidth="0.2" />
            <line x1="11.4" y1="21.2" x2="11.4" y2="24.6" stroke="#F9FAFB" strokeWidth="0.2" />
            
            {/* Center clapper */}
            <circle cx="8" cy="16" r="0.8" fill="#92400E" />
          </svg>
        )
      
      default:
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className}>
            <circle cx="10" cy="10" r="8" fill="#8B5CF6" />
            <text x="10" y="14" textAnchor="middle" fontSize="10" fill="white">★</text>
          </svg>
        )
    }
  }
  
  const renderSeasonal = (id: string, variant: string) => {
    switch (id) {
      case 'pumpkin':
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className}>
            {/* Pumpkin body */}
            <ellipse cx="10" cy="14" rx="8" ry="6" fill="#EA580C" />
            {/* Pumpkin ridges */}
            <ellipse cx="6" cy="14" rx="2" ry="5" fill="#C2410C" />
            <ellipse cx="10" cy="14" rx="2" ry="5.5" fill="#DC2626" />
            <ellipse cx="14" cy="14" rx="2" ry="5" fill="#C2410C" />
            {/* Stem */}
            <rect x="9" y="6" width="2" height="4" fill="#16A34A" />
            {/* Curly vine */}
            <path d="M 11 6 Q 14 4 12 2 Q 10 4 13 3" stroke="#22C55E" strokeWidth="1" fill="none" />
          </svg>
        )
      
      default:
        return (
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className}>
            <circle cx="8" cy="8" r="6" fill="#F97316" />
            <text x="8" y="12" textAnchor="middle" fontSize="8" fill="white">🎃</text>
          </svg>
        )
    }
  }
  
  const renderHouseCustom = (id: string, variant: string) => {
    switch (id) {
      // Window Styles
      case 'round_windows':
        return (
          <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className}>
            {/* Round window overlays for cottage positions */}
            <circle cx="15" cy="15" r="7" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
            <circle cx="35" cy="15" r="7" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
            {/* Cross pattern */}
            <line x1="15" y1="8" x2="15" y2="22" stroke="#2E4B3F" strokeWidth="0.5"/>
            <line x1="8" y1="15" x2="22" y2="15" stroke="#2E4B3F" strokeWidth="0.5"/>
            <line x1="35" y1="8" x2="35" y2="22" stroke="#2E4B3F" strokeWidth="0.5"/>
            <line x1="28" y1="15" x2="42" y2="15" stroke="#2E4B3F" strokeWidth="0.5"/>
          </svg>
        )
      
      case 'arched_windows':
        return (
          <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className}>
            {/* Arched window overlays */}
            <path d="M8 22 Q8 8 15 8 Q22 8 22 22 Z" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
            <path d="M28 22 Q28 8 35 8 Q42 8 42 22 Z" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
            {/* Window divisions */}
            <line x1="15" y1="8" x2="15" y2="22" stroke="#2E4B3F" strokeWidth="0.5"/>
            <line x1="35" y1="8" x2="35" y2="22" stroke="#2E4B3F" strokeWidth="0.5"/>
          </svg>
        )
        
      case 'bay_windows':
        return (
          <svg width={60 * scale} height={35 * scale} viewBox="0 0 60 35" className={className}>
            {/* Bay window protrusion */}
            <path d="M12 20 L12 12 L8 8 L22 8 L18 12 L18 20 Z" fill="#F5E9D4" stroke="#A18463" strokeWidth="1"/>
            <path d="M42 20 L42 12 L38 8 L52 8 L48 12 L48 20 Z" fill="#F5E9D4" stroke="#A18463" strokeWidth="1"/>
            {/* Windows */}
            <rect x="10" y="12" width="6" height="8" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
            <rect x="44" y="12" width="6" height="8" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
            <line x1="13" y1="12" x2="13" y2="20" stroke="#2E4B3F" strokeWidth="0.3"/>
            <line x1="47" y1="12" x2="47" y2="20" stroke="#2E4B3F" strokeWidth="0.3"/>
          </svg>
        )
      
      // Door Styles  
      case 'arched_door':
        return (
          <svg width={25 * scale} height={35 * scale} viewBox="0 0 25 35" className={className}>
            {/* Arched door */}
            <path d="M5 35 L5 15 Q5 5 12.5 5 Q20 5 20 15 L20 35 Z" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
            {/* Door panels */}
            <rect x="7" y="12" width="11" height="8" fill="none" stroke="#654321" strokeWidth="0.5"/>
            <rect x="7" y="22" width="11" height="8" fill="none" stroke="#654321" strokeWidth="0.5"/>
            {/* Handle */}
            <circle cx="16" cy="20" r="1" fill="#FFD700"/>
            {/* Arch detail */}
            <path d="M7 15 Q12.5 10 18 15" fill="none" stroke="#654321" strokeWidth="0.5"/>
          </svg>
        )
      
      case 'double_door':
        return (
          <svg width={35 * scale} height={35 * scale} viewBox="0 0 35 35" className={className}>
            {/* Left door */}
            <rect x="5" y="10" width="12" height="25" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
            {/* Right door */}
            <rect x="18" y="10" width="12" height="25" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
            {/* Door panels */}
            <rect x="7" y="15" width="8" height="6" fill="none" stroke="#654321" strokeWidth="0.5"/>
            <rect x="7" y="24" width="8" height="6" fill="none" stroke="#654321" strokeWidth="0.5"/>
            <rect x="20" y="15" width="8" height="6" fill="none" stroke="#654321" strokeWidth="0.5"/>
            <rect x="20" y="24" width="8" height="6" fill="none" stroke="#654321" strokeWidth="0.5"/>
            {/* Handles */}
            <circle cx="14" cy="22" r="0.8" fill="#FFD700"/>
            <circle cx="21" cy="22" r="0.8" fill="#FFD700"/>
          </svg>
        )
        
      case 'cottage_door':
        return (
          <svg width={25 * scale} height={35 * scale} viewBox="0 0 25 35" className={className}>
            {/* Cottage door with rustic details */}
            <rect x="5" y="10" width="15" height="25" fill="#D2691E" stroke="#8B4513" strokeWidth="1"/>
            {/* Cross-brace pattern */}
            <line x1="5" y1="20" x2="20" y2="10" stroke="#8B4513" strokeWidth="0.8"/>
            <line x1="5" y1="10" x2="20" y2="20" stroke="#8B4513" strokeWidth="0.8"/>
            {/* Vertical boards */}
            <line x1="9" y1="10" x2="9" y2="35" stroke="#8B4513" strokeWidth="0.3"/>
            <line x1="13" y1="10" x2="13" y2="35" stroke="#8B4513" strokeWidth="0.3"/>
            <line x1="16" y1="10" x2="16" y2="35" stroke="#8B4513" strokeWidth="0.3"/>
            {/* Handle */}
            <circle cx="17" cy="22" r="1" fill="#2F2F2F"/>
          </svg>
        )
      
      // Roof Trims
      case 'ornate_trim':
        return (
          <svg width={60 * scale} height={25 * scale} viewBox="0 0 60 25" className={className}>
            {/* Decorative roof trim with scrollwork */}
            <path d="M5 15 Q10 10 15 15 Q20 10 25 15 Q30 10 35 15 Q40 10 45 15 Q50 10 55 15" 
                  fill="none" stroke="#A18463" strokeWidth="2"/>
            {/* Additional decorative elements */}
            <circle cx="15" cy="15" r="2" fill="none" stroke="#A18463" strokeWidth="1"/>
            <circle cx="30" cy="15" r="2" fill="none" stroke="#A18463" strokeWidth="1"/>
            <circle cx="45" cy="15" r="2" fill="none" stroke="#A18463" strokeWidth="1"/>
            {/* Crown molding */}
            <rect x="5" y="18" width="50" height="3" fill="#A18463"/>
          </svg>
        )
        
      case 'scalloped_trim':
        return (
          <svg width={60 * scale} height={20 * scale} viewBox="0 0 60 20" className={className}>
            {/* Scalloped edge trim */}
            <path d="M5 15 Q10 5 15 15 Q20 5 25 15 Q30 5 35 15 Q40 5 45 15 Q50 5 55 15 L55 18 L5 18 Z" 
                  fill="#A18463" stroke="#2E4B3F" strokeWidth="1"/>
            {/* Decorative dots */}
            <circle cx="10" cy="12" r="1" fill="#2E4B3F"/>
            <circle cx="25" cy="12" r="1" fill="#2E4B3F"/>
            <circle cx="40" cy="12" r="1" fill="#2E4B3F"/>
            <circle cx="50" cy="12" r="1" fill="#2E4B3F"/>
          </svg>
        )
        
      case 'gabled_trim':
        return (
          <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className}>
            {/* Gabled roof trim with peak details */}
            <path d="M5 25 L25 5 L45 25" fill="none" stroke="#A18463" strokeWidth="2"/>
            {/* Peak ornament */}
            <polygon points="25,5 22,12 28,12" fill="#A18463" stroke="#2E4B3F" strokeWidth="1"/>
            {/* Side trim */}
            <rect x="5" y="23" width="40" height="4" fill="#A18463" stroke="#2E4B3F" strokeWidth="0.5"/>
            {/* Decorative brackets */}
            <path d="M12 23 Q15 18 18 23" fill="none" stroke="#2E4B3F" strokeWidth="1"/>
            <path d="M32 23 Q35 18 38 23" fill="none" stroke="#2E4B3F" strokeWidth="1"/>
          </svg>
        )
      {/* eslint-disable-next-line react/no-unescaped-entities */}

      default:
        return (
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className}>
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
          <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className}>
            {/* Bench legs */}
            <rect x="6" y="12" width="3" height="8" fill={benchColors.secondary} />
            <rect x="39" y="12" width="3" height="8" fill={benchColors.secondary} />
            {/* Bench seat */}
            <rect x="4" y="10" width="40" height="6" fill={benchColors.primary} rx="1" />
            {/* Bench back */}
            <rect x="4" y="6" width="40" height="4" fill={benchColors.primary} rx="1" />
            {/* Support beams */}
            <rect x="4" y="8" width="4" height="2" fill={benchColors.secondary} />
            <rect x="40" y="8" width="4" height="2" fill={benchColors.secondary} />
            {/* Wood grain details */}
            <line x1="8" y1="11" x2="40" y2="11" stroke={benchColors.grain} strokeWidth="0.5" />
            <line x1="8" y1="13" x2="40" y2="13" stroke={benchColors.grain} strokeWidth="0.5" />
            <line x1="8" y1="7" x2="40" y2="7" stroke={benchColors.grain} strokeWidth="0.5" />
          </svg>
        )

      case 'outdoor_table':
        return (
          <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className}>
            {/* Table legs */}
            <rect x="6" y="18" width="2" height="10" fill="#8B4513" />
            <rect x="24" y="18" width="2" height="10" fill="#8B4513" />
            <rect x="6" y="24" width="2" height="4" fill="#8B4513" />
            <rect x="24" y="24" width="2" height="4" fill="#8B4513" />
            {/* Table top */}
            <ellipse cx="16" cy="16" rx="12" ry="8" fill="#D2B48C" />
            <ellipse cx="16" cy="15" rx="11" ry="7" fill="#DEB887" />
            {/* Table surface details */}
            <ellipse cx="16" cy="15" rx="8" ry="5" fill="none" stroke="#CD853F" strokeWidth="0.5" />
            {/* Table items */}
            <circle cx="12" cy="13" r="2" fill="#FFE4E1" stroke="#DDA0DD" strokeWidth="0.5" />
            <rect x="18" y="11" width="4" height="6" fill="#8FBC8F" rx="0.5" />
          </svg>
        )

      case 'mailbox':
        const mailboxColors = getMailboxColors(variant)
        return (
          <svg width={20 * scale} height={32 * scale} viewBox="0 0 20 32" className={className}>
            {/* Post */}
            <rect x="8" y="16" width="4" height="14" fill="#8B4513" />
            {/* Mailbox body */}
            <rect x="4" y="8" width="12" height="10" fill={mailboxColors.primary} rx="2" />
            {/* Mailbox top */}
            <path d="M4 8 Q4 6 6 6 L14 6 Q16 6 16 8" fill={mailboxColors.secondary} />
            {/* Door */}
            <rect x="5" y="10" width="8" height="6" fill={mailboxColors.secondary} stroke={mailboxColors.accent} strokeWidth="0.5" />
            {/* Door handle */}
            <circle cx="12" cy="13" r="0.8" fill="#FFD700" />
            {/* Flag */}
            <rect x="16" y="10" width="3" height="2" fill="#FFD700" />
            {/* Numbers */}
            <text x="9" y="15" textAnchor="middle" fontSize="3" fill="white" fontWeight="bold">123</text>
          </svg>
        )

      case 'planter_box':
        return (
          <svg width={32 * scale} height={20 * scale} viewBox="0 0 32 20" className={className}>
            {/* Planter base */}
            <rect x="4" y="12" width="24" height="6" fill="#8B4513" />
            <rect x="2" y="14" width="28" height="4" fill="#A0522D" />
            {/* Soil */}
            <rect x="3" y="13" width="26" height="3" fill="#654321" />
            {/* Plants */}
            <circle cx="8" cy="10" r="2" fill="#228B22" />
            <circle cx="8" cy="8" r="1.5" fill="#32CD32" />
            <circle cx="16" cy="9" r="2.5" fill="#228B22" />
            <circle cx="16" cy="6" r="2" fill="#32CD32" />
            <circle cx="24" cy="10" r="2" fill="#228B22" />
            <circle cx="24" cy="8" r="1.5" fill="#32CD32" />
            {/* Flowers */}
            <circle cx="12" cy="8" r="1" fill="#FF69B4" />
            <circle cx="20" cy="7" r="1" fill="#FF1493" />
            <circle cx="6" cy="9" r="0.8" fill="#FFD700" />
          </svg>
        )

      case 'picnic_table':
        return (
          <svg width={40 * scale} height={28 * scale} viewBox="0 0 40 28" className={className}>
            {/* Table legs */}
            <polygon points="8,12 12,12 10,24 6,24" fill="#8B4513" />
            <polygon points="28,12 32,12 34,24 30,24" fill="#8B4513" />
            {/* Table top */}
            <rect x="4" y="10" width="32" height="4" fill="#D2B48C" />
            {/* Bench legs */}
            <rect x="2" y="18" width="2" height="6" fill="#8B4513" />
            <rect x="36" y="18" width="2" height="6" fill="#8B4513" />
            <rect x="10" y="18" width="2" height="6" fill="#8B4513" />
            <rect x="28" y="18" width="2" height="6" fill="#8B4513" />
            {/* Benches */}
            <rect x="0" y="16" width="16" height="3" fill="#D2B48C" />
            <rect x="24" y="16" width="16" height="3" fill="#D2B48C" />
            {/* Wood details */}
            <line x1="4" y1="11" x2="36" y2="11" stroke="#8B4513" strokeWidth="0.3" />
            <line x1="4" y1="13" x2="36" y2="13" stroke="#8B4513" strokeWidth="0.3" />
          </svg>
        )

      case 'planter_box':
        return (
          <svg width={32 * scale} height={20 * scale} viewBox="0 0 32 20" className={className}>
            {/* Planter base */}
            <rect x="4" y="12" width="24" height="6" fill="#8B4513" />
            <rect x="2" y="14" width="28" height="4" fill="#A0522D" />
            {/* Soil */}
            <rect x="3" y="13" width="26" height="3" fill="#654321" />
            {/* Plants */}
            <circle cx="8" cy="10" r="2" fill="#228B22" />
            <circle cx="8" cy="8" r="1.5" fill="#32CD32" />
            <circle cx="16" cy="9" r="2.5" fill="#228B22" />
            <circle cx="16" cy="6" r="2" fill="#32CD32" />
            <circle cx="24" cy="10" r="2" fill="#228B22" />
            <circle cx="24" cy="8" r="1.5" fill="#32CD32" />
            {/* Flowers */}
            <circle cx="12" cy="8" r="1" fill="#FF69B4" />
            <circle cx="20" cy="7" r="1" fill="#FF1493" />
            <circle cx="6" cy="9" r="0.8" fill="#FFD700" />
          </svg>
        )

      default:
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className}>
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
          <svg width={16 * scale} height={32 * scale} viewBox="0 0 16 32" className={className}>
            {/* Post */}
            <rect x="7" y="16" width="2" height="14" fill="#2F2F2F" />
            {/* Lantern base */}
            <rect x="4" y="14" width="8" height="2" fill="#4A4A4A" />
            {/* Lantern glass */}
            <rect x="5" y="6" width="6" height="8" fill="#FFF8DC" fill-opacity="0.8" stroke="#2F2F2F" strokeWidth="0.5" />
            {/* Lantern top */}
            <polygon points="8,4 6,6 10,6" fill="#2F2F2F" />
            <rect x="7" y="2" width="2" height="2" fill="#2F2F2F" />
            {/* Light glow */}
            <circle cx="8" cy="10" r="3" fill="#FFD700" opacity="0.6" />
            <circle cx="8" cy="10" r="1.5" fill="#FFF8DC" />
            {/* Decorative elements */}
            <rect x="6" y="8" width="4" height="0.5" fill="#2F2F2F" />
            <rect x="6" y="12" width="4" height="0.5" fill="#2F2F2F" />
          </svg>
        )

      case 'string_lights':
        return (
          <svg width={64 * scale} height={16 * scale} viewBox="0 0 64 16" className={className}>
            {/* String wire */}
            <path d="M2 8 Q16 4 32 8 Q48 4 62 8" stroke="#2F2F2F" strokeWidth="1" fill="none" />
            {/* Light bulbs */}
            <circle cx="8" cy="6" r="2" fill="#FFD700" opacity="0.8" />
            <circle cx="8" cy="6" r="1" fill="#FFF8DC" />
            <circle cx="20" cy="9" r="2" fill="#FF6347" opacity="0.8" />
            <circle cx="20" cy="9" r="1" fill="#FFF8DC" />
            <circle cx="32" cy="6" r="2" fill="#32CD32" opacity="0.8" />
            <circle cx="32" cy="6" r="1" fill="#FFF8DC" />
            <circle cx="44" cy="9" r="2" fill="#87CEEB" opacity="0.8" />
            <circle cx="44" cy="9" r="1" fill="#FFF8DC" />
            <circle cx="56" cy="6" r="2" fill="#DA70D6" opacity="0.8" />
            <circle cx="56" cy="6" r="1" fill="#FFF8DC" />
            {/* Light halos */}
            <circle cx="8" cy="6" r="3" fill="#FFD700" opacity="0.2" />
            <circle cx="20" cy="9" r="3" fill="#FF6347" opacity="0.2" />
            <circle cx="32" cy="6" r="3" fill="#32CD32" opacity="0.2" />
            <circle cx="44" cy="9" r="3" fill="#87CEEB" opacity="0.2" />
            <circle cx="56" cy="6" r="3" fill="#DA70D6" opacity="0.2" />
          </svg>
        )

      case 'torch':
        return (
          <svg width={12 * scale} height={36 * scale} viewBox="0 0 12 36" className={className}>
            {/* Torch pole */}
            <rect x="5" y="20" width="2" height="14" fill="#8B4513" />
            {/* Torch bowl */}
            <ellipse cx="6" cy="18" rx="4" ry="2" fill="#2F2F2F" />
            <ellipse cx="6" cy="17" rx="3.5" ry="1.5" fill="#4A4A4A" />
            {/* Flame */}
            <ellipse cx="6" cy="12" rx="2" ry="6" fill="#FF4500" />
            <ellipse cx="6" cy="10" rx="1.5" ry="4" fill="#FF6347" />
            <ellipse cx="6" cy="8" rx="1" ry="3" fill="#FFD700" />
            {/* Flame glow */}
            <ellipse cx="6" cy="12" rx="4" ry="8" fill="#FF4500" opacity="0.3" />
            {/* Sparks */}
            <circle cx="4" cy="6" r="0.5" fill="#FFD700" />
            <circle cx="8" cy="5" r="0.3" fill="#FF6347" />
            <circle cx="3" cy="9" r="0.3" fill="#FFD700" />
          </svg>
        )

      case 'spotlight':
        return (
          <svg width={20 * scale} height={24 * scale} viewBox="0 0 20 24" className={className}>
            {/* Spotlight stand */}
            <rect x="9" y="18" width="2" height="4" fill="#2F2F2F" />
            <ellipse cx="10" cy="22" rx="3" ry="1" fill="#4A4A4A" />
            {/* Spotlight head */}
            <ellipse cx="10" cy="12" rx="6" ry="4" fill="#4A4A4A" />
            <ellipse cx="10" cy="11" rx="5" ry="3" fill="#6A6A6A" />
            {/* Lens */}
            <circle cx="10" cy="11" r="3" fill="#E6E6FA" stroke="#2F2F2F" strokeWidth="0.5" />
            <circle cx="10" cy="11" r="2" fill="#FFF8DC" />
            {/* Light beam */}
            <polygon points="10,8 6,2 14,2" fill="#FFD700" opacity="0.4" />
            <polygon points="10,8 7,3 13,3" fill="#FFF8DC" opacity="0.6" />
            {/* Adjustment arm */}
            <rect x="8" y="15" width="4" height="3" fill="#2F2F2F" />
          </svg>
        )

      default:
        return (
          <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className}>
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
          <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className}>
            {/* Basin */}
            <ellipse cx="16" cy="24" rx="12" ry="6" fill="#4682B4" />
            <ellipse cx="16" cy="22" rx="10" ry="4" fill="#87CEEB" />
            {/* Water */}
            <ellipse cx="16" cy="22" rx="8" ry="3" fill="#B0E0E6" opacity="0.8" />
            {/* Central pillar */}
            <rect x="14" y="14" width="4" height="8" fill="#A9A9A9" />
            {/* Water spouts */}
            <ellipse cx="16" cy="12" rx="2" ry="4" fill="#87CEEB" opacity="0.7" />
            <ellipse cx="16" cy="8" rx="1.5" ry="3" fill="#B0E0E6" opacity="0.8" />
            <ellipse cx="16" cy="5" rx="1" ry="2" fill="#E0F6FF" opacity="0.9" />
            {/* Water droplets */}
            <circle cx="14" cy="10" r="0.5" fill="#87CEEB" />
            <circle cx="18" cy="9" r="0.5" fill="#87CEEB" />
            <circle cx="13" cy="6" r="0.3" fill="#B0E0E6" />
            <circle cx="19" cy="7" r="0.3" fill="#B0E0E6" />
            {/* Decorative base */}
            <ellipse cx="16" cy="24" rx="13" ry="7" fill="#696969" opacity="0.5" />
          </svg>
        )

      case 'pond':
        return (
          <svg width={40 * scale} height={24 * scale} viewBox="0 0 40 24" className={className}>
            {/* Pond shape */}
            <ellipse cx="20" cy="16" rx="16" ry="6" fill="#4682B4" />
            <ellipse cx="20" cy="14" rx="14" ry="4" fill="#87CEEB" />
            {/* Water surface */}
            <ellipse cx="20" cy="14" rx="12" ry="3" fill="#B0E0E6" opacity="0.8" />
            {/* Ripples */}
            <ellipse cx="15" cy="14" rx="3" ry="1" fill="none" stroke="#E0F6FF" strokeWidth="0.5" opacity="0.6" />
            <ellipse cx="25" cy="15" rx="2" ry="0.5" fill="none" stroke="#E0F6FF" strokeWidth="0.5" opacity="0.6" />
            {/* Lily pads */}
            <ellipse cx="12" cy="13" rx="2" ry="1.5" fill="#228B22" />
            <ellipse cx="28" cy="15" rx="1.5" ry="1" fill="#32CD32" />
            <ellipse cx="22" cy="12" rx="1.8" ry="1.2" fill="#228B22" />
            {/* Flowers on lily pads */}
            <circle cx="12" cy="13" r="0.5" fill="#FFB6C1" />
            <circle cx="22" cy="12" r="0.4" fill="#FF69B4" />
            {/* Cattails */}
            <rect x="6" y="8" width="0.5" height="6" fill="#8B4513" />
            <ellipse cx="6.25" cy="7" rx="0.8" ry="1.5" fill="#8B4513" />
            <rect x="34" y="9" width="0.5" height="5" fill="#8B4513" />
            <ellipse cx="34.25" cy="8" rx="0.7" ry="1.2" fill="#8B4513" />
          </svg>
        )

      case 'rain_barrel':
        return (
          <svg width={20 * scale} height={28 * scale} viewBox="0 0 20 28" className={className}>
            {/* Barrel body */}
            <ellipse cx="10" cy="20" rx="8" ry="6" fill="#8B4513" />
            <rect x="2" y="10" width="16" height="10" fill="#A0522D" />
            <ellipse cx="10" cy="10" rx="8" ry="6" fill="#D2B48C" />
            {/* Barrel bands */}
            <ellipse cx="10" cy="12" rx="8" ry="6" fill="none" stroke="#654321" strokeWidth="1" />
            <ellipse cx="10" cy="18" rx="8" ry="6" fill="none" stroke="#654321" strokeWidth="1" />
            {/* Spigot */}
            <rect x="18" y="16" width="3" height="2" fill="#2F2F2F" />
            <circle cx="19" cy="17" r="0.5" fill="#4A4A4A" />
            {/* Lid */}
            <ellipse cx="10" cy="8" rx="7" ry="2" fill="#654321" />
            <circle cx="10" cy="8" r="1" fill="#2F2F2F" />
            {/* Water level indicator */}
            <rect x="3" y="14" width="14" height="4" fill="#4682B4" opacity="0.6" />
            {/* Droplets */}
            <circle cx="21" cy="19" r="0.3" fill="#87CEEB" />
          </svg>
        )

      default:
        return (
          <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className}>
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
          <svg width={48 * scale} height={40 * scale} viewBox="0 0 48 40" className={className}>
            {/* Base */}
            <ellipse cx="24" cy="36" rx="20" ry="3" fill="#4A5D23" />
            {/* Floor */}
            <ellipse cx="24" cy="32" rx="18" ry="6" fill="#D2B48C" />
            {/* Posts */}
            <rect x="8" y="20" width="2" height="12" fill="#8B4513" />
            <rect x="22" y="20" width="2" height="12" fill="#8B4513" />
            <rect x="24" y="20" width="2" height="12" fill="#8B4513" />
            <rect x="38" y="20" width="2" height="12" fill="#8B4513" />
            {/* Roof */}
            <polygon points="24,8 8,20 40,20" fill="#8B4513" />
            <polygon points="24,8 40,20 44,18 28,6" fill="#A0522D" />
            {/* Roof peak */}
            <polygon points="24,6 22,8 26,8" fill="#654321" />
            {/* Railings */}
            <rect x="8" y="24" width="32" height="2" fill="#A0522D" />
            <rect x="8" y="28" width="32" height="1" fill="#8B4513" />
            {/* Decorative elements */}
            <path d="M12 20 Q16 16 20 20" fill="none" stroke="#654321" strokeWidth="1" />
            <path d="M28 20 Q32 16 36 20" fill="none" stroke="#654321" strokeWidth="1" />
          </svg>
        )

      case 'trellis':
        return (
          <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className}>
            {/* Vertical posts */}
            <rect x="6" y="8" width="2" height="20" fill="#8B4513" />
            <rect x="16" y="8" width="2" height="20" fill="#8B4513" />
            {/* Horizontal slats */}
            <rect x="6" y="10" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="14" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="18" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="22" width="12" height="1" fill="#A0522D" />
            <rect x="6" y="26" width="12" height="1" fill="#A0522D" />
            {/* Climbing plants */}
            <path d="M8 28 Q10 24 8 20 Q6 16 8 12" stroke="#228B22" strokeWidth="1.5" fill="none" />
            <path d="M16 26 Q14 22 16 18 Q18 14 16 10" stroke="#32CD32" strokeWidth="1.5" fill="none" />
            {/* Leaves */}
            <ellipse cx="7" cy="16" rx="1" ry="2" fill="#228B22" transform="rotate(-30 7 16)" />
            <ellipse cx="9" cy="20" rx="1.2" ry="1.8" fill="#32CD32" transform="rotate(45 9 20)" />
            <ellipse cx="15" cy="14" rx="1" ry="2" fill="#228B22" transform="rotate(20 15 14)" />
            <ellipse cx="17" cy="22" rx="1.2" ry="1.8" fill="#32CD32" transform="rotate(-45 17 22)" />
            {/* Flowers */}
            <circle cx="8" cy="12" r="1" fill="#FF69B4" />
            <circle cx="16" cy="10" r="0.8" fill="#FFB6C1" />
            <circle cx="7" cy="24" r="0.9" fill="#DA70D6" />
          </svg>
        )

      case 'garden_arch':
        return (
          <svg width={32 * scale} height={36 * scale} viewBox="0 0 32 36" className={className}>
            {/* Left post */}
            <rect x="4" y="20" width="3" height="14" fill="#8B4513" />
            {/* Right post */}
            <rect x="25" y="20" width="3" height="14" fill="#8B4513" />
            {/* Arch */}
            <path d="M4 20 Q16 8 28 20" stroke="#A0522D" strokeWidth="3" fill="none" />
            <path d="M6 22 Q16 12 26 22" stroke="#D2B48C" strokeWidth="2" fill="none" />
            {/* Cross beams */}
            <rect x="4" y="18" width="24" height="1" fill="#A0522D" />
            <rect x="4" y="24" width="24" height="1" fill="#A0522D" />
            {/* Climbing roses */}
            <path d="M4 34 Q8 30 4 26 Q0 22 4 18" stroke="#228B22" strokeWidth="1.5" fill="none" />
            <path d="M28 32 Q24 28 28 24 Q32 20 28 16" stroke="#32CD32" strokeWidth="1.5" fill="none" />
            {/* Rose flowers */}
            <circle cx="6" cy="22" r="1.2" fill="#FF69B4" />
            <circle cx="4" cy="28" r="1" fill="#FFB6C1" />
            <circle cx="26" cy="20" r="1.2" fill="#FF1493" />
            <circle cx="28" cy="26" r="1" fill="#DA70D6" />
            {/* Leaves */}
            <ellipse cx="5" cy="25" rx="0.8" ry="1.5" fill="#228B22" transform="rotate(-30 5 25)" />
            <ellipse cx="27" cy="23" rx="0.8" ry="1.5" fill="#32CD32" transform="rotate(30 27 23)" />
          </svg>
        )

      default:
        return (
          <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className}>
            <rect x="6" y="6" width="20" height="20" fill="#8B4513" rx="2" />
            <text x="16" y="20" textAnchor="middle" fontSize="8" fill="white">🏗️</text>
          </svg>
        )
    }
  }

  // Main render logic
  switch (decorationType) {
    case 'plant':
      return renderPlant(decorationId, variant)
    case 'path':
      return renderPath(decorationId, variant)
    case 'feature':
      return renderFeature(decorationId, variant)
    case 'seasonal':
      return renderSeasonal(decorationId, variant)
    case 'house_custom':
      return renderHouseCustom(decorationId, variant)
    case 'furniture':
      return renderFurniture(decorationId, variant)
    case 'lighting':
      return renderLighting(decorationId, variant)
    case 'water':
      return renderWater(decorationId, variant)
    case 'structure':
      return renderStructure(decorationId, variant)
    default:
      return (
        <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className}>
          <rect x="2" y="2" width="12" height="12" fill="#9CA3AF" rx="2" />
          <text x="8" y="11" textAnchor="middle" fontSize="8" fill="white">?</text>
        </svg>
      )
  }
}

// Export enhanced decoration library for the item palette
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