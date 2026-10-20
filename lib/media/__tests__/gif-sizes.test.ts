/**
 * @jest-environment node
 *
 * GIF uploads keep their format and every frame. Real sharp, no mocks.
 */
import sharp from 'sharp'
import { ImageValidationError, MEDIA_KEEP_MAX, renderGifSizes } from '@/lib/media/image'

/** A width×height GIF with one solid colour per frame, 100ms each, looping. */
async function makeGif(width: number, height: number, colours: Array<[number, number, number]>): Promise<Buffer> {
  const frame = width * height * 4
  const raw = Buffer.alloc(frame * colours.length)
  colours.forEach(([r, g, b], f) => {
    for (let i = 0; i < width * height; i++) {
      raw.set([r, g, b, 255], f * frame + i * 4)
    }
  })
  return sharp(raw, { raw: { width, height: height * colours.length, channels: 4, pageHeight: height } })
    .gif({ delay: colours.map(() => 100), loop: 0 })
    .toBuffer()
}

const RED: [number, number, number] = [255, 0, 0]
const GREEN: [number, number, number] = [0, 255, 0]

const framesOf = async (buf: Buffer) => {
  const meta = await sharp(buf, { animated: true }).metadata()
  return { format: meta.format, pages: meta.pages, width: meta.width, height: meta.pageHeight, delay: meta.delay }
}

test('a small 2-frame GIF: full and medium are the upload itself, the thumbnail still moves', async () => {
  const gif = await makeGif(8, 6, [RED, GREEN])
  const out = await renderGifSizes(gif)

  expect(out).toMatchObject({ width: 8, height: 6, frames: 2 })
  expect(out.full.equals(gif)).toBe(true)
  expect(out.medium.equals(gif)).toBe(true)
  // Not blown up
  expect(await framesOf(out.full)).toMatchObject({ format: 'gif', pages: 2, width: 8, height: 6 })

  // The thumbnail is never a bigger file than the upload; a tiny GIF's 150px crop would be
  expect(out.thumbnail.length).toBeLessThanOrEqual(gif.length)
  expect(await framesOf(out.thumbnail)).toMatchObject({ format: 'gif', pages: 2 })
})

test('a big GIF is shrunk for medium and thumbnail with every frame and its timing', async () => {
  const gif = await makeGif(900, 700, [RED, GREEN])
  const out = await renderGifSizes(gif)

  expect(out.full.equals(gif)).toBe(true)
  expect(await framesOf(out.medium)).toMatchObject({ format: 'gif', pages: 2, delay: [100, 100] })
  const medium = await framesOf(out.medium)
  expect(Math.max(medium.width!, medium.height!)).toBe(600)
  expect(await framesOf(out.thumbnail)).toMatchObject({ format: 'gif', pages: 2, width: 150, height: 150 })
})

test(`a GIF over ${MEDIA_KEEP_MAX}px is shrunk to fit, frames kept`, async () => {
  const gif = await makeGif(MEDIA_KEEP_MAX + 100, 10, [RED, GREEN])
  const out = await renderGifSizes(gif)
  expect(await framesOf(out.full)).toMatchObject({ format: 'gif', pages: 2, width: MEDIA_KEEP_MAX })
})

test('bytes that are not a GIF are turned away as bad input', async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer()
  await expect(renderGifSizes(png)).rejects.toBeInstanceOf(ImageValidationError)
  await expect(renderGifSizes(Buffer.from('GIF89a not really'))).rejects.toBeInstanceOf(ImageValidationError)
})
