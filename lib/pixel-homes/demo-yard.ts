/**
 * The yard on the homepage's demo house, for signed-out visitors: real
 * catalog items on the grid, so it shows the same hand-drawn art as a
 * resident's yard. The homepage's server props attach each item's catalog
 * art (pngUrl, renderSvg); without it the code-drawn version shows.
 *
 * Laid out around the house (drawn from x 176 to 336, its sort line at
 * y 182, the door at x 246–266): trees beside it, roses against the
 * foundation, a stone path from the door.
 */
import type { DecorationItem } from './decoration-data'

const CELL = 16

const item = (decorationId: string, name: string, type: DecorationItem['type'], gridX: number, gridY: number): DecorationItem => ({
  id: `demo_${decorationId}_${gridX}_${gridY}`,
  decorationId,
  name,
  type,
  zone: 'front_yard',
  position: { x: gridX * CELL, y: gridY * CELL },
  gridX,
  gridY,
  variant: 'default',
  size: 'medium',
})

export const DEMO_YARD: DecorationItem[] = [
  item('tree_oak', 'Oak Tree', 'plant', 6, 7),
  item('tree_pine', 'Pine Tree', 'plant', 4, 9),
  item('small_tree', 'Small Tree', 'plant', 23, 8),
  item('tree_pine', 'Pine Tree', 'plant', 27, 10),
  item('roses_red', 'Red Roses', 'plant', 12, 11),
  item('roses_pink', 'Pink Roses', 'plant', 18, 11),
  item('lavender', 'Lavender', 'plant', 13, 13),
  item('sunflowers', 'Sunflowers', 'plant', 8, 14),
  item('daisies_white', 'White Daisies', 'plant', 18, 14),
  item('garden_lantern', 'Garden Lantern', 'lighting', 17, 15),
  item('bird_bath', 'Bird Bath', 'feature', 25, 15),
  item('mailbox', 'Mailbox', 'furniture', 19, 17),
  item('garden_gnome', 'Garden Gnome', 'feature', 10, 17),
]

/** A two-cell stone path from the door to the bottom of the yard. */
export const DEMO_TERRAIN: Record<string, string> = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => 13 + i).flatMap((row) => [
    [`15,${row}`, 'stone_path'],
    [`16,${row}`, 'stone_path'],
  ])
)

/** The demo yard with each item's catalog art, as the homepage's server props pass it. */
export function demoYardWithArt(art: Map<string, { renderSvg: string | null; pngUrl: string | null }>): DecorationItem[] {
  return DEMO_YARD.map((d) => {
    const found = art.get(d.decorationId!)
    return {
      ...d,
      ...(found?.pngUrl && { pngUrl: found.pngUrl }),
      ...(found?.renderSvg && { renderSvg: found.renderSvg }),
    }
  })
}
