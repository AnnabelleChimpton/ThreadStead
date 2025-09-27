import React from 'react'

interface DecorationIconProps {
  type: 'plant' | 'path' | 'feature' | 'seasonal' | 'sky' | 'house_custom' | 'house_template' | 'house_color' | 'furniture' | 'lighting' | 'water' | 'structure'
  id: string
  size?: number
  className?: string
  color?: string  // For house color items
}

export default function DecorationIcon({
  type,
  id,
  size = 32,
  className = '',
  color
}: DecorationIconProps) {
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

  // For decoration items, render small versions
  const scale = size / 24  // Base scale from 24px

  switch (type) {
    case 'plant':
      switch (id) {
        case 'roses_red':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" />
              <rect x="11" y="14" width="2" height="6" fill="#2D5016" />
              <circle cx="12" cy="12" r="3" fill="#DC2626" />
              <circle cx="12" cy="12" r="1" fill="#7F1D1D" />
            </svg>
          )
        case 'daisies_white':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="6" ry="2" fill="#4A5D23" />
              <rect x="11" y="12" width="2" height="8" fill="#2D5016" />
              <g>
                {[0, 90, 180, 270].map(angle => (
                  <ellipse
                    key={angle}
                    cx="12"
                    cy="10"
                    rx="2"
                    ry="1"
                    fill="#FFFFFF"
                    transform={`rotate(${angle} 12 10)`}
                  />
                ))}
                <circle cx="12" cy="10" r="1.5" fill="#FCD34D" />
              </g>
            </svg>
          )
        case 'small_tree':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="11" y="16" width="2" height="6" fill="#8B4513" />
              <circle cx="12" cy="12" r="6" fill="#22543D" />
              <circle cx="12" cy="10" r="4" fill="#22C55E" opacity="0.8" />
            </svg>
          )
        case 'sunflowers':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" />
              <rect x="11" y="14" width="2" height="6" fill="#16A34A" />
              <g>
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                  <ellipse
                    key={angle}
                    cx="12"
                    cy="12"
                    rx="4"
                    ry="1.5"
                    fill="#FCD34D"
                    transform={`rotate(${angle} 12 12)`}
                  />
                ))}
                <circle cx="12" cy="12" r="3" fill="#92400E" />
              </g>
            </svg>
          )
        case 'lavender':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="6" ry="2" fill="#4A5D23" />
              <rect x="11" y="12" width="2" height="8" fill="#16A34A" />
              <ellipse cx="12" cy="10" rx="2" ry="6" fill="#A855F7" />
              <ellipse cx="12" cy="8" rx="1.5" ry="4" fill="#9333EA" />
              <ellipse cx="12" cy="6" rx="1" ry="2" fill="#7C3AED" />
            </svg>
          )
        case 'flower_pot':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <path d="M8 16 L8 20 L16 20 L16 16 Z" fill="#8B4513" stroke="#654321" strokeWidth="1" />
              <ellipse cx="12" cy="16" rx="4" ry="1.5" fill="#A3A3A3" stroke="#8B4513" strokeWidth="0.5" />
              <rect x="11" y="8" width="2" height="8" fill="#16A34A" />
              <circle cx="10" cy="8" r="1.5" fill="#DC2626" />
              <circle cx="14" cy="8" r="1.5" fill="#2563EB" />
              <circle cx="12" cy="6" r="1.5" fill="#F59E0B" />
            </svg>
          )
        case 'roses_pink':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" />
              <rect x="11" y="14" width="2" height="6" fill="#2D5016" />
              <circle cx="12" cy="12" r="3" fill="#EC4899" />
              <circle cx="12" cy="12" r="1" fill="#9D174D" />
            </svg>
          )
        case 'roses_white':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" />
              <rect x="11" y="14" width="2" height="6" fill="#2D5016" />
              <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
              <circle cx="12" cy="12" r="1" fill="#FCD34D" />
            </svg>
          )
        case 'daisies_yellow':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="6" ry="2" fill="#4A5D23" />
              <rect x="11" y="12" width="2" height="8" fill="#2D5016" />
              <g>
                {[0, 90, 180, 270].map(angle => (
                  <ellipse
                    key={angle}
                    cx="12"
                    cy="10"
                    rx="2"
                    ry="1"
                    fill="#FEF3C7"
                    transform={`rotate(${angle} 12 10)`}
                  />
                ))}
                <circle cx="12" cy="10" r="1.5" fill="#F59E0B" />
              </g>
            </svg>
          )
        case 'tree_oak':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="11" y="16" width="2" height="6" fill="#8B4513" />
              <circle cx="12" cy="12" r="6" fill="#16A34A" />
              <circle cx="12" cy="10" r="4" fill="#22C55E" opacity="0.8" />
              <circle cx="8" cy="12" r="2" fill="#059669" opacity="0.6" />
              <circle cx="16" cy="12" r="2" fill="#059669" opacity="0.6" />
            </svg>
          )
        case 'tree_pine':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="11" y="18" width="2" height="4" fill="#8B4513" />
              <path d="M12 4 L8 12 L16 12 Z" fill="#0F4C3A" />
              <path d="M12 7 L9 14 L15 14 Z" fill="#16A34A" />
              <path d="M12 10 L10 16 L14 16 Z" fill="#22C55E" />
            </svg>
          )
        case 'planter_box':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="6" y="14" width="12" height="6" fill="#8B4513" stroke="#654321" strokeWidth="1" />
              <rect x="7" y="12" width="2" height="8" fill="#16A34A" />
              <rect x="11" y="10" width="2" height="10" fill="#16A34A" />
              <rect x="15" y="12" width="2" height="8" fill="#16A34A" />
              <circle cx="8" cy="10" r="1" fill="#DC2626" />
              <circle cx="12" cy="8" r="1" fill="#F59E0B" />
              <circle cx="16" cy="10" r="1" fill="#2563EB" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <circle cx="12" cy="12" r="8" fill="#22C55E" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">P</text>
            </svg>
          )
      }

    case 'path':
      switch (id) {
        case 'stone_path':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="6" cy="12" rx="4" ry="2" fill="#9CA3AF" />
              <ellipse cx="18" cy="12" rx="4" ry="2" fill="#6B7280" />
              <ellipse cx="12" cy="10" rx="3" ry="1.5" fill="#F3F4F6" opacity="0.6" />
            </svg>
          )
        case 'brick_path':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="2" y="10" width="6" height="4" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.5" />
              <rect x="8" y="10" width="6" height="4" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
              <rect x="14" y="10" width="6" height="4" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.5" />
            </svg>
          )
        case 'stepping_stones':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="6" cy="10" rx="3" ry="2" fill="#9CA3AF" stroke="#6B7280" strokeWidth="0.5" />
              <ellipse cx="12" cy="14" rx="3" ry="2" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
              <ellipse cx="18" cy="10" rx="3" ry="2" fill="#9CA3AF" stroke="#6B7280" strokeWidth="0.5" />
              <ellipse cx="4" cy="16" rx="2" ry="1.5" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="0.5" />
            </svg>
          )
        case 'gravel_path':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="2" y="10" width="20" height="4" fill="#A3A3A3" stroke="#737373" strokeWidth="0.5" />
              {/* Gravel texture */}
              <circle cx="4" cy="11" r="0.5" fill="#6B7280" />
              <circle cx="7" cy="12" r="0.5" fill="#9CA3AF" />
              <circle cx="10" cy="11.5" r="0.5" fill="#6B7280" />
              <circle cx="13" cy="12.5" r="0.5" fill="#D1D5DB" />
              <circle cx="16" cy="11" r="0.5" fill="#9CA3AF" />
              <circle cx="19" cy="12" r="0.5" fill="#6B7280" />
              <circle cx="6" cy="13" r="0.3" fill="#E5E7EB" />
              <circle cx="11" cy="13" r="0.3" fill="#F3F4F6" />
              <circle cx="15" cy="13.5" r="0.3" fill="#E5E7EB" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="2" y="11" width="20" height="2" fill="#8B5CF6" rx="1" />
            </svg>
          )
      }

    case 'feature':
      switch (id) {
        case 'bird_bath':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="6" ry="2" fill="#6B7280" />
              <rect x="11" y="12" width="2" height="8" fill="#9CA3AF" />
              <ellipse cx="12" cy="12" rx="6" ry="3" fill="#D1D5DB" />
              <ellipse cx="12" cy="11" rx="4" ry="2" fill="#3B82F6" opacity="0.7" />
            </svg>
          )
        case 'garden_gnome':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="20" rx="4" ry="2" fill="#4A5D23" />
              <ellipse cx="12" cy="16" rx="3" ry="4" fill="#DC2626" />
              <circle cx="12" cy="10" r="2.5" fill="#FBBF24" />
              <path d="M 9 8 L 12 4 L 15 8 Z" fill="#DC2626" />
              <ellipse cx="12" cy="13" rx="1.5" ry="2" fill="#F3F4F6" />
            </svg>
          )
        case 'decorative_fence':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="2" y="12" width="20" height="2" fill="#8B4513" />
              <rect x="4" y="8" width="1.5" height="8" fill="#D2691E" />
              <rect x="8" y="6" width="1.5" height="10" fill="#D2691E" />
              <rect x="12" y="8" width="1.5" height="8" fill="#D2691E" />
              <rect x="16" y="6" width="1.5" height="10" fill="#D2691E" />
              <rect x="20" y="8" width="1.5" height="8" fill="#D2691E" />
              <circle cx="4.75" cy="8" r="0.75" fill="#8B4513" />
              <circle cx="8.75" cy="6" r="0.75" fill="#8B4513" />
              <circle cx="12.75" cy="8" r="0.75" fill="#8B4513" />
              <circle cx="16.75" cy="6" r="0.75" fill="#8B4513" />
              <circle cx="20.75" cy="8" r="0.75" fill="#8B4513" />
            </svg>
          )
        case 'wind_chimes':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="6" rx="4" ry="1" fill="#8B4513" />
              <line x1="8" y1="6" x2="8" y2="16" stroke="#C0C0C0" strokeWidth="0.5" />
              <line x1="10" y1="6" x2="10" y2="18" stroke="#C0C0C0" strokeWidth="0.5" />
              <line x1="12" y1="6" x2="12" y2="14" stroke="#C0C0C0" strokeWidth="0.5" />
              <line x1="14" y1="6" x2="14" y2="17" stroke="#C0C0C0" strokeWidth="0.5" />
              <line x1="16" y1="6" x2="16" y2="15" stroke="#C0C0C0" strokeWidth="0.5" />
              <rect x="7" y="16" width="2" height="1" fill="#FFD700" rx="0.5" />
              <rect x="9" y="18" width="2" height="1" fill="#FFA500" rx="0.5" />
              <rect x="11" y="14" width="2" height="1" fill="#FFD700" rx="0.5" />
              <rect x="13" y="17" width="2" height="1" fill="#FFA500" rx="0.5" />
              <rect x="15" y="15" width="2" height="1" fill="#FFD700" rx="0.5" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <circle cx="12" cy="12" r="8" fill="#8B5CF6" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">★</text>
            </svg>
          )
      }

    case 'seasonal':
      switch (id) {
        case 'pumpkin':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="16" rx="6" ry="4" fill="#EA580C" />
              <ellipse cx="9" cy="16" rx="1.5" ry="3" fill="#C2410C" />
              <ellipse cx="12" cy="16" rx="1.5" ry="3.5" fill="#DC2626" />
              <ellipse cx="15" cy="16" rx="1.5" ry="3" fill="#C2410C" />
              <rect x="11" y="10" width="2" height="3" fill="#16A34A" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <circle cx="12" cy="12" r="8" fill="#F97316" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">🎃</text>
            </svg>
          )
      }

    case 'house_template':
      switch (id) {
        case 'cottage_v1':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              {/* Cottage base */}
              <rect x="6" y="14" width="12" height="8" fill="#F5E9D4" stroke="#A18463" strokeWidth="1"/>
              {/* Cottage roof - simple triangular */}
              <path d="M4 14 L12 6 L20 14 Z" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
              {/* Door */}
              <rect x="10.5" y="17" width="3" height="5" fill="#654321"/>
              {/* Windows */}
              <rect x="8" y="16" width="2" height="2" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              <rect x="14" y="16" width="2" height="2" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              {/* Chimney */}
              <rect x="15" y="8" width="2" height="4" fill="#8B4513"/>
            </svg>
          )
        case 'townhouse_v1':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              {/* Modern townhouse base */}
              <rect x="5" y="10" width="14" height="12" fill="#E5D4B1" stroke="#A18463" strokeWidth="1"/>
              {/* Flat modern roof */}
              <rect x="4" y="9" width="16" height="2" fill="#654321" stroke="#4A2C17" strokeWidth="1"/>
              {/* Modern door with steps */}
              <rect x="11" y="17" width="2.5" height="5" fill="#8B4513"/>
              <rect x="10.5" y="21.5" width="3.5" height="0.5" fill="#9CA3AF"/>
              {/* Large modern windows */}
              <rect x="6" y="12" width="3" height="7" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              <rect x="15" y="12" width="3" height="7" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
            </svg>
          )
        case 'loft_v1':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              {/* Modern loft base - taller and narrower */}
              <rect x="7" y="12" width="10" height="10" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1"/>
              {/* Angular roof */}
              <path d="M6 12 L12 8 L18 12 Z" fill="#4B5563" stroke="#374151" strokeWidth="1"/>
              {/* Modern door */}
              <rect x="11" y="18" width="2.5" height="4" fill="#374151"/>
              {/* Larger windows */}
              <rect x="8" y="14" width="2.5" height="3" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              <rect x="13.5" y="14" width="2.5" height="3" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              {/* Modern detail */}
              <rect x="8" y="8" width="6" height="1" fill="#6B7280"/>
            </svg>
          )
        case 'cabin_v1':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              {/* Log cabin base */}
              <rect x="6" y="14" width="12" height="8" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
              {/* Cabin roof - steeper pitch */}
              <path d="M4 14 L12 5 L20 14 Z" fill="#654321" stroke="#4A2C17" strokeWidth="1"/>
              {/* Rustic door */}
              <rect x="10.5" y="17" width="3" height="5" fill="#4A2C17"/>
              {/* Small cabin windows */}
              <rect x="8" y="16" width="1.5" height="1.5" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              <rect x="14.5" y="16" width="1.5" height="1.5" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              {/* Stone chimney */}
              <rect x="16" y="7" width="2" height="5" fill="#6B7280"/>
              {/* Log details */}
              <line x1="6" y1="16" x2="18" y2="16" stroke="#4A2C17" strokeWidth="0.3"/>
              <line x1="6" y1="18" x2="18" y2="18" stroke="#4A2C17" strokeWidth="0.3"/>
              <line x1="6" y1="20" x2="18" y2="20" stroke="#4A2C17" strokeWidth="0.3"/>
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="4" width="16" height="16" fill="#A18463" rx="2" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">🏠</text>
            </svg>
          )
      }

    case 'house_custom':
      switch (id) {
        // Window icons
        case 'round_windows':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="1" y="4" width="22" height="16" fill="#F5E9D4" stroke="#A18463" strokeWidth="1.5" />
              <circle cx="7" cy="12" r="3.5" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
              <circle cx="17" cy="12" r="3.5" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
              <line x1="7" y1="8.5" x2="7" y2="15.5" stroke="#2E4B3F" strokeWidth="1"/>
              <line x1="3.5" y1="12" x2="10.5" y2="12" stroke="#2E4B3F" strokeWidth="1"/>
              <line x1="17" y1="8.5" x2="17" y2="15.5" stroke="#2E4B3F" strokeWidth="1"/>
              <line x1="13.5" y1="12" x2="20.5" y2="12" stroke="#2E4B3F" strokeWidth="1"/>
            </svg>
          )
        case 'arched_windows':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="1" y="4" width="22" height="16" fill="#F5E9D4" stroke="#A18463" strokeWidth="1.5" />
              <path d="M4 16 Q4 8 8 8 Q12 8 12 16 Z" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
              <path d="M12 16 Q12 8 16 8 Q20 8 20 16 Z" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1"/>
              <line x1="8" y1="8" x2="8" y2="16" stroke="#2E4B3F" strokeWidth="1"/>
              <line x1="16" y1="8" x2="16" y2="16" stroke="#2E4B3F" strokeWidth="1"/>
            </svg>
          )
        case 'bay_windows':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="2" y="8" width="20" height="10" fill="#F5E9D4" stroke="#A18463" strokeWidth="1" />
              <path d="M6 14 L6 10 L4 8 L10 8 L8 10 L8 14 Z" fill="#F5E9D4" stroke="#A18463" strokeWidth="1"/>
              <path d="M18 14 L18 10 L16 8 L22 8 L20 10 L20 14 Z" fill="#F5E9D4" stroke="#A18463" strokeWidth="1"/>
              <rect x="5" y="10" width="3" height="4" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
              <rect x="17" y="10" width="3" height="4" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="0.5"/>
            </svg>
          )
        
        // Door icons
        case 'arched_door':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="2" width="16" height="20" fill="#F5E9D4" stroke="#A18463" strokeWidth="1.5" />
              <path d="M7 22 L7 12 Q7 6 12 6 Q17 6 17 12 L17 22 Z" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
              <rect x="8" y="9" width="8" height="4" fill="none" stroke="#654321" strokeWidth="1"/>
              <rect x="8" y="15" width="8" height="4" fill="none" stroke="#654321" strokeWidth="1"/>
              <circle cx="15" cy="16" r="1" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
            </svg>
          )
        case 'double_door':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="4" width="16" height="16" fill="#F5E9D4" stroke="#A18463" strokeWidth="1" />
              <rect x="6" y="8" width="5" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
              <rect x="13" y="8" width="5" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1"/>
              <rect x="7" y="10" width="3" height="2.5" fill="none" stroke="#654321" strokeWidth="0.3"/>
              <rect x="14" y="10" width="3" height="2.5" fill="none" stroke="#654321" strokeWidth="0.3"/>
              <circle cx="10" cy="14" r="0.4" fill="#FFD700"/>
              <circle cx="15" cy="14" r="0.4" fill="#FFD700"/>
            </svg>
          )
        case 'cottage_door':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="6" y="4" width="12" height="16" fill="#F5E9D4" stroke="#A18463" strokeWidth="1" />
              <rect x="8" y="8" width="8" height="12" fill="#D2691E" stroke="#8B4513" strokeWidth="1"/>
              <line x1="8" y1="12" x2="16" y2="8" stroke="#8B4513" strokeWidth="0.5"/>
              <line x1="8" y1="8" x2="16" y2="12" stroke="#8B4513" strokeWidth="0.5"/>
              <line x1="10" y1="8" x2="10" y2="20" stroke="#8B4513" strokeWidth="0.2"/>
              <line x1="12" y1="8" x2="12" y2="20" stroke="#8B4513" strokeWidth="0.2"/>
              <line x1="14" y1="8" x2="14" y2="20" stroke="#8B4513" strokeWidth="0.2"/>
              <circle cx="14" cy="14" r="0.5" fill="#2F2F2F"/>
            </svg>
          )
          
        // Roof trim icons
        case 'ornate_trim':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <path d="M2 16 L12 4 L22 16" fill="none" stroke="#A18463" strokeWidth="2"/>
              <path d="M4 13 Q6 10 8 13 Q10 10 12 13 Q14 10 16 13 Q18 10 20 13" 
                    fill="none" stroke="#8B4513" strokeWidth="1.5"/>
              <circle cx="8" cy="13" r="1.5" fill="#8B4513"/>
              <circle cx="16" cy="13" r="1.5" fill="#8B4513"/>
              <rect x="3" y="17" width="18" height="3" fill="#A18463" stroke="#8B4513" strokeWidth="0.5"/>
              <polygon points="12,4 10,8 14,8" fill="#8B4513"/>
            </svg>
          )
        case 'scalloped_trim':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <path d="M2 15 L12 5 L22 15" fill="none" stroke="#A18463" strokeWidth="1.5"/>
              <path d="M4 13 Q6 9 8 13 Q10 9 12 13 Q14 9 16 13 Q18 9 20 13 L20 16 L4 16 Z" 
                    fill="#A18463" stroke="#2E4B3F" strokeWidth="0.5"/>
              <circle cx="6" cy="12" r="0.5" fill="#2E4B3F"/>
              <circle cx="12" cy="12" r="0.5" fill="#2E4B3F"/>
              <circle cx="18" cy="12" r="0.5" fill="#2E4B3F"/>
            </svg>
          )
        case 'gabled_trim':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <path d="M4 18 L12 6 L20 18" fill="none" stroke="#A18463" strokeWidth="1.5"/>
              <polygon points="12,6 10.5,9 13.5,9" fill="#A18463" stroke="#2E4B3F" strokeWidth="0.5"/>
              <rect x="4" y="16" width="16" height="2" fill="#A18463" stroke="#2E4B3F" strokeWidth="0.5"/>
              <path d="M7 16 Q8.5 14 10 16" fill="none" stroke="#2E4B3F" strokeWidth="0.5"/>
              <path d="M14 16 Q15.5 14 17 16" fill="none" stroke="#2E4B3F" strokeWidth="0.5"/>
            </svg>
          )
          
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="4" width="16" height="16" fill="#A18463" rx="2" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">🏠</text>
            </svg>
          )
      }

    case 'house_color':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <rect x="4" y="4" width="16" height="16" fill="#F5F5F5" stroke="#CCCCCC" strokeWidth="1" rx="2" />
          {/* Color swatch */}
          <rect x="6" y="6" width="12" height="12" fill={color || '#A18463'} stroke="#333333" strokeWidth="1" rx="1" />
          {/* Color picker icon */}
          <circle cx="18" cy="6" r="2.5" fill="#FFFFFF" stroke="#333333" strokeWidth="0.5"/>
          <circle cx="18" cy="6" r="1" fill={color || '#A18463'}/>
        </svg>
      )

    case 'furniture':
      switch (id) {
        case 'garden_bench':
        case 'garden_bench_blue':
        case 'garden_bench_green':
          const benchColor = id === 'garden_bench_blue' ? '#3B82F6' : id === 'garden_bench_green' ? '#16A34A' : '#8B4513'
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="14" width="16" height="3" fill={benchColor} rx="1" />
              <rect x="4" y="10" width="2" height="7" fill={benchColor} />
              <rect x="18" y="10" width="2" height="7" fill={benchColor} />
              <rect x="4" y="10" width="16" height="2" fill={benchColor} rx="1" />
            </svg>
          )
        case 'outdoor_table':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="12" rx="8" ry="4" fill="#8B4513" stroke="#654321" strokeWidth="1" />
              <rect x="6" y="12" width="2" height="6" fill="#654321" />
              <rect x="10" y="12" width="2" height="6" fill="#654321" />
              <rect x="12" y="12" width="2" height="6" fill="#654321" />
              <rect x="16" y="12" width="2" height="6" fill="#654321" />
            </svg>
          )
        case 'mailbox':
        case 'mailbox_red':
        case 'mailbox_blue':
          const mailboxColor = id === 'mailbox_red' ? '#DC2626' : id === 'mailbox_blue' ? '#2563EB' : '#6B7280'
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="18" y="8" width="2" height="10" fill="#8B4513" />
              <rect x="4" y="8" width="12" height="6" fill={mailboxColor} rx="2" />
              <rect x="5" y="10" width="8" height="3" fill="#FFFFFF" stroke={mailboxColor} strokeWidth="0.5" />
              <circle cx="13" cy="11" r="0.5" fill="#FFD700" />
            </svg>
          )
        case 'picnic_table':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="2" y="11" width="20" height="2" fill="#8B4513" rx="1" />
              <rect x="4" y="15" width="16" height="1.5" fill="#8B4513" rx="0.5" />
              <rect x="6" y="13" width="2" height="5" fill="#654321" />
              <rect x="16" y="13" width="2" height="5" fill="#654321" />
              <rect x="11" y="8" width="2" height="10" fill="#654321" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="4" width="16" height="16" fill="#8B4513" rx="2" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">🪑</text>
            </svg>
          )
      }

    case 'lighting':
      switch (id) {
        case 'garden_lantern':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="11" y="16" width="2" height="4" fill="#8B4513" />
              <rect x="8" y="8" width="8" height="8" fill="#FFD700" stroke="#D97706" strokeWidth="1" rx="2" />
              <rect x="9" y="9" width="6" height="6" fill="#FEF3C7" rx="1" />
              <circle cx="12" cy="12" r="2" fill="#FBBF24" opacity="0.8" />
              <rect x="10" y="6" width="4" height="2" fill="#8B4513" rx="1" />
            </svg>
          )
        case 'string_lights':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <path d="M2 8 Q12 12 22 8" stroke="#8B4513" strokeWidth="1" fill="none" />
              <circle cx="6" cy="9" r="1.5" fill="#FCD34D" />
              <circle cx="12" cy="10" r="1.5" fill="#F87171" />
              <circle cx="18" cy="9" r="1.5" fill="#60A5FA" />
              <circle cx="9" cy="9.5" r="1" fill="#34D399" />
              <circle cx="15" cy="9.5" r="1" fill="#A78BFA" />
            </svg>
          )
        case 'torch':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="11" y="12" width="2" height="8" fill="#8B4513" />
              <ellipse cx="12" cy="8" rx="3" ry="4" fill="#F59E0B" />
              <ellipse cx="12" cy="6" rx="2" ry="3" fill="#FBBF24" />
              <ellipse cx="12" cy="4" rx="1" ry="2" fill="#FEF3C7" />
            </svg>
          )
        case 'spotlight':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="11" y="14" width="2" height="6" fill="#374151" />
              <circle cx="12" cy="10" r="4" fill="#6B7280" stroke="#374151" strokeWidth="1" />
              <circle cx="12" cy="10" r="2" fill="#FEF3C7" />
              <path d="M12 6 L8 2 L16 2 Z" fill="#FBBF24" opacity="0.6" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <circle cx="12" cy="12" r="8" fill="#FCD34D" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">💡</text>
            </svg>
          )
      }

    case 'water':
      switch (id) {
        case 'fountain':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="18" rx="8" ry="3" fill="#3B82F6" opacity="0.6" />
              <rect x="10" y="12" width="4" height="6" fill="#9CA3AF" rx="1" />
              <circle cx="12" cy="8" r="3" fill="#60A5FA" opacity="0.8" />
              <circle cx="12" cy="6" r="1" fill="#DBEAFE" />
              <circle cx="10" cy="7" r="0.5" fill="#DBEAFE" />
              <circle cx="14" cy="7" r="0.5" fill="#DBEAFE" />
            </svg>
          )
        case 'pond':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <ellipse cx="12" cy="12" rx="8" ry="4" fill="#3B82F6" opacity="0.7" />
              <ellipse cx="12" cy="12" rx="6" ry="3" fill="#60A5FA" opacity="0.5" />
              <circle cx="8" cy="12" r="1" fill="#DBEAFE" opacity="0.8" />
              <circle cx="16" cy="13" r="0.5" fill="#DBEAFE" opacity="0.8" />
              <ellipse cx="12" cy="10" rx="2" ry="1" fill="#FFFFFF" opacity="0.6" />
            </svg>
          )
        case 'rain_barrel':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="8" y="8" width="8" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1" rx="1" />
              <ellipse cx="12" cy="8" rx="4" ry="1" fill="#6B7280" />
              <rect x="9" y="10" width="6" height="1" fill="#654321" />
              <rect x="9" y="13" width="6" height="1" fill="#654321" />
              <rect x="9" y="16" width="6" height="1" fill="#654321" />
              <circle cx="14" cy="12" r="1" fill="#3B82F6" opacity="0.7" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <circle cx="12" cy="12" r="8" fill="#3B82F6" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">💧</text>
            </svg>
          )
      }

    case 'structure':
      switch (id) {
        case 'gazebo':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <path d="M4 16 L12 8 L20 16 Z" fill="#8B4513" stroke="#654321" strokeWidth="1" />
              <rect x="6" y="16" width="2" height="4" fill="#654321" />
              <rect x="10" y="16" width="2" height="4" fill="#654321" />
              <rect x="12" y="16" width="2" height="4" fill="#654321" />
              <rect x="16" y="16" width="2" height="4" fill="#654321" />
              <rect x="4" y="16" width="16" height="1" fill="#8B4513" />
            </svg>
          )
        case 'trellis':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="4" width="2" height="16" fill="#8B4513" />
              <rect x="18" y="4" width="2" height="16" fill="#8B4513" />
              <rect x="4" y="8" width="16" height="1" fill="#8B4513" />
              <rect x="4" y="12" width="16" height="1" fill="#8B4513" />
              <rect x="4" y="16" width="16" height="1" fill="#8B4513" />
              <circle cx="8" cy="10" r="1" fill="#16A34A" />
              <circle cx="12" cy="6" r="1" fill="#16A34A" />
              <circle cx="16" cy="10" r="1" fill="#16A34A" />
            </svg>
          )
        case 'garden_arch':
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="12" width="2" height="8" fill="#8B4513" />
              <rect x="18" y="12" width="2" height="8" fill="#8B4513" />
              <path d="M6 12 Q12 4 18 12" stroke="#8B4513" strokeWidth="2" fill="none" />
              <circle cx="8" cy="10" r="0.5" fill="#16A34A" />
              <circle cx="12" cy="8" r="0.5" fill="#DC2626" />
              <circle cx="16" cy="10" r="0.5" fill="#16A34A" />
              <circle cx="10" cy="9" r="0.3" fill="#F59E0B" />
              <circle cx="14" cy="9" r="0.3" fill="#F59E0B" />
            </svg>
          )
        default:
          return (
            <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
              <rect x="4" y="4" width="16" height="16" fill="#8B4513" rx="2" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">🏗️</text>
            </svg>
          )
      }

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <rect x="4" y="4" width="16" height="16" fill="#9CA3AF" rx="2" />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">?</text>
        </svg>
      )
  }
}