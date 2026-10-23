/**
 * A signed GET with no query must sign and fetch the same path. fetch drops a
 * bare trailing `?`, so a path built as `/feed?` was signed with the `?` and
 * fetched without it, and the hub (which now checks signatures on feed reads)
 * refused it.
 */
import { RingHubClient } from '@/lib/api/ringhub/ringhub-client'

function client() {
  const c = new RingHubClient({ baseUrl: 'https://hub.test', instanceDID: 'did:web:site.test', privateKeyBase64Url: Buffer.alloc(32, 7).toString('base64url'), publicKeyMultibase: 'z' })
  const signed: string[] = []
  jest.spyOn(c as any, 'generateHttpSignature').mockImplementation(async (...args: unknown[]) => {
    signed.push(args[1] as string)
    return 'sig'
  })
  return { c, signed }
}

const fetched: string[] = []
beforeEach(() => {
  fetched.length = 0
  global.fetch = jest.fn(async (url: any) => {
    fetched.push(String(url))
    return new Response(JSON.stringify({ posts: [], total: 0, rings: [], limit: 20, offset: 0, hasMore: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as any
})

it('signs and fetches a feed read with no options at the same path', async () => {
  const { c, signed } = client()
  await c.getRingFeed('knits').catch(() => undefined)
  expect(signed).toEqual(['/trp/rings/knits/feed'])
  expect(fetched).toEqual(['https://hub.test/trp/rings/knits/feed'])
})

it('keeps the query when there is one', async () => {
  const { c, signed } = client()
  await c.getRingFeed('knits', { limit: 50 }).catch(() => undefined)
  expect(signed).toEqual(['/trp/rings/knits/feed?limit=50'])
  await c.listRings().catch(() => undefined)
  expect(signed[1]).toBe('/trp/rings')
})
