/**
 * <Embed> through the compiler: what reaches the component, what the owner
 * is told, and that iframes written straight into a page still go. The
 * render side (placeholder until the click) is embed-ssr.test.tsx; which
 * links play is lib/templates/__tests__/embeds.test.ts.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import type { Island } from '@/lib/templates/compilation/compiler/types'

function embedIsland(source: string): { island: Island; warnings: string[]; staticHTML: string } {
  const artifacts = compileTemplateToArtifacts(source)
  const island = artifacts.islands.find((i) => i.component === 'embed')
  if (!island) throw new Error('no embed island')
  return { island, warnings: artifacts.warnings, staticHTML: artifacts.staticHTML }
}

const BANDCAMP_PLAYER =
  'https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/artwork=small/transparent=true/'
const BANDCAMP_CODE = `<iframe style="border: 0; width: 100%; height: 120px;" src="${BANDCAMP_PLAYER}" seamless><a href="https://someone.bandcamp.com/album/name">Name by Someone</a></iframe>`

test('a link and a title reach the component, with nothing to warn about', () => {
  const { island, warnings } = embedIsland(
    '<h2>Listening</h2>\n<Embed src="https://www.youtube.com/watch?v=jNQXAC9IVRw&amp;t=5" title="Me at the zoo" height="300" />'
  )
  expect(warnings).toEqual([])
  expect(island._precomputed?.componentProps).toMatchObject({
    src: 'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=5',
    title: 'Me at the zoo',
    height: 300,
  })
  // A declared prop, not CSS
  expect(island._precomputed?.styles ?? {}).not.toHaveProperty('height')
})

test('<Embed /> closes itself: what comes after it stays on the page, outside it', () => {
  // embed is a void element in HTML; the component isn't
  const { island, staticHTML } = embedIsland(
    '<main><Embed src="https://youtu.be/jNQXAC9IVRw" /><h2>after</h2><Guestbook /></main>'
  )
  expect(island.children ?? []).toEqual([])
  expect(staticHTML).toMatch(/data-component="embed"><\/span><h2>after<\/h2>/)
  expect(compileTemplateToArtifacts('<p>a<br/>b<img src="/x.png" alt=""/></p>').staticHTML).toBe(
    '<p>a<br />b<img src="/x.png" alt="" /></p>'
  )
})

describe("a host's whole embed code pasted into src", () => {
  test("becomes the player link and the code's height", () => {
    const { island, warnings, staticHTML } = embedIsland(`<Embed src='${BANDCAMP_CODE}' title="Name" />`)
    expect(warnings).toEqual([])
    expect(island._precomputed?.componentProps).toMatchObject({ src: BANDCAMP_PLAYER, height: 120, title: 'Name' })
    // Nothing of the iframe survives anywhere in the page
    expect(staticHTML).not.toMatch(/<iframe|seamless|Name by Someone/i)
  })

  test("the tag's own height wins", () => {
    const { island } = embedIsland(`<Embed src='${BANDCAMP_CODE}' height="200" />`)
    expect(island._precomputed?.componentProps).toMatchObject({ src: BANDCAMP_PLAYER, height: 200 })
  })

  test('with its entities escaped too', () => {
    const escaped = BANDCAMP_CODE.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const { island, warnings } = embedIsland(`<Embed src="${escaped}" />`)
    expect(warnings).toEqual([])
    expect(island._precomputed?.componentProps).toMatchObject({ src: BANDCAMP_PLAYER, height: 120 })
  })

  test('code for anywhere else is left alone, and the owner hears about it', () => {
    const artifacts = compileTemplateToArtifacts(`<Embed src='<iframe src="https://evil.example/player"></iframe>' />`)
    expect(artifacts.warnings).toEqual([
      expect.stringMatching(/^Line 1: <Embed src=.*> Embed can't play that link\./),
    ])
    expect(JSON.stringify(artifacts.islands)).not.toContain('evil.example/player"')
  })
})

describe('what the owner is told', () => {
  test.each([
    ['https://evil.example/video', /Embed can't play that link\. It takes links from YouTube, Vimeo, Bandcamp, SoundCloud and Spotify\. Visitors see nothing there\./],
    ['http://www.youtube.com/watch?v=jNQXAC9IVRw', /Embed can't play that link/],
    ['https://someone.bandcamp.com/album/name', /For Bandcamp, use the link in Bandcamp's embed code/],
    ['', /Embed needs a link in src/],
  ])('src="%s"', (src, message) => {
    const artifacts = compileTemplateToArtifacts(`<p>Hi</p>\n<Embed src="${src}" />`)
    expect(artifacts.warnings).toHaveLength(1)
    expect(artifacts.warnings[0]).toMatch(/^Line 2: <Embed src=/)
    expect(artifacts.warnings[0]).toMatch(message)
  })

  test('without a src at all', () => {
    expect(compileTemplateToArtifacts('<Embed />').warnings).toEqual(['Line 1: <Embed> needs src="…" to work.'])
  })

  test('a javascript: src never reaches the component', () => {
    const { island, warnings } = embedIsland('<Embed src="javascript:alert(1)" />')
    expect(warnings).toHaveLength(1)
    expect(JSON.stringify(island)).not.toMatch(/javascript:/i)
  })
})

describe('iframes written straight into a page still go', () => {
  test.each([
    '<iframe src="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw"></iframe>',
    '<iframe src="https://bandcamp.com/EmbeddedPlayer/album=1/"></iframe>',
    '<IFRAME SRC="https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"></IFRAME>',
  ])('%s', (markup) => {
    const artifacts = compileTemplateToArtifacts(`<div><p>Before</p>${markup}<p>After</p></div>`)
    expect(artifacts.staticHTML).not.toMatch(/<iframe/i)
    expect(JSON.stringify(artifacts.ast)).not.toMatch(/iframe/i)
    expect(artifacts.staticHTML).toContain('After')
  })

  test('also inside an Embed', () => {
    const artifacts = compileTemplateToArtifacts(
      '<Embed src="https://youtu.be/jNQXAC9IVRw"><iframe src="https://evil.example/"></iframe></Embed>'
    )
    expect(JSON.stringify(artifacts.ast)).not.toMatch(/iframe|evil\.example/i)
    expect(artifacts.staticHTML).not.toMatch(/iframe|evil\.example/i)
  })
})
