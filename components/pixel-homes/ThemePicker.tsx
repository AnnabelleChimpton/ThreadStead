import React, { useState } from 'react'
import HouseSVG, { HouseTemplate, ColorPalette } from './HouseSVG'

interface ThemePickerProps {
  onSelection: (template: HouseTemplate, palette: ColorPalette) => void
  initialTemplate?: HouseTemplate
  initialPalette?: ColorPalette
  showExplanation?: boolean
  showPreview?: boolean
  immediateSelection?: boolean
  className?: string
}

const TEMPLATES: Array<{ id: HouseTemplate; name: string; description: string }> = [
  {
    id: 'cottage_v1',
    name: 'Cozy Cottage',
    description: 'Classic and warm, perfect for storytellers and community builders'
  },
  {
    id: 'townhouse_v1', 
    name: 'Urban Townhouse',
    description: 'Modern and connected, ideal for networkers and professionals'
  },
  {
    id: 'loft_v1',
    name: 'Creative Loft',
    description: 'Minimalist and artistic, great for creators and innovators'
  },
  {
    id: 'cabin_v1',
    name: 'Rustic Cabin',
    description: 'Natural and peaceful, suited for thoughtful writers and nature lovers'
  }
]

const PALETTES: Array<{ id: ColorPalette; name: string; description: string }> = [
  {
    id: 'thread_sage',
    name: 'Thread Sage',
    description: 'Warm earth tones with sage green - the classic ThreadStead feel'
  },
  {
    id: 'charcoal_nights',
    name: 'Charcoal Nights', 
    description: 'Dark and sophisticated with warm accent touches'
  },
  {
    id: 'pixel_petals',
    name: 'Pixel Petals',
    description: 'Bright and cheerful with coral and meadow greens'
  },
  {
    id: 'crt_glow',
    name: 'CRT Glow',
    description: 'Retro computing vibes with blue and green highlights'
  },
  {
    id: 'classic_linen',
    name: 'Classic Linen',
    description: 'Clean and minimal with cream and sage accents'
  }
]

export default function ThemePicker({ 
  onSelection, 
  initialTemplate = 'cottage_v1', 
  initialPalette = 'thread_sage',
  showExplanation = true,
  showPreview = true,
  immediateSelection = false,
  className = ''
}: ThemePickerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<HouseTemplate>(initialTemplate)
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(initialPalette)

  const handleSelection = () => {
    onSelection(selectedTemplate, selectedPalette)
  }

  const handleTemplateChange = (template: HouseTemplate) => {
    setSelectedTemplate(template)
    if (immediateSelection) {
      onSelection(template, selectedPalette)
    }
  }

  const handlePaletteChange = (palette: ColorPalette) => {
    setSelectedPalette(palette)
    if (immediateSelection) {
      onSelection(selectedTemplate, palette)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showExplanation && (
        <div className="bg-thread-paper border border-thread-sage rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-headline font-semibold text-thread-pine">
            🏠 Welcome to Your Pixel Home!
          </h3>
          <div className="text-sm text-thread-charcoal space-y-2">
            <p>
              <strong>Your Pixel Home</strong> is the front door to your ThreadStead presence - 
              a playful, interactive way for visitors to discover you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-thread-cream bg-opacity-50 p-3 rounded">
                <div className="font-semibold text-thread-pine">🏠 Pixel Home (/home/@you)</div>
                <div>Interactive house for discovery & social fun</div>
              </div>
              <div className="bg-thread-cream bg-opacity-50 p-3 rounded">
                <div className="font-semibold text-thread-pine">📝 Profile Page (/@you)</div>
                <div>Your customizable content hub & blog</div>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Choose your house style and colors - this theme will apply to both interfaces!
            </p>
          </div>
        </div>
      )}

      {/* Template Selection */}
      <div className="space-y-4">
        <h4 className="text-md font-headline font-medium text-gray-900">
          Choose Your House Style
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`
                border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 flex flex-col touch-manipulation active:scale-95
                ${selectedTemplate === template.id
                  ? 'border-thread-sage bg-thread-cream bg-opacity-30'
                  : 'border-gray-200 hover:border-thread-sage hover:bg-thread-cream hover:bg-opacity-20'
                }
              `}
              onClick={() => handleTemplateChange(template.id)}
            >
              <div className="w-full h-36 sm:h-32 mb-3 flex items-center justify-center">
                <HouseSVG
                  template={template.id}
                  palette={selectedPalette}
                  className="w-full h-full max-w-28 max-h-28 sm:max-w-24 sm:max-h-24"
                />
              </div>
              <div className="text-center flex-shrink-0">
                <div className="font-medium text-sm text-gray-900 mb-1">{template.name}</div>
                <div className="text-xs text-gray-600 leading-tight">{template.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Palette Selection */}
      <div className="space-y-4">
        <h4 className="text-md font-headline font-medium text-gray-900">
          Choose Your Color Palette
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {PALETTES.map((palette) => (
            <div
              key={palette.id}
              className={`
                border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 flex items-center space-x-4
                ${selectedPalette === palette.id 
                  ? 'border-thread-sage bg-thread-cream bg-opacity-30' 
                  : 'border-gray-200 hover:border-thread-sage hover:bg-thread-cream hover:bg-opacity-20'
                }
              `}
              onClick={() => handlePaletteChange(palette.id)}
            >
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center mr-4">
                <HouseSVG 
                  template={selectedTemplate} 
                  palette={palette.id}
                  className="w-full h-full max-w-14 max-h-14"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-thread-pine mb-1">{palette.name}</div>
                <div className="text-xs text-thread-sage leading-relaxed">{palette.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-thread-paper border border-thread-sage rounded-lg p-4">
          <h4 className="text-md font-headline font-medium text-thread-pine mb-3">
            Your Home Preview
          </h4>
          <div className="flex justify-center">
            <div className="w-48">
              <HouseSVG 
                template={selectedTemplate} 
                palette={selectedPalette}
                className="w-full h-auto drop-shadow-lg"
              />
            </div>
          </div>
          <div className="text-center mt-3 text-sm text-thread-sage">
            {TEMPLATES.find(t => t.id === selectedTemplate)?.name} × {PALETTES.find(p => p.id === selectedPalette)?.name}
          </div>
        </div>
      )}

      {/* Action Button */}
      {showPreview && (
        <div className="flex justify-center">
          <button
            onClick={handleSelection}
            className="
              px-6 py-3 
              bg-thread-sage text-thread-paper 
              hover:bg-thread-pine 
              transition-colors duration-200 
              rounded-md font-medium
              shadow-cozy hover:shadow-cozySm
            "
          >
            Set Up My Pixel Home 🏠
          </button>
        </div>
      )}
    </div>
  )
}