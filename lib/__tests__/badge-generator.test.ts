/**
 * @jest-environment node
 *
 * The ring badge's SVG takes the ring's name and the owner's colours. A bare
 * "&" made it invalid, so "Dungeons & Dragons" was created with no badge at
 * all, and a "<" or a crafted colour wrote markup into the SVG.
 */
import sharp from 'sharp'
import { generateBadge } from '@/lib/badge-generator'

const png = async (title: string, extra: Record<string, string> = {}) => {
  const { imageDataUrl } = await generateBadge({ title, ...extra })
  expect(imageDataUrl).toMatch(/^data:image\/png;base64,/)
  return sharp(Buffer.from(imageDataUrl!.split(',')[1], 'base64')).metadata()
}

it('draws names with & and <', async () => {
  expect(await png('Dungeons & Dragons')).toMatchObject({ width: 88, height: 31 })
  expect(await png('<b>hi</b> & <image href="x"/>')).toMatchObject({ width: 88, height: 31 })
})

it('ignores a colour that is not a colour', async () => {
  expect(await png('Knits', { backgroundColor: '"/><image href="file:///etc/passwd"/><rect fill="', textColor: 'red' })).toMatchObject({ width: 88 })
})
