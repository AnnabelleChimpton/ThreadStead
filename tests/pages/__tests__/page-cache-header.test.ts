/**
 * Which resident pages nginx may keep for the next signed-out visitor
 * (X-Accel-Expires, design/template-audit/perf/CACHE_STEPS.md): only a
 * public profile asked for with no session cookie at all. Everything a
 * signed-in, owner, blocked or private view could show stays uncached.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: { findFirst: jest.fn() },
    siteConfig: { findUnique: jest.fn(async () => null) },
    media: { findUnique: jest.fn(async () => null) },
    profile: { findUnique: jest.fn(async () => null) },
  },
}))
jest.mock('@/lib/domain/users/profile-access', () => ({ residentAccess: jest.fn(), hasPixelHome: jest.fn(async () => false) }))
jest.mock('@/lib/domain/bluesky/handle-links', () => ({ verifiedBlueskyHandle: jest.fn(async () => null) }))
jest.mock('@/lib/share-images/server', () => ({ residentShareImage: async () => null }))
jest.mock('@/lib/auth/server', () => ({
  ...jest.requireActual('@/lib/auth/server'),
  getSessionUser: jest.fn(async (req: { headers: { cookie?: string } }) => (/retro_session=u_owner/.test(req.headers.cookie ?? '') ? { id: 'u_owner' } : null)),
}))

import type { GetServerSidePropsContext } from 'next'
import { db } from '@/lib/config/database/connection'
import { residentAccess } from '@/lib/domain/users/profile-access'
import { getServerSideProps } from '@/pages/resident/[username]/index'

function row(visibility: string) {
  ;(db.handle.findFirst as jest.Mock).mockResolvedValue({
    user: {
      id: 'u_owner', did: 'did:x', primaryHandle: 'pat@local', subdomainLabel: 'pat', installs: [],
      profile: { visibility, templateMode: 'default', customTemplate: null, compiledTemplate: null, pageArtifact: null, widgetSlot: null, profileMidiId: null },
    },
  })
}

async function cacheHeader(cookie: string | undefined, extra: Record<string, string> = {}) {
  const setHeader = jest.fn()
  const result = await getServerSideProps({
    params: { username: 'pat' },
    query: {},
    req: { headers: { ...(cookie !== undefined && { cookie }), ...extra } },
    res: { setHeader },
  } as unknown as GetServerSidePropsContext)
  const call = setHeader.mock.calls.find(([name]) => name === 'X-Accel-Expires')
  return { header: call?.[1] ?? null, result }
}

beforeEach(() => {
  ;(residentAccess as jest.Mock).mockResolvedValue({ visible: true })
})

test('a signed-out visitor to a public profile: cacheable, for 10 seconds', async () => {
  row('public')
  expect((await cacheHeader(undefined)).header).toBe('10')
  // Other cookies are no one's in particular
  expect((await cacheHeader('csrf_token=abc; theme=dark')).header).toBe('10')
  // A client-side navigation's JSON is the same for anyone too
  expect((await cacheHeader(undefined, { 'x-nextjs-data': '1' })).header).toBe('10')
})

test.each([
  ['the owner', 'retro_session=u_owner.secret'],
  ['someone signed in', '__Host-retro_session=u_sam.secret'],
  ['an expired or bad session', 'retro_session=nonsense'],
  ['an empty session cookie', 'retro_session='],
  ['a session among other cookies', 'csrf_token=abc; __Host-retro_session=u_sam.secret'],
])('%s: never cached', async (_who, cookie) => {
  row('public')
  expect((await cacheHeader(cookie)).header).toBeNull()
})

test.each(['followers', 'friends', 'private'])('a %s profile: never cached, even signed out', async (visibility) => {
  row(visibility)
  ;(residentAccess as jest.Mock).mockResolvedValue({ visible: false, visibility, blocked: false })
  expect((await cacheHeader(undefined)).header).toBeNull()
})

test('a public profile the viewer may not see (a block reads as private): never cached', async () => {
  row('public')
  ;(residentAccess as jest.Mock).mockResolvedValue({ visible: false, visibility: 'private', blocked: true })
  expect((await cacheHeader(undefined)).header).toBeNull()
})

test('no such resident, or a suspended one: a 404, never cached', async () => {
  ;(db.handle.findFirst as jest.Mock).mockResolvedValue(null)
  const missing = await cacheHeader(undefined)
  expect(missing.result).toEqual({ notFound: true })
  expect(missing.header).toBeNull()
  row('public')
  ;(residentAccess as jest.Mock).mockResolvedValue({ visible: false, visibility: 'private', blocked: false, suspended: true })
  const suspended = await cacheHeader(undefined)
  expect(suspended.result).toEqual({ notFound: true })
  expect(suspended.header).toBeNull()
})
