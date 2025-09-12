import React from 'react'

interface DecorationSVGProps {
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal' | 'house_custom'
  decorationId: string
  variant?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
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
  className = ''
}: DecorationSVGProps) {
  const scale = SIZE_SCALES[size]
  
  const renderPlant = (id: string, variant: string) => {
    switch (id) {
      case 'roses_red':
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
            {/* Rose flowers */}
            <circle cx="11" cy="10" r="2.5" fill="#DC2626" />
            <circle cx="14" cy="8" r="2" fill="#EF4444" />
            <circle cx="8" cy="12" r="1.8" fill="#B91C1C" />
            {/* Flower centers */}
            <circle cx="11" cy="10" r="0.8" fill="#7F1D1D" />
            <circle cx="14" cy="8" r="0.6" fill="#991B1B" />
            <circle cx="8" cy="12" r="0.5" fill="#7F1D1D" />
          </svg>
        )
      
      case 'daisies_white':
        return (
          <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className}>
            {/* Grass base */}
            <ellipse cx="10" cy="17" rx="6" ry="2" fill="#4A5D23" />
            {/* Stems */}
            <rect x="7" y="10" width="0.8" height="7" fill="#2D5016" />
            <rect x="11" y="8" width="0.8" height="9" fill="#2D5016" />
            <rect x="13" y="12" width="0.8" height="5" fill="#2D5016" />
            {/* Daisy flowers */}
            <g>
              {/* Petals for first flower */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <ellipse
                  key={angle}
                  cx="8"
                  cy="8"
                  rx="1.5"
                  ry="0.6"
                  fill="#FFFFFF"
                  transform={`rotate(${angle} 8 8)`}
                />
              ))}
              <circle cx="8" cy="8" r="1.2" fill="#FCD34D" />
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
                  fill="#F9FAFB"
                  transform={`rotate(${angle} 12 6)`}
                />
              ))}
              <circle cx="12" cy="6" r="0.8" fill="#F59E0B" />
            </g>
          </svg>
        )
      
      case 'small_tree':
        return (
          <svg width={32 * scale} height={40 * scale} viewBox="0 0 32 40" className={className}>
            {/* Tree trunk */}
            <rect x="14" y="28" width="4" height="12" fill="#8B4513" />
            {/* Tree foliage - layered circles for natural look */}
            <circle cx="16" cy="20" r="12" fill="#22543D" opacity="0.8" />
            <circle cx="13" cy="16" r="10" fill="#2D5016" opacity="0.9" />
            <circle cx="19" cy="18" r="9" fill="#4A7C59" />
            <circle cx="16" cy="14" r="8" fill="#22C55E" opacity="0.7" />
            {/* Highlights */}
            <circle cx="12" cy="12" r="3" fill="#34D399" opacity="0.6" />
            <circle cx="20" cy="15" r="2.5" fill="#6EE7B7" opacity="0.5" />
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
    default:
      return (
        <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className}>
          <rect x="2" y="2" width="12" height="12" fill="#9CA3AF" rx="2" />
          <text x="8" y="11" textAnchor="middle" fontSize="8" fill="white">?</text>
        </svg>
      )
  }
}

// Export decoration library for the item palette
export const DECORATION_LIBRARY = {
  plants: [
    { id: 'roses_red', name: 'Red Roses', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_white', name: 'White Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'small_tree', name: 'Small Tree', type: 'plant', zone: 'front_yard' }
  ],
  paths: [
    { id: 'stone_path', name: 'Stone Path', type: 'path', zone: 'front_yard' },
    { id: 'brick_path', name: 'Brick Path', type: 'path', zone: 'front_yard' }
  ],
  features: [
    { id: 'bird_bath', name: 'Bird Bath', type: 'feature', zone: 'front_yard' },
    { id: 'garden_gnome', name: 'Garden Gnome', type: 'feature', zone: 'front_yard' }
  ],
  atmosphere: [
    { id: 'sunny_sky', name: 'Sunny Day', type: 'sky', zone: 'background' },
    { id: 'sunset_sky', name: 'Sunset', type: 'sky', zone: 'background' }
  ]
}