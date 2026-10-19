import { isOutForEveryone, noticeFor, noticeText, shortDate } from '../collections'

const now = new Date('2026-10-19T12:00:00Z')
const limited = (start: string, end: string) => ({ releaseType: 'LIMITED_TIME', releaseStartAt: new Date(start), releaseEndAt: new Date(end) })
const autumn = limited('2026-10-01T00:00:00Z', '2026-11-30T23:59:59Z')

describe('isOutForEveryone', () => {
  it('limited items only inside their window, and only with both dates', () => {
    expect(isOutForEveryone(autumn, now)).toBe(true)
    expect(isOutForEveryone(limited('2026-11-01T00:00:00Z', '2026-11-30T00:00:00Z'), now)).toBe(false)
    expect(isOutForEveryone(limited('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'), now)).toBe(false)
    expect(isOutForEveryone({ releaseType: 'LIMITED_TIME', releaseStartAt: null, releaseEndAt: null }, now)).toBe(false)
  })

  it('public and default items always; beta, claim-code and admin items never', () => {
    for (const releaseType of ['PUBLIC', 'DEFAULT']) expect(isOutForEveryone({ releaseType, releaseStartAt: null, releaseEndAt: null }, now)).toBe(true)
    for (const releaseType of ['BETA_USERS', 'CLAIM_CODE', 'ADMIN_ONLY']) expect(isOutForEveryone({ releaseType, releaseStartAt: null, releaseEndAt: null }, now)).toBe(false)
  })
})

describe('noticeFor and noticeText', () => {
  it('a limited collection says when it ends (the latest end of what is out)', () => {
    const notice = noticeFor('Autumn 2026', [autumn, limited('2026-10-01T00:00:00Z', '2026-11-15T00:00:00Z')], now)
    expect(notice).toEqual({ name: 'Autumn 2026', until: autumn.releaseEndAt })
    expect(noticeText(notice!)).toBe('Autumn 2026 decorations are out until Nov 30.')
  })

  it('a collection with lasting items has no end to mention', () => {
    const notice = noticeFor('Garden basics', [autumn, { releaseType: 'PUBLIC', releaseStartAt: null, releaseEndAt: null }], now)
    expect(noticeText(notice!)).toBe('Garden basics decorations are out.')
  })

  it('nothing to say when none of it is out for everyone', () => {
    expect(noticeFor('Winter 2026', [limited('2026-12-01T00:00:00Z', '2027-01-05T00:00:00Z')], now)).toBeNull()
    expect(noticeFor('Beta', [{ releaseType: 'BETA_USERS', releaseStartAt: null, releaseEndAt: null }], now)).toBeNull()
    expect(noticeFor('Empty', [], now)).toBeNull()
  })

  it('dates read the same everywhere (UTC)', () => {
    expect(shortDate('2026-11-30T23:59:59Z')).toBe('Nov 30')
    expect(shortDate(new Date('2026-12-01T00:30:00Z'))).toBe('Dec 1')
  })
})
