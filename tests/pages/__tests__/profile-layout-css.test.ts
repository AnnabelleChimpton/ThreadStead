/**
 * A profile page is two choices, layout and site styles
 * (lib/domain/profile/layout.ts). What the profile page and its post pages
 * send, read from the stored fields:
 *
 * - Both standard modes ('default' and 'enhanced') send the resident's own
 *   CSS when they have some, else the admin's default profile CSS. 'default'
 *   used to always send the admin default and ignore their CSS.
 * - templateEnabled no longer decides anything: an 'advanced' page renders
 *   its own HTML whatever it says.
 * - The cssMode field alone decides site styles; an old mode comment in the
 *   CSS doesn't, and no includeSiteCSS prop goes out.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: { findFirst: jest.fn() },
    siteConfig: { findUnique: jest.fn(async () => ({ value: '.ts-profile-header { color: teal; }' })) },
    media: { findUnique: jest.fn(async () => null) },
  },
}))
jest.mock('@/lib/domain/users/profile-access', () => ({
  residentAccess: jest.fn(async () => ({ visible: true })),
  hasPixelHome: jest.fn(async () => false),
}))
jest.mock('@/lib/domain/bluesky/handle-links', () => ({ verifiedBlueskyHandle: jest.fn(async () => null) }))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => null) }))
jest.mock('@/lib/utils/css/site-css-server', () => ({ getSiteCSS: jest.fn(async () => '') }))
jest.mock('@/lib/utils/data/fetchers', () => ({
  getPostsForUser: jest.fn(async () => ({ posts: [] })),
  getGuestbookForUser: jest.fn(async () => ({ entries: [] })),
  getPhotosForUser: jest.fn(async () => ({ media: [] })),
}))

import type { GetServerSidePropsContext } from 'next'
import { db } from '@/lib/config/database/connection'
import { getServerSideProps as profilePageProps } from '@/pages/resident/[username]/index'
import { getServerSideProps as postPageProps } from '@/pages/resident/[username]/post/[postId]'
import { readServerOnly } from '@/lib/utils/server-only'
import { advancedPageCss } from '@/lib/templates/rendering/page-css'

const ADMIN_CSS = '.ts-profile-header { color: teal; }'
const OWN_CSS = 'body { background: plum; }'

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response

/**
 * The stored row the profile page's loader reads (lib/domain/profile/load-resident-page.ts),
 * and what /api/profile answers the post page with. A page of your own HTML
 * with no compiled copy is compiled from its source, as an old row is.
 */
function serve(profile: Record<string, unknown>) {
  const row = { visibility: 'public', templateMode: 'default', customTemplate: '<h1>My own page</h1>', compiledTemplate: null, widgetSlot: null, profileMidiId: null, ...profile }
  ;(db.handle.findFirst as jest.Mock).mockResolvedValue({
    user: { id: 'u_pigeon', did: 'did:key:pigeon', primaryHandle: 'pigeon@local', subdomainLabel: 'pigeon', installs: [], profile: row },
  })
  global.fetch = jest.fn(async (url: string) => {
    if (url.includes('/api/site-config')) return json(200, { config: { default_profile_css: ADMIN_CSS } })
    if (url.includes('/api/posts/single/')) {
      return json(200, { post: { id: 'p1', author: { primaryHandle: 'pigeon@local', profile: { displayName: 'Pigeon' } } } })
    }
    return json(200, { userId: 'u_pigeon', username: 'pigeon', profile })
  }) as typeof fetch
}

const ctx = (params: Record<string, string>) =>
  ({ params, query: {}, req: { headers: {} } }) as unknown as GetServerSidePropsContext

/** The props a page's getServerSideProps returned */
function propsOf(result: unknown): Record<string, unknown> {
  return (result as { props: Record<string, unknown> }).props
}

async function profileProps(profile: Record<string, unknown>) {
  serve(profile)
  return propsOf(await profilePageProps(ctx({ username: 'pigeon' })))
}

async function postProps(profile: Record<string, unknown>) {
  serve(profile)
  return propsOf(await postPageProps(ctx({ username: 'pigeon', postId: 'p1' })))
}

