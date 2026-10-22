/**
 * The decorator's House items that pick a drawn part of the house, and the
 * choice each one makes. The items themselves live in the DecorationItem
 * table (section doors/windows/window_treatments/roof/chimney); this is
 * what their item ids mean.
 */
import type { HouseCustomizations } from '@/components/pixel-homes/HouseSVG'
import { HOUSE_SOCKETS, type SocketBox } from './house-layers'

type Part = 'door' | 'window' | 'treatment' | 'trim' | 'chimney' | 'mat' | 'number' | 'lights'

export const HOUSE_OPTION_ITEMS: Record<string, { part: Part; set: Partial<HouseCustomizations> }> = {
  default_door: { part: 'door', set: { doorStyle: 'default' } },
  arched_door: { part: 'door', set: { doorStyle: 'arched' } },
  double_door: { part: 'door', set: { doorStyle: 'double' } },
  cottage_door: { part: 'door', set: { doorStyle: 'cottage' } },
  default_windows: { part: 'window', set: { windowStyle: 'default' } },
  round_windows: { part: 'window', set: { windowStyle: 'round' } },
  arched_windows: { part: 'window', set: { windowStyle: 'arched' } },
  bay_windows: { part: 'window', set: { windowStyle: 'bay' } },
  default_treatments: { part: 'treatment', set: { windowTreatments: 'default' } },
  shutters: { part: 'treatment', set: { windowTreatments: 'shutters' } },
  flower_boxes: { part: 'treatment', set: { windowTreatments: 'flower_boxes' } },
  awnings: { part: 'treatment', set: { windowTreatments: 'awnings' } },
  default_trim: { part: 'trim', set: { roofTrim: 'default' } },
  ornate_trim: { part: 'trim', set: { roofTrim: 'ornate' } },
  scalloped_trim: { part: 'trim', set: { roofTrim: 'scalloped' } },
  gabled_trim: { part: 'trim', set: { roofTrim: 'gabled' } },
  default_chimney: { part: 'chimney', set: { chimneyStyle: 'default' } },
  brick_chimney: { part: 'chimney', set: { chimneyStyle: 'brick' } },
  stone_chimney: { part: 'chimney', set: { chimneyStyle: 'stone' } },
  no_chimney: { part: 'chimney', set: { chimneyStyle: 'none' } },
}

/**
 * The House items drawn over the house rather than as part of it (mat,
 * house number, lights). Only their tiles use this; DecorationMode applies
 * them itself (a number style also gives a house a number to show).
 */
export const HOUSE_EXTRA_ITEMS: Record<string, { part: Part; set: Partial<HouseCustomizations> }> = {
  no_mat: { part: 'mat', set: { welcomeMat: 'none' } },
  plain_mat: { part: 'mat', set: { welcomeMat: 'plain' } },
  floral_mat: { part: 'mat', set: { welcomeMat: 'floral' } },
  welcome_text_mat: { part: 'mat', set: { welcomeMat: 'welcome_text' } },
  custom_text_mat: { part: 'mat', set: { welcomeMat: 'custom_text' } },
  no_house_number: { part: 'number', set: { houseNumber: undefined } },
  classic_house_number: { part: 'number', set: { houseNumberStyle: 'classic' } },
  modern_house_number: { part: 'number', set: { houseNumberStyle: 'modern' } },
  rustic_house_number: { part: 'number', set: { houseNumberStyle: 'rustic' } },
  no_exterior_lights: { part: 'lights', set: { exteriorLights: 'none' } },
  lantern_lights: { part: 'lights', set: { exteriorLights: 'lantern' } },
  modern_lights: { part: 'lights', set: { exteriorLights: 'modern' } },
  string_exterior_lights: { part: 'lights', set: { exteriorLights: 'string_lights' } },
}

/**
 * The square of the house (in house pixels) a thumbnail of this part
 * shows: the left door/window and what's around it, the left end of the
 * trim under the eave, the top of the chimney, the mat, the number, the
 * door with its lights.
 */
export function houseOptionCrop(template: string, part: Part): { x: number; y: number; size: number } {
  const { x, y, size } = rawCrop(template, part)
  // kept on the canvas, so a tile never shows past the house's edge
  return { x: Math.min(Math.max(0, x), 200 - size), y: Math.min(Math.max(0, y), 180 - size), size }
}

function rawCrop(template: string, part: Part): { x: number; y: number; size: number } {
  const s = HOUSE_SOCKETS[template] ?? HOUSE_SOCKETS.cabin_v1
  const around = (b: SocketBox, pad: number) => {
    const size = Math.max(b.w, b.h) + pad * 2
    return { x: Math.round(b.x + b.w / 2 - size / 2), y: Math.round(b.y + b.h / 2 - size / 2), size }
  }
  switch (part) {
    case 'door':
      return around(s.door, 4)
    case 'window':
      return around(s['window-left'], 4)
    case 'treatment':
      return around(s['treatment-left'], 1)
    case 'trim':
      return { x: s.trim.x - 2, y: s.trim.y - 14, size: 36 }
    case 'mat':
      return around(s.mat, 6)
    case 'number':
      return around(s.number, 6)
    case 'lights': {
      const size = s.door.w + 24
      return { x: s.door.x - 12, y: Math.max(0, s.door.y - 6), size }
    }
    case 'chimney': {
      const size = Math.max(s.chimney.w + 16, 32)
      return { x: Math.round(s.chimney.x + s.chimney.w / 2 - size / 2), y: s.chimney.y - 4, size }
    }
  }
}
