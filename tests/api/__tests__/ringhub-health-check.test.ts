/**
 * @jest-environment node
 *
 * /api/ringhub/health-check stays public for deploy.sh (it reads
 * "authenticated":true), but is one check every 30 seconds for everyone:
 * each check is 3 hub calls, one signed as this site, and anyone could ask
 * as often as they liked. ?benchmark=true (3 more) is for an admin only.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/api/ringhub/ringhub-test-utils', () => ({
  checkRingHubHealth: jest.fn(async () => ({ ring_hub_available: true, response_time: 12, authenticated: true })),
  validateRingHubConfig: jest.fn(() => ({ valid: true, missing: [], warnings: [] })),
  benchmarkRingHubPerformance: jest.fn(async () => ({ operations: [], summary: {} })),
}))

import handler from '@/pages/api/ringhub/health-check'
import { getSessionUser } from '@/lib/auth/server'
import { checkRingHubHealth, benchmarkRingHubPerformance } from '@/lib/api/ringhub/ringhub-test-utils'

async function call(query: Record<string, string> = {}) {
  const req = { method: 'GET', query, headers: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(b: any) { this.body = b; return this },
    setHeader() {},
  }
  await handler(req, res as NextApiResponse)
  return res
}

let now = Date.now()
beforeEach(() => {
  jest.clearAllMocks()
  // Each test starts past the last one's 30 seconds
  now += 60_000
  jest.spyOn(Date, 'now').mockImplementation(() => now)
  ;(getSessionUser as jest.Mock).mockResolvedValue(null)
})

test("deploy.sh's read: public, and says it's authenticated", async () => {
  const res = await call()
  expect(res.statusCode).toBe(200)
  expect(JSON.stringify(res.body)).toContain('"authenticated":true')
})

test('many asks within 30 seconds, even at once, are one check', async () => {
  await Promise.all([call(), call(), call()])
  now += 29_000
  await call()
  expect(checkRingHubHealth).toHaveBeenCalledTimes(1)
  now += 2_000
  await call()
  expect(checkRingHubHealth).toHaveBeenCalledTimes(2)
})

test('the benchmark runs for an admin only', async () => {
  expect((await call({ benchmark: 'true' })).body.benchmark).toBeUndefined()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'm', role: 'member' })
  expect((await call({ benchmark: 'true' })).body.benchmark).toBeUndefined()
  expect(benchmarkRingHubPerformance).not.toHaveBeenCalled()
  ;(getSessionUser as jest.Mock).mockResolvedValue({ id: 'a', role: 'admin' })
  expect((await call({ benchmark: 'true' })).body.benchmark).toEqual({ operations: [], summary: {} })
})
