/**
 * Indie Index search (SEARCH_PLAN.md §3.5): the sites residents chose, plus
 * the Kagi Small Web pool, searched by their own words and their feeds'
 * recent posts.
 *
 * Candidates come from Postgres (websearch_to_tsquery over Site and SiteItem
 * search_tsv, word_similarity on titles and keys); the blend is here:
 *
 *   0.45·text + 0.25·trust tier + 0.15·freshness + 0.15·links
 *
 * text is the best of the site's own match and its best post (× 0.9), tier
 * is resident 1 / vouched 0.8 / community 0.6 / pool 0.25, freshness halves
 * every 90 days since the last post, and links counts residents and listed
 * sites pointing there. Typing a site's address pins it to the top.
 */
import { Prisma } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { buildExcerpt } from './excerpt'
import { normaliseTextRank, recencyScore } from './relevance'
import { splitQuery, MAX_QUERY_LENGTH } from './local'

export type IndieTier = 'resident' | 'vouched' | 'community' | 'pool' | 'candidate'

export interface IndiePost {
  url: string
  title: string | null
  excerpt?: string
  publishedAt: string | null
}

export interface IndieSite {
  id: string
  key: string
  url: string
  /** Shown under the title: the key (host, or host/~name). */
  domain: string
  title: string
  description?: string
  buttonUrl: string | null
  tier: IndieTier
  vouchCount: number
  /** Distinct residents pointing here (links, Websites lists, vouches). */
  residentSignals: number
  /** The resident whose site it is, when their profile is public. */
  owner: { handle: string; name: string } | null
  lastPostAt: string | null
  /** Up to two posts that match the query (or the newest, when browsing). */
  posts: IndiePost[]
  /** The signed-in viewer vouched for it. */
  vouched: boolean
}

export const INDIE_CANDIDATES = 300
const TIER_WEIGHT: Record<IndieTier, number> = { resident: 1, vouched: 0.8, community: 0.6, pool: 0.25, candidate: 0 }
export const INDIE_WEIGHTS = { text: 0.45, tier: 0.25, freshness: 0.15, links: 0.15 } as const

// Pool sites count once the bot has read them; before that they're only an address.
const LISTED = Prisma.sql`s."tier" IN ('resident', 'vouched', 'community', 'pool') AND s."status" IN ('active', 'stale')
  AND (s."tier" <> 'pool' OR s."lastOkAt" IS NOT NULL)`

/** log-scaled: 0 links → 0, 10+ → 1. */
export function linkScore(residents: number, sites: number): number {
  return Math.min(1, Math.log2(1 + residents + sites) / Math.log2(11))
}

export function indieScore(
  s: { siteRank: number; itemRank: number; trigram: number; tier: IndieTier; lastPostAt: Date | null; residentSignals: number; linkedFromSites: number },
  now: number
): number {
  const text = Math.max(normaliseTextRank(s.siteRank), 0.9 * normaliseTextRank(s.itemRank), 0.8 * s.trigram)
  return (
    INDIE_WEIGHTS.text * text +
    INDIE_WEIGHTS.tier * TIER_WEIGHT[s.tier] +
    INDIE_WEIGHTS.freshness * recencyScore(s.lastPostAt, now) +
    INDIE_WEIGHTS.links * linkScore(s.residentSignals, s.linkedFromSites)
  )
}

/** "https://www.Jvns.ca/" → "jvns.ca": what someone types when they mean a site. */
export function addressOf(query: string): string {
  return query.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
}

interface CandidateRow {
  id: string
  key: string
  url: string
  title: string | null
  description: string | null
  buttonUrl: string | null
  tier: IndieTier
  vouchCount: number
  residentSignals: number
  linkedFromSites: number
  lastPostAt: Date | null
  ownerId: string | null
  siteRank: number | null
  itemRank: number | null
  trigram: number | null
}

const SITE_COLUMNS = Prisma.sql`s."id", s."key", s."url", s."title", s."description", s."buttonUrl", s."tier"::text AS "tier",
  s."vouchCount", s."residentSignals", s."linkedFromSites", s."lastPostAt", s."ownerId"`

