import React, { useEffect, useState } from 'react'
import HouseSVG, { type ColorPalette, type HouseCustomizations, type HouseTemplate } from './HouseSVG'
import {
  HOUSE_SIZE,
  houseLayerSet,
  houseOptionSprites,
  keyColourMap,
  swapKeyColours,
  type HouseLayerSet,
} from '@/lib/pixel-homes/house-layers'

interface HouseSpriteProps {
  template: HouseTemplate
  palette: ColorPalette
  customizations?: HouseCustomizations
  className?: string
  /** Draw this layer set whatever the flag says (admin previews of placeholder or new art) */
  layerSet?: HouseLayerSet
}

/** One recoloured copy of each layer per palette, shared by every house on the page. */
const recoloured = new Map<string, Promise<string>>()

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Couldn't load ${src}`))
    img.src = src
  })
}

/** A layer with its key colours swapped for the palette's, as an object URL. */
function paletteLayerUrl(src: string, palette: string): Promise<string> {
  const cacheKey = `${palette}|${src}`
  let url = recoloured.get(cacheKey)
  if (!url) {
    url = (async () => {
      const img = await loadImage(src)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas')
      ctx.drawImage(img, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      swapKeyColours(pixels.data, keyColourMap(palette))
      ctx.putImageData(pixels, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('No PNG')
      return URL.createObjectURL(blob)
    })()
    url.catch(() => recoloured.delete(cacheKey))
    recoloured.set(cacheKey, url)
  }
  return url
}

/** Residents' own wall/roof/trim/window colours wait on a decision (snap to ramps or not). */
function hasCustomColours(c: HouseCustomizations | undefined): boolean {
  return !!(c && (c.wallColor || c.roofColor || c.trimColor || c.windowColor || c.detailColor))
}

const pct = (n: number, of: number) => `${(n / of) * 100}%`

/**
 * A house from PNG layers in the resident's palette (art-direction T14).
 * Falls back to the code-drawn HouseSVG when the template has no layer art,
 * isn't switched on, uses custom colours, or while the layers are loading.
 */
export default function HouseSprite({ template, palette, customizations, className = '', layerSet }: HouseSpriteProps) {
  const set = layerSet ?? houseLayerSet(template)
  const usable = !!set && !hasCustomColours(customizations)
  const options = usable ? houseOptionSprites(template, set!, customizations as Record<string, unknown>) : []
  const sources = usable ? [set!.layers.base, set!.layers.roof, ...options.map((o) => o.src)] : []
  const sourcesKey = sources.join('\n')
  const [urls, setUrls] = useState<{ key: string; list: string[] } | null>(null)

  useEffect(() => {
    if (!sourcesKey) return
    let cancelled = false
    const key = `${palette}\n${sourcesKey}`
    Promise.all(sourcesKey.split('\n').map((src) => paletteLayerUrl(src, palette)))
      .then((list) => { if (!cancelled) setUrls({ key, list }) })
      .catch(() => { if (!cancelled) setUrls(null) })
    return () => { cancelled = true }
  }, [sourcesKey, palette])

  const ready = usable && urls?.key === `${palette}\n${sourcesKey}`
  if (!ready) {
    return <HouseSVG template={template} palette={palette} customizations={customizations} className={className} />
  }

  const [base, roof, ...optionUrls] = urls!.list
  const layer: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', maxWidth: 'none' }
  return (
    <div
      className={`house-svg relative ${className}`}
      data-house-sprite={template}
      style={{ aspectRatio: `${HOUSE_SIZE.width} / ${HOUSE_SIZE.height}` }}
      role="img"
      aria-label="House"
    >
      <img src={base} alt="" style={layer} />
      <img src={roof} alt="" style={layer} />
      {options.map((option, i) => (
        <img
          key={`${option.name}-${option.box.x}-${option.box.y}`}
          src={optionUrls[i]}
          alt=""
          style={{
            position: 'absolute',
            left: pct(option.box.x, HOUSE_SIZE.width),
            top: pct(option.box.y, HOUSE_SIZE.height),
            width: pct(option.box.w, HOUSE_SIZE.width),
            height: pct(option.box.h, HOUSE_SIZE.height),
            imageRendering: 'pixelated',
            maxWidth: 'none',
          }}
        />
      ))}
    </div>
  )
}
