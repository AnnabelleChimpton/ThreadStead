import React, { useState } from 'react'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'

interface HousePatternPickerProps {
  template: HouseTemplate
  palette: ColorPalette
  customizations: HouseCustomizations
  onCustomizationChange: (key: keyof HouseCustomizations, value: string) => void
  className?: string
}

// Pattern options with descriptions
const PATTERN_OPTIONS = {
  foundationStyle: [
    { id: 'default', name: 'Default', description: 'Simple foundation' },
    { id: 'stone', name: 'Stone', description: 'Natural stone foundation' },
    { id: 'brick', name: 'Brick', description: 'Classic brick foundation' },
    { id: 'raised', name: 'Raised', description: 'Elevated foundation with posts' }
  ],
  wallPattern: [
    { id: 'default', name: 'Smooth', description: 'Clean smooth walls' },
    { id: 'shingles', name: 'Shingles', description: 'Cedar shake shingles' },
    { id: 'board_batten', name: 'Board & Batten', description: 'Traditional board and batten' },
    { id: 'stone_veneer', name: 'Stone Veneer', description: 'Natural stone accents' }
  ],
  windowTreatments: [
    { id: 'default', name: 'Plain', description: 'Simple windows' },
    { id: 'shutters', name: 'Shutters', description: 'Decorative shutters' },
    { id: 'flower_boxes', name: 'Flower Boxes', description: 'Window flower boxes' },
    { id: 'awnings', name: 'Awnings', description: 'Striped awnings' }
  ],
  roofMaterial: [
    { id: 'default', name: 'Standard', description: 'Basic roofing' },
    { id: 'shingles', name: 'Shingles', description: 'Asphalt shingles' },
    { id: 'tile', name: 'Tile', description: 'Clay roof tiles' },
    { id: 'metal', name: 'Metal', description: 'Metal roofing' },
    { id: 'thatch', name: 'Thatch', description: 'Traditional thatch' }
  ],
  chimneyStyle: [
    { id: 'default', name: 'Standard', description: 'Basic chimney' },
    { id: 'brick', name: 'Brick', description: 'Red brick chimney' },
    { id: 'stone', name: 'Stone', description: 'Natural stone chimney' },
    { id: 'none', name: 'None', description: 'No chimney' }
  ]
}

const PATTERN_CATEGORIES = [
  {
    id: 'foundationStyle',
    name: 'Foundation',
    icon: '🏗️',
    description: 'Choose your foundation style'
  },
  {
    id: 'wallPattern',
    name: 'Wall Pattern',
    icon: '🧱',
    description: 'Select wall texture and pattern'
  },
  {
    id: 'windowTreatments',
    name: 'Windows',
    icon: '🪟',
    description: 'Add window decorations'
  },
  {
    id: 'roofMaterial',
    name: 'Roof Material',
    icon: '🏠',
    description: 'Choose roofing material'
  },
  {
    id: 'chimneyStyle',
    name: 'Chimney',
    icon: '🏭',
    description: 'Select chimney style'
  }
]