async function candidates(query: string, address: string): Promise<CandidateRow[]> {
  const { fuzzy, similarTo, excluded } = splitQuery(query)
  const excludedSql = excluded
    ? Prisma.sql`AND NOT COALESCE(s.search_tsv @@ websearch_to_tsquery('english', public.immutable_unaccent(${excluded})), false)`
    : Prisma.empty
  const excludedItemSql = excluded
    ? Prisma.sql`AND NOT COALESCE(i.search_tsv @@ websearch_to_tsquery('english', public.immutable_unaccent(${excluded})), false)`
    : Prisma.empty

  return db.$queryRaw<CandidateRow[]>`
    WITH input AS (
      SELECT websearch_to_tsquery('english', public.immutable_unaccent(${query})) AS tsq,
             lower(public.immutable_unaccent(${fuzzy})) AS fuzzy,
             lower(public.immutable_unaccent(${similarTo})) AS sim
    ),
    by_site AS (
      SELECT s."id",
             COALESCE(ts_rank_cd(s.search_tsv, input.tsq), 0)::float8 AS site_rank,
             greatest(word_similarity(input.sim, COALESCE(s."title", '')), word_similarity(input.sim, s."key"))::float8 AS trigram
      FROM "Site" s CROSS JOIN input
      WHERE ${LISTED}
        AND (s.search_tsv @@ input.tsq
          OR s."key" = ${address}
          OR (length(input.fuzzy) > 2 AND (input.fuzzy <% s."title" OR input.fuzzy <% s."key")))
        ${excludedSql}
    ),
    by_item AS (
      SELECT i."siteId" AS "id", max(ts_rank_cd(i.search_tsv, input.tsq))::float8 AS item_rank
      FROM "SiteItem" i JOIN "Site" s ON s."id" = i."siteId" CROSS JOIN input
      WHERE ${LISTED} AND i.search_tsv @@ input.tsq ${excludedItemSql} ${excludedSql}
      GROUP BY i."siteId"
    ),
    cand AS (
      SELECT COALESCE(a."id", b."id") AS "id", a.site_rank, a.trigram, b.item_rank
      FROM by_site a FULL OUTER JOIN by_item b ON a."id" = b."id"
    )
    SELECT ${SITE_COLUMNS}, c.site_rank AS "siteRank", c.item_rank AS "itemRank", c.trigram
    FROM cand c JOIN "Site" s ON s."id" = c."id"
    ORDER BY greatest(COALESCE(c.site_rank, 0), COALESCE(c.item_rank, 0)) DESC, s."id"
    LIMIT ${INDIE_CANDIDATES}
  `
}

async function hydrate(rows: CandidateRow[], query: string | null, viewerId: string | null): Promise<IndieSite[]> {
  const ids = rows.map((r) => r.id)
  if (ids.length === 0) return []

  // Matching posts when searching, the newest when browsing; two per site.
  const items = await db.$queryRaw<Array<{ siteId: string; url: string; title: string | null; excerpt: string | null; publishedAt: Date | null }>>`
    SELECT "siteId", "url", "title", "excerpt", "publishedAt" FROM (
      SELECT i.*, row_number() OVER (
        PARTITION BY i."siteId"
        ORDER BY ${query ? Prisma.sql`ts_rank_cd(i.search_tsv, websearch_to_tsquery('english', public.immutable_unaccent(${query}))) DESC,` : Prisma.empty}
                 i."publishedAt" DESC NULLS LAST, i."fetchedAt" DESC
      ) AS rn
      FROM "SiteItem" i
      WHERE i."siteId" = ANY(${ids})
        ${query ? Prisma.sql`AND i.search_tsv @@ websearch_to_tsquery('english', public.immutable_unaccent(${query}))` : Prisma.empty}
    ) t WHERE rn <= 2
  `
  const postsBySite = new Map<string, IndiePost[]>()
  for (const item of items) {
    const list = postsBySite.get(item.siteId) ?? []
    list.push({
      url: item.url,
      title: item.title,
      excerpt: item.excerpt ? (query ? buildExcerpt(item.excerpt, query) : item.excerpt.slice(0, 200)) : undefined,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
    })
    postsBySite.set(item.siteId, list)
  }

  const ownerIds = [...new Set(rows.map((r) => r.ownerId).filter((id): id is string => !!id))]
  const [owners, vouches] = await Promise.all([
    ownerIds.length
      ? db.user.findMany({
          where: { id: { in: ownerIds }, profile: { visibility: 'public' } },
          select: { id: true, handles: { select: { handle: true }, take: 1 }, profile: { select: { displayName: true } } },
        })
      : [],
    viewerId ? db.vouch.findMany({ where: { userId: viewerId, siteId: { in: ids } }, select: { siteId: true } }) : [],
  ])
  const ownerById = new Map(
    owners.flatMap((o) => (o.handles[0] ? [[o.id, { handle: o.handles[0].handle, name: o.profile?.displayName || o.handles[0].handle }] as const] : []))
  )
  const vouchedIds = new Set(vouches.map((v) => v.siteId))

  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    url: r.url,
    domain: r.key,
    title: r.title?.trim() || r.key,
    description: r.description?.trim() || undefined,
    buttonUrl: r.buttonUrl,
    tier: r.tier,
    vouchCount: r.vouchCount,
    residentSignals: r.residentSignals,
    owner: r.ownerId ? ownerById.get(r.ownerId) ?? null : null,
    lastPostAt: r.lastPostAt ? new Date(r.lastPostAt).toISOString() : null,
    posts: postsBySite.get(r.id) ?? [],
    vouched: vouchedIds.has(r.id),
  }))
}

