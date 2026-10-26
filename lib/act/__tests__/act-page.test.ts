/**
 * @jest-environment node
 *
 * The action pages' server side: the way back is the person's own address,
 * worked out from their label (never from the request), a pop-up only when
 * they have one, and nothing about who's signed in gets cached.
 */
import type { GetServerSidePropsContext } from 'next'

const findFirst = jest.fn()
jest.mock('@/lib/config/database/connection', () => ({ db: { handle: { findFirst: (...a: unknown[]) => findFirst(...a) } } }))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'pat-1', primaryHandle: 'pat@HomePageAgain' })) }))
jest.mock('@/lib/domain/users/profile-access', () => ({ residentAccess: jest.fn(async () => ({ visible: true })) }))
jest.mock('@/lib/subdomains/host', () => ({ residentSiteUrl: (label: string | null) => (label ? `https://${label}.homepageagain.com/` : null) }))

import { loadActPage } from '../act-page'

function context(query: Record<string, string> = {}) {
  const setHeader = jest.fn()
  return { ctx: { params: { username: 'alice' }, query, req: { headers: {} }, res: { setHeader } } as unknown as GetServerSidePropsContext, setHeader }
}

const alice = (label: string | null) => ({ handle: 'alice', user: { id: 'alice-1', subdomainLabel: label, profile: { displayName: 'Alice', avatarUrl: null } } })

test('back to their own address; a pop-up when asked; not cached', async () => {
  findFirst.mockResolvedValue(alice('alice'))
  const { ctx, setHeader } = context({ via: 'popup', next: 'https://evil.example' })
  const result = await loadActPage(ctx)
  expect(result).toEqual({ props: {
    target: { id: 'alice-1', username: 'alice', name: 'Alice', avatarUrl: null },
    viewer: { id: 'pat-1', username: 'pat' },
    backUrl: 'https://alice.homepageagain.com/',
    popup: true,
    canSee: true,
  } })
  expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
})

test('without an address of their own: back to their page here, and never a pop-up finish', async () => {
  findFirst.mockResolvedValue(alice(null))
  const result = await loadActPage(context({ via: 'popup' }).ctx)
  expect(result).toMatchObject({ props: { backUrl: '/resident/alice', popup: false } })
})

test('nobody by that name: not found', async () => {
  findFirst.mockResolvedValue(null)
  expect(await loadActPage(context().ctx)).toEqual({ notFound: true })
})
