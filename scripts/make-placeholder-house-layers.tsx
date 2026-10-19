#!/usr/bin/env tsx
/**
 * A stand-in layer set for the HouseSprite renderer, made from the
 * code-drawn cabin, so the layer + key-colour pipeline can be tested before
 * the real cabin art exists. Not art: it's HouseSVG snapped to the palette.
 *
 *   npx tsx scripts/make-placeholder-house-layers.tsx
 *
 * Draws the cabin with the key ramps' colours as its wall/roof/trim/window
 * colours, rasterises it at 1×, then snaps every pixel: shades of a key
 * colour go to that key ramp (by lightness), everything else to the nearest
 * threadstead-44 colour. Rows above the walls (y < 100) are the roof layer,
 * the rest the base. Writes public/pixel-homes/house-layers/placeholder/.
 */
import { mkdirSync } from 'fs'
import path from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import HouseSVG from '../components/pixel-homes/HouseSVG'
import { KEY_RAMPS, PALETTE_COLOURS, type HousePart } from '../lib/pixel-homes/palette'

const OUT = path.join(process.cwd(), 'public/pixel-homes/house-layers/placeholder')
const ROOF_BOTTOM = 100

type RGB = [number, number, number]
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const lum = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b
const dist = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

/** Hue family of each key ramp: which channels are high. */
function keyPart([r, g, b]: RGB): HousePart | null {
  const hi = (v: number) => v > 60
  const lo = (v: number) => v < 40
  if (hi(r) && lo(g) && hi(b) && Math.abs(r - b) < 40) return 'wall' // magenta
  if (lo(r) && hi(g) && hi(b) && Math.abs(g - b) < 40) return 'roof' // cyan
  if (hi(r) && hi(g) && lo(b) && Math.abs(r - g) < 40) return 'trim' // olive/yellow
  if (lo(r) && lo(g) && hi(b)) return 'glass' // blue
  return null
}

function snap(pixel: RGB): RGB {
  const part = keyPart(pixel)
  if (part) {
    const ramp = KEY_RAMPS[part].map(rgb)
    return ramp.reduce((best, c) => (Math.abs(lum(c) - lum(pixel)) < Math.abs(lum(best) - lum(pixel)) ? c : best))
  }
  const palette = PALETTE_COLOURS.map(rgb)
  return palette.reduce((best, c) => (dist(c, pixel) < dist(best, pixel) ? c : best))
}

async function main() {
  const markup = renderToStaticMarkup(
    <HouseSVG
      template="cabin_v1"
      palette="thread_sage"
      customizations={{
        wallColor: KEY_RAMPS.wall[2],
        roofColor: KEY_RAMPS.roof[2],
        trimColor: KEY_RAMPS.trim[2],
        windowColor: KEY_RAMPS.glass[2],
      }}
    />
  ).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" ')

  const { data, info } = await sharp(Buffer.from(markup), { density: 72 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const base = Buffer.alloc(data.length)
  const roof = Buffer.alloc(data.length)
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4
      if (data[i + 3] < 128) continue
      const [r, g, b] = snap([data[i], data[i + 1], data[i + 2]])
      const target = y < ROOF_BOTTOM ? roof : base
      target.set([r, g, b, 255], i)
    }
  }
  mkdirSync(OUT, { recursive: true })
  for (const [name, buf] of [['base', base], ['roof', roof]] as const) {
    await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, `cabin_${name}.png`))
  }
  console.log(`Wrote cabin_base.png and cabin_roof.png (${info.width}×${info.height}) to ${OUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
