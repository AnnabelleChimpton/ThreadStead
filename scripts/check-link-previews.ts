/**
 * Checks the link previews (Open Graph and Twitter/X cards) of a running site,
 * the way a chat app or social site reads them: one of each tag, absolute
 * URLs, an image that loads, and a large card only for a wide image.
 *
 *   npm run check:previews -- https://homepageagain.com
 *   npm run check:previews -- http://localhost:3000 /resident/someone /tr/some-ring
 *
 * With no paths it checks the main pages plus a resident, post, home and ring
 * found by following links, as a visitor would. Exits 1 when anything is wrong.
 */

const UA = 'Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)'
const PAGES = ['/', '/feed', '/search', '/threadrings', '/neighborhood', '/community', '/help', '/help/faq', '/build', '/indie', '/login', '/signup']
const ONE_EACH = ['og:title', 'og:image', 'og:site_name', 'twitter:card']

type Tags = Map<string, string[]>

async function get(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  return { res, body: Buffer.from(await res.arrayBuffer()) }
}

/** The <head>'s title count and its meta/link tags we care about. */
function readHead(html: string): { titles: number; tags: Tags } {
  const head = html.split(/<body[\s>]/i)[0]
  const tags: Tags = new Map()
  for (const [tag] of head.matchAll(/<(?:meta|link)\b[^>]*>/gi)) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1]?.replace(/&amp;/g, '&')
    const key = attr('property') || attr('name') || (attr('rel') === 'canonical' ? 'canonical' : undefined)
    if (key && /^(og:|twitter:|description$|canonical$)/.test(key)) {
      tags.set(key, [...(tags.get(key) ?? []), (attr('content') ?? attr('href'))!])
    }
  }
  return { titles: head.match(/<title[\s>]/gi)?.length ?? 0, tags }
}

/** Width and height from a PNG, GIF, JPEG or WebP's first bytes. */
function imageSize(b: Buffer): [number, number] | null {
  if (b.subarray(1, 4).toString() === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)]
  if (b.subarray(0, 3).toString() === 'GIF') return [b.readUInt16LE(6), b.readUInt16LE(8)]
  if (b.subarray(8, 12).toString() === 'WEBP') {
    const kind = b.subarray(12, 16).toString()
    if (kind === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1]
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
    if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1] }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9; ) {
      if (b[i] !== 0xff) { i++; continue }
      if ([0xc0, 0xc1, 0xc2].includes(b[i + 1])) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]
      i += 2 + b.readUInt16BE(i + 2)
    }
  }
  return null
}

/** One of each kind of page people share, found by following links. */
async function samples(base: string): Promise<string[]> {
  const page = async (path: string) => (await get(new URL(path, base).toString())).body.toString('utf8')
  const found: string[] = []
  const homes = [...(await page('/neighborhood')).matchAll(/href="\/home\/([^/"?#]+)"/g)].map((m) => m[1])
  if (homes[0]) found.push(`/home/${homes[0]}`, `/resident/${homes[0]}`)
  // The newest post of the first neighbor (of a few) who has one in their feed
  for (const name of new Set(homes.slice(0, 5))) {
    const post = (await page(`/resident/${name}/feed.xml`)).match(/<item>[\s\S]*?<link>https?:\/\/[^/<]+(\/[^<]+)<\/link>/)?.[1]
    if (post) { found.push(post); break }
  }
  // The biggest ring, from the list the rings page loads; its street when it has one
  const ring = JSON.parse(await page('/api/threadrings?sort=members&limit=1')).threadRings?.[0]?.slug
  if (ring) found.push(`/tr/${ring}`)
  if (ring && (await get(new URL(`/neighborhood/ring/${ring}`, base).toString())).res.ok) found.push(`/neighborhood/ring/${ring}`)
  return found
}

async function checkPage(base: string, path: string): Promise<string[]> {
  const { res, body } = await get(new URL(path, base).toString())
  if (!res.ok) return [`status ${res.status}`]
  const { titles, tags } = readHead(body.toString('utf8'))
  const one = (key: string) => tags.get(key)?.[0]
  const problems: string[] = []

  if (titles !== 1) problems.push(`${titles} <title> tags`)
  for (const [key, values] of tags) if (values.length > 1) problems.push(`${values.length}× ${key}: ${values.join(' | ')}`)
  for (const key of ONE_EACH) if (!tags.has(key)) problems.push(`no ${key}`)
  for (const key of ['og:image', 'twitter:image', 'og:url', 'canonical']) {
    const value = one(key)
    if (value && !/^https?:\/\//.test(value)) problems.push(`${key} isn't absolute: ${value}`)
  }
  if (one('og:url') !== one('canonical')) problems.push(`og:url ${one('og:url')} ≠ canonical ${one('canonical')}`)
  if (one('twitter:image') && one('twitter:image') !== one('og:image')) problems.push('twitter:image ≠ og:image')

  const imageUrl = one('og:image')
  if (imageUrl && /^https?:\/\//.test(imageUrl)) {
    const image = await get(imageUrl)
    const size = imageSize(image.body)
    if (!image.res.ok || !image.res.headers.get('content-type')?.startsWith('image/')) {
      problems.push(`image doesn't load (${image.res.status} ${image.res.headers.get('content-type')}): ${imageUrl}`)
    } else if (!size) {
      problems.push(`image size unreadable: ${imageUrl}`)
    } else {
      const [w, h] = size
      if (one('twitter:card') === 'summary_large_image' && w / h < 1.3) problems.push(`large card for a ${w}×${h} image`)
      // A smaller copy of the declared image is fine; another shape isn't
      const [dw, dh] = [Number(one('og:image:width')), Number(one('og:image:height'))]
      if (dw && dh && Math.abs(dw / dh - w / h) > 0.02) problems.push(`says ${dw}×${dh}, is ${w}×${h}`)
    }
  }
  return problems
}

async function main() {
  const [base, ...given] = process.argv.slice(2)
  if (!base) throw new Error('Usage: npm run check:previews -- <site URL> [paths…]')
  const paths = given.length ? given : [...PAGES, ...(await samples(base))]
  let failed = 0
  for (const path of paths) {
    const problems = await checkPage(base, path).catch((error: Error) => [`couldn't fetch: ${error.message}`])
    console.log(`${problems.length ? '✗' : '✓'} ${path}`)
    for (const problem of problems) console.log(`    ${problem}`)
    if (problems.length) failed++
  }
  console.log(`\n${paths.length - failed} of ${paths.length} pages preview cleanly`)
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
