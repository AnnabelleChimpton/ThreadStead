/**
 * Indie Index stage 2 against a real Postgres (SEARCH_PLAN.md §3.5): the
 * 20261019000000_add_indie_index migration's triggers and cascades, the
 * listing rule and tiers (lib/indie-index/tiers.ts).
 */
import { db } from '@/lib/config/database/connection'
import { recomputeSites, RESIDENT_MIN_AGE_DAYS } from '@/lib/indie-index/tiers'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-10-19T12:00:00Z')

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE "User", "Site", "SiteOptOut", "IndexRun", "BlockedSite" RESTART IDENTITY CASCADE'
  )
}

let seq = 0
/** A resident whose account is `ageDays` old at NOW. */
async function resident(name: string, ageDays = 30) {
  const id = `u_${name}`
  await db.user.create({
    data: { id, did: `did:test:${name}:${seq++}`, createdAt: new Date(NOW.getTime() - ageDays * DAY) },
  })
  return id
}

async function site(key: string, data: Partial<{ title: string; description: string; source: 'community' | 'pool'; grandfathered: boolean; ownerId: string; status: 'active' | 'hidden' }> = {}) {
  const host = key.split('/')[0]
  return db.site.create({ data: { key, host, url: `https://${key}/`, ...data } })
}

async function matches(table: 'Site' | 'SiteItem', query: string): Promise<string[]> {
  const col = table === 'Site' ? '"key"' : '"url"'
  const rows = await db.$queryRawUnsafe<Array<{ v: string }>>(
    `SELECT ${col} AS v FROM "${table}" WHERE search_tsv @@ websearch_to_tsquery('english', immutable_unaccent($1)) ORDER BY 1`,
    query
  )
  return rows.map((r) => r.v)
}

async function tierOf(id: string) {
  return db.site.findUniqueOrThrow({ where: { id }, select: { tier: true, source: true, residentSignals: true, vouchCount: true } })
}

beforeEach(reset)
afterAll(async () => {
  await reset()
  await db.$disconnect()
})

// ------------------------------------------------------------ migration --

describe('search_tsv triggers', () => {
  it('indexes a site by title, key and description, with entities and accents handled', async () => {
    await site('jvns.ca', { title: 'Julia Evans &amp; zines', description: 'Café notes on <b>networking</b>' })
    await site('tilde.club/~anna', { title: 'Anna' })
    await site('example.org', { title: 'Something else' })

    expect(await matches('Site', 'jvns')).toEqual(['jvns.ca'])
    expect(await matches('Site', 'jvns.ca')).toEqual(['jvns.ca'])
    expect(await matches('Site', 'zine')).toEqual(['jvns.ca'])
    expect(await matches('Site', 'cafe networks')).toEqual(['jvns.ca'])
    expect(await matches('Site', 'amp')).toEqual([])
    expect(await matches('Site', 'tilde anna')).toEqual(['tilde.club/~anna'])
  })

  it('keeps the vector current when the title or description changes', async () => {
    const s = await site('jvns.ca', { title: 'Old name' })
    await db.site.update({ where: { id: s.id }, data: { title: 'Wizard zines', description: null } })
    expect(await matches('Site', 'wizard')).toEqual(['jvns.ca'])
    expect(await matches('Site', 'old')).toEqual([])
  })

  it('indexes feed items by title and excerpt', async () => {
    const s = await site('jvns.ca')
    await db.siteItem.createMany({
      data: [
        { siteId: s.id, url: 'https://jvns.ca/dns', title: 'Debugging DNS', excerpt: 'Why my resolvers were slow' },
        { siteId: s.id, url: 'https://jvns.ca/git', title: 'Git &amp; you', excerpt: null },
      ],
    })
    expect(await matches('SiteItem', 'resolver debug')).toEqual(['https://jvns.ca/dns'])
    expect(await matches('SiteItem', 'git')).toEqual(['https://jvns.ca/git'])
  })

  it('keeps one item per url per site', async () => {
    const s = await site('jvns.ca')
    await db.siteItem.create({ data: { siteId: s.id, url: 'https://jvns.ca/a' } })
    await expect(db.siteItem.create({ data: { siteId: s.id, url: 'https://jvns.ca/a' } })).rejects.toThrow()
  })
})

describe('cascades', () => {
  it('deleting a site removes its items, vouches, signals and outgoing links, and unhooks incoming ones', async () => {
    const u = await resident('ada')
    const a = await site('a.example.org')
    const b = await site('b.example.org')
    await db.siteItem.create({ data: { siteId: a.id, url: 'https://a.example.org/1' } })
    await db.vouch.create({ data: { siteId: a.id, userId: u } })
    await db.siteSignal.create({ data: { siteId: a.id, userId: u, kind: 'blogroll' } })
    await db.siteLink.create({ data: { fromSiteId: a.id, toKey: 'b.example.org', toSiteId: b.id } })
    await db.siteLink.create({ data: { fromSiteId: b.id, toKey: 'a.example.org', toSiteId: a.id } })

    await db.site.delete({ where: { id: a.id } })

    expect(await db.siteItem.count()).toBe(0)
    expect(await db.vouch.count()).toBe(0)
    expect(await db.siteSignal.count()).toBe(0)
    expect(await db.siteLink.findMany({ select: { fromSiteId: true, toKey: true, toSiteId: true } })).toEqual([
      { fromSiteId: b.id, toKey: 'a.example.org', toSiteId: null },
    ])
  })

  it("deleting a resident removes their vouches and signals and clears ownership, but keeps the site", async () => {
    const u = await resident('ada')
    const s = await site('ada.example.org', { ownerId: u })
    await db.vouch.create({ data: { siteId: s.id, userId: u } })
    await db.siteSignal.create({ data: { siteId: s.id, userId: u, kind: 'own' } })

    await db.user.delete({ where: { id: u } })

    expect(await db.site.findUniqueOrThrow({ where: { id: s.id }, select: { ownerId: true } })).toEqual({ ownerId: null })
    expect(await db.vouch.count()).toBe(0)
    expect(await db.siteSignal.count()).toBe(0)
  })
})

