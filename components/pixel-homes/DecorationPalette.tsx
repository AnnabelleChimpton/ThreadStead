import React, { useState, useMemo } from 'react'
import DecorationIcon from './DecorationIcon'

interface DecorationItem {
  id: string
  name: string
  type: string
  zone?: string
  section?: string
  isDefault?: boolean
  color?: string
  iconSvg?: string
  renderSvg?: string
  isLimitedTime?: boolean
  isUserClaimed?: boolean
  isNew?: boolean
  expiresAt?: string
  releaseType?: string
  [key: string]: any
}

interface DecorationPaletteProps {
  items: Record<string, DecorationItem[]>
  selectedItem: DecorationItem | null
  onItemSelect: (item: DecorationItem) => void
  className?: string
  isMobile?: boolean
  onCategoryChange?: (category: string) => void // Callback when primary category changes
  palette?: 'thread_sage' | 'charcoal_nights' | 'pixel_petals' | 'crt_glow' | 'classic_linen'
}

// Primary categories with better organization
const PRIMARY_CATEGORIES = {
  decorations: {
    label: 'Decor',
    icon: '🎨',
    subcategories: {
      plants: { label: 'Plants', icon: '🌱' },
      furniture: { label: 'Furniture', icon: '🪑' },
      lighting: { label: 'Lighting', icon: '💡' },
      water: { label: 'Water', icon: '💧' },
      structures: { label: 'Structures', icon: '🏗️' },
      paths: { label: 'Paths', icon: '🛤️' },
      features: { label: 'Features', icon: '✨' },
    }
  },
  house: {
    label: 'House',
    icon: '🏠',
    subcategories: {
      doors: { label: 'Doors', icon: '🚪' },
      windows: { label: 'Windows', icon: '🪟' },
      roof: { label: 'Roof Trim', icon: '🏘️' },
    }
  },
  themes: {
    label: 'Themes',
    icon: '🎭',
    subcategories: {}
  },
  colors: {
    label: 'Colors',
    icon: '🎨',
    subcategories: {}
  },
  atmosphere: {
    label: 'Sky',
    icon: '🌤️',
    subcategories: {}
  },
  text: {
    label: 'Text',
    icon: '📝',
    subcategories: {}
  }
}

