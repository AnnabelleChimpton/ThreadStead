/**
 * What residents and the admin can do to the Indie Index (SEARCH_PLAN.md
 * §3.5): vouch for a site (adding it if it's new), take a vouch back, remove
 * their own site, and the admin's hide / opt-out controls. The API routes
 * under pages/api/indie and pages/api/admin/indie are thin wrappers.
 */
import type { PrismaClient } from '@prisma/client'
import { ApiError } from '@/lib/api/errors'
import { isPlatformProfile, loadBlockedSet } from './blocklist'
import { isBlockedHost, isOptedOut, siteRefOf } from './site-key'
import { recomputeSites } from './tiers'

/** New vouches per resident per day. */
export const VOUCHES_PER_DAY = 20
export const NOTE_MAX = 200

export interface VouchResult {
  siteId: string
  key: string
  tier: string
  /** The site shows up in search now. */
  listed: boolean
  /** This vouch added the site to the index. */
  added: boolean
}


async function optOutSet(db: PrismaClient) {
  return new Set((await db.siteOptOut.findMany({ select: { key: true } })).map((o) => o.key))
}

async function checkDailyLimit(db: PrismaClient, userId: string, now: Date) {
  const recent = await db.vouch.count({ where: { userId, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
  if (recent >= VOUCHES_PER_DAY) throw new ApiError(429, `That's ${VOUCHES_PER_DAY} vouches today. Try again tomorrow.`)
}

async function finish(db: PrismaClient, siteId: string, added: boolean, now: Date): Promise<VouchResult> {
  await recomputeSites(db, [siteId], now)
  const site = await db.site.findUniqueOrThrow({ where: { id: siteId }, select: { id: true, key: true, tier: true } })
  return { siteId: site.id, key: site.key, tier: site.tier, listed: site.tier !== 'candidate', added }
}

/**
 * Vouch for a site by its address. A site the index doesn't have yet is
 * added as a candidate; it's listed once a second resident points at it.
 */
export async function vouchForUrl(
  db: PrismaClient,
  { userId, url, note, baseUrl, now = new Date() }: { userId: string; url: string; note?: string | null; baseUrl: string; now?: Date }
): Promise<VouchResult> {
  const withScheme = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
  const ref = siteRefOf(withScheme)
  if (!ref) throw new ApiError(400, "That doesn't look like a web address.")
  if (ref.host === siteRefOf(baseUrl)?.host) throw new ApiError(400, "That's this site. Homes here are already in search.")
  if (isBlockedHost(ref.host, await loadBlockedSet(db)) || isPlatformProfile(withScheme)) {
    throw new ApiError(400, 'That one is on the list of big platforms the index leaves out.')
  }
  if (isOptedOut(ref, await optOutSet(db))) throw new ApiError(400, 'That site asked not to be listed.')

  const existing = await db.site.findUnique({ where: { key: ref.key }, select: { id: true, status: true } })
  if (existing?.status === 'hidden') throw new ApiError(400, "That site can't be listed right now.")
  const already = existing && (await db.vouch.findUnique({ where: { siteId_userId: { siteId: existing.id, userId } } }))
  if (!already) await checkDailyLimit(db, userId, now)

  const site =
    existing ??
    (await db.site.upsert({
      where: { key: ref.key },
      create: { key: ref.key, host: ref.host, url: ref.url, source: 'community' },
      update: {},
      select: { id: true, status: true },
    }))
  const cleanNote = note?.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX) || null
  await db.vouch.upsert({
    where: { siteId_userId: { siteId: site.id, userId } },
    create: { siteId: site.id, userId, note: cleanNote, createdAt: now },
    update: { note: cleanNote },
  })
  return finish(db, site.id, !existing, now)
}

/** Vouch for a site that's already in the index (the button on a result). */
export async function vouchForSite(
  db: PrismaClient,
  { userId, siteId, now = new Date() }: { userId: string; siteId: string; now?: Date }
): Promise<VouchResult> {
  const site = await db.site.findUnique({ where: { id: siteId }, select: { id: true, status: true } })
  if (!site || site.status === 'hidden') throw new ApiError(404, 'That site isn’t in the index.')
  const already = await db.vouch.findUnique({ where: { siteId_userId: { siteId, userId } } })
  if (!already) {
    await checkDailyLimit(db, userId, now)
    await db.vouch.create({ data: { siteId, userId, createdAt: now } })
  }
  return finish(db, siteId, false, now)
}

/** Take a vouch back. */
export async function unvouch(db: PrismaClient, { userId, siteId, now = new Date() }: { userId: string; siteId: string; now?: Date }) {
  await db.vouch.deleteMany({ where: { siteId, userId } })
  const exists = await db.site.findUnique({ where: { id: siteId }, select: { id: true } })
  return exists ? finish(db, siteId, false, now) : null
}

/**
 * Take a site out of the index for good: its owner (the resident it belongs
 * to) or the admin. It's deleted with its posts, links and vouches, and the
 * key is remembered so nothing adds it back.
 */
export async function optOutSite(
  db: PrismaClient,
  { siteId, by }: { siteId: string; by: { id: string; role: string } }
): Promise<{ key: string }> {
  const site = await db.site.findUnique({ where: { id: siteId }, select: { id: true, key: true, ownerId: true } })
  if (!site) throw new ApiError(404, 'That site isn’t in the index.')
  const isAdmin = by.role === 'admin'
  if (!isAdmin && site.ownerId !== by.id) throw new ApiError(403, 'Only the person whose site it is can remove it.')
  await db.$transaction([
    db.siteOptOut.upsert({ where: { key: site.key }, create: { key: site.key, via: isAdmin && site.ownerId !== by.id ? 'admin' : 'owner' }, update: {} }),
    db.site.delete({ where: { id: site.id } }),
  ])
  return { key: site.key }
}

/** Admin: opt a site out by address, for someone who wrote in. */
export async function optOutKey(db: PrismaClient, address: string): Promise<{ key: string; removed: number }> {
  const withScheme = /^https?:\/\//i.test(address.trim()) ? address.trim() : `https://${address.trim()}`
  const ref = siteRefOf(withScheme)
  if (!ref) throw new ApiError(400, "That doesn't look like a web address.")
  const [, removed] = await db.$transaction([
    db.siteOptOut.upsert({ where: { key: ref.key }, create: { key: ref.key, via: 'admin' }, update: {} }),
    db.site.deleteMany({ where: ref.key === ref.host ? { host: ref.host } : { key: ref.key } }),
  ])
  return { key: ref.key, removed: removed.count }
}

/** Admin: let a site back in (it comes back when something points at it again). */
export async function liftOptOut(db: PrismaClient, key: string) {
  await db.siteOptOut.deleteMany({ where: { key } })
}

/** Admin: hide or show a site in search. */
export async function setHidden(db: PrismaClient, siteId: string, hidden: boolean) {
  const site = await db.site.findUnique({ where: { id: siteId }, select: { id: true, status: true } })
  if (!site) throw new ApiError(404, 'That site isn’t in the index.')
  if (hidden) await db.site.update({ where: { id: siteId }, data: { status: 'hidden' } })
  else if (site.status === 'hidden') await db.site.update({ where: { id: siteId }, data: { status: 'active', nextFetchAt: new Date() } })
}
