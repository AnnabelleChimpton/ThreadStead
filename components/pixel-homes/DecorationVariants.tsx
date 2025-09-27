import React, { useState } from 'react'
import DecorationSVG from './DecorationSVG'

interface DecorationVariantsProps {
  decorationType: string
  decorationId: string
  selectedVariant?: string
  selectedSize?: 'small' | 'medium' | 'large'
  onVariantChange: (variant: string) => void
  onSizeChange: (size: 'small' | 'medium' | 'large') => void
  className?: string
}

// Define available variants for each decoration
const DECORATION_VARIANTS: Record<string, Record<string, Array<{ id: string; name: string; description?: string }>>> = {
  plant: {
    roses_red: [
      { id: 'red', name: 'Red', description: 'Classic red roses' },
      { id: 'pink', name: 'Pink', description: 'Soft pink roses' },
      { id: 'white', name: 'White', description: 'Pure white roses' },
      { id: 'yellow', name: 'Yellow', description: 'Bright yellow roses' }
    ],
    daisies_white: [
      { id: 'white', name: 'White', description: 'Classic white daisies' },
      { id: 'yellow', name: 'Yellow', description: 'Sunny yellow daisies' },
      { id: 'purple', name: 'Purple', description: 'Purple aster daisies' }
    ],
    small_tree: [
      { id: 'oak', name: 'Oak', description: 'Mighty oak tree' },
      { id: 'maple', name: 'Maple', description: 'Beautiful maple tree' },
      { id: 'pine', name: 'Pine', description: 'Evergreen pine tree' },
      { id: 'cherry', name: 'Cherry', description: 'Flowering cherry tree' }
    ]
  },
  furniture: {
    garden_bench: [
      { id: 'wood', name: 'Wood', description: 'Natural wood finish' },
      { id: 'painted_white', name: 'White', description: 'Fresh white paint' },
      { id: 'painted_green', name: 'Green', description: 'Forest green paint' },
      { id: 'weathered', name: 'Weathered', description: 'Rustic weathered look' }
    ],
    mailbox: [
      { id: 'red', name: 'Red', description: 'Classic red mailbox' },
      { id: 'blue', name: 'Blue', description: 'Patriotic blue mailbox' },
      { id: 'black', name: 'Black', description: 'Elegant black mailbox' },
      { id: 'green', name: 'Green', description: 'Nature-inspired green' }
    ],
    planter_box: [
      { id: 'flowers', name: 'Flowers', description: 'Mixed flower variety' },
      { id: 'herbs', name: 'Herbs', description: 'Kitchen herb garden' },
      { id: 'vegetables', name: 'Vegetables', description: 'Fresh vegetables' },
      { id: 'succulents', name: 'Succulents', description: 'Low-maintenance succulents' }
    ]
  },
  lighting: {
    garden_lantern: [
      { id: 'warm', name: 'Warm', description: 'Warm white light' },
      { id: 'cool', name: 'Cool', description: 'Cool white light' },
      { id: 'amber', name: 'Amber', description: 'Cozy amber glow' },
      { id: 'colored', name: 'Colored', description: 'Multi-colored festive' }
    ],
    string_lights: [
      { id: 'white', name: 'White', description: 'Classic white lights' },
      { id: 'multicolor', name: 'Rainbow', description: 'Festive rainbow colors' },
      { id: 'warm', name: 'Warm', description: 'Warm vintage bulbs' },
      { id: 'icicle', name: 'Icicle', description: 'Cool blue icicle effect' }
    ]
  },
  water: {
    fountain: [
      { id: 'stone', name: 'Stone', description: 'Natural stone fountain' },
      { id: 'marble', name: 'Marble', description: 'Elegant marble fountain' },
      { id: 'modern', name: 'Modern', description: 'Contemporary design' },
      { id: 'tiered', name: 'Tiered', description: 'Multi-level fountain' }
    ],
    pond: [
      { id: 'natural', name: 'Natural', description: 'Natural pond ecosystem' },
      { id: 'koi', name: 'Koi', description: 'Koi fish pond' },
      { id: 'lily', name: 'Lily', description: 'Water lily focus' },
      { id: 'rock', name: 'Rock', description: 'Rock garden pond' }
    ]
  }
}

// Size configurations with detailed specs
const SIZE_CONFIGS = {
  small: {
    scale: 0.7,
    name: 'Small',
    description: 'Compact size, perfect for accents',
    gridSize: { width: 1, height: 1 },
    cost: 0.8
  },
  medium: {
    scale: 1.0,
    name: 'Medium',
    description: 'Standard size, well-balanced',
    gridSize: { width: 1, height: 1 },
    cost: 1.0
  },
  large: {
    scale: 1.4,
    name: 'Large',
    description: 'Statement size, eye-catching',
    gridSize: { width: 2, height: 2 },
    cost: 1.5
  }
}

