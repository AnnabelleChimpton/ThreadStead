/**
 * Orphaned hub PostRefs (FUTURE_IMPROVEMENTS A3): scan, plan, apply, and the
 * feed's log-once helper. The real-hub version lives in the federation suite.
 */
import {
  executeOrphanRemoval,
  noteMissingLocalPost,
  planOrphanRemoval,
  resetMissingPostLog,
  scanForOrphanPostRefs,
  type OrphanPostRef,
} from '@/lib/domain/threadrings/orphan-postrefs'

const OURS = 'http://localhost:3000'
const ALICE = 'did:web:localhost%3A3000:users:alice'
const BOB = 'did:web:localhost%3A3000:users:bob'
const GONE = 'did:web:localhost%3A3000:users:deleted'

function ref(id: string, ring: string, uri: string, actorDid = ALICE) {
  return { id, ringSlug: ring, uri, digest: 'd', actorDid, submittedBy: actorDid, submittedAt: '2026-05-01T00:00:00.000Z', isPinned: false, status: 'ACCEPTED' as const }
}

function fakeHub(feeds: Record<string, any[]>, owners: Record<string, string> = {}) {
  return {
    listRings: jest.fn(async ({ limit = 100, offset = 0 } = {}) => {
      const rings = Object.keys(feeds).map((slug) => ({ slug, ownerDid: owners[slug] ?? BOB })) as any[]
      return { rings: rings.slice(offset, offset + limit), total: rings.length }
    }),
    getRingFeed: jest.fn(async (slug: string, { limit = 100, offset = 0 } = {}) => ({
      posts: feeds[slug].slice(offset, offset + limit),
      total: feeds[slug].length,
    })),
  }
}

describe('scanForOrphanPostRefs', () => {
  test('finds our refs whose post is gone; ignores external, live and unparseable', async () => {
    const hub = fakeHub({
      welcome: [
        ref('r1', 'welcome', `${OURS}/resident/alice/post/live1`),
        ref('r2', 'welcome', `${OURS}/resident/alice/post/gone1`),
        ref('r3', 'welcome', 'https://elsewhere.example/resident/x/post/gone1'),
        ref('r4', 'welcome', `${OURS}/resident/alice/notapost`),
      ],
      art: [ref('r5', 'art', `${OURS}/resident/alice/post/gone1`)],
    })
    const existingPostIds = jest.fn(async (ids: string[]) => new Set(ids.filter((id) => id.startsWith('live'))))

    const scan = await scanForOrphanPostRefs({ hub, existingPostIds })

    expect(scan.ringsScanned).toBe(2)
    expect(scan.refsScanned).toBe(5)
    expect(scan.ourRefs).toBe(4)
    expect(scan.unparseableUris).toEqual([`${OURS}/resident/alice/notapost`])
    expect(scan.orphans.map((o) => o.refId)).toEqual(['r2', 'r5'])
    expect(existingPostIds).toHaveBeenCalledWith(['live1', 'gone1']) // deduped, one DB call
    expect(scan.ringOwners.get('art')).toBe(BOB)
  })

  test('pages through rings and feeds', async () => {
    const many = Array.from({ length: 7 }, (_, i) => ref(`r${i}`, 'big', `${OURS}/resident/a/post/p${i}`))
    const hub = fakeHub({ big: many, a: [], b: [] })
    const scan = await scanForOrphanPostRefs({ hub, existingPostIds: async () => new Set(), pageSize: 3 })
    expect(scan.ringsScanned).toBe(3)
    expect(scan.orphans).toHaveLength(7)
    expect(hub.getRingFeed.mock.calls.filter(([s]) => s === 'big')).toHaveLength(3)
  })

  test('a failing ring is reported, not fatal', async () => {
    const hub = fakeHub({ ok: [ref('r1', 'ok', `${OURS}/resident/a/post/x`)], broken: [] })
    hub.getRingFeed.mockImplementation(async (slug: string) => {
      if (slug === 'broken') throw new Error('404 Ring not found')
      return { posts: [ref('r1', 'ok', `${OURS}/resident/a/post/x`)], total: 1 }
    })
    const scan = await scanForOrphanPostRefs({ hub, existingPostIds: async () => new Set() })
    expect(scan.ringsFailed).toEqual([{ slug: 'broken', error: '404 Ring not found' }])
    expect(scan.orphans).toHaveLength(1)
  })

  test('--ring restricts the scan and skips the ring listing', async () => {
    const hub = fakeHub({ a: [], b: [] })
    await scanForOrphanPostRefs({ hub, ringSlugs: ['b'], existingPostIds: async () => new Set() })
    expect(hub.listRings).not.toHaveBeenCalled()
    expect(hub.getRingFeed).toHaveBeenCalledWith('b', expect.anything())
  })
})

