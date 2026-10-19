/**
 * @jest-environment node
 *
 * PNG and WebP uploads keep their format, transparency and (for PNG) exact
 * pixels, so pixel art and cut-outs survive. Real sharp, no mocks.
 */
import sharp from 'sharp'
import { renderMediaSizesKeepingFormat } from '@/lib/media/image'

// A 4×4 sprite: every pixel different, half of them see-through
async function sprite(): Promise<{ png: Buffer; raw: Buffer }> {
  const raw = Buffer.alloc(4 * 4 * 4)
  for (let i = 0; i < 16; i++) {
    raw[i * 4] = i * 16
    raw[i * 4 + 1] = 255 - i * 16
    raw[i * 4 + 2] = (i * 37) % 256
    raw[i * 4 + 3] = i % 2 === 0 ? 255 : 0
  }
  const png = await sharp(raw, { raw: { width: 4, height: 4, channels: 4 } }).png().toBuffer()
  return { png, raw }
}

test('a PNG stays a PNG, with its transparency and exact pixels', async () => {
  const { png, raw } = await sprite()
  const { thumbnail, medium, full } = await renderMediaSizesKeepingFormat(png, 'png')
  for (const out of [thumbnail, medium, full]) {
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('png')
    expect(meta.hasAlpha).toBe(true)
  }
  const back = await sharp(full).ensureAlpha().raw().toBuffer()
  expect(back.equals(raw)).toBe(true)
})

test('a WebP stays a WebP with alpha', async () => {
  const { png } = await sprite()
  const webp = await sharp(png).webp({ lossless: true }).toBuffer()
  const { full } = await renderMediaSizesKeepingFormat(webp, 'webp')
  const meta = await sharp(full).metadata()
  expect(meta.format).toBe('webp')
  expect(meta.hasAlpha).toBe(true)
})

test('small images are not blown up, big ones are capped at 4096', async () => {
  const { png } = await sprite()
  const { full } = await renderMediaSizesKeepingFormat(png, 'png')
  expect((await sharp(full).metadata()).width).toBe(4)
  const big = await sharp({ create: { width: 5000, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()
  const capped = await renderMediaSizesKeepingFormat(big, 'png')
  expect((await sharp(capped.full).metadata()).width).toBe(4096)
})
