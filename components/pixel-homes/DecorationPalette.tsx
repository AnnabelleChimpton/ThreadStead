import React, { useState, useMemo, useRef, useEffect } from 'react'
import DecorationIcon from './DecorationIcon'
import ThemePicker from './ThemePicker'
import { HouseCustomizations, HouseTemplate, ColorPalette } from './HouseSVG'
import { DecorationItem, TERRAIN_TILES, TerrainTile } from '../../lib/pixel-homes/decoration-data'
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon'
import { DECORATION_CATEGORY_ICONS, getCategoryIcon } from '@/lib/pixel-homes/category-icons'
import { matchesSearch } from '@/lib/pixel-homes/palette-search'
import { retroSFX } from '../../lib/audio/retro-sfx'
import { normalizeHexColor } from '../../lib/pixel-homes/decoration-save-rules'

/**
 * A hex color box that only passes on real colors. While what's typed
 * isn't one ("banana", "#12"), the house keeps its last good color and the
 * box says so. Empty means "use the theme's color".
 */
function HexColorInput({ value, onChange }: { value: string | undefined; onChange: (color: string | undefined) => void }) {
  const [draft, setDraft] = useState(value || '')
  // Follow changes made elsewhere (the color picker, Reset)
  useEffect(() => {
    setDraft((current) => (normalizeHexColor(current) === (value || null) ? current : value || ''))
  }, [value])

  const invalid = draft.trim() !== '' && !normalizeHexColor(draft)
  const commit = (color: string | null | undefined) => {
    if ((color || undefined) !== (value || undefined)) onChange(color || undefined)
  }

  return (
    <div>
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const next = e.target.value
          setDraft(next)
          // Short #abc only counts on blur, so typing #abcdef isn't cut off
          if (next.trim() === '') commit(undefined)
          else if (/^#?[0-9a-fA-F]{6}$/.test(next.trim())) commit(normalizeHexColor(next))
        }}
        onBlur={() => {
          const color = normalizeHexColor(draft)
          if (color) commit(color)
          setDraft(color || value || '')
        }}
        placeholder="#RRGGBB"
        maxLength={7}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'hex-color-error' : undefined}
        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 font-mono text-sm ${
          invalid ? 'border-thread-sunset focus:ring-thread-sunset' : 'border-thread-sage focus:ring-thread-pine'
        }`}
      />
      {invalid && (
        <p id="hex-color-error" className="mt-1 text-xs text-thread-sunset">
          Use a color like #A1B2C3.
        </p>
      )}
    </div>
  )
}

/**
 * Renders a terrain tile icon with dithered pattern matching the actual terrain
 */
function TerrainTileIcon({ tileId, size = 32 }: { tileId: string; size?: number }) {
  const getTerrainPattern = () => {
    switch (tileId) {
      case 'grass':
        return (
          <>
            <rect width={size} height={size} fill="#7CCD7C" />
            {/* Grass blades */}
            <rect x={2} y={4} width={1} height={3} fill="#5AAF5A" />
            <rect x={6} y={2} width={1} height={4} fill="#5AAF5A" />
            <rect x={10} y={5} width={1} height={3} fill="#5AAF5A" />
            <rect x={14} y={3} width={1} height={4} fill="#5AAF5A" />
            <rect x={4} y={10} width={1} height={3} fill="#5AAF5A" />
            <rect x={8} y={8} width={1} height={4} fill="#5AAF5A" />
            <rect x={12} y={11} width={1} height={3} fill="#5AAF5A" />
            {/* Highlights */}
            <rect x={3} y={6} width={1} height={2} fill="#90EE90" />
            <rect x={9} y={4} width={1} height={2} fill="#90EE90" />
          </>
        )
      case 'dirt':
        return (
          <>
            <rect width={size} height={size} fill="#8B4513" />
            {/* Dither texture */}
            <rect x={2} y={2} width={2} height={2} fill="#6B3410" />
            <rect x={8} y={4} width={2} height={2} fill="#A0522D" />
            <rect x={4} y={8} width={2} height={2} fill="#6B3410" />
            <rect x={10} y={10} width={2} height={2} fill="#A0522D" />
            <rect x={0} y={6} width={1} height={1} fill="#6B3410" />
            <rect x={6} y={0} width={1} height={1} fill="#A0522D" />
            <rect x={12} y={6} width={1} height={1} fill="#6B3410" />
          </>
        )
      case 'stone_path':
        return (
          <>
            <rect width={size} height={size} fill="#808080" />
            {/* Stone pattern */}
            <rect x={1} y={1} width={5} height={4} fill="#909090" />
            <rect x={8} y={2} width={5} height={3} fill="#707070" />
            <rect x={2} y={7} width={4} height={5} fill="#707070" />
            <rect x={8} y={8} width={5} height={4} fill="#909090" />
            {/* Gaps */}
            <rect x={0} y={5} width={14} height={1} fill="#606060" opacity={0.5} />
            <rect x={6} y={0} width={1} height={14} fill="#606060" opacity={0.5} />
          </>
        )
      case 'brick_path':
        return (
          <>
            <rect width={size} height={size} fill="#A52A2A" />
            {/* Brick pattern */}
            <rect x={0} y={0} width={6} height={4} fill="#B83030" />
            <rect x={8} y={0} width={6} height={4} fill="#983030" />
            <rect x={0} y={4} width={14} height={1} fill="#6B1F1F" />
            <rect x={4} y={6} width={6} height={4} fill="#B83030" />
            <rect x={12} y={6} width={2} height={4} fill="#983030" />
            <rect x={0} y={6} width={3} height={4} fill="#983030" />
            <rect x={0} y={10} width={14} height={1} fill="#6B1F1F" />
          </>
        )
      case 'water':
        return (
          <>
            <rect width={size} height={size} fill="#4682B4" />
            {/* Water ripples */}
            <rect x={1} y={3} width={3} height={1} fill="#5A9ECF" />
            <rect x={8} y={1} width={4} height={1} fill="#5A9ECF" />
            <rect x={2} y={8} width={4} height={1} fill="#5A9ECF" />
            <rect x={10} y={10} width={3} height={1} fill="#5A9ECF" />
            {/* Sparkle */}
            <rect x={5} y={5} width={1} height={1} fill="#6BAFDF" />
            <rect x={11} y={7} width={1} height={1} fill="#6BAFDF" />
          </>
        )
      case 'sand':
        return (
          <>
            <rect width={size} height={size} fill="#F4A460" />
            {/* Sand texture */}
            <rect x={2} y={2} width={1} height={1} fill="#E8C080" />
            <rect x={6} y={4} width={1} height={1} fill="#D49040" />
            <rect x={10} y={2} width={1} height={1} fill="#E8C080" />
            <rect x={4} y={8} width={1} height={1} fill="#D49040" />
            <rect x={8} y={10} width={1} height={1} fill="#E8C080" />
            <rect x={12} y={6} width={1} height={1} fill="#D49040" />
            <rect x={0} y={6} width={1} height={1} fill="#E8C080" />
          </>
        )
      case 'gravel':
        return (
          <>
            <rect width={size} height={size} fill="#708090" />
            {/* Gravel stones */}
            <rect x={1} y={1} width={3} height={2} fill="#808898" />
            <rect x={6} y={2} width={3} height={2} fill="#606878" />
            <rect x={10} y={0} width={3} height={2} fill="#808898" />
            <rect x={2} y={5} width={2} height={3} fill="#606878" />
            <rect x={7} y={6} width={3} height={2} fill="#808898" />
            <rect x={0} y={9} width={3} height={2} fill="#606878" />
            <rect x={5} y={10} width={3} height={2} fill="#808898" />
            <rect x={10} y={8} width={3} height={3} fill="#606878" />
          </>
        )
      case 'flower_bed':
        return (
          <>
            <rect width={size} height={size} fill="#3D2314" />
            {/* Soil texture */}
            <rect x={2} y={2} width={2} height={2} fill="#4D3324" />
            <rect x={8} y={4} width={2} height={2} fill="#2D1304" />
            <rect x={4} y={8} width={2} height={2} fill="#4D3324" />
            <rect x={10} y={10} width={2} height={2} fill="#2D1304" />
            <rect x={0} y={6} width={1} height={1} fill="#4D3324" />
          </>
        )
      case 'mulch':
        return (
          <>
            <rect width={size} height={size} fill="#5D4037" />
            <rect x={1} y={1} width={3} height={2} fill="#6D5047" />
            <rect x={6} y={3} width={4} height={2} fill="#4D3027" />
            <rect x={2} y={7} width={3} height={2} fill="#4D3027" />
            <rect x={8} y={9} width={4} height={2} fill="#6D5047" />
          </>
        )
      case 'moss':
        return (
          <>
            <rect width={size} height={size} fill="#7CB342" />
            <rect x={2} y={2} width={2} height={2} fill="#8BC34A" />
            <rect x={8} y={4} width={2} height={2} fill="#689F38" />
            <rect x={4} y={8} width={2} height={2} fill="#8BC34A" />
            <rect x={10} y={10} width={2} height={2} fill="#689F38" />
            <rect x={6} y={6} width={1} height={1} fill="#9CCC65" />
          </>
        )
      case 'pebbles':
        return (
          <>
            <rect width={size} height={size} fill="#90A4AE" />
            <rect x={1} y={1} width={2} height={2} fill="#B0BEC5" />
            <rect x={5} y={2} width={2} height={2} fill="#78909C" />
            <rect x={9} y={1} width={3} height={2} fill="#B0BEC5" />
            <rect x={2} y={5} width={2} height={2} fill="#78909C" />
            <rect x={7} y={6} width={2} height={2} fill="#B0BEC5" />
            <rect x={11} y={5} width={2} height={2} fill="#78909C" />
            <rect x={0} y={9} width={3} height={2} fill="#B0BEC5" />
            <rect x={5} y={10} width={2} height={2} fill="#78909C" />
            <rect x={9} y={9} width={3} height={2} fill="#B0BEC5" />
          </>
        )
      case 'cobblestone':
        return (
          <>
            <rect width={size} height={size} fill="#9E9E9E" />
            <rect x={0} y={0} width={5} height={5} fill="#AEAEAE" />
            <rect x={6} y={0} width={6} height={5} fill="#8E8E8E" />
            <rect x={0} y={6} width={6} height={6} fill="#8E8E8E" />
            <rect x={7} y={6} width={5} height={6} fill="#AEAEAE" />
            {/* Gaps */}
            <rect x={5} y={0} width={1} height={12} fill="#7E7E7E" opacity={0.5} />
            <rect x={0} y={5} width={12} height={1} fill="#7E7E7E" opacity={0.5} />
          </>
        )
      case 'wood_deck':
        return (
          <>
            <rect width={size} height={size} fill="#A1887F" />
            {/* Planks */}
            <rect x={0} y={3} width={14} height={1} fill="#8B7060" />
            <rect x={0} y={7} width={14} height={1} fill="#8B7060" />
            <rect x={0} y={11} width={14} height={1} fill="#8B7060" />
            {/* Wood grain */}
            <rect x={3} y={1} width={2} height={1} fill="#8B7060" opacity={0.4} />
            <rect x={9} y={5} width={2} height={1} fill="#8B7060" opacity={0.4} />
            <rect x={5} y={9} width={2} height={1} fill="#8B7060" opacity={0.4} />
          </>
        )
      default:
        // Fallback - use tile color
        const tile = TERRAIN_TILES.find(t => t.id === tileId)
        return <rect width={size} height={size} fill={tile?.color || '#888888'} />
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size < 20 ? 14 : size} ${size < 20 ? 14 : size}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated' }}
    >
      {getTerrainPattern()}
    </svg>
  )
}

interface DecorationPaletteProps {
  items: Record<string, DecorationItem[]>
  // While true, the palette waits before picking which tab to open on
  itemsLoading?: boolean
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
    icon: 'gift',
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
    icon: 'buildings',
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
  itemsLoading = false,
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
  const userPickedTab = useRef(false)

  // Open on a tab that has something in it: the first stocked Decor tab
  // (never the empty-until-uploaded "My Art"), else House, else Themes.
  useEffect(() => {
    if (itemsLoading || userPickedTab.current) return
    const hasItems = (key: string) => (items[key]?.length ?? 0) > 0
    const decorTab = Object.keys(PRIMARY_CATEGORIES.decorations.subcategories)
      .find(key => key !== 'custom' && hasItems(key))
    if (decorTab) {
      setPrimaryCategory('decorations')
      setSecondaryCategory(decorTab)
    } else if (hasItems('house')) {
      const houseTab = Object.keys(PRIMARY_CATEGORIES.house.subcategories)
        .find(key => items.house.some(item => item.section === key))
      setPrimaryCategory('house')
      if (houseTab) setSecondaryCategory(houseTab)
    } else {
      setPrimaryCategory('themes')
    }
  }, [items, itemsLoading])

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

  // Filter items based on search: names, ids, and the words for each category ("lamp", "flower")
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return transformedItems

    const filtered: Record<string, DecorationItem[]> = {}
    Object.entries(items).forEach(([category, itemList]) => {
      filtered[category] = itemList.filter(item => matchesSearch(item, category, searchQuery))
    })
    filtered.decorations = ['plants', 'furniture', 'lighting', 'water', 'structures', 'paths', 'features']
      .flatMap(category => filtered[category] ?? [])
    return filtered
  }, [items, transformedItems, searchQuery])

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
    userPickedTab.current = true
    setPrimaryCategory(category)
    setSearchQuery('')
    retroSFX.playModeChange()

    // Set default secondary category — skip "My Art", which is empty until the user uploads
    const subcategories = PRIMARY_CATEGORIES[category as keyof typeof PRIMARY_CATEGORIES]?.subcategories
    const keys = Object.keys(subcategories || {})
    if (keys.length > 0) {
      setSecondaryCategory(keys.find(key => key !== 'custom') ?? keys[0])
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
                    <HexColorInput
                      value={currentColor}
                      onChange={(color) => {
                        if (colorKey) {
                          onHouseCustomizationChange({ [colorKey]: color })
                        }
                      }}
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
                <div className="w-8 h-8 rounded border border-thread-sage/50 mb-1 shadow-sm overflow-hidden">
                  <TerrainTileIcon tileId={tile.id} size={32} />
                </div>
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

              {/* House Number */}
              <div>
                <label className="block text-sm font-medium text-thread-pine mb-2 flex items-center gap-1">
                  <PixelIcon name="home" size={16} className="inline-block align-middle" /> House Number
                  <span className="text-xs text-thread-sage ml-2">(Max 8 chars)</span>
                </label>
                <input
                  type="text"
                  value={houseCustomizations.houseNumber || ''}
                  onChange={(e) => onHouseCustomizationChange({ houseNumber: e.target.value.slice(0, 8) })}
                  placeholder="e.g., '42' or '123A'"
                  maxLength={8}
                  className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent text-gray-900 bg-white touch-manipulation"
                  style={{ minHeight: '48px' }}
                />
                <div className="text-xs text-gray-700 text-right mt-1">
                  {(houseCustomizations.houseNumber || '').length}/8
                </div>
                {houseCustomizations.houseNumber && !houseCustomizations.houseNumberStyle && (
                  <div className="text-xs text-thread-sunset mt-1">
                    Select a house number style in House → House Number to display
                  </div>
                )}
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
              Your own pixel art: PNG or WebP, up to 64×64 px and 100 KB. A GIF keeps only its first frame. Replacing an image changes every copy in your yard.
            </div>
          </div>

          <div className={`!grid ${isMobile ? '!grid-cols-3 !gap-3' : '!grid-cols-5 !gap-4'}`}>
            {customItems.map((item) => {
              const isUploading = uploadingSlot === item.slot
              const isEmpty = item.isEmpty
              const isSelected = selectedItem?.id === item.id

              return (
                <div key={item.id} className="flex flex-col gap-1">
                <div
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
                        <img
                          src={item.customAssetUrl}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
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
                {/* Always shown, so touch and keyboard users can reach them */}
                {!isEmpty && !isUploading && (
                  <div className="flex justify-center gap-2 text-xs">
                    <button type="button" onClick={() => triggerUpload(item.slot!)} className="ts-bare ts-text-button">
                      Replace
                    </button>
                    <button type="button" onClick={() => onCustomSlotDelete?.(item.slot!)} className="ts-bare ts-text-button">
                      Remove
                    </button>
                  </div>
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
                    pngUrl={item.pngUrl}
                    pngWidth={item.pngWidth}
                    pngHeight={item.pngHeight}
                    pngFrames={item.pngFrames}
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
              placeholder="Search: lamp, flower, bench…"
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
        {/* Every tab in view: they wrap rather than scroll out of sight */}
        <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Palette">
          {Object.entries(PRIMARY_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              role="tab"
              aria-selected={primaryCategory === key}
              onClick={() => handlePrimaryChange(key)}
              // The site's own tab: an ink underline marks the open one
              className="ts-tab flex flex-col items-center gap-0.5 text-xs whitespace-nowrap touch-manipulation"
            >
              <PixelIcon name={category.icon} size={18} />
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Category Navigation */}
      {hasSecondaryCategories && !searchQuery && primaryCategory !== 'themes' && primaryCategory !== 'text' && primaryCategory !== 'terrain' && !selectedItem?.type?.includes('house_color') && !selectedItem?.id.startsWith('sign_post') && (
        <div className="flex-none border-b border-thread-sage/20 bg-thread-cream/30">
          <div className="flex flex-wrap px-3 py-1 gap-x-1" role="tablist" aria-label="Kinds">
            {Object.entries(secondaryCategories).map(([key, subcategory]) => (
              <button
                key={key}
                onClick={() => {
                  userPickedTab.current = true
                  setSecondaryCategory(key)
                  retroSFX.playSelectItem()
                }}
                role="tab"
                aria-selected={secondaryCategory === key}
                className="ts-tab text-xs whitespace-nowrap touch-manipulation"
              >
                {(subcategory as { label: string; icon: PixelIconName }).label}
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