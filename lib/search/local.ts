/**
 * On-site search candidates: Postgres full-text search + pg_trgm.
 *
 * Each fetcher returns the top CANDIDATES_PER_TYPE rows for one type with raw
 * relevance signals; lib/search/relevance.ts blends them into one order.
 * The columns, triggers and indexes come from
 * prisma/migrations/20261017000000_add_search_fts.
 *
 * - websearch_to_tsquery: quotes are phrases, `-word` excludes, `or` works,
 *   and malformed input never errors.
 * - word_similarity (`<%`, GIN-indexed) on handles, display names and titles
 *   catches partial words and typos ("nor", "writting").
 * - Visibility and blocks are in the WHERE, so nothing the viewer may not
 *   see is fetched and then dropped after paging.
 *
 * Every value from the request is a bound parameter (Prisma.sql), never
 * concatenated into the SQL.
 */
import { Prisma } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { escapeLike } from './query'
import type { RelevanceSignals } from './relevance'
import { activeAccountSql } from '@/lib/domain/users/moderation'

/**
 * Rows read per type before blending. Paging walks the blended list, so a
 * type's results stop after this many — ample for people and pages; posts
 * deeper than this need a narrower query.
 */
export const CANDIDATES_PER_TYPE = 100

/** Longer queries are cut to this many characters. */
export const MAX_QUERY_LENGTH = 200

type Viewer = string | null

// --------------------------------------------------- visibility & blocks --
// The SQL form of lib/domain/posts/visibility.ts (allowedVisibilities):
//   public    everyone
//   followers viewer → owner follow is accepted
//   friends   accepted both ways
//   private   the owner only
// The profile API (pages/api/profile/[username].ts) applies the same rules to
// Profile.visibility. tests/db/search.dbtest.ts checks this SQL against
// allowedVisibilities() for every viewer relationship.

/** `follower` has an accepted follow of `followee`. */
function follows(follower: Prisma.Sql, followee: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`EXISTS (SELECT 1 FROM "Follow" f WHERE f."followerId" = ${follower} AND f."followeeId" = ${followee} AND f.status = 'accepted')`
}

function visibleTo(viewer: Viewer, visibility: Prisma.Sql, owner: Prisma.Sql): Prisma.Sql {
  const v = Prisma.sql`${viewer}::text`
  return Prisma.sql`(
    ${visibility} = 'public'
    OR (${v} IS NOT NULL AND (
      ${owner} = ${v}
      OR (${visibility} IN ('followers', 'friends')
          AND ${follows(v, owner)}
          AND (${visibility} = 'followers' OR ${follows(owner, v)}))
    ))
  )`
}

/** Neither side has blocked the other. */
function notBlockedEitherWay(viewer: Viewer, other: Prisma.Sql): Prisma.Sql {
  const v = Prisma.sql`${viewer}::text`
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM "UserBlock" b
    WHERE (b."blockerId" = ${v} AND b."blockedUserId" = ${other})
       OR (b."blockerId" = ${other} AND b."blockedUserId" = ${v})
  )`
}

function sharesRing(viewer: Viewer, other: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "ThreadRingMember" a
    JOIN "ThreadRingMember" b ON b."threadRingId" = a."threadRingId"
    WHERE a."userId" = ${viewer}::text AND b."userId" = ${other}
  )`
}

// ------------------------------------------------------------ query split --

/**
 * websearch_to_tsquery understands quotes and `-word`; trigram matching
 * doesn't. So trigrams only see the positive words, a quoted query skips
 * trigram *matching* (a phrase means "exactly this"), and the `-words` are
 * applied to every row however it matched.
 */
