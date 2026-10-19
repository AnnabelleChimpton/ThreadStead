jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

import { clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { MAX_MEMBER_PAGES, pickWalkTarget, ringMemberDids } from '../ring-walk'

beforeEach(() => clearCache())

describe('pickWalkTarget', () => {
  const members = [{ number: 3 }, { number: 9 }, { number: 20 }]

  it('next is the first member past the sign, wrapping to the start', () => {
    expect(pickWalkTarget(members, 3, 'next')).toEqual({ number: 9 })
    expect(pickWalkTarget(members, 20, 'next')).toEqual({ number: 3 })
    expect(pickWalkTarget(members, 0, 'next')).toEqual({ number: 3 })
  })

  it('prev is the last member at or before the sign, wrapping to the end', () => {
    expect(pickWalkTarget(members, 9, 'prev')).toEqual({ number: 9 })
    expect(pickWalkTarget(members, 8, 'prev')).toEqual({ number: 3 })
    expect(pickWalkTarget(members, 2, 'prev')).toEqual({ number: 20 })
  })

  it('random is any member', () => {
    expect(pickWalkTarget(members, 3, 'random', () => 0)).toEqual({ number: 3 })
    expect(pickWalkTarget(members, 3, 'random', () => 0.99)).toEqual({ number: 20 })
  })

  it('no members, nowhere to go', () => {
    expect(pickWalkTarget([], 3, 'next')).toBeNull()
  })
})

describe('ringMemberDids', () => {
  const page = (dids: string[], hasMore: boolean) => ({ members: dids.map((actorDid) => ({ actorDid, status: 'ACTIVE' })), total: 0, limit: 100, offset: 0, hasMore })

  it('reads every page, 100 at a time, and caches the ring', async () => {
    const hub = {
      getRingMembers: jest.fn(async (_slug: string, { offset }: any) =>
        offset === 0 ? page(['a', 'b'], true) : page(['c'], false)
      ),
    }
    expect(await ringMemberDids(hub as any, 'gardens')).toEqual(['a', 'b', 'c'])
    expect(hub.getRingMembers).toHaveBeenCalledWith('gardens', { limit: 100, offset: 0 })
    expect(hub.getRingMembers).toHaveBeenCalledWith('gardens', { limit: 100, offset: 100 })
    await ringMemberDids(hub as any, 'gardens')
    expect(hub.getRingMembers).toHaveBeenCalledTimes(2)
  })

  it(`stops after ${MAX_MEMBER_PAGES} pages however many members there are`, async () => {
    const hub = { getRingMembers: jest.fn(async (_s: string, { offset }: any) => page([`m${offset}`], true)) }
    expect(await ringMemberDids(hub as any, 'huge')).toHaveLength(MAX_MEMBER_PAGES)
  })

  it('a missing or private ring (404 to an unsigned read) has no members to walk', async () => {
    const hub = { getRingMembers: jest.fn(async () => { throw new RingHubClientError('Not found', 404) }) }
    expect(await ringMemberDids(hub as any, 'secret')).toBeNull()
  })

  it('a members list in the wrong shape is an error, not an empty ring', async () => {
    const hub = { getRingMembers: jest.fn(async () => ({ members: [{}], hasMore: false })) }
    await expect(ringMemberDids(hub as any, 'odd')).rejects.toThrow()
  })
})