export default function DecorationVariants({
  decorationType,
  decorationId,
  selectedVariant = 'default',
  selectedSize = 'medium',
  onVariantChange,
  onSizeChange,
  className = ''
}: DecorationVariantsProps) {
  const [activeTab, setActiveTab] = useState<'size' | 'variant'>('size')

  // Get available variants for this decoration
  const availableVariants = DECORATION_VARIANTS[decorationType]?.[decorationId] || []
  const hasVariants = availableVariants.length > 0

  return (
    <div className={`decoration-variants bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header with tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('size')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'size'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            📏 Size
          </button>
          {hasVariants && (
            <button
              onClick={() => setActiveTab('variant')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'variant'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🎨 Style
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Size Selection */}
        {activeTab === 'size' && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Choose Size</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(SIZE_CONFIGS).map(([size, config]) => (
                <button
                  key={size}
                  onClick={() => onSizeChange(size as 'small' | 'medium' | 'large')}
                  className={`relative p-3 border rounded-lg transition-all duration-200 text-center ${
                    selectedSize === size
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {/* Size preview */}
                  <div className="flex items-center justify-center h-12 mb-2">
                    <DecorationSVG
                      decorationType={decorationType as any}
                      decorationId={decorationId}
                      variant={selectedVariant}
                      size={size as 'small' | 'medium' | 'large'}
                      className="transition-transform hover:scale-110"
                    />
                  </div>

                  <div className="text-xs font-medium text-gray-800">
                    {config.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {config.gridSize.width}×{config.gridSize.height} grid
                  </div>

                  {/* Selection indicator */}
                  {selectedSize === size && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Size description */}
            <div className="bg-gray-50 rounded-lg p-3 mt-3">
              <div className="text-xs text-gray-600">
                <strong>{SIZE_CONFIGS[selectedSize].name}:</strong> {SIZE_CONFIGS[selectedSize].description}
              </div>
            </div>
          </div>
        )}

        {/* Variant Selection */}
        {activeTab === 'variant' && hasVariants && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Choose Style</h4>
            <div className="grid grid-cols-2 gap-2">
              {availableVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => onVariantChange(variant.id)}
                  className={`relative p-3 border rounded-lg transition-all duration-200 text-center ${
                    selectedVariant === variant.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {/* Variant preview */}
                  <div className="flex items-center justify-center h-12 mb-2">
                    <DecorationSVG
                      decorationType={decorationType as any}
                      decorationId={decorationId}
                      variant={variant.id}
                      size={selectedSize}
                      className="transition-transform hover:scale-110"
                    />
                  </div>

                  <div className="text-xs font-medium text-gray-800">
                    {variant.name}
                  </div>
                  {variant.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {variant.description}
                    </div>
                  )}

                  {/* Selection indicator */}
                  {selectedVariant === variant.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No variants available */}
        {activeTab === 'variant' && !hasVariants && (
          <div className="text-center py-6 text-gray-500">
            <span className="text-2xl mb-2 block">🎨</span>
            <div className="text-sm">No style variations available for this decoration</div>
          </div>
        )}
      </div>

      {/* Quick info footer */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>
            Current: {SIZE_CONFIGS[selectedSize].name}
            {hasVariants && selectedVariant !== 'default' &&
              `, ${availableVariants.find(v => v.id === selectedVariant)?.name || selectedVariant}`
            }
          </span>
          <span className="text-blue-600">
            Grid: {SIZE_CONFIGS[selectedSize].gridSize.width}×{SIZE_CONFIGS[selectedSize].gridSize.height}
          </span>
        </div>
      </div>
    </div>
  )
}

// Enhanced decoration picker with variants
export function DecorationPickerWithVariants({
  decorationType,
  decorationId,
  onSelect,
  className = ''
}: {
  decorationType: string
  decorationId: string
  onSelect: (decoration: {
    type: string;
    id: string;
    variant: string;
    size: 'small' | 'medium' | 'large'
  }) => void
  className?: string
}) {
  const [selectedVariant, setSelectedVariant] = useState('default')
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium')

  const handleSelect = () => {
    onSelect({
      type: decorationType,
      id: decorationId,
      variant: selectedVariant,
      size: selectedSize
    })
  }

  return (
    <div className={`decoration-picker-with-variants ${className}`}>
      <DecorationVariants
        decorationType={decorationType}
        decorationId={decorationId}
        selectedVariant={selectedVariant}
        selectedSize={selectedSize}
        onVariantChange={setSelectedVariant}
        onSizeChange={setSelectedSize}
      />

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSelect}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Place Decoration
        </button>
      </div>
    </div>
  )
}

// Utility function to get random variant
export function getRandomVariant(decorationType: string, decorationId: string): string {
  const variants = DECORATION_VARIANTS[decorationType]?.[decorationId] || []
  if (variants.length === 0) return 'default'

  const randomIndex = Math.floor(Math.random() * variants.length)
  return variants[randomIndex].id
}

// Utility function to get all available variants
export function getAvailableVariants(decorationType: string, decorationId: string) {
  return DECORATION_VARIANTS[decorationType]?.[decorationId] || []
}

// Export variant configuration
export { DECORATION_VARIANTS, SIZE_CONFIGS }