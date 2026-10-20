/**
 * @jest-environment node
 *
 * What "Download my page" puts in the zip. Storage is a stand-in with the
 * same two helpers as lib/storage/r2.ts and a CDN at cdn.example; the
 * picture reader is a mock, so nothing reaches R2 or the network.
 */
import { buildPageDownload, findUrls, ownImageKey, type ImageReader, type PageDownloadStorage } from '../page-download'
import { readStoredZip } from '@/lib/utils/zip/__tests__/read-stored-zip'

const CDN = 'https://cdn.example'
const storage: PageDownloadStorage = {
  keyFromPublicUrl: (url) => (url.startsWith(`${CDN}/`) ? url.slice(CDN.length + 1) || null : null),
  publicUrl: (key) => `${CDN}/${key}`,
}
const ME = 'user_me'
const NOW = new Date('2026-10-19T12:00:00Z')

const bytesFor = (key: string) => Buffer.from(`picture:${key}`)
function reader(sizes: Record<string, number> = {}): jest.MockedFunction<ImageReader> {
  return jest.fn(async (url: string, maxBytes: number) => {
    const key = url.slice(CDN.length + 1)
    const bytes = sizes[key] !== undefined ? Buffer.alloc(sizes[key], 1) : bytesFor(key)
    if (bytes.length > maxBytes) return 'too-big' as const
    return { bytes, contentType: 'image/png' }
  })
}

function filesOf(zip: Buffer): Record<string, string> {
  return Object.fromEntries(readStoredZip(zip).map((e) => [e.name, e.data.toString('utf8')]))
}

const MINE = `${CDN}/media/${ME}/1700000000_medium.png`
const MY_AVATAR = `${CDN}/profile-photos/${ME}/1700000001_full.webp`
const MY_BANNER = `${CDN}/profile-banners/${ME}/1700000002.jpg`
const THEIRS = `${CDN}/media/user_other/1700000003_medium.png`
const ELSEWHERE = 'https://moss.neocities.org/cat.jpg'
const SNAPSHOT = `${CDN}/home-snapshots/${ME}.abc.png`

describe('a page of your own HTML', () => {
  const template = [
    '<main>',
    `  <img src="${MINE}" alt="me">`,
    `  <img src="${MINE}?v=2" alt="me again">`,
    `  <img src="${THEIRS}" alt="a friend's">`,
    `  <img src="${ELSEWHERE}" alt="a cat">`,
    `  <img src="${SNAPSHOT}" alt="my yard">`,
    '  <Guestbook />',
    '</main>',
  ].join('\n')
  const css = `body { background: url("${MY_BANNER}"); }\n.me { background-image: url(${MY_AVATAR}); }\n.x { background: url(${THEIRS}); }`

  test('index.html, style.css and your pictures, pointing at each other', async () => {
    const readImage = reader()
    const result = await buildPageDownload(
      { userId: ME, handle: 'pat', templateMode: 'advanced', customTemplate: template, customCSS: css },
      { storage, readImage, siteName: 'HomePageAgain', now: NOW }
    )
    const files = filesOf(result.zip)
    expect(Object.keys(files).sort()).toEqual([
      'images/media-1700000000_medium.png',
      'images/profile-banners-1700000002.jpg',
      'images/profile-photos-1700000001_full.webp',
      'index.html',
      'style.css',
    ])
    expect(result.files[0]).toBe('index.html')
    expect(result.leftOut).toBe(0)

    // Only your own uploads were read, each once, at the plain CDN address
    expect(readImage.mock.calls.map((c) => c[0]).sort()).toEqual(
      [MINE, MY_AVATAR, MY_BANNER].map((u) => u.split('?')[0]).sort()
    )

    const html = files['index.html']
    expect(html.startsWith('<!--\n  @pat\'s page on HomePageAgain, downloaded 2026-10-19.\n')).toBe(true)
    expect(html).toContain('Your CSS is in style.css.')
    expect(html).toContain('Pictures it uses that you uploaded are in images/.')
    expect(html).not.toContain('standard layout')
    expect(html).toContain('<img src="images/media-1700000000_medium.png" alt="me">')
    // The same picture at a second address is the same file
    expect(html).toContain('<img src="images/media-1700000000_medium.png" alt="me again">')
    // Not yours, not ours, or not an upload: left as it was
    expect(html).toContain(`<img src="${THEIRS}"`)
    expect(html).toContain(`<img src="${ELSEWHERE}"`)
    expect(html).toContain(`<img src="${SNAPSHOT}"`)
    expect(html).toContain('<Guestbook />')
    expect(html.endsWith(template.replace(MINE + '?v=2', 'images/media-1700000000_medium.png').replace(MINE, 'images/media-1700000000_medium.png'))).toBe(true)

    expect(files['style.css']).toBe(
      'body { background: url("images/profile-banners-1700000002.jpg"); }\n' +
        '.me { background-image: url(images/profile-photos-1700000001_full.webp); }\n' +
        `.x { background: url(${THEIRS}); }`
    )
    expect(files['images/media-1700000000_medium.png']).toBe(`picture:media/${ME}/1700000000_medium.png`)
  })

  test('a template saved but not showing says so', async () => {
    const result = await buildPageDownload(
      { userId: ME, handle: 'pat', templateMode: 'default', customTemplate: '<p>hi</p>', customCSS: null },
      { storage, readImage: reader(), siteName: 'HomePageAgain', now: NOW }
    )
    const files = filesOf(result.zip)
    expect(Object.keys(files)).toEqual(['index.html'])
    expect(files['index.html']).toContain("Your page uses the standard layout right now, so this HTML isn't showing there.")
    expect(files['index.html']).not.toContain('style.css')
    expect(files['index.html']).not.toContain('images/')
  })

  test('pictures past the size cap keep their web address', async () => {
    const big = `${CDN}/media/${ME}/big.png`
    const readImage = reader({ [`media/${ME}/big.png`]: 900 })
    const result = await buildPageDownload(
      { userId: ME, handle: 'pat', templateMode: 'advanced', customTemplate: `<img src="${MINE}"><img src="${big}">`, customCSS: null },
      { storage, readImage, siteName: 'HomePageAgain', now: NOW, maxBytes: 4096 + 200 + 64 }
    )
    const files = filesOf(result.zip)
    expect(result.leftOut).toBe(1)
    expect(Object.keys(files).sort()).toEqual(['images/media-1700000000_medium.png', 'index.html'])
    expect(files['index.html']).toContain(`<img src="${big}">`)
    expect(files['index.html']).toContain("1 more didn't fit in the download, so they still point at their web address.")
  })

  test('a picture that fails to load is skipped quietly', async () => {
    const readImage: ImageReader = jest.fn(async () => null)
    const result = await buildPageDownload(
      { userId: ME, handle: 'pat', templateMode: 'advanced', customTemplate: `<img src="${MINE}">`, customCSS: null },
      { storage, readImage, siteName: 'HomePageAgain', now: NOW }
    )
    expect(result.files).toEqual(['index.html'])
    expect(result.leftOut).toBe(0)
    expect(filesOf(result.zip)['index.html']).toContain(`<img src="${MINE}">`)
  })
})