describe('planOrphanRemoval', () => {
  const orphan = (refId: string, ringSlug: string, uri: string, actorDid = ALICE): OrphanPostRef => ({
    refId, ringSlug, uri, postId: uri.split('/').pop()!, actorDid, submittedBy: actorDid, submittedAt: '2026-05-01T00:00:00.000Z', status: 'ACCEPTED',
  })
  const users = async (dids: string[]) =>
    new Map(dids.filter((d) => d === ALICE || d === BOB).map((d) => [d, d === ALICE ? 'u-alice' : 'u-bob']))

  test('one author call per uri; copies in other rings are covered by it', async () => {
    const plan = await planOrphanRemoval(
      [orphan('r2', 'welcome', `${OURS}/p/gone1`), orphan('r5', 'art', `${OURS}/p/gone1`), orphan('r6', 'art', `${OURS}/p/gone2`)],
      { localUsersByDid: users, ringOwners: new Map(), ownerFallback: false }
    )
    expect(plan.map((p) => [p.orphan.refId, p.signer?.kind ?? null, p.coveredBy ?? null])).toEqual([
      ['r2', 'author', null],
      ['r5', null, 'r2'],
      ['r6', 'author', null],
    ])
    expect(plan[0].signer).toEqual({ kind: 'author', did: ALICE, userId: 'u-alice' })
  })

  test('author without a key: skipped unless --owner-fallback, then signed by the ring owner', async () => {
    const orphans = [orphan('r7', 'art', `${OURS}/p/gone3`, GONE)]
    const ringOwners = new Map([['art', BOB]])

    const [skipped] = await planOrphanRemoval(orphans, { localUsersByDid: users, ringOwners, ownerFallback: false })
    expect(skipped.signer).toBeNull()
    expect(skipped.blocked).toMatch(/--owner-fallback/)

    const [owner] = await planOrphanRemoval(orphans, { localUsersByDid: users, ringOwners, ownerFallback: true })
    expect(owner.signer).toEqual({ kind: 'owner', did: BOB, userId: 'u-bob' })
  })

  test('nobody local can sign: skipped with a reason', async () => {
    const [item] = await planOrphanRemoval([orphan('r8', 'x', `${OURS}/p/g`, GONE)], {
      localUsersByDid: users, ringOwners: new Map([['x', 'did:web:other.example']]), ownerFallback: true,
    })
    expect(item.signer).toBeNull()
    expect(item.blocked).toMatch(/neither the author nor the ring owner/)
  })
})

describe('executeOrphanRemoval', () => {
  test('curates each signed item as its signer; records failures without stopping', async () => {
    const curatePost = jest.fn()
      .mockResolvedValueOnce({ totalRemoved: 2 })
      .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }))
    const curateAs = jest.fn(() => ({ curatePost }))
    const base = { ringSlug: 'r', uri: 'u', actorDid: ALICE, submittedBy: ALICE, submittedAt: '', status: 'ACCEPTED' }

    const outcomes = await executeOrphanRemoval([
      { orphan: { ...base, refId: 'a', postId: 'p1' }, signer: { kind: 'author', did: ALICE, userId: 'u-alice' } },
      { orphan: { ...base, refId: 'b', postId: 'p1' }, signer: null, coveredBy: 'a' },
      { orphan: { ...base, refId: 'c', postId: 'p2' }, signer: { kind: 'owner', did: BOB, userId: 'u-bob' } },
    ], { curateAs })

    expect(curateAs.mock.calls).toEqual([['u-alice'], ['u-bob']])
    expect(curatePost).toHaveBeenNthCalledWith(1, 'a', 'remove', { reason: expect.stringContaining('p1') })
    expect(outcomes).toEqual([
      { refId: 'a', ok: true, totalRemoved: 2 },
      { refId: 'c', ok: false, error: '403 Forbidden' },
    ])
  })
})

describe('noteMissingLocalPost', () => {
  beforeEach(() => resetMissingPostLog())

  test('warns once per post ID, however many renders hit it', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    for (let i = 0; i < 5; i++) {
      noteMissingLocalPost('gone1', { id: 'r2', ringSlug: 'welcome' })
      noteMissingLocalPost('gone2', { id: 'r9', ringSlug: 'art' })
    }
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0][0]).toContain('post=gone1')
    expect(warn.mock.calls[0][0]).toContain('reconcile-orphan-postrefs')
    warn.mockRestore()
  })
})
