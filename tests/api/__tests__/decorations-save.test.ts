/**
 * Contract tests for POST /api/home/decorations/save with a mocked db —
 * pinning the fixes from the pixel-homes audit:
 *  - the delete+create replacement MUST run inside a $transaction (the old
 *    two-statement version wiped decorations when the second step failed)
 *  - validation: auth, array shape, 100-decoration cap
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userHomeConfig: { upsert: jest.fn().mockResolvedValue({}) },
    userHomeDecoration: {
      deleteMany: jest.fn((args: any) => ({ __op: 'deleteMany', args })),
      createMany: jest.fn((args: any) => ({ __op: 'createMany', args })),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))

import handler from '@/pages/api/home/decorations/save'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'

const mockDb = db as any

function makeReqRes(body: any, method = 'POST') {
  const req = { method, body } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    jsonBody: undefined,
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

const VALID_DECORATION = {
  decorationType: 'plant',
  decorationId: 'roses_red',
  zone: 'front_yard',
  positionX: 10,
  positionY: 20,
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'user-1' })
})

describe('auth and validation', () => {
  test('401 when not logged in', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const { req, res } = makeReqRes({ decorations: [] })
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  test('400 when decorations is not an array', async () => {
    const { req, res } = makeReqRes({ decorations: 'nope' })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  test('400 past the 100-decoration cap', async () => {
    const { req, res } = makeReqRes({
      decorations: Array.from({ length: 101 }, () => VALID_DECORATION),
    })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })
})

describe('atomic replacement (the decoration-wipe fix)', () => {
  test('delete + create run inside a single $transaction', async () => {
    const { req, res } = makeReqRes({ decorations: [VALID_DECORATION] })
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    const ops = mockDb.$transaction.mock.calls[0][0]
    expect(ops.map((o: any) => o.__op)).toEqual(['deleteMany', 'createMany'])
    // createMany received the mapped decoration for the right user
    expect(ops[1].args.data[0]).toMatchObject({
      userId: 'user-1',
      decorationId: 'roses_red',
      zone: 'front_yard',
    })
  })

  test('empty decoration list still clears atomically (delete only)', async () => {
    const { req, res } = makeReqRes({ decorations: [] })
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    const ops = mockDb.$transaction.mock.calls[0][0]
    expect(ops.map((o: any) => o.__op)).toEqual(['deleteMany'])
  })

  test('a transaction failure surfaces as 500, not silent success', async () => {
    mockDb.$transaction.mockRejectedValueOnce(new Error('db down'))
    const { req, res } = makeReqRes({ decorations: [VALID_DECORATION] })
    await handler(req, res)
    expect(res.statusCode).toBe(500)
  })
})
