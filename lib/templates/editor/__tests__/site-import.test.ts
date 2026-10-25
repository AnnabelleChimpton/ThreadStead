/**
 * Bringing a page in from your own site (lib/templates/editor/site-import.ts):
 * its own stylesheets as <style>s, every address absolute so pictures, links
 * and fonts keep coming from the site, and nothing from a page that sends us
 * somewhere else.
 */
import { importSitePage } from '../site-import'
import { FetchError, type Fetcher } from '@/lib/indie-index/http'
import { siteRefOf } from '@/lib/indie-index/site-key'

const SITE = 'https://pat.neocities.org/'
const site = { url: SITE, siteRef: siteRefOf(SITE)!.key }

function fakeSite(pages: Record<string, { body: string; status?: number; url?: string }>): Fetcher {
  return jest.fn(async ({ url }) => {
    const page = pages[url]
    if (!page) return { status: 404, url, headers: { get: () => null }, body: '' }
    return { status: page.status ?? 200, url: page.url ?? url, headers: { get: () => null }, body: page.body }
  })
}

const HOME = `<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="/print.css" media="print">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323">
<link rel="stylesheet" href="https://other.example.com/x.css">
<style>body { background: url(img/bg.gif); }</style>
</head><body>
<img src="cat.gif" srcset="cat.gif 1x, cat@2x.gif 2x" alt="my cat">
<a href="about.html">About</a> <a href="#top">Top</a> <a href="mailto:pat@example.com">Mail</a>
<div style="background-image: url('stars.png')">x</div>
<img src="https://elsewhere.example/a.png" alt="">
</body></html>`

test('addresses become absolute, and its own stylesheets come in as <style>s', async () => {
  const fetcher = fakeSite({
    [SITE]: { body: HOME },
    'https://pat.neocities.org/style.css': { body: 'h1 { background: url("bits/h1.png"); }' },
    'https://pat.neocities.org/print.css': { body: 'nav { display: none; }' },
  })
  const result = await importSitePage(site, fetcher)
  if (!result.ok) throw new Error(result.reason)
  const { html } = result
  expect(html).toContain('<style>\nh1 { background: url("https://pat.neocities.org/bits/h1.png"); }\n</style>')
  expect(html).toContain('<style media="print">\nnav { display: none; }\n</style>')
  expect(html).not.toContain('href="style.css"')
  // Stylesheets from elsewhere stay links: Google Fonts go to the CSS tab as
  // @imports when it's taken in, others are listed under the code
  expect(html).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323">')
  expect(html).toContain('<link rel="stylesheet" href="https://other.example.com/x.css">')
  expect(html).toContain('url(https://pat.neocities.org/img/bg.gif)')
  expect(html).toContain('src="https://pat.neocities.org/cat.gif"')
  expect(html).toContain('srcset="https://pat.neocities.org/cat.gif 1x, https://pat.neocities.org/cat@2x.gif 2x"')
  expect(html).toContain('href="https://pat.neocities.org/about.html"')
  expect(html).toContain('href="#top"')
  expect(html).toContain('href="mailto:pat@example.com"')
  expect(html).toContain("url('https://pat.neocities.org/stars.png')")
  expect(html).toContain('src="https://elsewhere.example/a.png"')
})

test("a page's own <base href> is what its addresses are against", async () => {
  const result = await importSitePage(site, fakeSite({ [SITE]: { body: '<base href="/v2/"><img src="a.png" alt="">' } }))
  expect(result).toEqual({ ok: true, html: '<base href="https://pat.neocities.org/v2/"><img src="https://pat.neocities.org/v2/a.png" alt="">' })
})

test('nothing from a page that sends us to another site, or answers an error', async () => {
  expect(await importSitePage(site, fakeSite({ [SITE]: { body: '<p>parked</p>', url: 'https://parking.example/' } })))
    .toEqual({ ok: false, reason: "Your page sent me on to another site, so I didn't bring it in." })
  expect(await importSitePage(site, fakeSite({}))).toEqual({ ok: false, reason: 'Your page answered 404.' })
  const down: Fetcher = async () => { throw new FetchError('timed out after 10s') }
  expect(await importSitePage(site, down)).toEqual({ ok: false, reason: "I couldn't get your page (timed out after 10s)." })
})

test('a stylesheet that fails is left as its link, and the page still comes in', async () => {
  const result = await importSitePage(site, fakeSite({ [SITE]: { body: '<link rel="stylesheet" href="gone.css"><p>hi</p>' } }))
  expect(result).toEqual({ ok: true, html: '<link rel="stylesheet" href="https://pat.neocities.org/gone.css"><p>hi</p>' })
})
