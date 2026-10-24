/**
 * @jest-environment node
 *
 * PNG and WebP uploads keep their format, transparency and (for PNG) exact
 * pixels, so pixel art and cut-outs survive. Real sharp, no mocks.
 */
import sharp from 'sharp'
import { isApng, renderMediaSizesKeepingFormat, withoutPngMetadata } from '@/lib/media/image'

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

describe('animation and pixel art (template audit 08)', () => {
  // A 2-frame animated WebP, built by stacking two frames as pages
  async function animatedWebp(): Promise<Buffer> {
    const frame = (r: number) => sharp({ create: { width: 20, height: 20, channels: 4, background: { r, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()
    const [a, b] = await Promise.all([frame(255), frame(0)])
    return sharp([a, b], { join: { animated: true } }).webp({ loop: 0, delay: [100, 100] }).toBuffer()
  }

  test('an animated WebP keeps every frame', async () => {
    const { full, medium } = await renderMediaSizesKeepingFormat(await animatedWebp(), 'webp')
    expect((await sharp(full, { animated: true }).metadata()).pages).toBe(2)
    expect((await sharp(medium, { animated: true }).metadata()).pages).toBe(2)
  })

  // A real PNG with an acTL chunk and a text chunk spliced in after IHDR
  function chunk(type: string, data: Buffer): Buffer {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(require('zlib').crc32(body))
    return Buffer.concat([length, body, crc])
  }
  async function apng(): Promise<Buffer> {
    const { png } = await sprite()
    const afterIhdr = 8 + 12 + png.readUInt32BE(8)
    const acTL = Buffer.alloc(8); acTL.writeUInt32BE(1, 0)
    return Buffer.concat([png.subarray(0, afterIhdr), chunk('acTL', acTL), chunk('tEXt', Buffer.from('Comment\0where I live')), png.subarray(afterIhdr)])
  }

  test('an APNG is kept as uploaded, without its text and EXIF chunks', async () => {
    const upload = await apng()
    expect(isApng(upload)).toBe(true)
    const { full } = await renderMediaSizesKeepingFormat(upload, 'png')
    expect(full.includes(Buffer.from('acTL'))).toBe(true)
    expect(full.includes(Buffer.from('where I live'))).toBe(false)
    expect(full.length).toBe(withoutPngMetadata(upload).length)
  })

  test("a small sprite's thumbnail grows with hard edges, colours unblended", async () => {
    const { png } = await sprite()
    const { thumbnail } = await renderMediaSizesKeepingFormat(png, 'png')
    const { data, info } = await sharp(thumbnail).raw().toBuffer({ resolveWithObject: true })
    const colours = new Set<string>()
    for (let i = 0; i < data.length; i += info.channels) if (data[i + 3] === 255) colours.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
    expect(colours.size).toBeLessThanOrEqual(8) // the sprite's 8 solid colours, no blends between them
  })
})
