/**
 * Indie Index listing rule and trust tiers (SEARCH_PLAN.md §3.5).
 *
 * A signal (SiteSignal or Vouch) counts once per resident per site, and only
 * once the resident's account is RESIDENT_MIN_AGE_DAYS old. Younger signals
 * are stored and start counting by themselves on a later recompute. A
 * suspended or banned account's signals, vouches and ownership don't count
 * while the restriction lasts (lib/domain/users/moderation.ts); moderateUser
 * recomputes their sites right away, and the nightly harvest picks up a
 * suspension that ended by itself.
 *
 *   resident   the site's owner (an `own` signal) is a counting resident
 *   vouched    2+ counting residents, at least one of them vouched
 *   community  2+ counting residents, or moved over from IndexedSite
 *   pool       Kagi Small Web only
 *   candidate  anything else: stored, not searchable
 *
 * A pool site that reaches a community tier becomes a community site
 * (nightly refresh, more items).
 */
import { Prisma, type PrismaClient } from '@prisma/client'
import { utc } from './sql'

export const RESIDENT_MIN_AGE_DAYS = 7

/** Tiers that show up in search (with status active or stale). */
export const LISTED_TIERS = ['resident', 'vouched', 'community', 'pool'] as const

/**
 * `alias` is a "User" row that isn't suspended, banned or leaving at `now`. The same
 * rule as activeAccountSql in lib/domain/users/moderation.ts, written against
 * a joined row and the run's own clock (this file runs from scripts too).
 */
function activeAt(alias: string, now: Date): Prisma.Sql {
  const u = Prisma.raw(alias)
  return Prisma.sql`(${u}."deletesAt" IS NULL AND (${u}."moderationStatus" = 'active'
    OR (${u}."moderationStatus" = 'suspended' AND ${u}."suspendedUntil" <= ${utc(now)})))`
}

/**
 * Recompute residentSignals, vouchCount, tier and source for the given sites
 * (all sites when `siteIds` is omitted). Returns how many rows were updated.
 */
export async function recomputeSites(
  db: PrismaClient | Prisma.TransactionClient,
  siteIds?: string[],
  now: Date = new Date()
): Promise<number> {
  if (siteIds && siteIds.length === 0) return 0
  const cutoff = new Date(now.getTime() - RESIDENT_MIN_AGE_DAYS * 24 * 60 * 60 * 1000)
  const only = siteIds ? Prisma.sql`AND s."id" = ANY(${siteIds})` : Prisma.empty

  return db.$executeRaw`
    WITH people AS (
      SELECT "siteId", "userId", false AS vouched FROM "SiteSignal"
      UNION ALL
      SELECT "siteId", "userId", true AS vouched FROM "Vouch"
    ),
    counted AS (
      SELECT p."siteId",
             count(DISTINCT p."userId") AS residents,
             count(DISTINCT p."userId") FILTER (WHERE p.vouched) AS vouchers
      FROM people p
      JOIN "User" u ON u."id" = p."userId" AND u."createdAt" <= ${utc(cutoff)} AND ${activeAt('u', now)}
      GROUP BY p."siteId"
    ),
    vouches AS (
      SELECT v."siteId", count(*) AS n
      FROM "Vouch" v JOIN "User" u ON u."id" = v."userId" AND ${activeAt('u', now)}
      GROUP BY v."siteId"
    ),
    next AS (
      SELECT s."id",
             COALESCE(c.residents, 0)::int AS residents,
             COALESCE(v.n, 0)::int AS vouch_count,
             CASE
               WHEN EXISTS (
                 SELECT 1 FROM "User" o
                 WHERE o."id" = s."ownerId" AND o."createdAt" <= ${utc(cutoff)} AND ${activeAt('o', now)}
               )
                 THEN 'resident'
               WHEN COALESCE(c.residents, 0) >= 2 AND COALESCE(c.vouchers, 0) >= 1 THEN 'vouched'
               WHEN COALESCE(c.residents, 0) >= 2 OR s."grandfathered" THEN 'community'
               WHEN s."source" = 'pool' THEN 'pool'
               ELSE 'candidate'
             END AS tier
      FROM "Site" s
      LEFT JOIN counted c ON c."siteId" = s."id"
      LEFT JOIN vouches v ON v."siteId" = s."id"
      WHERE true ${only}
    )
    UPDATE "Site" s
    SET "residentSignals" = next.residents,
        "vouchCount" = next.vouch_count,
        "tier" = next.tier::"SiteTier",
        "source" = CASE WHEN next.tier IN ('resident', 'vouched', 'community') THEN 'community'::"SiteSource" ELSE s."source" END,
        "updatedAt" = ${utc(now)}
    FROM next
    WHERE s."id" = next."id"
      AND (s."residentSignals" IS DISTINCT FROM next.residents
        OR s."vouchCount" IS DISTINCT FROM next.vouch_count
        OR s."tier"::text IS DISTINCT FROM next.tier
        OR (next.tier IN ('resident', 'vouched', 'community') AND s."source" <> 'community'))
  `
}

/**
 * The sites `userId` owns, points at or vouched for: the ones whose tier can
 * change when that account is suspended, banned, lifted or deleted. Read it
 * before a delete (the cascade takes the signals with it).
 */
export async function sitesTouchedBy(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string
): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Site" WHERE "ownerId" = ${userId}
    UNION SELECT "siteId" FROM "SiteSignal" WHERE "userId" = ${userId}
    UNION SELECT "siteId" FROM "Vouch" WHERE "userId" = ${userId}
  `
  return rows.map((r) => r.id)
}
