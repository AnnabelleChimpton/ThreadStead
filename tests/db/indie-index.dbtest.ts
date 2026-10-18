/**
 * Indie Index stage 2 against a real Postgres (SEARCH_PLAN.md §3.5): the
 * 20261019000000_add_indie_index migration's triggers and cascades, the
 * listing rule and tiers (lib/indie-index/tiers.ts), and moving old
 * IndexedSite rows over (lib/indie-index/legacy.ts).
 */
import { db } from '@/lib/config/database/connection'
import { recomputeSites, RESIDENT_MIN_AGE_DAYS } from '@/lib/indie-index/tiers'
import { applyLegacyMove, planLegacyMove } from '@/lib/indie-index/legacy'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-10-19T12:00:00Z')

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE "User", "Site", "SiteOptOut", "IndexRun", "IndexedSite", "BlockedSite" RESTART IDENTITY CASCADE'
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

// ---------------------------------------------------------- legacy move --

async function indexed(url: string, data: Partial<{ title: string; description: string; submittedBy: string; verifiedBy: string; discoveryMethod: string; communityValidated: boolean; crawlStatus: string }> = {}) {
  return db.indexedSite.create({ data: { url, title: data.title ?? url, ...data } })
}

describe('moving IndexedSite rows over', () => {
  it('moves only what a person submitted or verified, never seeded rows marked validated', async () => {
    const ada = await resident('ada')
    const mod = await resident('mod')
    await indexed('https://ada-picked.example.org/', { submittedBy: ada, discoveryMethod: 'manual' })
    await indexed('https://mod-checked.example.org/', { verifiedBy: mod })
    await indexed('https://seeded.example.org/', { discoveryMethod: 'api_seeding', communityValidated: true, crawlStatus: 'success' })
    await indexed('https://crawled.example.org/', { discoveryMethod: 'crawler_auto_submit', communityValidated: true })

    const plan = await planLegacyMove(db)
    expect(plan.considered).toBe(2)
    expect(plan.sites.map((s) => s.key).sort()).toEqual(['ada-picked.example.org', 'mod-checked.example.org'])
  })

  it('merges rows for the same site, prefers the homepage text, and keeps tilde neighbours apart', async () => {
    const [ada, bo] = [await resident('ada'), await resident('bo')]
    await indexed('https://jvns.ca/blog/some-post/', { submittedBy: ada, title: 'Some post', description: 'A post' })
    await indexed('https://www.jvns.ca/', { submittedBy: bo, title: 'Julia Evans', description: 'Zines and blog' })
    await indexed('https://tilde.club/~anna/', { submittedBy: ada, title: 'Anna' })
    await indexed('https://tilde.club/~bo/', { submittedBy: bo, title: 'Bo' })

    const plan = await planLegacyMove(db)
    const jvns = plan.sites.find((s) => s.key === 'jvns.ca')!
    expect(jvns).toMatchObject({ title: 'Julia Evans', description: 'Zines and blog', url: 'https://jvns.ca/' })
    expect(jvns.voucherIds.sort()).toEqual([ada, bo].sort())
    expect(jvns.fromUrls).toHaveLength(2)
    expect(plan.sites.map((s) => s.key).sort()).toEqual(['jvns.ca', 'tilde.club/~anna', 'tilde.club/~bo'])
  })

  it('skips blocked hosts (subdomains too), opted-out sites and non-site urls', async () => {
    const ada = await resident('ada')
    await db.blockedSite.create({ data: { domain: 'youtube.com', category: 'video' } })
    await db.siteOptOut.create({ data: { key: 'tilde.club', via: 'robots' } })
    await indexed('https://m.youtube.com/channel/ada', { submittedBy: ada })
    await indexed('https://tilde.club/~anna/', { submittedBy: ada })
    await indexed('http://localhost:3000/', { submittedBy: ada })
    await indexed('https://ok.example.org/', { submittedBy: ada })

    const plan = await planLegacyMove(db)
    expect(plan.sites.map((s) => s.key)).toEqual(['ok.example.org'])
    expect(plan.skipped.map((s) => s.reason).sort()).toEqual(['blocked host', 'not a site url', 'opted out'])
  })

  it('treats a profile on a platform (/@name) as not a site, and blocks big platforms even with an empty BlockedSite table', async () => {
    const ada = await resident('ada')
    await indexed('https://mastodon.social/@ada', { submittedBy: ada })
    await indexed('https://www.instagram.com/ada/', { submittedBy: ada })
    await indexed('https://ada.tumblr.com/', { submittedBy: ada })
    const plan = await planLegacyMove(db)
    expect(plan.sites.map((s) => s.key)).toEqual(['ada.tumblr.com'])
    expect(plan.skipped.map((s) => s.reason).sort()).toEqual(['blocked host', 'not a site url'])
  })

  it('turns the submitter, verifier and up-voters into vouches, ignoring broken/spam votes', async () => {
    const [ada, bo, cy, dee] = [await resident('ada'), await resident('bo'), await resident('cy'), await resident('dee')]
    const row = await indexed('https://liked.example.org/', { submittedBy: ada, verifiedBy: bo })
    await db.siteVote.createMany({
      data: [
        { siteId: row.id, userId: cy, voteType: 'interesting' },
        { siteId: row.id, userId: cy, voteType: 'quality' },
        { siteId: row.id, userId: dee, voteType: 'spam' },
      ],
    })
    const plan = await planLegacyMove(db)
    expect(plan.sites[0].voucherIds.sort()).toEqual([ada, bo, cy].sort())
  })

  it('applies: grandfathered sites with vouches and tiers, and running it twice changes nothing', async () => {
    const [ada, bo] = [await resident('ada'), await resident('bo')]
    const liked = await indexed('https://liked.example.org/', { submittedBy: ada, title: 'Liked', description: 'Two people like it' })
    await db.siteVote.create({ data: { siteId: liked.id, userId: bo, voteType: 'upvote' } })
    await indexed('https://solo.example.org/', { submittedBy: ada, title: 'Solo' })

    const first = await applyLegacyMove(db, await planLegacyMove(db))
    expect(first).toEqual({ sitesCreated: 2, sitesUpdated: 0, vouchesCreated: 3 })

    const sites = await db.site.findMany({
      orderBy: { key: 'asc' },
      select: { key: true, url: true, title: true, description: true, source: true, tier: true, grandfathered: true, vouchCount: true, residentSignals: true, status: true },
    })
    expect(sites).toEqual([
      { key: 'liked.example.org', url: 'https://liked.example.org/', title: 'Liked', description: 'Two people like it', source: 'community', tier: 'vouched', grandfathered: true, vouchCount: 2, residentSignals: 2, status: 'active' },
      { key: 'solo.example.org', url: 'https://solo.example.org/', title: 'Solo', description: null, source: 'community', tier: 'community', grandfathered: true, vouchCount: 1, residentSignals: 1, status: 'active' },
    ])
    expect(await matches('Site', 'liked')).toEqual(['liked.example.org'])

    const second = await applyLegacyMove(db, await planLegacyMove(db))
    expect(second).toEqual({ sitesCreated: 0, sitesUpdated: 2, vouchesCreated: 0 })
    expect(await db.site.count()).toBe(2)
    expect(await db.vouch.count()).toBe(3)
  })

  it("keeps an existing site's own text and promotes a pool site it matches", async () => {
    const ada = await resident('ada')
    await site('kagi.example.org', { source: 'pool', title: 'From the feed' })
    await indexed('https://kagi.example.org/', { submittedBy: ada, title: 'Old title' })

    await applyLegacyMove(db, await planLegacyMove(db))
    expect(await db.site.findUniqueOrThrow({ where: { key: 'kagi.example.org' }, select: { title: true, source: true, tier: true, grandfathered: true } })).toEqual({
      title: 'From the feed',
      source: 'community',
      tier: 'community',
      grandfathered: true,
    })
  })

  it('reads nothing but IndexedSite, BlockedSite and SiteOptOut when planning', async () => {
    const ada = await resident('ada')
    await indexed('https://ok.example.org/', { submittedBy: ada })
    await planLegacyMove(db)
    expect(await db.site.count()).toBe(0)
    expect(await db.vouch.count()).toBe(0)
  })
})
