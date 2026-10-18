/**
 * Kagi Small Web as the Indie Index's starting pool (SEARCH_PLAN.md §3.5).
 *
 * smallweb.txt is one feed URL per line, ~42,900 personal blogs, MIT
 * licensed (lib/indie-index/kagi/LICENSE). Pool sites are searchable but
 * rank below sites residents chose, refresh about once a month, and keep a
 * few short entries. Re-importing adds new feeds and drops pool sites that
 * left the list; sites residents picked up are never touched.
 */
import { randomUUID } from 'crypto'
import type { PrismaClient } from '@prisma/client'
import { isBlockedHost, isOptedOut, siteRefOf, type SiteRef } from './site-key'
import { loadBlockedSet } from './blocklist'

export const KAGI_SMALLWEB_URL = 'https://raw.githubusercontent.com/kagisearch/smallweb/main/smallweb.txt'
export { KAGI_SMALLWEB_HOME } from './public'

/**
 * Feed services where the feed's host isn't the person's site
 * (feeds.feedburner.com/name, www.blogger.com/feeds/id). Their feeds are
 * skipped rather than all filed under one host.
 */
export const SHARED_FEED_HOSTS = new Set(['feedburner.com', 'blogger.com', 'paragraph.com', 'feedblitz.com', 'feedpress.me'])

/** Fewer lines than this means a broken download, not a smaller list. */
export const MIN_SANE_LIST = 1000

const DAY = 24 * 60 * 60 * 1000

/** The feed URLs in smallweb.txt (http(s) only, comments and blanks skipped). */
export function parseKagiList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && /^https?:\/\/\S+$/i.test(line))
}

export interface KagiImportResult {
  listed: number
  added: number
  updated: number
  removed: number
  skipped: number
}

export async function importKagiList(
  db: PrismaClient,
  text: string,
  { now = new Date(), random = Math.random }: { now?: Date; random?: () => number } = {}
): Promise<KagiImportResult> {
  const urls = parseKagiList(text)
  if (urls.length < MIN_SANE_LIST) {
    throw new Error(`The Kagi list has only ${urls.length} feeds; refusing to import (the download probably failed)`)
  }

  const [blockedSet, optOuts] = await Promise.all([loadBlockedSet(db), db.siteOptOut.findMany({ select: { key: true } })])
  const optOutSet = new Set(optOuts.map((o) => o.key))

  const feeds = new Map<string, SiteRef & { feedUrl: string }>()
  let skipped = 0
  for (const feedUrl of urls) {
    const ref = siteRefOf(feedUrl)
    if (!ref || isBlockedHost(ref.host, blockedSet) || isBlockedHost(ref.host, SHARED_FEED_HOSTS) || isOptedOut(ref, optOutSet)) {
      skipped++
      continue
    }
    if (feeds.has(ref.key)) {
      skipped++
      continue
    }
    feeds.set(ref.key, { ...ref, feedUrl })
  }
  const keys = [...feeds.keys()]

  const existing = await db.$queryRaw<Array<{ key: string; source: string; feedUrl: string | null }>>`
    SELECT "key", "source"::text AS "source", "feedUrl" FROM "Site" WHERE "key" = ANY(${keys}::text[])
  `
  const existingByKey = new Map(existing.map((row) => [row.key, row]))

  // New pool sites, spread over a month so the rotation starts even.
  const fresh = keys.filter((key) => !existingByKey.has(key))
  let added = 0
  for (let i = 0; i < fresh.length; i += 1000) {
    const { count } = await db.site.createMany({
      data: fresh.slice(i, i + 1000).map((key) => {
        const f = feeds.get(key)!
        return {
          id: randomUUID(),
          key,
          host: f.host,
          url: f.url,
          feedUrl: f.feedUrl,
          source: 'pool' as const,
          tier: 'pool' as const,
          nextFetchAt: new Date(now.getTime() + random() * 30 * DAY),
        }
      }),
      skipDuplicates: true,
    })
    added += count
  }

  // A pool site whose feed moved; a community site that has no feed yet.
  let updated = 0
  for (const row of existing) {
    const feedUrl = feeds.get(row.key)!.feedUrl
    if (row.feedUrl === feedUrl) continue
    if (row.source === 'pool' || row.feedUrl === null) {
      await db.site.update({ where: { key: row.key }, data: { feedUrl, feedEtag: null, feedLastModified: null } })
      updated++
    }
  }

  const removed = await db.$executeRaw`
    DELETE FROM "Site" WHERE "source" = 'pool' AND "tier" = 'pool' AND NOT ("key" = ANY(${keys}::text[]))
  `

  return { listed: urls.length, added, updated, removed, skipped }
}
