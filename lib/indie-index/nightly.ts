/**
 * One nightly Indie Index run (SEARCH_PLAN.md §3.5), started by pm2 through
 * scripts/indie-index-refresh.ts:
 *
 *   1. re-import the Kagi Small Web list when the last import is 28+ days old
 *   2. harvest residents' signals and recompute tiers
 *   3. refresh due sites (feeds, weekly homepages, new candidates)
 *   4. harvest again, so tonight's backlinks and links count tonight
 *   5. re-check residents' ring sites that are due their weekly look
 *      (lib/rings/sites.ts; the one page each owner gave, robots.txt not read),
 *      and drop ring strip click counts past their 13 months
 *
 * Each run is an IndexRun row. A run that hasn't finished and started under
 * 6 hours ago blocks another (two pm2 starts, or a manual run during the
 * nightly one). Older unfinished rows are runs that crashed.
 */
import type { PrismaClient } from '@prisma/client'
import { harvestSignals } from './harvest'
import { ACCEPT_TEXT, type Fetcher } from './http'
import { importKagiList, KAGI_SMALLWEB_URL } from './kagi'
import { refreshSites, type RefreshOptions, type RefreshStats } from './refresh'
import { recheckSites } from '@/lib/rings/sites'
import { pruneDoorwayCounts } from '@/lib/rings/counts'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const KAGI_EVERY_DAYS = 28
export const RUN_BUDGET_HOURS = 3

export class RunInProgressError extends Error {
  constructor(startedAt: Date) {
    super(`Another Indie Index run started at ${startedAt.toISOString()} and hasn't finished`)
    this.name = 'RunInProgressError'
  }
}

export interface NightlyOptions {
  /** Polite fetcher for sites. */
  fetcher: Fetcher
  /** Plain fetcher for the Kagi list (raw.githubusercontent.com). */
  listFetcher: Fetcher
  baseUrl: string
  now?: () => Date
  log?: (line: string) => void
  refresh?: Partial<Pick<RefreshOptions, 'concurrency' | 'poolPerRun' | 'candidatesPerRun' | 'random'>>
}

async function claimRun(db: PrismaClient, kind: string, now: Date) {
  const running = await db.indexRun.findFirst({
    where: { kind, finishedAt: null, startedAt: { gt: new Date(now.getTime() - 6 * HOUR) } },
    orderBy: { startedAt: 'desc' },
  })
  if (running) throw new RunInProgressError(running.startedAt)
  return db.indexRun.create({ data: { kind, startedAt: now } })
}

/** Fetch and import the Kagi list now, as its own IndexRun. */
export async function runKagiImport(db: PrismaClient, { listFetcher, now = () => new Date(), log = () => {} }: Pick<NightlyOptions, 'listFetcher' | 'now' | 'log'>) {
  const run = await claimRun(db, 'kagi_import', now())
  try {
    const res = await listFetcher({ url: KAGI_SMALLWEB_URL, accept: ACCEPT_TEXT, maxBytes: 20 * 1024 * 1024 })
    if (res.status !== 200) throw new Error(`Kagi list returned ${res.status}`)
    const result = await importKagiList(db, res.body, { now: now() })
    log(`Kagi Small Web: ${result.listed} feeds listed, ${result.added} added, ${result.updated} updated, ${result.removed} removed, ${result.skipped} skipped`)
    await db.indexRun.update({ where: { id: run.id }, data: { finishedAt: now(), fetched: 1, itemsAdded: result.added } })
    return result
  } catch (error) {
    await db.indexRun.update({ where: { id: run.id }, data: { finishedAt: now(), failed: 1, error: String(error instanceof Error ? error.message : error).slice(0, 500) } })
    throw error
  }
}

export async function runNightly(db: PrismaClient, options: NightlyOptions): Promise<RefreshStats> {
  const now = options.now ?? (() => new Date())
  const log = options.log ?? (() => {})
  const run = await claimRun(db, 'nightly', now())

  try {
    const lastImport = await db.indexRun.findFirst({
      where: { kind: 'kagi_import', finishedAt: { not: null }, error: null },
      orderBy: { startedAt: 'desc' },
    })
    if (!lastImport || now().getTime() - lastImport.startedAt.getTime() >= KAGI_EVERY_DAYS * DAY) {
      // A failed import shouldn't cost the community sites their night.
      await runKagiImport(db, { listFetcher: options.listFetcher, now, log }).catch((error) => log(`Kagi import failed: ${error instanceof Error ? error.message : error}`))
    }

    const first = await harvestSignals(db, { baseUrl: options.baseUrl, now: now() })
    log(`Harvest: ${first.signals} signals, ${first.sitesCreated} new sites, ${first.linkCandidatesCreated} link candidates, ${first.signalsRemoved} signals and ${first.candidatesRemoved} candidates removed`)

    const stats = await refreshSites(db, {
      ...options.refresh,
      fetcher: options.fetcher,
      baseUrl: options.baseUrl,
      now,
      deadline: new Date(now().getTime() + RUN_BUDGET_HOURS * HOUR),
      log,
    })
    log(`Refresh: ${stats.sites} sites, ${stats.fetched} requests, ${stats.notModified} unchanged, ${stats.failed} failed, ${stats.itemsAdded} new entries, ${stats.optedOut} opted out, ${stats.dropped} dropped`)

    await harvestSignals(db, { baseUrl: options.baseUrl, now: now() })

    // Its own failure shouldn't cost the Index its night
    const rings = await recheckSites(db, { fetcher: options.fetcher, baseUrl: options.baseUrl, now, log }).catch((error) => {
      log(`Ring site re-check failed: ${error instanceof Error ? error.message : error}`)
      return null
    })
    if (rings) log(`Ring sites: ${rings.checked} checked, ${rings.ok} found, ${rings.missed} missed, ${rings.resting} now resting, ${rings.removed} removed`)
    await pruneDoorwayCounts(db, now()).catch(() => {})

    await db.indexRun.update({
      where: { id: run.id },
      data: { finishedAt: now(), fetched: stats.fetched, notModified: stats.notModified, failed: stats.failed, itemsAdded: stats.itemsAdded },
    })
    return stats
  } catch (error) {
    await db.indexRun.update({
      where: { id: run.id },
      data: { finishedAt: now(), error: String(error instanceof Error ? error.message : error).slice(0, 500) },
    })
    throw error
  }
}
