/**
 * The quiet count under a pixel home: visits that don't appear in its
 * visitor trail (signed out, or signed in with "Show me in visitor trails"
 * off), as one number per home per UTC day in PixelHomeVisitCount.
 *
 * Nothing about the visitor is stored. To count a person once a day rather
 * than once per page load, each visit is reduced to an HMAC of who they look
 * like (user id, or IP address + user agent) under a random key that lives in
 * this process's memory and changes every day. The digests stay in memory
 * for that day only, so neither the key nor what was hashed is ever written
 * anywhere. Single-server deployment (server.js), so one process sees every
 * visit; a restart forgets the day's digests and may count someone twice.
 */
import { createHmac, randomBytes } from 'crypto'
import type { PrismaClient } from '@prisma/client'

/** Days of counts shown ("this week") and kept. */
export const VISIT_COUNT_DAYS = 7

/**
 * Most visitors remembered per day. Past this the day stops counting, so a
 * flood of fake visitors can't grow memory without bound.
 */
export const MAX_DIGESTS_PER_DAY = 200_000

type Db = Pick<PrismaClient, 'pixelHomeVisitCount'>

/** Who a visit looks like, before hashing. Never stored. */
export type VisitorIdentity =
  | { kind: 'user'; userId: string }
  | { kind: 'anonymous'; ip: string | null; userAgent: string | null }

/** Midnight UTC of the day `now` falls on, as a Date for a @db.Date column. */
export function utcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function dayKey(now: Date): string {
  return utcDay(now).toISOString().slice(0, 10)
}

let today: { day: string; key: Buffer; seen: Set<string> } | null = null

function forDay(now: Date) {
  const day = dayKey(now)
  if (!today || today.day !== day) today = { day, key: randomBytes(32), seen: new Set() }
  return today
}

function identityText(identity: VisitorIdentity): string {
  return identity.kind === 'user'
    ? `user\0${identity.userId}`
    : `anon\0${identity.ip ?? ''}\0${identity.userAgent ?? ''}`
}

/**
 * True the first time today this visitor is seen at this home, false after
 * (and once the day's memory is full). Remembers the visit as a side effect.
 */
export function firstVisitToday(homeOwnerId: string, identity: VisitorIdentity, now: Date = new Date()): boolean {
  const state = forDay(now)
  const digest = createHmac('sha256', state.key)
    .update(`${homeOwnerId}\0${identityText(identity)}`)
    .digest('base64url')
    .slice(0, 22)
  if (state.seen.has(digest)) return false
  if (state.seen.size >= MAX_DIGESTS_PER_DAY) return false
  state.seen.add(digest)
  return true
}

/** Add one to today's count for this home if this visitor hasn't been counted today. */
export async function countVisit(
  db: Db,
  homeOwnerId: string,
  identity: VisitorIdentity,
  now: Date = new Date()
): Promise<boolean> {
  if (!firstVisitToday(homeOwnerId, identity, now)) return false
  const day = utcDay(now)
  await db.pixelHomeVisitCount.upsert({
    where: { homeOwnerId_day: { homeOwnerId, day } },
    create: { homeOwnerId, day, visits: 1 },
    update: { visits: { increment: 1 } },
  })
  return true
}

/** The first day still counted: today and the six before it. */
export function weekStart(now: Date = new Date()): Date {
  const day = utcDay(now)
  return new Date(day.getTime() - (VISIT_COUNT_DAYS - 1) * 24 * 60 * 60 * 1000)
}

/** Visits counted at this home this week (today and the six days before). */
export async function otherVisitsThisWeek(db: Db, homeOwnerId: string, now: Date = new Date()): Promise<number> {
  const result = await db.pixelHomeVisitCount.aggregate({
    where: { homeOwnerId, day: { gte: weekStart(now) } },
    _sum: { visits: true },
  })
  return result._sum.visits ?? 0
}

/** Drop days that have fallen out of the week, for one home or (without an id) every home. */
export async function pruneVisitCounts(db: Db, now: Date = new Date(), homeOwnerId?: string): Promise<number> {
  const { count } = await db.pixelHomeVisitCount.deleteMany({
    where: { day: { lt: weekStart(now) }, ...(homeOwnerId && { homeOwnerId }) },
  })
  return count
}

/** Tests only: forget today's key and digests. */
export function resetVisitMemory(): void {
  today = null
}
