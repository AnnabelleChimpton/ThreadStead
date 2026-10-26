/**
 * @jest-environment node
 *
 * Parts and tokens (design/component-styling-audit/PLAN.md): every
 * component's parts, as lib/templates/styling/component-parts.ts lists them,
 * are the ts-* classes it really draws. Each component's registry example
 * is put on a page and visited the way a visit goes (server render, then
 * hydrated in a browser DOM), by a visitor, a friend and the owner, with
 * every disclosure opened, so the parts that only show sometimes show.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

// As in ssr-golden.test.tsx: PixelIcon's SVG import is a file stub under jest
jest.mock('@/components/ui/PixelIcon', () => {
  const React = jest.requireActual('react')
  const PixelIcon = ({ size = 24 }: { size?: number }) =>
    React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } })
  return { PixelIcon, default: PixelIcon }
})

// The component runtime loads at once, as in Next's server render
jest.mock('next/dynamic', () => require('../sync-dynamic').syncDynamic)

import React from 'react'
import { renderToString } from 'react-dom/server'
import { JSDOM, VirtualConsole } from 'jsdom'
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer'
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { forgetOwnerRings } from '@/lib/templates/owner-rings'
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { buildComponentDocs, type ComponentDoc } from '@/lib/templates-docs/component-docs'
import { PARTS, DRAWS_ALSO } from '@/lib/templates/styling/component-parts'
import { AppProviders, residentData, OWNER_ID, enterBrowser } from '../ssr-golden-support'

const VISITOR = 'u_visitor'
const FRIEND = 'u_friend'

/** The owner before setting anything up: the components say where to (OwnerNote) */
const NEW_OWNER = 'new-owner'

/** Everything a component can show: posts, photos, friends, a song, a house, rings */
function richData(viewerId: string | null): ResidentData {
  const data = residentData(viewerId)
  if (viewerId === NEW_OWNER) {
    return { ...residentData(OWNER_ID), posts: [], images: [], featuredFriends: [], websites: [], pixelHome: undefined } as unknown as ResidentData
  }
  return {
    ...data,
    viewer: { ...data.viewer, isFriend: viewerId === FRIEND, isFollowing: viewerId === FRIEND, isFollower: viewerId === FRIEND },
    images: [
      { id: 'i1', url: '/a.png', alt: 'One', caption: 'A caption', createdAt: '2026-10-01T12:00:00.000Z' },
      { id: 'i2', url: '/b.png', alt: 'Two', caption: '', createdAt: '2026-10-02T12:00:00.000Z' },
    ],
    posts: data.posts.map((post) => ({ ...post, title: 'A title', commentCount: 1 })),
    featuredFriends: [{ id: 'u_sam', handle: 'sam', displayName: 'Sam', avatarUrl: '/s.png' }],
    profileMidi: { url: '/api/media/serve/m1', title: 'A tune', credit: 'by me', autoplay: false, loop: false },
    pixelHome: { template: 'cottage_v1', palette: 'thread_sage', customizations: {}, number: 7, snapshotCardUrl: null },
  } as unknown as ResidentData
}

const RING = { id: 'tiny-gardens', slug: 'tiny-gardens', name: 'Tiny Gardens', visibility: 'public' }

/** What the components ask the site for after load */
function answer(url: string, viewerId: string | null): unknown {
  if (url.startsWith('/api/users/pat/badges')) {
    return viewerId === NEW_OWNER ? { badges: [] } : { badges: [{ id: 'b1', title: 'Tiny Gardens', imageUrl: '/badge.png', threadRing: RING }] }
  }
  if (url.startsWith('/api/guestbook/')) {
    if (viewerId === NEW_OWNER) return { entries: [] }
    return { entries: [{ id: 'g1', message: 'Lovely page!', authorId: 'u_sam', authorUsername: 'sam', createdAt: '2026-10-03T12:00:00.000Z' }] }
  }
  if (url.startsWith('/api/mutuals/')) {
    return viewerId === FRIEND ? { count: 1, sample: [{ userId: 'u_sam', handle: 'sam', avatarUrl: '/s.png' }] } : { anon: !viewerId, count: 0, sample: [] }
  }
  if (url.startsWith('/api/rel/')) {
    return { status: viewerId === OWNER_ID ? 'owner' : viewerId === FRIEND ? 'friends' : viewerId ? 'none' : 'anon' }
  }
  return {}
}

const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))

