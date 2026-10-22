/**
 * Clicks through members' ring strips (SCOPE.md §5): one number per ring,
 * site, doorway (next, prev, random, or the badge to the ring page) and UTC
 * day in RingDoorwayCount. No IP address, user agent or cookie is read or
 * stored. Badge loads aren't counted. Only clicks from a site we know count.
 */
import type { PrismaClient, RingDoorway } from '@prisma/client'
import { utc } from '@/lib/indie-index/sql'
import { utcDay } from '@/lib/pixel-homes/visit-count'

type Db = Pick<PrismaClient, '$executeRaw' | 'ringDoorwayCount'>

export async function countDoorway(db: Db, ringSlug: string, siteId: string, doorway: RingDoorway, now: Date = new Date()) {
  try {
    await db.$executeRaw`
      INSERT INTO "RingDoorwayCount" ("ringSlug", "siteId", "doorway", "day", "clicks")
      VALUES (${ringSlug}, ${siteId}, ${doorway}::"RingDoorway", ${utc(utcDay(now))}::date, 1)
      ON CONFLICT ("ringSlug", "siteId", "doorway", "day") DO UPDATE SET "clicks" = "RingDoorwayCount"."clicks" + 1
    `
  } catch (error) {
    // A count is never worth a visitor's click (the site may have just been removed)
    console.warn('Ring doorway count skipped:', error instanceof Error ? error.message : error)
  }
}

/** Clicks through each of these sites' strips since `since`, all rings. */
export async function clicksBySite(db: Db, siteIds: string[], since: Date): Promise<Map<string, number>> {
  if (siteIds.length === 0) return new Map()
  const rows = await db.ringDoorwayCount.groupBy({
    by: ['siteId'],
    where: { siteId: { in: siteIds }, day: { gte: utcDay(since) } },
    _sum: { clicks: true },
  })
  return new Map(rows.map((r) => [r.siteId, r._sum.clicks ?? 0]))
}

/** A ring's busiest doorways since `since`: site id → clicks, most first. */
export async function busiestDoorways(db: Db, ringSlug: string, since: Date, take = 10) {
  const rows = await db.ringDoorwayCount.groupBy({
    by: ['siteId'],
    where: { ringSlug, day: { gte: utcDay(since) } },
    _sum: { clicks: true },
    orderBy: { _sum: { clicks: 'desc' } },
    take,
  })
  return rows.map((r) => ({ siteId: r.siteId, clicks: r._sum.clicks ?? 0 }))
}

/** Every ring's clicks and arrivals since `since`, for /admin/indie. */
export async function doorwayTotals(db: Db, since: Date) {
  const rows = await db.ringDoorwayCount.groupBy({
    by: ['doorway'],
    where: { day: { gte: utcDay(since) } },
    _sum: { clicks: true },
  })
  return Object.fromEntries(rows.map((r) => [r.doorway, r._sum.clicks ?? 0])) as Partial<Record<RingDoorway, number>>
}

/** Days of counts kept (DATA_PROCESSING_REGISTER.md §1.5). */
export const DOORWAY_COUNT_MONTHS = 13

export async function pruneDoorwayCounts(db: Db, now: Date = new Date()) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - DOORWAY_COUNT_MONTHS, now.getUTCDate()))
  const { count } = await db.ringDoorwayCount.deleteMany({ where: { day: { lt: cutoff } } })
  return count
}