export function splitQuery(query: string): { fuzzy: string; similarTo: string; excluded: string } {
  const tokens = query.split(/\s+/).filter(Boolean)
  const positive = tokens.filter((t) => !t.startsWith('-') && t.toLowerCase() !== 'or').join(' ')
  const excluded = tokens
    .filter((t) => t.length > 1 && t.startsWith('-'))
    .map((t) => t.slice(1))
    .join(' or ')
  const similarTo = positive.replace(/"/g, '').trim()
  return { fuzzy: query.includes('"') ? '' : similarTo, similarTo, excluded }
}

/** `AND NOT (tsv @@ any excluded word)`, or nothing. */
function excluding(tsv: Prisma.Sql, config: 'english' | 'simple', excluded: string): Prisma.Sql {
  if (!excluded) return Prisma.empty
  return Prisma.sql`AND NOT COALESCE(${tsv} @@ websearch_to_tsquery(${Prisma.raw(`'${config}'`)}, public.immutable_unaccent(${excluded})), false)`
}

/** Candidate pre-order inside SQL: exact first, then text + trigram. */
const PRE_ORDER = Prisma.sql`exact DESC, (0.55 * "textRank" / ("textRank" + 0.3) + 0.15 * trigram) DESC`

interface RawRow {
  id: string
  textRank: number | null
  trigram: number | null
  exact: boolean | null
  activityAt: Date | null
  follows: boolean | null
  sharedRing: boolean | null
}

function toSignals(type: RelevanceSignals['type'], rows: RawRow[]): RelevanceSignals[] {
  return rows.map((r) => ({
    type,
    id: r.id,
    textRank: Number(r.textRank) || 0,
    trigram: Number(r.trigram) || 0,
    exact: !!r.exact,
    activityAt: r.activityAt ? new Date(r.activityAt) : null,
    follows: !!r.follows,
    sharedRing: !!r.sharedRing,
  }))
}

// ------------------------------------------------------------------ posts --

export async function postCandidates(query: string, viewer: Viewer, take = CANDIDATES_PER_TYPE) {
  const v = Prisma.sql`${viewer}::text`
  const { fuzzy, similarTo, excluded } = splitQuery(query)
  const rows = await db.$queryRaw<RawRow[]>`
    WITH input AS (
      SELECT websearch_to_tsquery('english', public.immutable_unaccent(${query})) AS tsq,
             lower(public.immutable_unaccent(${query})) AS raw,
             lower(public.immutable_unaccent(${fuzzy})) AS fuzzy,
             lower(public.immutable_unaccent(${similarTo})) AS sim
    ),
    matched AS (
      SELECT p.id, p."authorId", p."createdAt",
             COALESCE(ts_rank_cd(p.search_tsv, input.tsq), 0)::float8 AS "textRank",
             word_similarity(input.sim, p.title)::float8 AS trigram,
             (lower(public.immutable_unaccent(p.title)) = input.raw) AS exact
      FROM "Post" p CROSS JOIN input
      WHERE (p.search_tsv @@ input.tsq OR (input.fuzzy <> '' AND input.fuzzy <% p.title))
        ${excluding(Prisma.sql`p.search_tsv`, 'english', excluded)}
        -- comment-only shadows of RingHub posts (pages/api/comments/[postId].ts)
        AND p.platform IS DISTINCT FROM 'ringhub'
        AND ${visibleTo(viewer, Prisma.sql`p.visibility`, Prisma.sql`p."authorId"`)}
        AND ${notBlockedEitherWay(viewer, Prisma.sql`p."authorId"`)}
        AND ${activeAccountSql(Prisma.sql`p."authorId"`)}
        AND NOT EXISTS (
          SELECT 1 FROM "PostThreadRing" ptr
          JOIN "UserBlock" b ON b."blockedThreadRingId" = ptr."threadRingId"
          WHERE ptr."postId" = p.id AND b."blockerId" = ${v}
        )
        AND EXISTS (SELECT 1 FROM "Handle" h WHERE h."userId" = p."authorId")
    ),
    cand AS (
      SELECT * FROM matched ORDER BY ${PRE_ORDER}, "createdAt" DESC, id LIMIT ${take}
    )
    SELECT c.id, c."textRank", c.trigram, c.exact, c."createdAt" AS "activityAt",
           ${follows(v, Prisma.sql`c."authorId"`)} AS follows,
           (EXISTS (
              SELECT 1 FROM "PostThreadRing" ptr
              JOIN "ThreadRingMember" m ON m."threadRingId" = ptr."threadRingId"
              WHERE ptr."postId" = c.id AND m."userId" = ${v}
            ) OR ${sharesRing(viewer, Prisma.sql`c."authorId"`)}) AS "sharedRing"
    FROM cand c
  `
  return toSignals('post', rows)
}

// ------------------------------------------------------------------ users --

export async function userCandidates(query: string, viewer: Viewer, take = CANDIDATES_PER_TYPE) {
  const v = Prisma.sql`${viewer}::text`
  const { fuzzy, similarTo, excluded } = splitQuery(query)
  const strip = (s: string) => s.replace(/^@+/, '').trim()
  // Prefix matches cover 1–2 character queries, where trigrams can't help.
  const handlePrefix = strip(fuzzy) ? `${escapeLike(strip(fuzzy))}%` : null
  const namePrefix = fuzzy ? `${escapeLike(fuzzy)}%` : null

  const rows = await db.$queryRaw<RawRow[]>`
    WITH input AS (
      SELECT websearch_to_tsquery('simple', public.immutable_unaccent(${query})) AS tsq,
             lower(public.immutable_unaccent(${query})) AS raw,
             lower(public.immutable_unaccent(${fuzzy})) AS fuzzy,
             lower(public.immutable_unaccent(${similarTo})) AS sim,
             lower(${strip(fuzzy)}) AS hfuzzy,
             lower(${strip(similarTo)}) AS hsim,
             lower(${strip(query)}) AS hq
    ),
    matched AS (
      SELECT h."userId" AS id FROM "Handle" h CROSS JOIN input
      WHERE (input.hfuzzy <> '' AND input.hfuzzy <% h.handle) OR h.handle ILIKE ${handlePrefix}
      UNION
      SELECT pr."userId" FROM "Profile" pr CROSS JOIN input
      WHERE pr.search_tsv @@ input.tsq
         OR (input.fuzzy <> '' AND input.fuzzy <% pr."displayName")
         OR pr."displayName" ILIKE ${namePrefix}
    ),
    scored AS (
      SELECT u.id,
             COALESCE(ts_rank_cd(pr.search_tsv, input.tsq), 0)::float8 AS "textRank",
             GREATEST(hs.sim, COALESCE(word_similarity(input.sim, pr."displayName"), 0))::float8 AS trigram,
             (hs.exact OR COALESCE(lower(public.immutable_unaccent(pr."displayName")) = input.raw, false)) AS exact
      FROM matched m
      JOIN "User" u ON u.id = m.id
      CROSS JOIN input
      JOIN LATERAL (
        SELECT max(word_similarity(input.hsim, h.handle)) AS sim, bool_or(lower(h.handle) = input.hq) AS exact
        FROM "Handle" h WHERE h."userId" = u.id
      ) hs ON hs.sim IS NOT NULL
      LEFT JOIN "Profile" pr ON pr."userId" = u.id
      -- No profile row means public, as on the profile page.
      WHERE (pr.id IS NULL OR ${visibleTo(viewer, Prisma.sql`pr.visibility`, Prisma.sql`u.id`)})
        AND ${notBlockedEitherWay(viewer, Prisma.sql`u.id`)}
        AND ${activeAccountSql(Prisma.sql`u.id`)}
        ${excluding(Prisma.sql`pr.search_tsv`, 'simple', excluded)}
    ),
    cand AS (
      SELECT * FROM scored ORDER BY ${PRE_ORDER}, id LIMIT ${take}
    )
    SELECT c.id, c."textRank", c.trigram, c.exact,
           (SELECT max(p."createdAt") FROM "Post" p WHERE p."authorId" = c.id AND p.visibility = 'public') AS "activityAt",
           ${follows(v, Prisma.sql`c.id`)} AS follows,
           ${sharesRing(viewer, Prisma.sql`c.id`)} AS "sharedRing"
    FROM cand c
  `
  return toSignals('user', rows)
}

// ------------------------------------------------------------------ pages --

export async function pageCandidates(query: string, take = CANDIDATES_PER_TYPE) {
  const { fuzzy, similarTo, excluded } = splitQuery(query)
  const rows = await db.$queryRaw<RawRow[]>`
    WITH input AS (
      SELECT websearch_to_tsquery('english', public.immutable_unaccent(${query})) AS tsq,
             lower(public.immutable_unaccent(${query})) AS raw,
             lower(public.immutable_unaccent(${fuzzy})) AS fuzzy,
             lower(public.immutable_unaccent(${similarTo})) AS sim
    ),
    matched AS (
      SELECT c.id, c."updatedAt" AS "activityAt",
             COALESCE(ts_rank_cd(c.search_tsv, input.tsq), 0)::float8 AS "textRank",
             word_similarity(input.sim, c.title)::float8 AS trigram,
             (lower(public.immutable_unaccent(c.title)) = input.raw OR lower(c.slug) = input.raw) AS exact
      FROM "CustomPage" c CROSS JOIN input
      WHERE c.published AND (c.search_tsv @@ input.tsq OR (input.fuzzy <> '' AND input.fuzzy <% c.title))
        ${excluding(Prisma.sql`c.search_tsv`, 'english', excluded)}
    )
    SELECT * FROM matched ORDER BY ${PRE_ORDER}, id LIMIT ${take}
  `
  return toSignals('page', rows)
}

// ------------------------------------------------------------------ homes --
// Pixel homes by their own words: title, sign board and description. Owner
// names are left to People, which shows the house too. No stored tsvector:
// one row per resident, three short fields, so it's computed per query (add a
// trigger-maintained column like Post's if this table ever gets big).

export async function homeCandidates(query: string, viewer: Viewer, take = CANDIDATES_PER_TYPE) {
  const { fuzzy, similarTo, excluded } = splitQuery(query)
  const tsv = Prisma.sql`(
    setweight(to_tsvector('english', public.immutable_unaccent(COALESCE(h."houseTitle", ''))), 'A') ||
    setweight(to_tsvector('english', public.immutable_unaccent(COALESCE(h."houseBoardText", ''))), 'B') ||
    setweight(to_tsvector('english', public.immutable_unaccent(COALESCE(h."houseDescription", ''))), 'C')
  )`
  const rows = await db.$queryRaw<RawRow[]>`
    WITH input AS (
      SELECT websearch_to_tsquery('english', public.immutable_unaccent(${query})) AS tsq,
             lower(public.immutable_unaccent(${query})) AS raw,
             lower(public.immutable_unaccent(${fuzzy})) AS fuzzy,
             lower(public.immutable_unaccent(${similarTo})) AS sim
    ),
    matched AS (
      SELECT h."userId" AS id, h."updatedAt" AS "activityAt",
             COALESCE(ts_rank_cd(${tsv}, input.tsq), 0)::float8 AS "textRank",
             GREATEST(
               COALESCE(word_similarity(input.sim, h."houseTitle"), 0),
               COALESCE(word_similarity(input.sim, h."houseBoardText"), 0)
             )::float8 AS trigram,
             COALESCE(lower(public.immutable_unaccent(h."houseTitle")) = input.raw, false) AS exact
      FROM "UserHomeConfig" h
      CROSS JOIN input
      LEFT JOIN "Profile" pr ON pr."userId" = h."userId"
      WHERE COALESCE(h."houseTitle", h."houseBoardText", h."houseDescription") IS NOT NULL
        AND (${tsv} @@ input.tsq
             OR (input.fuzzy <> '' AND (input.fuzzy <% h."houseTitle" OR input.fuzzy <% h."houseBoardText")))
        ${excluding(tsv, 'english', excluded)}
        AND (pr.id IS NULL OR ${visibleTo(viewer, Prisma.sql`pr.visibility`, Prisma.sql`h."userId"`)})
        AND ${notBlockedEitherWay(viewer, Prisma.sql`h."userId"`)}
        AND ${activeAccountSql(Prisma.sql`h."userId"`)}
        AND EXISTS (SELECT 1 FROM "Handle" hd WHERE hd."userId" = h."userId")
    )
    SELECT * FROM matched ORDER BY ${PRE_ORDER}, id LIMIT ${take}
  `
  return toSignals('home', rows)
}

// -------------------------------------------------------------- hydration --
// Display fields for the page of results only.

/** What a house thumbnail needs (components/pixel-homes/HouseSVG). */
export const HOUSE_SELECT = {
  houseTemplate: true,
  palette: true,
  wallColor: true,
  roofColor: true,
  trimColor: true,
  windowColor: true,
  detailColor: true,
  windowStyle: true,
  doorStyle: true,
  roofTrim: true,
} as const

export function hydratePosts(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return db.post.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      bodyText: true,
      bodyMarkdown: true,
      bodyHtml: true,
      createdAt: true,
      author: {
        select: {
          handles: { take: 1, orderBy: { handle: 'asc' }, select: { handle: true } },
          profile: { select: { displayName: true } },
        },
      },
      _count: { select: { comments: { where: { status: 'visible' } } } },
      threadRings: {
        take: 1,
        orderBy: { addedAt: 'asc' },
        select: { threadRing: { select: { name: true, slug: true } } },
      },
    },
  })
}

export function hydrateUsers(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return db.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      handles: { take: 1, orderBy: { handle: 'asc' }, select: { handle: true } },
      profile: { select: { displayName: true, bio: true, avatarThumbnailUrl: true, avatarUrl: true } },
      homeConfig: { select: HOUSE_SELECT },
      _count: { select: { posts: { where: { visibility: 'public' } }, followers: true } },
    },
  })
}

export function hydratePages(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return db.customPage.findMany({
    where: { id: { in: ids }, published: true },
    select: { id: true, slug: true, title: true, content: true },
  })
}

export function hydrateHomes(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return db.userHomeConfig.findMany({
    where: { userId: { in: ids } },
    select: {
      ...HOUSE_SELECT,
      userId: true,
      houseTitle: true,
      houseBoardText: true,
      houseDescription: true,
      user: {
        select: {
          handles: { take: 1, orderBy: { handle: 'asc' }, select: { handle: true } },
          profile: { select: { displayName: true } },
        },
      },
    },
  })
}