export interface IndiePage {
  results: IndieSite[]
  total: number
  /** total hit the candidate cap, so there may be more. */
  capped: boolean
}

/** Search the Indie Index. */
export async function searchIndie(
  rawQuery: string,
  { limit = 20, offset = 0, viewerId = null, now = Date.now() }: { limit?: number; offset?: number; viewerId?: string | null; now?: number } = {}
): Promise<IndiePage> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH)
  if (!query) return { results: [], total: 0, capped: false }

  const address = addressOf(query)
  const rows = await candidates(query, address)
  const ranked = rows
    .map((r) => {
      const score = indieScore(
        {
          siteRank: Number(r.siteRank) || 0,
          itemRank: Number(r.itemRank) || 0,
          trigram: Number(r.trigram) || 0,
          tier: r.tier,
          lastPostAt: r.lastPostAt ? new Date(r.lastPostAt) : null,
          residentSignals: r.residentSignals,
          linkedFromSites: r.linkedFromSites,
        },
        now
      )
      return { row: r, score: r.key === address ? 1 + score : score }
    })
    .sort((a, b) => b.score - a.score || a.row.key.localeCompare(b.row.key))

  const page = ranked.slice(offset, offset + limit).map((r) => r.row)
  return { results: await hydrate(page, query, viewerId), total: rows.length, capped: rows.length >= INDIE_CANDIDATES }
}

/**
 * Browsing with no query: community sites with something new first, newest
 * post first. Pool sites stay out of the browse list (they're a search pool).
 */
export async function browseIndie(
  { limit = 20, offset = 0, viewerId = null }: { limit?: number; offset?: number; viewerId?: string | null } = {}
): Promise<IndiePage> {
  const [rows, total] = await Promise.all([
    db.$queryRaw<CandidateRow[]>`
      SELECT ${SITE_COLUMNS}, NULL::float8 AS "siteRank", NULL::float8 AS "itemRank", NULL::float8 AS trigram
      FROM "Site" s
      WHERE s."tier" IN ('resident', 'vouched', 'community') AND s."status" IN ('active', 'stale')
      ORDER BY s."lastPostAt" DESC NULLS LAST, s."residentSignals" DESC, s."key"
      LIMIT ${limit} OFFSET ${offset}
    `,
    db.site.count({ where: { tier: { in: ['resident', 'vouched', 'community'] }, status: { in: ['active', 'stale'] } } }),
  ])
  return { results: await hydrate(rows, null, viewerId), total, capped: false }
}

/**
 * Candidates for /indie: sites one resident points at, or listed sites link
 * to, that need another resident before they're listed. Only ones the
 * refresher could read (a title, or a feed) so the list isn't bare addresses.
 */
export async function candidateSites(
  { limit = 20, offset = 0, viewerId = null }: { limit?: number; offset?: number; viewerId?: string | null } = {}
): Promise<IndiePage> {
  const where = Prisma.sql`
    s."tier" = 'candidate' AND s."status" <> 'hidden'
    AND (s."residentSignals" > 0 OR s."vouchCount" > 0 OR s."linkedFromSites" > 0)
    AND (s."title" IS NOT NULL OR s."feedUrl" IS NOT NULL)`
  const [rows, [{ n }]] = await Promise.all([
    db.$queryRaw<CandidateRow[]>`
      SELECT ${SITE_COLUMNS}, NULL::float8 AS "siteRank", NULL::float8 AS "itemRank", NULL::float8 AS trigram
      FROM "Site" s WHERE ${where}
      ORDER BY (s."residentSignals" + s."vouchCount" + s."linkedFromSites") DESC, s."lastPostAt" DESC NULLS LAST, s."key"
      LIMIT ${limit} OFFSET ${offset}
    `,
    db.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM "Site" s WHERE ${where}`,
  ])
  return { results: await hydrate(rows, null, viewerId), total: n, capped: false }
}
