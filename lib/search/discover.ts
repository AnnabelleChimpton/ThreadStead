/**
 * Things to show when a search finds nothing, and the Surprise Me pick.
 * Homes and rings are ours; indie sites come from the Indie Index
 * (SEARCH_PLAN.md §3.5): sites residents chose, or a Kagi Small Web pool
 * site that posted in the last 90 days.
 */
import { Prisma } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { cached } from '@/lib/api/ringhub/ringhub-cache'
import { hydrateHomes } from './local'
import { fetchRings, ringResult, type RingRow } from './rings'
import { queryTerms } from './relevance'
import { isWebUrl, cleanText } from './sites'
import { houseThumb, type SearchResult } from './types'
import { activeAccountSql } from '@/lib/domain/users/moderation'

type Card = Omit<SearchResult, 'relevanceScore'>

/** `count` random homes of residents whose profile the viewer may see. */
export async function randomHomes(viewerId: string | null, count: number): Promise<Card[]> {
  const v = Prisma.sql`${viewerId}::text`
  // Same visibility/block rules as lib/search/local.ts, kept to the public
  // case here: a random sample has no reason to reach into followers-only.
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT h."userId" AS id
    FROM "UserHomeConfig" h
    LEFT JOIN "Profile" pr ON pr."userId" = h."userId"
    WHERE (pr.id IS NULL OR pr.visibility = 'public')
      AND EXISTS (SELECT 1 FROM "Handle" hd WHERE hd."userId" = h."userId")
      AND ${activeAccountSql(Prisma.sql`h."userId"`)}
      AND NOT EXISTS (
        SELECT 1 FROM "UserBlock" b
        WHERE (b."blockerId" = ${v} AND b."blockedUserId" = h."userId")
           OR (b."blockerId" = h."userId" AND b."blockedUserId" = ${v})
      )
    ORDER BY random()
    LIMIT ${count}
  `
  const homes = await hydrateHomes(rows.map((r) => r.id))
  return homes.flatMap((h) => {
    const handle = h.user.handles[0]?.handle
    if (!handle) return []
    const ownerName = h.user.profile?.displayName || handle
    return [
      {
        type: 'home' as const,
        id: h.userId,
        title: h.houseTitle || h.houseBoardText || `${ownerName}'s home`,
        description: h.houseDescription || undefined,
        url: `/home/${handle}`,
        home: { handle, ownerName, house: houseThumb(h) },
      },
    ]
  })
}

/** Ring lists here change slowly and are the same for everyone (blocks aside). */
function cachedRings(search: string, viewerId: string | null, system: string, limit: number) {
  return cached(`search-discover:${system}:${viewerId ?? 'anon'}:${search}:${limit}`, 60_000, 10 * 60_000, () =>
    fetchRings({ search, viewerId, system, limit })
  )
}

/**
 * Rings near a query that found nothing: try its words one at a time
 * ("weekend imrul" → "weekend"), then fall back to the biggest rings.
 */
export async function closestRings(
  query: string,
  viewerId: string | null,
  system: string,
  limit = 4
): Promise<{ rings: Card[]; fallback: boolean }> {
  // Single words, plus a crude singular ("cats" → "cat": the hub matches
  // substrings). The whole query already found nothing, so skip it.
  const whole = query.trim().toLowerCase()
  const terms = [...new Set(
    queryTerms(query)
      .filter((t) => t.length >= 3)
      .flatMap((t) => (t.length > 3 && t.endsWith('s') ? [t, t.slice(0, -1)] : [t]))
  )].filter((t) => t !== whole).slice(0, 4)
  const seen = new Set<string>()
  const near: RingRow[] = []
  if (terms.length > 0) {
    const lists = await Promise.all(terms.map((t) => cachedRings(t, viewerId, system, limit).catch(() => [])))
    for (const ring of lists.flat()) {
      if (seen.has(ring.slug)) continue
      seen.add(ring.slug)
      near.push(ring)
    }
  }
  if (near.length > 0) return { rings: near.slice(0, limit).map(ringResult), fallback: false }
  const biggest = await cachedRings('', viewerId, system, limit).catch(() => [])
  return { rings: biggest.map(ringResult), fallback: true }
}

/** The Surprise Me preview card. */
export interface SurprisePick {
  kind: 'home' | 'ring' | 'site'
  title: string
  description?: string
  url: string
  /** Leaves the site: open in a new tab. */
  external: boolean
  domain?: string
  home?: Card['home']
  ring?: Card['ring']
}

/** Sites residents chose (their own and vouched ones twice as likely), else a lively pool site. */
async function randomSite(): Promise<SurprisePick | null> {
  const community = await db.$queryRaw<Array<{ url: string; key: string; title: string | null; description: string | null; tier: string }>>`
    SELECT "url", "key", "title", "description", "tier"::text AS "tier" FROM "Site"
    WHERE "tier" IN ('resident', 'vouched', 'community') AND "status" = 'active'
    ORDER BY random() LIMIT 50
  `
  const weighted = community.flatMap((s) => (s.tier === 'community' ? [s] : [s, s]))
  let site = weighted.length ? weighted[Math.floor(Math.random() * weighted.length)] : null
  if (!site) {
    ;[site] = await db.$queryRaw<typeof community>`
      SELECT "url", "key", "title", "description", "tier"::text AS "tier" FROM "Site"
      WHERE "tier" = 'pool' AND "status" = 'active' AND "lastPostAt" > (now() AT TIME ZONE 'UTC') - interval '90 days'
      ORDER BY random() LIMIT 1
    `
  }
  if (!site || !isWebUrl(site.url)) return null
  return {
    kind: 'site',
    title: cleanText(site.title) || site.key,
    description: cleanText(site.description) || undefined,
    url: site.url,
    external: true,
    domain: site.key,
  }
}

async function randomRing(viewerId: string | null, system: string): Promise<SurprisePick | null> {
  const rings = await cachedRings('', viewerId, system, 50).catch(() => [])
  if (rings.length === 0) return null
  const card = ringResult(rings[Math.floor(Math.random() * rings.length)])
  return { kind: 'ring', title: card.title, description: card.description, url: card.url, external: false, ring: card.ring }
}

async function randomHome(viewerId: string | null): Promise<SurprisePick | null> {
  const [card] = await randomHomes(viewerId, 1)
  if (!card) return null
  return { kind: 'home', title: card.title, description: card.description, url: card.url, external: false, home: card.home }
}

/** One random home, ring or indie site, trying the others if a kind is empty. */
export async function surprisePick(
  viewerId: string | null,
  system: string,
  kind?: SurprisePick['kind']
): Promise<SurprisePick | null> {
  const pickers: Record<SurprisePick['kind'], () => Promise<SurprisePick | null>> = {
    home: () => randomHome(viewerId),
    ring: () => (system === 'none' ? Promise.resolve(null) : randomRing(viewerId, system)),
    site: randomSite,
  }
  // Fisher–Yates; a Math.random() sort comparator isn't a fair shuffle.
  const order = Object.keys(pickers) as SurprisePick['kind'][]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  if (kind) order.unshift(kind)
  for (const k of order) {
    const pick = await pickers[k]()
    if (pick) return pick
  }
  return null
}