/** The ts-* classes a page draws for this viewer, with its disclosures opened */
async function classesDrawn(source: string, viewerId: string | null): Promise<Set<string>> {
  const a = compileTemplateToArtifacts(source)
  const stored = JSON.parse(JSON.stringify({ mode: 'advanced', staticHTML: a.staticHTML, islands: a.islands, ast: a.ast }))
  const owner = viewerId === OWNER_ID || viewerId === NEW_OWNER
  const compiled = pageForRender(stored, { isOwner: owner })
  const data = richData(viewerId)
  const user = { id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced' as const, cssMode: 'disable' as const, compiledTemplate: compiled } }
  const page = (
    <AppProviders>
      <AdvancedProfileRenderer user={user} residentData={data} />
    </AppProviders>
  )
  const html = renderToString(page)
  const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="root">${html}</div></body></html>`, {
    url: 'http://localhost/resident/pat',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  })
  const leave = enterBrowser(dom)
  ;(globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => answer(String(url), viewerId),
  })
  const found = new Set<string>()
  const collect = (root: Element) => {
    for (const el of root.querySelectorAll('[class]')) {
      for (const name of el.getAttribute('class')!.split(/\s+/)) if (name.startsWith('ts-')) found.add(name)
    }
  }
  try {
    const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client')
    const root = dom.window.document.getElementById('root')!
    const app = hydrateRoot(root, page, { onRecoverableError: () => {} })
    await settle()
    collect(root)
    // Open what opens (RevealBox, MutualFriends), and press Play (Embed)
    for (const button of root.querySelectorAll('[aria-expanded="false"], .ts-embed-button')) (button as HTMLElement).click()
    await settle()
    collect(root)
    app.unmount()
  } finally {
    leave()
    dom.window.close()
  }
  return found
}

let realError: typeof console.error
beforeAll(() => {
  realError = console.error
  console.error = () => {}
})
afterAll(() => {
  console.error = realError
})
beforeEach(() => forgetOwnerRings())

/** Pieces of the site, not of one component */
const SITE_CLASSES = new Set(['ts-island', 'ts-empty'])
/** A variant (ts-embed--youtube) is its part's, not a part of its own */
const isVariant = (name: string) => name.includes('--')

/** Children drawn by their parent (Tab in Tabs) list no parts of their own */
const CHILDREN = new Set(['Tab', 'CarouselImage', 'Radio', 'Option'])

/** A component's example, and more of it where the example leaves parts out */
const MORE: Record<string, string[]> = {
  BlogPosts: ['<BlogPosts heading="Lately" />'],
  Guestbook: ['<Guestbook />'],
  ImageCarousel: ['<ImageCarousel />'],
  RevealBox: ['<RevealBox buttonText="More" buttonStyle="link"><p>Hi</p></RevealBox>'],
  DynamicImage: ['<Var name="nothing" type="string" initial="" />\n<DynamicImage var="nothing" alt="Nothing yet" />'],
}

const docs = buildComponentDocs(componentRegistry.getAllRegistrations())
const drawn = new Map<string, Set<string>>()

beforeAll(async () => {
  for (const doc of docs) {
    const found = new Set<string>()
    for (const source of [doc.example, ...(MORE[doc.name] ?? [])]) {
      for (const viewer of [null, VISITOR, FRIEND, OWNER_ID, NEW_OWNER]) {
        forgetOwnerRings()
        for (const name of await classesDrawn(`<div>${source}</div>`, viewer)) {
          if (!SITE_CLASSES.has(name) && !isVariant(name)) found.add(name)
        }
      }
    }
    drawn.set(doc.name, found)
  }
}, 180000)

const listed = new Set(PARTS.map((part) => part.part))

test('every ts-* class a component draws is a part in the table', () => {
  const unlisted = [...drawn].flatMap(([name, classes]) => [...classes].filter((c) => !listed.has(c)).map((c) => `${name}: ${c}`))
  expect(unlisted).toEqual([])
})

test.each(docs.filter((doc: ComponentDoc) => PARTS.some((part) => part.component === doc.name)).map((doc) => doc.name))(
  "%s draws every part the table lists for it",
  (name) => {
    const parts = new Set(PARTS.filter((part) => part.component === name).map((part) => part.part))
    expect([...parts].filter((part) => !drawn.get(name)!.has(part))).toEqual([])
  }
)

test('every component in the table is a component in the reference', () => {
  const names = new Set(docs.map((doc) => doc.name))
  expect([...new Set(PARTS.map((part) => part.component))].filter((name) => !names.has(name) && name !== 'Notes only you see')).toEqual([])
})

test("the notes only the owner sees are drawn, by a page that has nothing yet", () => {
  expect([...drawn.values()].some((classes) => classes.has('ts-owner-note'))).toBe(true)
})

test.each(Object.entries(DRAWS_ALSO))('%s draws the parts of the components the reference says it has', (name, others) => {
  const missing = others.filter((other) => !PARTS.some((part) => part.component === other && drawn.get(name)!.has(part.part)))
  expect(missing).toEqual([])
})

test('children list no parts of their own', () => {
  expect(PARTS.filter((part) => CHILDREN.has(part.component))).toEqual([])
})