describe('the CSS a profile page sends', () => {
  test("a 'default' page with saved CSS sends that CSS", async () => {
    const props = await profileProps({ templateMode: 'default', cssMode: 'inherit', customCSS: OWN_CSS })
    expect(props.customCSS).toBe(OWN_CSS)
  })

  test("a 'default' page with no CSS sends the admin default", async () => {
    expect((await profileProps({ templateMode: 'default', cssMode: 'inherit', customCSS: '' })).customCSS).toBe(ADMIN_CSS)
    expect((await profileProps({ templateMode: 'default', cssMode: 'inherit' })).customCSS).toBe(ADMIN_CSS)
  })

  test("'enhanced' is unchanged: own CSS, else the admin default", async () => {
    expect((await profileProps({ templateMode: 'enhanced', cssMode: 'inherit', customCSS: OWN_CSS })).customCSS).toBe(OWN_CSS)
    expect((await profileProps({ templateMode: 'enhanced', cssMode: 'disable', customCSS: '' })).customCSS).toBe(ADMIN_CSS)
  })

  test('a profile with no templateMode at all is the standard layout', async () => {
    expect((await profileProps({ customCSS: OWN_CSS })).customCSS).toBe(OWN_CSS)
  })

  test("a post page sends the same CSS as its author's profile page", async () => {
    expect((await postProps({ templateMode: 'default', customCSS: OWN_CSS })).customCSS).toBe(OWN_CSS)
    expect((await postProps({ templateMode: 'default', customCSS: '' })).customCSS).toBe(ADMIN_CSS)
    expect((await postProps({ templateMode: 'advanced', customCSS: OWN_CSS })).customCSS).toBe(OWN_CSS)
  })
})

describe('your own HTML page', () => {
  test.each([true, false, undefined])('renders whatever templateEnabled says (%s)', async (templateEnabled) => {
    const props = await profileProps({
      templateMode: 'advanced',
      templateEnabled,
      cssMode: 'disable',
      hideNavigation: true,
      customCSS: OWN_CSS,
      compiledTemplate: null,
    })
    expect(props.templateMode).toBe('advanced')
    expect(props.residentData).toBeDefined()
    expect(props.compiledTemplate).toBeDefined()
    // Its CSS goes once, transformed, for the server render only (not in the page data)
    expect(props).not.toHaveProperty('customCSS')
    expect(JSON.stringify(props)).not.toContain('plum')
    expect(readServerOnly(props, 'advanced-template-css')).toBe(advancedPageCss(OWN_CSS, props.compiledTemplate))
    expect(props.cssMode).toBe('disable')
    expect(props.hideNavigation).toBe(true)
  })
})

describe('site styles', () => {
  test('cssMode alone decides; no includeSiteCSS goes out', async () => {
    const off = await profileProps({ templateMode: 'enhanced', cssMode: 'disable', includeSiteCSS: true })
    expect(off.cssMode).toBe('disable')
    expect(off).not.toHaveProperty('includeSiteCSS')

    const on = await profileProps({ templateMode: 'enhanced', cssMode: 'inherit', includeSiteCSS: false })
    expect(on.cssMode).toBe('inherit')
    expect(on).not.toHaveProperty('includeSiteCSS')
  })

  test('an old mode comment in the CSS no longer sets the mode', async () => {
    const props = await profileProps({ templateMode: 'enhanced', cssMode: 'inherit', customCSS: `/* CSS_MODE:disable */\n${OWN_CSS}` })
    expect(props.cssMode).toBe('inherit')
  })

  test('the post page sends no includeSiteCSS either', async () => {
    const props = await postProps({ templateMode: 'enhanced', cssMode: 'disable', includeSiteCSS: false })
    expect(props).not.toHaveProperty('includeSiteCSS')
  })
})

test('a client-side navigation gets the page CSS as a prop, since it arrives as JSON', async () => {
  serve({ templateMode: 'advanced', cssMode: 'disable', customCSS: OWN_CSS })
  const props = propsOf(await profilePageProps({ params: { username: 'pigeon' }, query: {}, req: { headers: { 'x-nextjs-data': '1' } } } as unknown as GetServerSidePropsContext))
  expect(props.pageCss).toBe(advancedPageCss(OWN_CSS, props.compiledTemplate))
})