export default function DecorationPalette({
  items,
  selectedItem,
  onItemSelect,
  className = '',
  isMobile = false,
  onCategoryChange,
  palette = 'thread_sage'
}: DecorationPaletteProps) {
  const [primaryCategory, setPrimaryCategory] = useState<string>('decorations')
  const [secondaryCategory, setSecondaryCategory] = useState<string>('plants')
  const [searchQuery, setSearchQuery] = useState('')

  // Transform items to match new structure
  const transformedItems = useMemo(() => {
    const result: Record<string, DecorationItem[]> = {}

    // Copy all existing items
    Object.entries(items).forEach(([key, itemList]) => {
      result[key] = itemList
    })

    // Create flattened decoration items for search
    const allDecorations: DecorationItem[] = []
    const decorationCategories = ['plants', 'furniture', 'lighting', 'water', 'structures', 'paths', 'features']

    decorationCategories.forEach(category => {
      if (result[category]) {
        allDecorations.push(...result[category])
      }
    })

    result.decorations = allDecorations
    return result
  }, [items])

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return transformedItems

    const filtered: Record<string, DecorationItem[]> = {}
    Object.entries(transformedItems).forEach(([category, itemList]) => {
      filtered[category] = itemList.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
    return filtered
  }, [transformedItems, searchQuery])

  // Get current items to display
  const getCurrentItems = (): DecorationItem[] => {
    if (primaryCategory === 'decorations') {
      if (searchQuery) {
        return filteredItems.decorations || []
      }
      return filteredItems[secondaryCategory] || []
    }

    if (primaryCategory === 'house') {
      const houseItems = filteredItems.house || []
      if (secondaryCategory === 'doors') {
        return houseItems.filter(item => item.section === 'doors')
      }
      if (secondaryCategory === 'windows') {
        return houseItems.filter(item => item.section === 'windows')
      }
      if (secondaryCategory === 'roof') {
        return houseItems.filter(item => item.section === 'roof')
      }
      return houseItems
    }

    return filteredItems[primaryCategory] || []
  }

  const currentItems = getCurrentItems()

  // Get available secondary categories
  const getSecondaryCategories = () => {
    const primary = PRIMARY_CATEGORIES[primaryCategory as keyof typeof PRIMARY_CATEGORIES]
    return primary?.subcategories || {}
  }

  const secondaryCategories = getSecondaryCategories()
  const hasSecondaryCategories = Object.keys(secondaryCategories).length > 0

  const handlePrimaryChange = (category: string) => {
    setPrimaryCategory(category)
    setSearchQuery('')

    // Notify parent component about category change
    if (onCategoryChange) {
      onCategoryChange(category)
    }

    // Set default secondary category
    const subcategories = PRIMARY_CATEGORIES[category as keyof typeof PRIMARY_CATEGORIES]?.subcategories
    if (subcategories && Object.keys(subcategories).length > 0) {
      setSecondaryCategory(Object.keys(subcategories)[0])
    }
  }

  return (
    <div className={`decoration-palette flex flex-col h-full bg-white ${className}`}>
      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search decorations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white touch-manipulation"
            style={{ minHeight: '48px' }}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Primary Category Navigation */}
      <div className="px-4 pb-2">
        <div className={`flex ${isMobile ? 'overflow-x-auto -mx-4 px-4 pb-1' : 'flex-wrap'} gap-2`}>
          {Object.entries(PRIMARY_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              onClick={() => handlePrimaryChange(key)}
              className={`flex items-center gap-2 rounded-lg text-sm font-medium transition-all touch-manipulation active:scale-95 ${isMobile ? 'flex-col px-3 py-2 min-w-[72px] flex-shrink-0' : 'px-3 py-2 whitespace-nowrap'
                } ${primaryCategory === key
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                }`}
              style={isMobile ? { minHeight: '64px' } : {}}
            >
              <span className={isMobile ? 'text-xl' : ''}>{category.icon}</span>
              <span className={isMobile ? 'text-xs font-medium whitespace-nowrap' : ''}>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Category Navigation */}
      {hasSecondaryCategories && !searchQuery && (
        <div className="px-4 pb-3">
          <div className={`flex ${isMobile ? 'overflow-x-auto -mx-4 px-4 pb-1' : 'flex-wrap'} gap-1`}>
            {Object.entries(secondaryCategories).map(([key, subcategory]) => (
              <button
                key={key}
                onClick={() => setSecondaryCategory(key)}
                className={`flex flex-nowrap items-center gap-1 px-3 py-2 rounded text-xs font-medium whitespace-nowrap transition-all touch-manipulation active:scale-95 ${isMobile ? 'flex-shrink-0' : ''
                  } ${secondaryCategory === key
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                style={isMobile ? { minHeight: '44px' } : {}}
              >
                <span className="text-sm flex-shrink-0">{(subcategory as any).icon}</span>
                <span>{(subcategory as any).label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && (
        <div className="px-4 pb-2">
          <div className="text-xs text-gray-600">
            {currentItems.length} result{currentItems.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-4 relative"
        style={isMobile ? {
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'y proximity'
        } : undefined}
      >
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm text-center text-gray-600">
              {searchQuery ? 'No items found' : 'No items in this category'}
            </div>
          </div>
        ) : (
          <div className={`grid ${isMobile ? 'grid-cols-3 gap-2' : 'grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
            }`}>
            {currentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemSelect(item)}
                className={`
                  relative aspect-square rounded-xl border-2
                  transition-all duration-200 hover:scale-105 hover:shadow-lg
                  flex flex-col items-center justify-center
                  ${isMobile ? 'p-2' : 'p-3'}
                  ${selectedItem?.id === item.id
                    ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                  ${isMobile ? 'active:scale-95' : ''}
                `}
              >
                {/* Item Icon */}
                <div className="flex-1 flex items-center justify-center">
                  <DecorationIcon
                    type={item.type as "path" | "feature" | "plant" | "furniture" | "lighting" | "water" | "structure" | "sky" | "seasonal" | "house_custom" | "house_template" | "house_color"}
                    id={item.id}
                    size={isMobile ? 36 : 32}
                    className="drop-shadow-sm"
                    color={item.color}
                    iconSvg={item.iconSvg}
                    palette={palette}
                  />
                </div>

                {/* Item Name */}
                <div
                  className={`mt-1 text-center text-xs font-medium text-gray-700 leading-tight px-0.5 ${isMobile ? 'line-clamp-1' : 'line-clamp-2'} overflow-hidden`}
                  title={item.name}
                >
                  {item.name}
                </div>

                {/* Selected - Click to deselect hint (desktop only) */}
                {selectedItem?.id === item.id && !isMobile && (
                  <div className="mt-1 text-center text-[10px] font-semibold text-blue-600 leading-tight px-1">
                    Click to deselect
                  </div>
                )}

                {/* Selection Indicator */}
                {selectedItem?.id === item.id && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}

                {/* Default Indicator */}
                {item.isDefault && (
                  <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded text-[8px] font-medium">
                    DEFAULT
                  </div>
                )}

                {/* Limited Time Indicator */}
                {item.isLimitedTime && (
                  <div className="absolute -top-1 -left-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded text-[8px] font-medium animate-pulse">
                    LIMITED
                  </div>
                )}

                {/* Exclusive/Claimed Indicator */}
                {item.isUserClaimed && (
                  <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs px-1 py-0.5 rounded text-[8px] font-medium">
                    CLAIMED
                  </div>
                )}

                {/* Default Item Indicator */}
                {item.isDefault && (
                  <div className="absolute -top-1 -left-1 bg-yellow-400 text-yellow-900 text-xs px-1 py-0.5 rounded text-[8px] font-bold border border-yellow-600">
                    ⭐
                  </div>
                )}

                {/* New Item Indicator */}
                {item.isNew && (
                  <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded text-[8px] font-medium">
                    NEW!
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Scroll Indicator Gradient - Mobile Only */}
        {isMobile && currentItems.length > 6 && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  )
}