export default function HousePatternPicker({
  template,
  palette,
  customizations,
  onCustomizationChange,
  className = ''
}: HousePatternPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('foundationStyle')

  const activeOptions = PATTERN_OPTIONS[activeCategory as keyof typeof PATTERN_OPTIONS] || []
  const activeValue = customizations[activeCategory as keyof HouseCustomizations] || 'default'

  return (
    <div className={`house-pattern-picker bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">🏠 House Patterns</h3>
        <p className="text-sm text-gray-600">Customize your house with detailed architectural patterns</p>
      </div>

      {/* Preview Section */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <HouseSVG
              template={template}
              palette={palette}
              customizations={customizations}
              className="w-48 h-36"
            />
          </div>
        </div>
        <div className="text-center mt-3">
          <div className="text-sm font-medium text-gray-800">Preview</div>
          <div className="text-xs text-gray-600">Real-time house customization</div>
        </div>
      </div>

      <div className="flex">
        {/* Category Sidebar */}
        <div className="w-48 border-r border-gray-200">
          <div className="p-2">
            {PATTERN_CATEGORIES.map((category) => {
              const currentValue = customizations[category.id as keyof HouseCustomizations] || 'default'
              const option = PATTERN_OPTIONS[category.id as keyof typeof PATTERN_OPTIONS]?.find(opt => opt.id === currentValue)

              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 mb-1 ${
                    activeCategory === category.id
                      ? 'bg-blue-50 border-2 border-blue-300 text-blue-700'
                      : 'hover:bg-gray-50 border-2 border-transparent text-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">{category.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{category.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {option?.name || 'Default'}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Options Panel */}
        <div className="flex-1 p-4">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-800 mb-1">
              {PATTERN_CATEGORIES.find(cat => cat.id === activeCategory)?.name}
            </h4>
            <p className="text-sm text-gray-600">
              {PATTERN_CATEGORIES.find(cat => cat.id === activeCategory)?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {activeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => onCustomizationChange(activeCategory as keyof HouseCustomizations, option.id)}
                className={`relative p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                  activeValue === option.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Mini preview */}
                <div className="flex items-center justify-center h-16 mb-3 bg-white rounded border">
                  <HouseSVG
                    template={template}
                    palette={palette}
                    customizations={{
                      ...customizations,
                      [activeCategory]: option.id
                    }}
                    className="w-12 h-9"
                  />
                </div>

                <div className="text-sm font-medium text-gray-800 mb-1">
                  {option.name}
                </div>
                <div className="text-xs text-gray-600">
                  {option.description}
                </div>

                {/* Selection indicator */}
                {activeValue === option.id && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Category info */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <strong>Tip:</strong> Mix and match different patterns to create your unique house style.
              Each pattern adds authentic architectural details to your home.
            </div>
          </div>
        </div>
      </div>

      {/* Footer with summary */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>
            Active patterns: {Object.entries(customizations)
              .filter(([key, value]) => value && value !== 'default' && PATTERN_OPTIONS[key as keyof typeof PATTERN_OPTIONS])
              .length
            } / {PATTERN_CATEGORIES.length}
          </span>
          <button
            onClick={() => {
              PATTERN_CATEGORIES.forEach(cat => {
                onCustomizationChange(cat.id as keyof HouseCustomizations, 'default')
              })
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Reset All Patterns
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact pattern picker for smaller spaces
export function CompactPatternPicker({
  template,
  palette,
  customizations,
  onCustomizationChange,
  className = ''
}: HousePatternPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activePatterns = Object.entries(customizations)
    .filter(([key, value]) => value && value !== 'default' && PATTERN_OPTIONS[key as keyof typeof PATTERN_OPTIONS])
    .length

  return (
    <div className={`compact-pattern-picker ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <span className="text-lg mr-3">🏗️</span>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-800">House Patterns</div>
            <div className="text-xs text-gray-600">
              {activePatterns > 0 ? `${activePatterns} active patterns` : 'Default styling'}
            </div>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2">
          <HousePatternPicker
            template={template}
            palette={palette}
            customizations={customizations}
            onCustomizationChange={onCustomizationChange}
          />
        </div>
      )}
    </div>
  )
}

// Quick pattern presets
export const HOUSE_PATTERN_PRESETS = {
  cottage_cozy: {
    foundationStyle: 'stone',
    wallPattern: 'board_batten',
    windowTreatments: 'flower_boxes',
    roofMaterial: 'shingles',
    chimneyStyle: 'brick'
  },
  modern_minimalist: {
    foundationStyle: 'default',
    wallPattern: 'default',
    windowTreatments: 'default',
    roofMaterial: 'metal',
    chimneyStyle: 'none'
  },
  rustic_charm: {
    foundationStyle: 'stone',
    wallPattern: 'stone_veneer',
    windowTreatments: 'shutters',
    roofMaterial: 'thatch',
    chimneyStyle: 'stone'
  },
  suburban_classic: {
    foundationStyle: 'brick',
    wallPattern: 'shingles',
    windowTreatments: 'shutters',
    roofMaterial: 'shingles',
    chimneyStyle: 'brick'
  }
} as const

export function applyPatternPreset(preset: keyof typeof HOUSE_PATTERN_PRESETS, onCustomizationChange: (key: keyof HouseCustomizations, value: string) => void) {
  const patterns = HOUSE_PATTERN_PRESETS[preset]
  Object.entries(patterns).forEach(([key, value]) => {
    onCustomizationChange(key as keyof HouseCustomizations, value)
  })
}