describe('the standard layout', () => {
  test('just the CSS, its pictures and a README', async () => {
    const result = await buildPageDownload(
      { userId: ME, handle: 'pat', templateMode: 'default', customTemplate: null, customCSS: `.x { background: url('${MINE}') }` },
      { storage, readImage: reader(), siteName: 'HomePageAgain', now: NOW }
    )
    const files = filesOf(result.zip)
    expect(Object.keys(files)).toEqual(['README.txt', 'style.css', 'images/media-1700000000_medium.png'])
    expect(files['README.txt']).toBe(
      "@pat's page on HomePageAgain, downloaded 2026-10-19.\n\n" +
        "Your page uses the site's standard layout, so there's no HTML of your own to download.\n" +
        'style.css is the CSS you added to it.\n' +
        'images/ has the pictures your CSS uses that you uploaded.\n'
    )
    expect(files['style.css']).toBe(".x { background: url('images/media-1700000000_medium.png') }")
  })

  test('nothing customised: a README saying so', async () => {
    const result = await buildPageDownload(
      { userId: ME, handle: 'pat', templateMode: null, customTemplate: '   ', customCSS: '' },
      { storage, readImage: reader(), siteName: 'HomePageAgain', now: NOW }
    )
    const files = filesOf(result.zip)
    expect(Object.keys(files)).toEqual(['README.txt'])
    expect(files['README.txt']).toContain("You haven't added any CSS to it yet.")
  })
})

describe('whose pictures', () => {
  test.each([
    [MINE, `media/${ME}/1700000000_medium.png`],
    [`${MINE}?v=3#top`, `media/${ME}/1700000000_medium.png`],
    [MY_AVATAR, `profile-photos/${ME}/1700000001_full.webp`],
    [THEIRS, null],
    [ELSEWHERE, null],
    [SNAPSHOT, null],
    [`${CDN}/media/${ME}/../user_other/x.png`, null],
    [`${CDN}/media/${ME}//x.png`, null],
    [`${CDN}/media/${ME}/x%2F..%2Fy.png`, null],
    [`${CDN}/media/${ME}x/evil.png`, null],
  ])('%s', (url, key) => {
    expect(ownImageKey(url, ME, storage)).toBe(key)
  })

  test('addresses are found in HTML and CSS, without trailing punctuation', () => {
    expect(findUrls(`<a href="https://a.example/x">x</a>, see https://b.example/y. url(https://c.example/z.png) 'https://a.example/x'`)).toEqual([
      'https://a.example/x',
      'https://b.example/y',
      'https://c.example/z.png',
    ])
  })
})
