import { HUB_TIMEOUT } from '../ringhub-ssr'
import { MAX_MEMBER_PAGES, MEMBER_PAGE_SIZE, readAllRingMembers } from '../ring-members'

const member = (actorDid: string) => ({ actorDid, status: 'ACTIVE', role: 'member', joinedAt: null }) as const

/** A hub holding `count` members, paged like rings.ts (newest first, hasMore). */
function hubWith(count: number) {
  const all = Array.from({ length: count }, (_, i) => member(`did:m${i}`))
  return {
    getRingMembers: jest.fn(async (_slug: string, opts?: { limit?: number; offset?: number }) => {
      const limit = opts?.limit ?? 20
      const offset = opts?.offset ?? 0
      const members = all.slice(offset, offset + limit)
      return { members, total: count, limit, offset, hasMore: offset + members.length < count }
    }),
  }
}

describe('readAllRingMembers', () => {
  it('reads past the hub default of 20, at the max page size', async () => {
    const hub = hubWith(250)
    const read = await readAllRingMembers(hub, 'gardens')
    expect(read).not.toBe(HUB_TIMEOUT)
    if (read === HUB_TIMEOUT) return
    expect(read.members).toHaveLength(250)
    expect(read.complete).toBe(true)
    expect(read.total).toBe(250)
    expect(hub.getRingMembers.mock.calls).toEqual([
      ['gardens', { limit: MEMBER_PAGE_SIZE, offset: 0 }],
      ['gardens', { limit: MEMBER_PAGE_SIZE, offset: 100 }],
      ['gardens', { limit: MEMBER_PAGE_SIZE, offset: 200 }],
    ])
  })

  it('stops after one page for a small ring', async () => {
    const hub = hubWith(5)
    const read = await readAllRingMembers(hub, 'gardens')
    expect(read !== HUB_TIMEOUT && read.members).toHaveLength(5)
    expect(hub.getRingMembers).toHaveBeenCalledTimes(1)
  })

  it('caps the pages for a huge ring and says the list is incomplete', async () => {
    const hub = hubWith(MEMBER_PAGE_SIZE * (MAX_MEMBER_PAGES + 2))
    const read = await readAllRingMembers(hub, 'gardens')
    expect(hub.getRingMembers).toHaveBeenCalledTimes(MAX_MEMBER_PAGES)
    expect(read !== HUB_TIMEOUT && read.members).toHaveLength(MEMBER_PAGE_SIZE * MAX_MEMBER_PAGES)
    expect(read !== HUB_TIMEOUT && read.complete).toBe(false)
  })

  it('drops a member repeated across pages when someone joins mid-read', async () => {
    const hub = {
      getRingMembers: jest.fn(async (_s: string, opts?: { offset?: number }) =>
        opts?.offset
          ? { members: [member('did:b'), member('did:c')], total: 3, limit: 100, offset: 100, hasMore: false }
          : { members: [member('did:a'), member('did:b')], total: 3, limit: 100, offset: 0, hasMore: true }
      ),
    }
    const read = await readAllRingMembers(hub, 'gardens')
    expect(read !== HUB_TIMEOUT && read.members.map((m) => m.actorDid)).toEqual(['did:a', 'did:b', 'did:c'])
  })

  it('a failed first page is HUB_TIMEOUT, so the caller falls back', async () => {
    const hub = { getRingMembers: jest.fn(async () => { throw new Error('boom') }) }
    expect(await readAllRingMembers(hub, 'gardens')).toBe(HUB_TIMEOUT)
  })

  it('a failed later page keeps what was read', async () => {
    const real = hubWith(250)
    const hub = {
      getRingMembers: jest.fn(async (slug: string, opts?: { limit?: number; offset?: number }) => {
        if (opts?.offset === 200) throw new Error('boom')
        return real.getRingMembers(slug, opts)
      }),
    }
    const read = await readAllRingMembers(hub, 'gardens')
    expect(read !== HUB_TIMEOUT && read.members).toHaveLength(200)
    expect(read !== HUB_TIMEOUT && read.complete).toBe(false)
  })

  it('one deadline covers every page', async () => {
    jest.useFakeTimers()
    try {
      const real = hubWith(250)
      const hub = {
        getRingMembers: jest.fn((slug: string, opts?: { limit?: number; offset?: number }) =>
          opts?.offset ? new Promise<never>(() => {}) : real.getRingMembers(slug, opts)
        ),
      }
      const pending = readAllRingMembers(hub, 'gardens', { deadlineMs: 1000 })
      await jest.advanceTimersByTimeAsync(1000)
      const read = await pending
      expect(read !== HUB_TIMEOUT && read.members).toHaveLength(100)
      expect(read !== HUB_TIMEOUT && read.complete).toBe(false)
      expect(hub.getRingMembers).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })

  it('a first page past the deadline is HUB_TIMEOUT', async () => {
    jest.useFakeTimers()
    try {
      const hub = { getRingMembers: jest.fn(() => new Promise<never>(() => {})) }
      const pending = readAllRingMembers(hub, 'gardens', { deadlineMs: 1000 })
      await jest.advanceTimersByTimeAsync(1000)
      expect(await pending).toBe(HUB_TIMEOUT)
    } finally {
      jest.useRealTimers()
    }
  })
})
