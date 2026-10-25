/**
 * @jest-environment node
 *
 * Copying pictures from a resident's own site into their page pictures:
 * only their verified sites, only real pictures, within the bytes allowed.
 * A fake fetcher; nothing touches the network or the bucket.
 */
import type { Fetcher } from '@/lib/indie-index/http'
import { FetchError } from '@/lib/indie-index/http'
import { copySitePictures, fileNameOf, PAGE_PICTURE_BYTES, pictureType } from '../page-pictures'

const GIF = Buffer.from('GIF89a' + 'x'.repeat(20))
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)])

function fetcherFor(pages: Record<string, { status?: number; bytes?: Buffer; url?: string; error?: string }>): Fetcher & jest.Mock {
  return jest.fn(async (req) => {
    const page = pages[req.url]
    if (!page) throw new FetchError('not found in test')
    if (page.error) throw new FetchError(page.error)
    expect(req.raw).toBe(true)
    return { status: page.status ?? 200, url: page.url ?? req.url, headers: { get: () => null }, body: '', bytes: page.bytes }
  }) as unknown as Fetcher & jest.Mock
}

test('copies pictures on your own sites, and leaves everything else where it is', async () => {
  const fetcher = fetcherFor({
    'https://pat.neocities.org/cat.gif': { bytes: GIF },
    'https://pat.neocities.org/img/sky.png': { bytes: PNG },
    'https://pat.neocities.org/page.html': { bytes: Buffer.from('<html>') },
    'https://pat.neocities.org/gone.gif': { status: 404 },
    'https://pat.neocities.org/moved.gif': { bytes: GIF, url: 'https://elsewhere.example.org/moved.gif' },
    'https://pat.neocities.org/slow.gif': { error: 'timed out after 10s' },
  })
  const store = jest.fn(async (bytes: Buffer, type: string, name: string) => `https://cdn.example/${name}?${type}`)
  const result = await copySitePictures({
    urls: [
      'https://pat.neocities.org/cat.gif', 'https://pat.neocities.org/cat.gif', 'https://pat.neocities.org/img/sky.png',
      'https://someone.else/cat.gif', 'https://pat.neocities.org/page.html', 'https://pat.neocities.org/gone.gif',
      'https://pat.neocities.org/moved.gif', 'https://pat.neocities.org/slow.gif',
    ],
    siteRefs: new Set(['pat.neocities.org']),
    usedBytes: 0,
    fetcher,
    store,
  })
  expect(result.copied).toEqual({
    'https://pat.neocities.org/cat.gif': 'https://cdn.example/cat.gif?image/gif',
    'https://pat.neocities.org/img/sky.png': 'https://cdn.example/sky.png?image/png',
  })
  expect(result.left).toEqual([
    { url: 'https://someone.else/cat.gif', reason: "It isn't on one of your sites." },
    { url: 'https://pat.neocities.org/page.html', reason: "It isn't a GIF, PNG, JPEG or WebP." },
    { url: 'https://pat.neocities.org/gone.gif', reason: 'Your site answered 404.' },
    { url: 'https://pat.neocities.org/moved.gif', reason: 'It sent me on to another site.' },
    { url: 'https://pat.neocities.org/slow.gif', reason: "I couldn't get it (timed out after 10s)." },
  ])
  expect(result.full).toBe(false)
  // Never fetched: not one of yours
  expect(fetcher.mock.calls.map(([req]) => req.url)).not.toContain('https://someone.else/cat.gif')
  expect(store).toHaveBeenCalledTimes(2)
})

test('stops copying when the page pictures are full', async () => {
  const fetcher = fetcherFor({ 'https://pat.neocities.org/a.gif': { bytes: GIF }, 'https://pat.neocities.org/b.gif': { bytes: GIF } })
  const store = jest.fn(async () => 'https://cdn.example/x.gif')
  const result = await copySitePictures({
    urls: ['https://pat.neocities.org/a.gif', 'https://pat.neocities.org/b.gif'],
    siteRefs: new Set(['pat.neocities.org']),
    usedBytes: PAGE_PICTURE_BYTES - GIF.length + 1,
    fetcher,
    store,
  })
  expect(result.full).toBe(true)
  expect(Object.keys(result.copied)).toEqual([])
  expect(result.left.map((l) => l.reason)).toEqual([
    'Your page pictures are full (50 MB). Delete some on your media page to make room.',
    'Your page pictures are full (50 MB). Delete some on your media page to make room.',
  ])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(store).not.toHaveBeenCalled()
})

test('a picture is known by its bytes, and named by its address', () => {
  expect(pictureType(GIF)).toBe('image/gif')
  expect(pictureType(PNG)).toBe('image/png')
  expect(pictureType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
  expect(pictureType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp')
  expect(pictureType(Buffer.from('<svg'))).toBeNull()
  expect(fileNameOf('https://pat.neocities.org/img/my%20cat.gif?v=2')).toBe('my cat.gif')
})
