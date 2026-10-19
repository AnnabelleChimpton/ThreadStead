/**
 * The quiet visit count's memory: a visitor is counted once a day per home,
 * the day's memory is forgotten at midnight UTC, and it can't grow forever.
 */
import {
  MAX_DIGESTS_PER_DAY,
  countVisit,
  firstVisitToday,
  resetVisitMemory,
  utcDay,
  weekStart,
} from '../visit-count'

const anon = (ip: string, userAgent = 'UA') => ({ kind: 'anonymous' as const, ip, userAgent })
const at = (iso: string) => new Date(iso)

beforeEach(() => resetVisitMemory())

describe('firstVisitToday', () => {
  it('counts a visitor once a day per home', () => {
    const now = at('2026-10-19T10:00:00Z')
    expect(firstVisitToday('home1', anon('1.1.1.1'), now)).toBe(true)
    expect(firstVisitToday('home1', anon('1.1.1.1'), now)).toBe(false)
    expect(firstVisitToday('home2', anon('1.1.1.1'), now)).toBe(true)
    expect(firstVisitToday('home1', anon('1.1.1.2'), now)).toBe(true)
    expect(firstVisitToday('home1', anon('1.1.1.1', 'Other browser'), now)).toBe(true)
  })

  it('tells signed-in people apart by account, not address', () => {
    const now = at('2026-10-19T10:00:00Z')
    expect(firstVisitToday('home1', { kind: 'user', userId: 'u_a' }, now)).toBe(true)
    expect(firstVisitToday('home1', { kind: 'user', userId: 'u_a' }, now)).toBe(false)
    expect(firstVisitToday('home1', { kind: 'user', userId: 'u_b' }, now)).toBe(true)
  })

  it('starts over at midnight UTC', () => {
    expect(firstVisitToday('home1', anon('1.1.1.1'), at('2026-10-19T23:59:59Z'))).toBe(true)
    expect(firstVisitToday('home1', anon('1.1.1.1'), at('2026-10-20T00:00:00Z'))).toBe(true)
    expect(firstVisitToday('home1', anon('1.1.1.1'), at('2026-10-20T08:00:00Z'))).toBe(false)
  })

  it('stops counting for the day once its memory is full', () => {
    const now = at('2026-10-19T10:00:00Z')
    for (let i = 0; i < MAX_DIGESTS_PER_DAY; i++) firstVisitToday('home1', anon(`ip${i}`), now)
    expect(firstVisitToday('home1', anon('someone new'), now)).toBe(false)
    expect(firstVisitToday('home1', anon('someone new'), at('2026-10-20T00:00:01Z'))).toBe(true)
  })
})

describe('countVisit', () => {
  it('adds one to today’s row the first time only', async () => {
    const upsert = jest.fn(async () => ({}))
    const db = { pixelHomeVisitCount: { upsert } } as any
    const now = at('2026-10-19T10:00:00Z')
    expect(await countVisit(db, 'home1', anon('1.1.1.1'), now)).toBe(true)
    expect(await countVisit(db, 'home1', anon('1.1.1.1'), now)).toBe(false)
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith({
      where: { homeOwnerId_day: { homeOwnerId: 'home1', day: at('2026-10-19T00:00:00Z') } },
      create: { homeOwnerId: 'home1', day: at('2026-10-19T00:00:00Z'), visits: 1 },
      update: { visits: { increment: 1 } },
    })
    // What was hashed (the address) is never passed to the database
    expect(JSON.stringify(upsert.mock.calls)).not.toContain('1.1.1.1')
  })
})

describe('days', () => {
  it('utcDay is midnight UTC, whatever the local time zone', () => {
    expect(utcDay(at('2026-10-19T23:30:00-07:00')).toISOString()).toBe('2026-10-20T00:00:00.000Z')
  })

  it('the week is today and the six days before', () => {
    expect(weekStart(at('2026-10-19T12:00:00Z')).toISOString()).toBe('2026-10-13T00:00:00.000Z')
  })
})
