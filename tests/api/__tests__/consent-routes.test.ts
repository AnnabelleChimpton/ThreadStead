/**
 * /api/consent/manage and /api/consent/withdraw act only on the session
 * user's own consent records. They used to be auth: 'none' and read the user
 * from ?userId, so anyone could read or rewrite anyone's consent by id.
 *
 * The real CSRF check runs here (not mocked), so writes without a matching
 * cookie + header are refused.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => {
  const tx = {
    userConsent: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    consentLog: { create: jest.fn().mockResolvedValue({}) },
  }
  return {
    db: {
      __tx: tx,
      userConsent: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  }
})
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))

import manage from '@/pages/api/consent/manage'
import withdraw from '@/pages/api/consent/withdraw'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'

const mockDb = db as any
const tx = mockDb.__tx

const CSRF = 'test-csrf-token'

function makeReqRes(opts: {
  method?: string
  query?: Record<string, string>
  body?: unknown
  csrf?: boolean
}) {
  const { method = 'GET', query = {}, body, csrf = true } = opts
  const req = {
    method,
    query,
    body,
    url: '/api/consent',
    headers: csrf ? { cookie: `csrf_token=${CSRF}`, 'x-csrf-token': CSRF } : {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.jsonBody = payload
      return this
    },
    setHeader: jest.fn(),
  }
  return { req, res: res as NextApiResponse & { statusCode: number; jsonBody: any } }
}

const ME = { id: 'user-me', role: 'member' }
const SAVE_BODY = { consents: [{ type: 'ESSENTIAL', granted: true }] }

/** Every write the routes can make, so "touched nothing" is one assertion. */
function writeCalls() {
  return [tx.userConsent.upsert, tx.consentLog.create, mockDb.$transaction].reduce(
    (n, fn) => n + fn.mock.calls.length,
    0
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getSessionUser as jest.Mock).mockResolvedValue(ME)
})

describe('GET /api/consent/manage', () => {
  test('reads the session user’s own consents', async () => {
    const { req, res } = makeReqRes({ method: 'GET' })
    await manage(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.jsonBody.success).toBe(true)
    expect(mockDb.userConsent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ME.id } })
    )
  })

  test('?userId of another user is refused', async () => {
    const { req, res } = makeReqRes({ method: 'GET', query: { userId: 'someone-else' } })
    await manage(req, res)
    expect(res.statusCode).toBe(403)
    expect(mockDb.userConsent.findMany).not.toHaveBeenCalled()
  })

  test('?userId matching the session user is still fine', async () => {
    const { req, res } = makeReqRes({ method: 'GET', query: { userId: ME.id } })
    await manage(req, res)
    expect(res.statusCode).toBe(200)
  })

  test('signed-out visitor gets 401 and no records', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes({ method: 'GET', query: { userId: ME.id } })
    await manage(req, res)
    expect(res.statusCode).toBe(401)
    expect(mockDb.userConsent.findMany).not.toHaveBeenCalled()
  })
})

describe('POST /api/consent/manage', () => {
  test('saves to the session user’s own record', async () => {
    const { req, res } = makeReqRes({ method: 'POST', body: SAVE_BODY })
    await manage(req, res)
    expect(res.statusCode).toBe(200)
    expect(tx.userConsent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type: { userId: ME.id, type: 'ESSENTIAL' } },
        create: expect.objectContaining({ userId: ME.id }),
      })
    )
    expect(tx.consentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: ME.id }) })
    )
  })

  test('?userId of another user is refused before any write', async () => {
    const { req, res } = makeReqRes({
      method: 'POST',
      query: { userId: 'someone-else' },
      body: SAVE_BODY,
    })
    await manage(req, res)
    expect(res.statusCode).toBe(403)
    expect(writeCalls()).toBe(0)
  })

  test('CSRF token is required', async () => {
    const { req, res } = makeReqRes({ method: 'POST', body: SAVE_BODY, csrf: false })
    await manage(req, res)
    expect(res.statusCode).toBe(403)
    expect(writeCalls()).toBe(0)
  })

  test('signed-out visitor cannot write by id', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes({ method: 'POST', query: { userId: ME.id }, body: SAVE_BODY })
    await manage(req, res)
    expect(res.statusCode).toBe(401)
    expect(writeCalls()).toBe(0)
  })
})

describe('POST /api/consent/withdraw', () => {
  test('withdraws the session user’s own non-essential consents', async () => {
    const { req, res } = makeReqRes({ method: 'POST', body: {} })
    await withdraw(req, res)
    expect(res.statusCode).toBe(200)
    expect(tx.userConsent.upsert).toHaveBeenCalled()
    for (const [args] of tx.userConsent.upsert.mock.calls) {
      expect(args.where.userId_type.userId).toBe(ME.id)
      expect(args.where.userId_type.type).not.toBe('ESSENTIAL')
    }
  })

  test('?userId of another user is refused before any write', async () => {
    const { req, res } = makeReqRes({ method: 'POST', query: { userId: 'someone-else' }, body: {} })
    await withdraw(req, res)
    expect(res.statusCode).toBe(403)
    expect(writeCalls()).toBe(0)
  })

  test('CSRF token is required', async () => {
    const { req, res } = makeReqRes({ method: 'POST', body: {}, csrf: false })
    await withdraw(req, res)
    expect(res.statusCode).toBe(403)
    expect(writeCalls()).toBe(0)
  })

  test('signed-out visitor gets 401', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes({ method: 'POST', query: { userId: ME.id }, body: {} })
    await withdraw(req, res)
    expect(res.statusCode).toBe(401)
    expect(writeCalls()).toBe(0)
  })
})
