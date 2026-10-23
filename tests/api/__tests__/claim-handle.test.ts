/**
 * @jest-environment node
 *
 * /api/account/claim-handle: one handle per account. A second claim used to
 * add another Handle row and move primaryHandle, so one account could squat
 * any number of names (and, with home subdomains, addresses).
 *
 * The real CSRF and same-origin checks run here.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => {
  const tx = {
    user: { updateMany: jest.fn() },
    handle: { create: jest.fn().mockResolvedValue({}) },
    profile: { findUnique: jest.fn().mockResolvedValue({ id: 'p' }), create: jest.fn() },
    pluginInstall: { findFirst: jest.fn().mockResolvedValue({ id: 'hello' }), create: jest.fn() },
  }
  return {
    db: {
      __tx: tx,
      handle: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  }
})
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/domain/users/handle-availability', () => ({
  ...jest.requireActual('@/lib/domain/users/handle-availability'),
  handleUnavailableReason: jest.fn(),
}))

import claimHandle from '@/pages/api/account/claim-handle'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { Prisma } from '@prisma/client'
import { handleUnavailableReason } from '@/lib/domain/users/handle-availability'

const mockDb = db as any
const tx = mockDb.__tx
const mockSession = getSessionUser as jest.Mock
const mockUnavailable = handleUnavailableReason as jest.Mock

const CSRF = 'tok'

async function claim(handle: string, headers: Record<string, string> = {}) {
  const req = {
    method: 'POST',
    url: '/api/account/claim-handle',
    query: {},
    body: { handle },
    headers: { cookie: `csrf_token=${CSRF}`, 'x-csrf-token': CSRF, 'sec-fetch-site': 'same-origin', ...headers },
  } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      this.headersSent = true
      return this
    },
    setHeader() {
      return this
    },
  }
  await claimHandle(req, res as NextApiResponse)
  return res as { statusCode: number; body: any }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue({ id: 'u1', primaryHandle: null })
  mockDb.handle.findFirst.mockResolvedValue(null)
  tx.user.updateMany.mockResolvedValue({ count: 1 })
  mockUnavailable.mockResolvedValue(null)
})

test('a new account claims its first handle', async () => {
  const res = await claim('alice')
  expect(res.statusCode).toBe(201)
  expect(tx.user.updateMany).toHaveBeenCalledWith({
    where: { id: 'u1', primaryHandle: null },
    data: { primaryHandle: expect.stringMatching(/^alice@/), subdomainLabel: 'alice' },
  })
  expect(tx.handle.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'u1', handle: 'alice' }) })
})

test('an account with a primary handle gets a 409 and nothing changes', async () => {
  mockSession.mockResolvedValue({ id: 'u1', primaryHandle: 'alice@homepageagain.com' })
  const res = await claim('alice2')
  expect(res.statusCode).toBe(409)
  expect(res.body).toEqual({ error: 'You already have a username.' })
  expect(mockDb.$transaction).not.toHaveBeenCalled()
})

test('a Handle row counts even if primaryHandle was never set', async () => {
  mockDb.handle.findFirst.mockImplementation(async ({ where }: any) => (where.userId === 'u1' ? { id: 'h1' } : null))
  const res = await claim('alice2')
  expect(res.statusCode).toBe(409)
  expect(tx.handle.create).not.toHaveBeenCalled()
})

test('two claims racing: the one that loses the row lock makes no Handle', async () => {
  tx.user.updateMany.mockResolvedValue({ count: 0 })
  const res = await claim('alice2')
  expect(res.statusCode).toBe(409)
  expect(res.body).toEqual({ error: 'You already have a username.' })
  expect(tx.handle.create).not.toHaveBeenCalled()
})

test("a name someone else has is still 'taken'", async () => {
  mockUnavailable.mockImplementation(async (h: string) => (h === 'bob' ? 'taken' : null))
  const res = await claim('bob')
  expect(res.statusCode).toBe(409)
  expect(res.body).toEqual({ error: 'Username is already taken' })
  expect(mockDb.$transaction).not.toHaveBeenCalled()
})

test('an underscore name gets the hyphen address', async () => {
  expect((await claim('a_b')).statusCode).toBe(201)
  expect(tx.user.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ subdomainLabel: 'a-b' }) })
  )
})

test("the other spelling (a-b when a_b exists) and a tombstoned name are refused", async () => {
  mockUnavailable.mockResolvedValueOnce('same-address')
  expect(await claim('a-b')).toMatchObject({ statusCode: 409, body: { error: expect.stringContaining('- and _') } })
  mockUnavailable.mockResolvedValueOnce('held')
  expect(await claim('gone')).toMatchObject({ statusCode: 409, body: { error: "That username isn't available" } })
  expect(mockDb.$transaction).not.toHaveBeenCalled()
})

test('a_b and a-b claimed at once: the unique label refuses the second', async () => {
  tx.user.updateMany.mockRejectedValueOnce(
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['subdomainLabel'] },
    })
  )
  const res = await claim('a-b')
  expect(res.statusCode).toBe(409)
  expect(res.body.error).toContain('- and _')
})

test('needs the CSRF token now (signup has the cookie from /api/auth/verify)', async () => {
  const res = await claim('alice', { cookie: '', 'x-csrf-token': '' })
  expect(res.statusCode).toBe(403)
})

test('refuses a claim posted from a resident subdomain', async () => {
  const res = await claim('alice', { 'sec-fetch-site': 'same-site' })
  expect(res.statusCode).toBe(403)
  expect(tx.handle.create).not.toHaveBeenCalled()
})
