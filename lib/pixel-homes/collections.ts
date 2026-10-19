/**
 * Seasonal decoration collections (pixel homes Phase 5).
 *
 * A collection is just a name on catalog items (DecorationItem.collection,
 * e.g. "Autumn 2026"). The palette shows each as its own group, and the
 * usual release rules decide what's in it: LIMITED_TIME items only between
 * releaseStartAt and releaseEndAt (lib/pixel-homes/decoration-availability).
 *
 * An admin can mark one collection current (SiteConfig
 * `pixel_homes_current_collection`). While some of its items are out for
 * everyone, the street header says so in one line. There's no economy here:
 * nothing to collect, count or trade.
 */
import type { PrismaClient, ReleaseType } from '@prisma/client'

export const CURRENT_COLLECTION_KEY = 'pixel_homes_current_collection'
export const COLLECTION_NAME_MAX = 60

type Db = Pick<PrismaClient, 'siteConfig' | 'decorationItem'>

export interface CollectionItemWindow {
  releaseType: ReleaseType | string
  releaseStartAt: Date | null
  releaseEndAt: Date | null
}

export interface CollectionNotice {
  name: string
  /** The last day its limited items are out, when they all end. */
  until: Date | null
}

/** "Nov 30", the same for everyone (dates are stored in UTC). */
export function shortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** Whether everyone can place this item right now (no beta key or claim needed). */
export function isOutForEveryone(item: CollectionItemWindow, now: Date): boolean {
  if (item.releaseType === 'DEFAULT' || item.releaseType === 'PUBLIC') return true
  if (item.releaseType !== 'LIMITED_TIME') return false
  return !!item.releaseStartAt && !!item.releaseEndAt && item.releaseStartAt <= now && item.releaseEndAt >= now
}

/**
 * What the street says about a collection: nothing when none of its items
 * are out for everyone; an end date when everything that's out is limited.
 */
export function noticeFor(name: string, items: CollectionItemWindow[], now: Date): CollectionNotice | null {
  const out = items.filter((item) => isOutForEveryone(item, now))
  if (out.length === 0) return null
  const lasting = out.some((item) => item.releaseType !== 'LIMITED_TIME')
  if (lasting) return { name, until: null }
  const until = out.reduce<Date | null>(
    (latest, item) => (!latest || item.releaseEndAt! > latest ? item.releaseEndAt : latest),
    null
  )
  return { name, until }
}

/** "Autumn 2026 decorations are out until Nov 30." */
export function noticeText(notice: CollectionNotice): string {
  return notice.until
    ? `${notice.name} decorations are out until ${shortDate(notice.until)}.`
    : `${notice.name} decorations are out.`
}

export async function getCurrentCollectionName(db: Db): Promise<string | null> {
  const row = await db.siteConfig.findUnique({ where: { key: CURRENT_COLLECTION_KEY } })
  return row?.value.trim() || null
}

/** The current collection's line for the street, if it has items out. Never throws. */
export async function getCollectionNotice(db: Db, now: Date = new Date()): Promise<CollectionNotice | null> {
  try {
    const name = await getCurrentCollectionName(db)
    if (!name) return null
    const items = await db.decorationItem.findMany({
      where: { collection: name, isActive: true },
      select: { releaseType: true, releaseStartAt: true, releaseEndAt: true },
    })
    return noticeFor(name, items, now)
  } catch (error) {
    console.error('Collection notice skipped:', error)
    return null
  }
}

export interface CollectionSummary {
  name: string
  items: number
  /** Items everyone can place right now. */
  outNow: number
  startsAt: string | null
  endsAt: string | null
}

/** Every collection in the catalog, for the admin page. */
export async function listCollections(db: Db, now: Date = new Date()): Promise<CollectionSummary[]> {
  const items = await db.decorationItem.findMany({
    where: { collection: { not: null }, isActive: true },
    select: { collection: true, releaseType: true, releaseStartAt: true, releaseEndAt: true },
  })
  const byName = new Map<string, CollectionItemWindow[]>()
  for (const item of items) {
    const name = item.collection!.trim()
    if (!name) continue
    byName.set(name, [...(byName.get(name) ?? []), item])
  }
  const iso = (d: Date | null) => (d ? d.toISOString() : null)
  return [...byName.entries()]
    .map(([name, list]) => {
      const starts = list.map((i) => i.releaseStartAt).filter((d): d is Date => !!d)
      const ends = list.map((i) => i.releaseEndAt).filter((d): d is Date => !!d)
      return {
        name,
        items: list.length,
        outNow: list.filter((i) => isOutForEveryone(i, now)).length,
        startsAt: iso(starts.length ? new Date(Math.min(...starts.map(Number))) : null),
        endsAt: iso(ends.length ? new Date(Math.max(...ends.map(Number))) : null),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Mark a collection current (or none, with null). Only names in the catalog. */
export async function setCurrentCollection(db: Db, name: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (name === null || name.trim() === '') {
    await db.siteConfig.deleteMany({ where: { key: CURRENT_COLLECTION_KEY } })
    return { ok: true }
  }
  const clean = name.trim()
  if (clean.length > COLLECTION_NAME_MAX) return { ok: false, error: 'That collection name is too long.' }
  const exists = await db.decorationItem.findFirst({ where: { collection: clean }, select: { id: true } })
  if (!exists) return { ok: false, error: 'No decorations are in that collection.' }
  await db.siteConfig.upsert({
    where: { key: CURRENT_COLLECTION_KEY },
    create: { key: CURRENT_COLLECTION_KEY, value: clean },
    update: { value: clean },
  })
  return { ok: true }
}