// ---------------------------------------------------------------- tiers --

describe('recomputeSites', () => {
  it('a counting owner makes it a resident site', async () => {
    const u = await resident('ada')
    const s = await site('ada.example.org', { ownerId: u })
    await db.siteSignal.create({ data: { siteId: s.id, userId: u, kind: 'own' } })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toEqual({ tier: 'resident', source: 'community', residentSignals: 1, vouchCount: 0 })
  })

  it(`an owner younger than ${RESIDENT_MIN_AGE_DAYS} days waits, then counts by itself`, async () => {
    const u = await resident('newbie', RESIDENT_MIN_AGE_DAYS - 1)
    const s = await site('newbie.example.org', { ownerId: u })
    await db.siteSignal.create({ data: { siteId: s.id, userId: u, kind: 'own' } })
    await recomputeSites(db, [s.id], NOW)
    expect((await tierOf(s.id)).tier).toBe('candidate')

    await recomputeSites(db, [s.id], new Date(NOW.getTime() + 2 * DAY))
    expect(await tierOf(s.id)).toMatchObject({ tier: 'resident', residentSignals: 1 })
  })

  it('one resident is a candidate, however many ways they point at it', async () => {
    const u = await resident('ada')
    const s = await site('stranger.example.org')
    await db.siteSignal.createMany({
      data: [
        { siteId: s.id, userId: u, kind: 'blogroll' },
        { siteId: s.id, userId: u, kind: 'home_link' },
        { siteId: s.id, userId: u, kind: 'home_button' },
      ],
    })
    await db.vouch.create({ data: { siteId: s.id, userId: u } })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toEqual({ tier: 'candidate', source: 'community', residentSignals: 1, vouchCount: 1 })
  })

  it('two residents list it (community), and a vouch among them makes it vouched', async () => {
    const [a, b] = [await resident('ada'), await resident('bo')]
    const s = await site('stranger.example.org')
    await db.siteSignal.createMany({
      data: [
        { siteId: s.id, userId: a, kind: 'blogroll' },
        { siteId: s.id, userId: b, kind: 'home_link' },
      ],
    })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toMatchObject({ tier: 'community', residentSignals: 2 })

    await db.vouch.create({ data: { siteId: s.id, userId: b } })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toMatchObject({ tier: 'vouched', residentSignals: 2, vouchCount: 1 })
  })

  it("a young account's vouch is shown in the count but doesn't list the site yet", async () => {
    const a = await resident('ada')
    const young = await resident('newbie', 2)
    const s = await site('stranger.example.org')
    await db.siteSignal.create({ data: { siteId: s.id, userId: a, kind: 'blogroll' } })
    await db.vouch.create({ data: { siteId: s.id, userId: young } })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toMatchObject({ tier: 'candidate', residentSignals: 1, vouchCount: 1 })
  })

  it('grandfathered sites stay listed with a single signal', async () => {
    const s = await site('old.example.org', { grandfathered: true })
    await recomputeSites(db, [s.id], NOW)
    expect((await tierOf(s.id)).tier).toBe('community')
  })

  it('pool sites stay pool until residents pick them up, then become community sites', async () => {
    const [a, b] = [await resident('ada'), await resident('bo')]
    const s = await site('kagi.example.org', { source: 'pool' })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toMatchObject({ tier: 'pool', source: 'pool' })

    await db.vouch.createMany({ data: [{ siteId: s.id, userId: a }, { siteId: s.id, userId: b }] })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toMatchObject({ tier: 'vouched', source: 'community' })
  })

  it('drops back when a signal goes away', async () => {
    const [a, b] = [await resident('ada'), await resident('bo')]
    const s = await site('stranger.example.org')
    await db.vouch.createMany({ data: [{ siteId: s.id, userId: a }, { siteId: s.id, userId: b }] })
    await recomputeSites(db, [s.id], NOW)
    expect((await tierOf(s.id)).tier).toBe('vouched')

    await db.vouch.deleteMany({ where: { userId: b } })
    await recomputeSites(db, [s.id], NOW)
    expect(await tierOf(s.id)).toMatchObject({ tier: 'candidate', residentSignals: 1, vouchCount: 1 })
  })

  it('without ids it recomputes every site, and skips rows that are already right', async () => {
    const u = await resident('ada')
    await site('one.example.org', { grandfathered: true })
    await site('two.example.org', { ownerId: u })
    expect(await recomputeSites(db, undefined, NOW)).toBe(2)
    expect(await recomputeSites(db, undefined, NOW)).toBe(0)
    expect(await recomputeSites(db, [], NOW)).toBe(0)
  })

  it('leaves status alone (an admin-hidden site stays hidden)', async () => {
    const s = await site('hidden.example.org', { grandfathered: true, status: 'hidden' })
    await recomputeSites(db, [s.id], NOW)
    expect(await db.site.findUniqueOrThrow({ where: { id: s.id }, select: { status: true, tier: true } })).toEqual({
      status: 'hidden',
      tier: 'community',
    })
  })
})
