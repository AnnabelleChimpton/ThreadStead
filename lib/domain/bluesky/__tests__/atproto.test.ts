/**
 * @jest-environment node
 *
 * The outside lookups for Bluesky handles, with a fake fetcher: what a
 * resident may paste, and how Bluesky's and plc.directory's answers read.
 */
import { lookupBlueskyAccount, parseBlueskyInput, plcHandle, type Fetcher } from '@/lib/domain/bluesky/atproto'

const DID = 'did:plc:ewvi7nxzyoun6zhxrhs64oiz'

function fetcherFor(routes: Record<string, { status?: number; body?: unknown } | Error>) {
  const calls: string[] = []
  const fetcher: Fetcher = async (url) => {
    calls.push(url)
    const route = routes[url]
    if (route instanceof Error) throw route
    if (!route) return new Response('nope', { status: 404 })
    return new Response(JSON.stringify(route.body ?? {}), { status: route.status ?? 200 })
  }
  return { fetcher, calls }
}

describe('parseBlueskyInput', () => {
  test('handles, with or without @, at:// or a bsky.app link', () => {
    for (const raw of ['alice.bsky.social', '@Alice.bsky.social', ' at://alice.bsky.social ', 'https://bsky.app/profile/alice.bsky.social']) {
      expect(parseBlueskyInput(raw)).toEqual({ kind: 'handle', handle: 'alice.bsky.social' })
    }
  })

  test('did:plc, also from a profile link', () => {
    expect(parseBlueskyInput(DID)).toEqual({ kind: 'did', did: DID })
    expect(parseBlueskyInput(`bsky.app/profile/${DID}`)).toEqual({ kind: 'did', did: DID })
  })

  test('did:web, malformed DIDs and non-handles are refused before any request', () => {
    expect(parseBlueskyInput('did:web:example.com')).toMatchObject({ kind: 'invalid', message: expect.stringContaining('did:plc') })
    expect(parseBlueskyInput('did:plc:short')).toMatchObject({ kind: 'invalid' })
    for (const raw of ['', '   ', 'alice', 'http://evil.example/x', 'a b.com', 'alice.123', null, 42]) {
      expect(parseBlueskyInput(raw)).toMatchObject({ kind: 'invalid' })
    }
  })
})

describe('lookupBlueskyAccount', () => {
  const url = (actor: string) => `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`

  test('asks the public Bluesky API, never a host from the input', async () => {
    const { fetcher, calls } = fetcherFor({
      [url('alice.bsky.social')]: { body: { did: DID, handle: 'Alice.bsky.social', displayName: ' Alice ', avatar: 'https://cdn.bsky.app/a.jpg' } },
    })
    await expect(lookupBlueskyAccount({ kind: 'handle', handle: 'alice.bsky.social' }, fetcher)).resolves.toEqual({
      did: DID,
      handle: 'alice.bsky.social',
      displayName: 'Alice',
      avatar: 'https://cdn.bsky.app/a.jpg',
    })
    expect(calls).toEqual([url('alice.bsky.social')])
  })

  test('an unknown account is a 404, Bluesky down is a 502', async () => {
    const missing = fetcherFor({ [url('nobody.bsky.social')]: { status: 400, body: { error: 'InvalidRequest' } } })
    await expect(lookupBlueskyAccount({ kind: 'handle', handle: 'nobody.bsky.social' }, missing.fetcher)).rejects.toMatchObject({ status: 404 })
    const down = fetcherFor({ [url(DID)]: new Error('timeout') })
    await expect(lookupBlueskyAccount({ kind: 'did', did: DID }, down.fetcher)).rejects.toMatchObject({ status: 502 })
    const broken = fetcherFor({ [url(DID)]: { status: 500 } })
    await expect(lookupBlueskyAccount({ kind: 'did', did: DID }, broken.fetcher)).rejects.toMatchObject({ status: 502 })
  })

  test('a handle that belongs to a did:web account is refused', async () => {
    const { fetcher } = fetcherFor({ [url('web.example.com')]: { body: { did: 'did:web:web.example.com', handle: 'web.example.com' } } })
    await expect(lookupBlueskyAccount({ kind: 'handle', handle: 'web.example.com' }, fetcher)).rejects.toMatchObject({ status: 400 })
  })
})

describe('plcHandle', () => {
  const doc = (aliases: unknown) => ({ [`https://plc.directory/${DID}`]: { body: { id: DID, alsoKnownAs: aliases } } })

  test('the first at:// alias is the handle', async () => {
    const { fetcher } = fetcherFor(doc(['https://example.com', 'at://Alice.HomePageAgain.com', 'at://old.bsky.social']))
    await expect(plcHandle(DID, fetcher)).resolves.toEqual({ ok: true, handle: 'alice.homepageagain.com' })
  })

  test('no alias is no handle; an unreachable directory is not "changed"', async () => {
    await expect(plcHandle(DID, fetcherFor(doc([])).fetcher)).resolves.toEqual({ ok: true, handle: null })
    await expect(plcHandle(DID, fetcherFor({}).fetcher)).resolves.toEqual({ ok: false })
    await expect(plcHandle(DID, fetcherFor({ [`https://plc.directory/${DID}`]: new Error('down') }).fetcher)).resolves.toEqual({ ok: false })
  })

  test('only well-formed did:plc reaches the directory', async () => {
    const { fetcher, calls } = fetcherFor({})
    await expect(plcHandle('did:plc:../../admin', fetcher)).resolves.toEqual({ ok: false })
    expect(calls).toEqual([])
  })
})
