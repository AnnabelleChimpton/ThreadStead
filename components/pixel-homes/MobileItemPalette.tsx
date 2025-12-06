import React, { useState } from 'react'
import DecorationIcon from './DecorationIcon'
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon'

interface DecorationItem {
  id: string
  name: string
  type: string
  category: string
  [key: string]: any
}

interface MobileItemPaletteProps {
  items: DecorationItem[]
  selectedItem: DecorationItem | null
  onItemSelect: (item: DecorationItem) => void
  className?: string
}

const CATEGORY_ICONS: Record<string, PixelIconName> = {
  themes: 'paint-bucket',
  templates: 'home',
  colors: 'paint-bucket',
  plant: 'drop',
  path: 'map',
  feature: 'zap',
  seasonal: 'gift',
  text: 'edit'
}

const CATEGORY_NAMES = {
  themes: 'Themes',
  templates: 'Templates', 
  colors: 'Colors',
  plant: 'Plants',
  path: 'Paths',
  feature: 'Features',
  seasonal: 'Seasonal',
  text: 'Text'
}

export default function MobileItemPalette({
  items,
  selectedItem,
  onItemSelect,
  className = ''
}: MobileItemPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<string>('themes')
  
  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, DecorationItem[]>)

  const categories = Object.keys(itemsByCategory).sort((a, b) => {
    // Sort categories in logical order
    const order = ['themes', 'templates', 'colors', 'plant', 'path', 'feature', 'seasonal', 'text']
    return order.indexOf(a) - order.indexOf(b)
  })

  const activeItems = itemsByCategory[activeCategory] || []

  return (
    <div className={`mobile-item-palette flex flex-col h-full ${className}`}>
      {/* Category Tabs - Horizontal scrolling on mobile */}
      <div className="category-tabs border-b border-gray-200 bg-white">
        <div className="flex overflow-x-auto px-2 py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          {categories.map(category => (
            <button
              key={category}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center
                min-w-[70px] h-16 mx-1 rounded-lg transition-all
                touch-manipulation active:scale-95
                ${activeCategory === category 
                  ? 'bg-blue-100 border-2 border-blue-300 text-blue-700' 
                  : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                }
              `}
              onClick={() => setActiveCategory(category)}
            >
              <span className="mb-1">
                <PixelIcon name={CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || 'archive'} size={24} />
              </span>
              <span className="text-xs font-medium leading-tight">
                {CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES] || category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid - Touch-optimized */}
      <div className="flex-1 overflow-y-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="grid grid-cols-3 gap-3">
          {activeItems.map(item => (
            <button
              key={item.id}
              className={`
                aspect-square p-3 rounded-xl border-2 
                touch-manipulation active:scale-95 transition-all duration-150
                flex flex-col items-center justify-center
                min-h-[80px] relative
                ${selectedItem?.id === item.id
                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
              onClick={() => onItemSelect(item)}
            >
              {/* Item Icon/Preview */}
              <div className="flex-1 flex items-center justify-center w-full">
                {item.type === 'theme' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
                    <PixelIcon name="paint-bucket" size={16} />
                  </div>
                ) : item.type === 'template' ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <PixelIcon name="home" size={24} />
                  </div>
                ) : item.type === 'color' ? (
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: item.color || item.value || '#ccc' }}
                  />
                ) : (
                  <DecorationIcon 
                    type={item.decorationType || item.type}
                    id={item.decorationId || item.id}
                    size={32}
                    className="w-full h-full max-w-8 max-h-8"
                  />
                )}
              </div>
              
              {/* Item Name */}
              <span className="text-xs font-medium text-center leading-tight mt-1 px-1">
                {item.name}
              </span>

              {/* Selection Indicator */}
              {selectedItem?.id === item.id && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <PixelIcon name="check" size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {activeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <PixelIcon name="archive" size={32} className="mb-2 text-gray-400" />
            <span className="text-sm">No items in this category</span>
          </div>
        )}
      </div>
    </div>
  )
}