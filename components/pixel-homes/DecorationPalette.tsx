import React, { useState, useMemo, useRef } from 'react'
import DecorationIcon from './DecorationIcon'
import ThemePicker from './ThemePicker'
import { HouseCustomizations, HouseTemplate, ColorPalette } from './HouseSVG'
import { DecorationItem, TERRAIN_TILES, TerrainTile } from '../../lib/pixel-homes/decoration-data'
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon'
import { DECORATION_CATEGORY_ICONS, getCategoryIcon } from '@/lib/pixel-homes/category-icons'

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
  // Custom pixel art slot handlers
  onCustomSlotUpload?: (slot: number, file: File) => void
  onCustomSlotDelete?: (slot: number) => void
  uploadingSlot?: number | null
}

const PRIMARY_CATEGORIES: Record<string, {
  label: string
  icon: PixelIconName
  subcategories: Record<string, { label: string; icon: PixelIconName }>
}> = {
  decorations: {
    label: 'Decor',
    icon: 'paint-bucket',
    subcategories: {
      custom: { label: 'My Art', icon: 'image' },
      plants: { label: 'Plants', icon: 'drop' },
      furniture: { label: 'Furniture', icon: 'archive' },
      lighting: { label: 'Lighting', icon: 'lightbulb' },
      water: { label: 'Water', icon: 'drop' },
      structures: { label: 'Structures', icon: 'building' },
      paths: { label: 'Paths', icon: 'map' },
      features: { label: 'Features', icon: 'zap' },
    }
  },
  terrain: {
    label: 'Terrain',
    icon: 'map',
    subcategories: {}
  },
  house: {
    label: 'House',
    icon: 'home',
    subcategories: {
      doors: { label: 'Doors', icon: 'external-link' },
      windows: { label: 'Windows', icon: 'image' },
      window_treatments: { label: 'Window Decor', icon: 'image' },
      roof: { label: 'Roof Trim', icon: 'buildings' },
      chimney: { label: 'Chimney', icon: 'zap' },
      welcome_mat: { label: 'Welcome Mat', icon: 'home' },
      house_number: { label: 'House Number', icon: 'script' },
      exterior_lights: { label: 'Lights', icon: 'lightbulb' },
    }
  },
  themes: {
    label: 'Themes',
    icon: 'paint-bucket',
    subcategories: {}
  },
  colors: {
    label: 'Colors',
    icon: 'paint-bucket',
    subcategories: {}
  },
  atmosphere: {
    label: 'Sky',
    icon: 'cloud-sun',
    subcategories: {}
  },
  text: {
    label: 'Text',
    icon: 'script',
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
  selectedTerrainId,
  onCustomSlotUpload,
  onCustomSlotDelete,
  uploadingSlot
}: DecorationPaletteProps) {
  const [primaryCategory, setPrimaryCategory] = useState<string>('decorations')
  const [secondaryCategory, setSecondaryCategory] = useState<string>('plants')
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingUploadSlot, setPendingUploadSlot] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file input change for custom slot uploads
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && pendingUploadSlot !== null && onCustomSlotUpload) {
      onCustomSlotUpload(pendingUploadSlot, file)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setPendingUploadSlot(null)
  }

  // Trigger file picker for a specific slot
  const triggerUpload = (slot: number) => {
    setPendingUploadSlot(slot)
    fileInputRef.current?.click()
  }

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
      if (secondaryCategory === 'window_treatments') {
        return houseItems.filter(item => item.section === 'window_treatments')
      }
      if (secondaryCategory === 'roof') {
        return houseItems.filter(item => item.section === 'roof')
      }
      if (secondaryCategory === 'chimney') {
        return houseItems.filter(item => item.section === 'chimney')
      }
      if (secondaryCategory === 'welcome_mat') {
        return houseItems.filter(item => item.section === 'welcome_mat')
      }
      if (secondaryCategory === 'house_number') {
        return houseItems.filter(item => item.section === 'house_number')
      }
      if (secondaryCategory === 'exterior_lights') {
        return houseItems.filter(item => item.section === 'exterior_lights')
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
              <PixelIcon name="flag" size={20} /> Sign Post Settings
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
                <PixelIcon name="paint-bucket" size={20} /> {selectedItem.name}
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
                  : 'border-thread-sage/30 bg-white hover:border-thread-sage/60'
                }
              `}
            >
              <div className="w-8 h-8 rounded border border-thread-sage/50 bg-white flex items-center justify-center mb-1">
                <PixelIcon name="trash" size={20} className="text-red-500" />
              </div>
              <span className="text-xs text-center font-medium text-thread-pine">Eraser</span>
            </button>

            {/* Terrain Tiles */}
            {TERRAIN_TILES.map((tile) => (
              <button
                key={tile.id}
                onClick={() => onTerrainSelect?.(tile.id)}
                className={`
                  aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all
                  ${selectedTerrainId === tile.id
                    ? 'border-thread-sky bg-thread-sky/20 shadow-md transform scale-105'
                    : 'border-thread-sage/30 bg-white hover:border-thread-sage/60'
                  }
                `}
              >
                <div
                  className="w-8 h-8 rounded border border-thread-sage/50 mb-1 shadow-sm"
                  style={{ backgroundColor: tile.color }}
                />
                <span className="text-xs text-center font-medium text-thread-pine">{tile.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 text-xs text-thread-sage text-center">
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
              <PixelIcon name="script" size={20} /> House Text Settings
            </h3>

            <div className="space-y-4">
              {/* House Title */}
              <div>
                <label className="block text-sm font-medium text-thread-pine mb-2 flex items-center gap-1">
                  <PixelIcon name="flag" size={16} className="inline-block align-middle" /> House Title
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
                <label className="block text-sm font-medium text-thread-pine mb-2 flex items-center gap-1">
                  <PixelIcon name="flag" size={16} className="inline-block align-middle" /> House Sign
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

    // Special rendering for Custom Art slots
    if (secondaryCategory === 'custom' && primaryCategory === 'decorations') {
      const customItems = filteredItems.custom || []
      return (
        <div className="flex-1 overflow-y-auto px-4 pb-4 relative">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Info text */}
          <div className="mb-4 p-3 bg-thread-cream/50 rounded-lg border border-thread-sage/30">
            <div className="text-sm text-thread-pine font-medium mb-1">My Custom Pixel Art</div>
            <div className="text-xs text-thread-sage">
              Upload your own pixel art (64×64 max, PNG/GIF/WebP, 100KB limit). Click a slot to upload or select placed art.
            </div>
          </div>

          <div className={`!grid ${isMobile ? '!grid-cols-3 !gap-3' : '!grid-cols-5 !gap-4'}`}>
            {customItems.map((item) => {
              const isUploading = uploadingSlot === item.slot
              const isEmpty = item.isEmpty
              const isSelected = selectedItem?.id === item.id

              return (
                <div
                  key={item.id}
                  className={`
                    relative aspect-square rounded-xl border-2 overflow-hidden
                    transition-all duration-200
                    ${isSelected
                      ? 'border-thread-sky bg-thread-sky/20 shadow-md transform scale-105'
                      : isEmpty
                        ? 'border-dashed border-thread-sage/50 bg-thread-cream/30 hover:border-thread-sage hover:bg-thread-cream/50'
                        : 'border-thread-sage/30 bg-white hover:border-thread-sage/60 hover:shadow-lg'
                    }
                  `}
                >
                  {isUploading ? (
                    // Uploading state
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <div className="text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-thread-sky border-t-transparent rounded-full mx-auto mb-2" />
                        <span className="text-xs text-thread-sage">Uploading...</span>
                      </div>
                    </div>
                  ) : isEmpty ? (
                    // Empty slot - show upload button
                    <button
                      onClick={() => triggerUpload(item.slot!)}
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-thread-sage/20 flex items-center justify-center mb-1 group-hover:bg-thread-sky/30 transition-colors">
                        <PixelIcon name="upload" size={20} className="text-thread-sage group-hover:text-thread-sky" />
                      </div>
                      <span className="text-xs text-thread-sage group-hover:text-thread-pine">Upload</span>
                    </button>
                  ) : (
                    // Filled slot - show preview with actions
                    <>
                      <button
                        onClick={() => onItemSelect(item)}
                        className="absolute inset-0 flex items-center justify-center p-2 cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.customAssetUrl}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </button>

                      {/* Replace button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          triggerUpload(item.slot!)
                        }}
                        className="absolute top-1 left-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 hover:opacity-100 transition-opacity hover:bg-thread-cream"
                        title="Replace image"
                      >
                        <PixelIcon name="upload" size={12} className="text-thread-sage" />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCustomSlotDelete?.(item.slot!)
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 hover:opacity-100 transition-opacity hover:bg-red-50"
                        title="Remove image"
                      >
                        <PixelIcon name="close" size={12} className="text-red-500" />
                      </button>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-thread-sky rounded-full flex items-center justify-center shadow-sm z-10">
                          <PixelIcon name="check" size={12} className="text-white" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
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
          <div className="flex flex-col items-center justify-center h-32 text-thread-sage">
            <PixelIcon name="search" size={32} className="mb-2 text-thread-sage/60" />
            <div className="text-sm text-center text-thread-sage">
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
                    ? '!border-thread-sky !bg-thread-sky/20 !shadow-md !transform !scale-105'
                    : '!border-thread-sage/30 !bg-white hover:!border-thread-sage/60'
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
                  <div className="!absolute !-top-1 !-right-1 !w-5 !h-5 !bg-thread-sky !rounded-full !flex !items-center !justify-center !shadow-sm !z-10">
                    <PixelIcon name="check" size={12} className="text-white" />
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
    <div className={`decoration-palette flex flex-col h-full bg-thread-paper ${className}`}>
      {/* Search Bar - Only show for grid views */}
      {primaryCategory !== 'themes' && primaryCategory !== 'text' && primaryCategory !== 'terrain' && !selectedItem?.type?.includes('house_color') && !selectedItem?.id.startsWith('sign_post') && (
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search decorations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-thread-sage/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sky focus:border-thread-sky text-sm text-gray-900 bg-white touch-manipulation"
              style={{ minHeight: '48px' }}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-thread-sage">
              <PixelIcon name="search" size={16} />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-thread-sage hover:text-thread-pine"
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
                  ? 'bg-thread-sky/30 text-thread-pine shadow-sm ring-1 ring-thread-sky/50'
                  : 'bg-thread-cream/50 text-thread-sage hover:bg-thread-cream hover:text-thread-pine'
                }
              `}
            >
              <PixelIcon name={category.icon} size={20} />
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Category Navigation */}
      {hasSecondaryCategories && !searchQuery && primaryCategory !== 'themes' && primaryCategory !== 'text' && primaryCategory !== 'terrain' && !selectedItem?.type?.includes('house_color') && !selectedItem?.id.startsWith('sign_post') && (
        <div className="flex-none border-b border-thread-sage/20 bg-thread-cream/30">
          <div className={`flex overflow-x-auto hide-scrollbar ${isMobile ? 'px-2' : 'px-4'} py-2 gap-2`}>
            {Object.entries(secondaryCategories).map(([key, subcategory]) => (
              <button
                key={key}
                onClick={() => setSecondaryCategory(key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation
                  ${secondaryCategory === key
                    ? 'bg-white text-thread-pine shadow-sm ring-1 ring-thread-sky/30'
                    : 'text-thread-sage hover:bg-white/70 hover:text-thread-pine'
                  }
                `}
              >
                <PixelIcon name={(subcategory as { label: string; icon: PixelIconName }).icon} size={16} />
                <span>{(subcategory as { label: string; icon: PixelIconName }).label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && (
        <div className="px-4 pb-2">
          <div className="text-xs text-thread-sage">
            {currentItems.length} result{currentItems.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {renderContent()}
    </div>
  )
}