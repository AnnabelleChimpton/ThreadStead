import React, { useState, useMemo } from 'react'
import DecorationIcon from './DecorationIcon'
import ThemePicker from './ThemePicker'
import { HouseCustomizations, HouseTemplate, ColorPalette } from './HouseSVG'
import { DecorationItem, TERRAIN_TILES, TerrainTile } from '../../lib/pixel-homes/decoration-data'

interface DecorationPaletteProps {
  items: Record<string, DecorationItem[]>
  selectedItem: DecorationItem | null
  onItemSelect: (item: DecorationItem | null) => void
  className?: string
  isMobile?: boolean
  palette?: ColorPalette
  houseCustomizations: HouseCustomizations
  onHouseCustomizationChange: (updates: Partial<HouseCustomizations>) => void
  onThemeChange: (template: HouseTemplate, palette: ColorPalette) => void
  currentTemplate: HouseTemplate
  currentPalette: ColorPalette
  onDecorationUpdate?: (id: string, updates: Partial<DecorationItem>) => void
  onTerrainSelect?: (terrainId: string | null) => void
  selectedTerrainId?: string | null
}

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
  terrain: {
    label: 'Terrain',
    icon: '🌍',
    subcategories: {}
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
  palette = 'thread_sage',
  houseCustomizations,
  onHouseCustomizationChange,
  onThemeChange,
  currentTemplate,
  currentPalette,
  onDecorationUpdate,
  onTerrainSelect,
  selectedTerrainId
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

    // Set default secondary category
    const subcategories = PRIMARY_CATEGORIES[category as keyof typeof PRIMARY_CATEGORIES]?.subcategories
    if (subcategories && Object.keys(subcategories).length > 0) {
      setSecondaryCategory(Object.keys(subcategories)[0])
    }
  }

  // Render content based on category
  const renderContent = () => {
    // 1. Sign Post Text Input (Highest Priority)
    if (selectedItem?.id.startsWith('sign_post') && onDecorationUpdate) {
      return (
        <div className="h-full p-4 overflow-y-auto">
          <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
            <h3 className="text-lg font-headline font-semibold text-thread-pine mb-4 flex items-center gap-2">
              🪧 Sign Post Settings
            </h3>

            <div>
              <label className="block text-sm font-medium text-thread-pine mb-2">
                Sign Text
                <span className="text-xs text-thread-sage ml-2">(Max 8 chars)</span>
              </label>
              <input
                type="text"
                value={selectedItem.text || ''}
                onChange={(e) => onDecorationUpdate(selectedItem.id, { text: e.target.value.slice(0, 8) })}
                placeholder="e.g., HELLO"
                maxLength={8}
                className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent text-gray-900 bg-white touch-manipulation font-mono"
                style={{ minHeight: '48px' }}
              />
              <div className="text-xs text-gray-700 text-right mt-1">
                {(selectedItem.text || '').length}/8
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => onItemSelect(null)}
                className="w-full px-4 py-2 text-sm text-thread-sage border border-thread-sage rounded hover:bg-thread-cream hover:bg-opacity-50 transition-colors"
              >
                Back to Selection
              </button>
            </div>
          </div>
        </div>
      )
    }

    // 2. Color Picker View
    if (selectedItem?.type === 'house_color') {
      const getColorKey = (id: string): keyof HouseCustomizations | null => {
        switch (id) {
          case 'wall_color': return 'wallColor'
          case 'roof_color': return 'roofColor'
          case 'trim_color': return 'trimColor'
          case 'window_color': return 'windowColor'
          case 'detail_color': return 'detailColor'
          default: return null
        }
      }

      const colorKey = getColorKey(selectedItem.id)
      const currentColor = colorKey ? (houseCustomizations[colorKey] as string) : '#ffffff'

      return (
        <div className="h-full p-4 overflow-y-auto">
          <div className="bg-thread-paper border border-thread-sage rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-headline font-semibold text-thread-pine flex items-center gap-2">
                🎨 {selectedItem.name}
              </h3>
              <button
                onClick={() => onItemSelect(null)} // Clear selection to go back
                className="text-sm text-thread-sage hover:text-thread-pine underline"
              >
                Back to Colors
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-thread-pine mb-2">
                  Custom Color
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-thread-sage shadow-sm">
                    <input
                      type="color"
                      value={currentColor || '#ffffff'}
                      onChange={(e) => {
                        if (colorKey) {
                          onHouseCustomizationChange({ [colorKey]: e.target.value })
                        }
                      }}
                      className="absolute -top-2 -left-2 w-24 h-24 p-0 border-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={currentColor || ''}
                      onChange={(e) => {
                        if (colorKey) {
                          onHouseCustomizationChange({ [colorKey]: e.target.value })
                        }
                      }}
                      placeholder="#RRGGBB"
                      className="w-full px-3 py-2 border border-thread-sage rounded focus:outline-none focus:ring-1 focus:ring-thread-pine font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  if (colorKey) {
                    onHouseCustomizationChange({ [colorKey]: undefined })
                  }
                }}
                className="w-full px-4 py-2 text-sm text-thread-sage border border-thread-sage rounded hover:bg-thread-cream hover:bg-opacity-50 transition-colors"
              >
                Reset to Palette Default
              </button>

              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                <p>Tip: This overrides the theme palette for this specific part.</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // 3. Terrain View
    if (primaryCategory === 'terrain') {
      return (
        <div className="h-full p-4 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4">
            {/* Eraser */}
            <button
              onClick={() => onTerrainSelect?.(null)}
              className={`
                aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all
                ${selectedTerrainId === null
                  ? 'border-red-500 bg-red-50 shadow-md transform scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-lg mb-1">
                ❌
              </div>
              <span className="text-xs text-center font-medium text-gray-700">Eraser</span>
            </button>

            {/* Terrain Tiles */}
            {TERRAIN_TILES.map((tile) => (
              <button
                key={tile.id}
                onClick={() => onTerrainSelect?.(tile.id)}
                className={`
                  aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all
                  ${selectedTerrainId === tile.id
                    ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div
                  className="w-8 h-8 rounded border border-gray-300 mb-1 shadow-sm"
                  style={{ backgroundColor: tile.color }}
                />
                <span className="text-xs text-center font-medium text-gray-700">{tile.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-500 text-center">
            Select a terrain type and click or drag on the canvas to paint.
          </div>
        </div>
      )
    }

    // 4. Category Views
    if (primaryCategory === 'themes') {
      return (
        <div className="h-full p-4 overflow-y-auto">
          <ThemePicker
            onSelection={onThemeChange}
            initialTemplate={currentTemplate}
            initialPalette={currentPalette}
            showExplanation={false}
            showPreview={false}
            immediateSelection={true}
            isSidebar={true}
            className="space-y-4"
          />
        </div>
      )
    }

    if (primaryCategory === 'text') {
      return (
        <div className="h-full p-4 overflow-y-auto">
          <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
            <h3 className="text-lg font-headline font-semibold text-thread-pine mb-4 flex items-center gap-2">
              📝 House Text Settings
            </h3>

            <div className="space-y-4">
              {/* House Title */}
              <div>
                <label className="block text-sm font-medium text-thread-pine mb-2">
                  🏷️ House Title
                  <span className="text-xs text-thread-sage ml-2">(Max 50 chars)</span>
                </label>
                <input
                  type="text"
                  value={houseCustomizations.houseTitle || ''}
                  onChange={(e) => onHouseCustomizationChange({ houseTitle: e.target.value.slice(0, 50) })}
                  placeholder="e.g., 'My Creative Space'"
                  maxLength={50}
                  className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent text-gray-900 bg-white touch-manipulation"
                  style={{ minHeight: '48px' }}
                />
                <div className="text-xs text-gray-700 text-right mt-1">
                  {(houseCustomizations.houseTitle || '').length}/50
                </div>
              </div>

              {/* House Sign Text */}
              <div>
                <label className="block text-sm font-medium text-thread-pine mb-2">
                  🪧 House Sign
                  <span className="text-xs text-thread-sage ml-2">(Max 20 chars)</span>
                </label>
                <input
                  type="text"
                  value={houseCustomizations.houseBoardText || ''}
                  onChange={(e) => onHouseCustomizationChange({ houseBoardText: e.target.value.slice(0, 20) })}
                  placeholder="e.g., 'Welcome!'"
                  maxLength={20}
                  className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent text-gray-900 bg-white touch-manipulation"
                  style={{ minHeight: '48px' }}
                />
                <div className="text-xs text-gray-700 text-right mt-1">
                  {(houseCustomizations.houseBoardText || '').length}/20
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Default Grid View
    return (
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
          <div className={`!grid ${isMobile ? '!grid-cols-3 !gap-2' : '!grid-cols-5 !gap-4'}`}>
            {currentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemSelect(item)}
                title={item.name}
                className={`
                  !relative !aspect-square !rounded-xl !border-2 !w-full !overflow-hidden
                  !transition-all !duration-200 hover:!scale-105 hover:!shadow-lg
                  !flex !items-center !justify-center
                  ${isMobile ? '!p-1' : '!p-2'}
                  ${selectedItem?.id === item.id
                    ? '!border-blue-500 !bg-blue-50 !shadow-md !transform !scale-105'
                    : '!border-gray-200 !bg-white hover:!border-gray-300'
                  }
                  ${isMobile ? 'active:!scale-95' : ''}
                `}
                style={{ aspectRatio: '1 / 1' }}
              >
                {/* Item Icon */}
                <div className="!flex-1 !flex !items-center !justify-center !w-full !h-full !overflow-hidden">
                  <DecorationIcon
                    type={item.type as any}
                    id={item.id}
                    size={isMobile ? 42 : 38}
                    className="!drop-shadow-sm"
                    color={
                      // Use current custom color if available, otherwise item default
                      (item.type === 'house_color' && houseCustomizations)
                        ? (
                          item.id === 'wall_color' ? houseCustomizations.wallColor :
                            item.id === 'roof_color' ? houseCustomizations.roofColor :
                              item.id === 'trim_color' ? houseCustomizations.trimColor :
                                item.id === 'window_color' ? houseCustomizations.windowColor :
                                  item.id === 'detail_color' ? houseCustomizations.detailColor :
                                    item.color
                        ) || item.color
                        : item.color
                    }
                    iconSvg={item.iconSvg}
                    palette={palette}
                  />
                </div>

                {/* Selection Indicator */}
                {selectedItem?.id === item.id && (
                  <div className="!absolute !-top-1 !-right-1 !w-5 !h-5 !bg-blue-500 !rounded-full !flex !items-center !justify-center !shadow-sm !z-10">
                    <span className="!text-white !text-xs">✓</span>
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
    )
  }

  return (
    <div className={`decoration-palette flex flex-col h-full bg-white ${className}`}>
      {/* Search Bar - Only show for grid views */}
      {primaryCategory !== 'themes' && primaryCategory !== 'text' && primaryCategory !== 'terrain' && !selectedItem?.type?.includes('house_color') && !selectedItem?.id.startsWith('sign_post') && (
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
      )}

      {/* Primary Category Navigation */}
      <div className="px-4 pb-2 pt-2">
        <div className={`flex overflow-x-auto hide-scrollbar ${isMobile ? 'px-2' : 'px-4'} py-2 gap-2`}>
          {Object.entries(PRIMARY_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              onClick={() => handlePrimaryChange(key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation
                ${primaryCategory === key
                  ? 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className="text-lg">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Category Navigation */}
      {hasSecondaryCategories && !searchQuery && primaryCategory !== 'themes' && primaryCategory !== 'text' && primaryCategory !== 'terrain' && !selectedItem?.type?.includes('house_color') && !selectedItem?.id.startsWith('sign_post') && (
        <div className="flex-none border-b border-gray-100 bg-gray-50/50">
          <div className={`flex overflow-x-auto hide-scrollbar ${isMobile ? 'px-2' : 'px-4'} py-2 gap-2`}>
            {Object.entries(secondaryCategories).map(([key, subcategory]) => (
              <button
                key={key}
                onClick={() => setSecondaryCategory(key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation
                  ${secondaryCategory === key
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                  }
                `}
              >
                <span className="text-base">{(subcategory as any).icon}</span>
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

      {/* Main Content Area */}
      {renderContent()}
    </div>
  )
}