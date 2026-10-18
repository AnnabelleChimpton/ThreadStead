/**
 * Move the old IndexedSite rows that a person chose into the Indie Index
 * (SEARCH_PLAN.md §3.5). Run by scripts/indie-index-migrate-legacy.ts.
 *
 * Only rows a resident submitted (`submittedBy`) or a moderator verified
 * (`verifiedBy`) move. `communityValidated` is ignored: the seeder set it on
 * its own rows. Everything else is left for the drop migration.
 *
 * Each moved site is grandfathered (listed at `community` tier even with one
 * signal). The submitter, the verifier and anyone who voted it up become
 * vouches. Safe to re-run: sites are matched by key, vouches skip duplicates,
 * and an existing site keeps its own title and description.
 */
import type { PrismaClient } from '@prisma/client'
import { isPlatformProfile, loadBlockedSet } from './blocklist'
import { isBlockedHost, isOptedOut, siteRefOf, type SiteRef } from './site-key'
import { recomputeSites } from './tiers'

/** Old SiteVote types that mean "this is good". `broken` and `spam` don't. */
export const POSITIVE_VOTE_TYPES = ['upvote', 'quality', 'interesting', 'helpful', 'creative']

export interface LegacySite extends SiteRef {
  title: string | null
  description: string | null
  /** Users whose submission, verification or up-vote becomes a vouch. */
  voucherIds: string[]
  /** The IndexedSite rows merged into this site. */
  fromUrls: string[]
}

export interface LegacyPlan {
  /** IndexedSite rows a person submitted or verified. */
  considered: number
  sites: LegacySite[]
  skipped: Array<{ url: string; reason: 'not a site url' | 'blocked host' | 'opted out' }>
}

export interface LegacyResult {
  sitesCreated: number
  sitesUpdated: number
  vouchesCreated: number
}

function isHomepage(url: string, ref: SiteRef): boolean {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/?$/, '/') === ref.url.replace(/\/?$/, '/')
  } catch {
    return false
  }
}

function clean(text: string | null | undefined): string | null {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  return t || null
}

/** Read-only: what a run would move. */
export async function planLegacyMove(db: PrismaClient): Promise<LegacyPlan> {
  const rows = await db.indexedSite.findMany({
    where: { OR: [{ submittedBy: { not: null } }, { verifiedBy: { not: null } }] },
    select: {
      url: true,
      title: true,
      description: true,
      submittedBy: true,
      verifiedBy: true,
      votes: { where: { voteType: { in: POSITIVE_VOTE_TYPES } }, select: { userId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  const [blockedSet, optOuts] = await Promise.all([loadBlockedSet(db), db.siteOptOut.findMany({ select: { key: true } })])
  const optOutSet = new Set(optOuts.map((o) => o.key))

  const byKey = new Map<string, LegacySite>()
  const skipped: LegacyPlan['skipped'] = []
  for (const row of rows) {
    const ref = isPlatformProfile(row.url) ? null : siteRefOf(row.url)
    if (!ref) {
      skipped.push({ url: row.url, reason: 'not a site url' })
      continue
    }
    if (isBlockedHost(ref.host, blockedSet)) {
      skipped.push({ url: row.url, reason: 'blocked host' })
      continue
    }
    if (isOptedOut(ref, optOutSet)) {
      skipped.push({ url: row.url, reason: 'opted out' })
      continue
    }

    const people = [row.submittedBy, row.verifiedBy, ...row.votes.map((v) => v.userId)].filter(
      (id): id is string => !!id
    )
    const existing = byKey.get(ref.key)
    if (!existing) {
      byKey.set(ref.key, {
        ...ref,
        title: clean(row.title),
        description: clean(row.description),
        voucherIds: [...new Set(people)],
        fromUrls: [row.url],
      })
      continue
    }
    existing.voucherIds = [...new Set([...existing.voucherIds, ...people])]
    existing.fromUrls.push(row.url)
    // The homepage row's text describes the site better than a post's does.
    if (isHomepage(row.url, ref) || !existing.title) {
      existing.title = clean(row.title) ?? existing.title
      existing.description = clean(row.description) ?? existing.description
    }
  }

  return { considered: rows.length, sites: [...byKey.values()], skipped }
}

/** Write a plan from planLegacyMove(). */
export async function applyLegacyMove(db: PrismaClient, plan: LegacyPlan): Promise<LegacyResult> {
  const result: LegacyResult = { sitesCreated: 0, sitesUpdated: 0, vouchesCreated: 0 }
  const siteIds: string[] = []

  for (const site of plan.sites) {
    await db.$transaction(async (tx) => {
      const existing = await tx.site.findUnique({ where: { key: site.key }, select: { id: true, title: true, description: true } })
      const row = existing
        ? await tx.site.update({
            where: { id: existing.id },
            data: {
              grandfathered: true,
              title: existing.title ?? site.title,
              description: existing.description ?? site.description,
            },
            select: { id: true },
          })
        : await tx.site.create({
            data: {
              key: site.key,
              host: site.host,
              url: site.url,
              title: site.title,
              description: site.description,
              source: 'community',
              grandfathered: true,
            },
            select: { id: true },
          })
      if (existing) result.sitesUpdated++
      else result.sitesCreated++
      siteIds.push(row.id)

      if (site.voucherIds.length > 0) {
        const { count } = await tx.vouch.createMany({
          data: site.voucherIds.map((userId) => ({ siteId: row.id, userId })),
          skipDuplicates: true,
        })
        result.vouchesCreated += count
      }
    })
  }

  await recomputeSites(db, siteIds)
  return result
}
