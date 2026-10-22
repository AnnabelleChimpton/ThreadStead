import React from 'react'
import HouseSprite from './HouseSprite'
import type { ColorPalette, HouseCustomizations, HouseTemplate } from './HouseSVG'
import { HOUSE_SIZE } from '@/lib/pixel-homes/house-layers'
import { HOUSE_OPTION_ITEMS, houseOptionCrop } from '@/lib/pixel-homes/house-option-items'

interface HouseOptionThumbProps {
  itemId: string
  template: HouseTemplate
  palette: ColorPalette
  customizations: HouseCustomizations
  size: number
}

/**
 * A decorator tile for a door, window, window decor, roof trim or chimney:
 * a close-up of the resident's own house wearing that choice, in their
 * colours. Null for items that aren't one of those parts.
 */
export default function HouseOptionThumb({ itemId, template, palette, customizations, size }: HouseOptionThumbProps) {
  const option = HOUSE_OPTION_ITEMS[itemId]
  if (!option) return null
  const crop = houseOptionCrop(template, option.part)
  const scale = size / crop.size
  return (
    <div
      aria-hidden="true"
      data-house-option-thumb={itemId}
      style={{ width: size, height: size, position: 'relative', overflow: 'hidden', borderRadius: 4 }}
    >
      <div
        style={{
          position: 'absolute',
          left: -crop.x * scale,
          top: -crop.y * scale,
          width: HOUSE_SIZE.width * scale,
          height: HOUSE_SIZE.height * scale,
        }}
      >
        <HouseSprite
          template={template}
          palette={palette}
          customizations={{ ...customizations, ...option.set }}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

/** Whether a decorator item gets a house close-up as its tile. */
export function isHouseOptionItem(itemId: string): boolean {
  return itemId in HOUSE_OPTION_ITEMS
}
