#!/usr/bin/env npx tsx

/**
 * The Indie Index nightly job (SEARCH_PLAN.md §3.5, lib/indie-index/nightly.ts).
 * pm2 starts it every night from ecosystem.indie-index.config.cjs.
 *
 * Usage:
 *   npx tsx scripts/indie-index-refresh.ts                  # the nightly run
 *   npx tsx scripts/indie-index-refresh.ts --harvest-only   # residents' signals and tiers only, no fetching
 *   npx tsx scripts/indie-index-refresh.ts --import-kagi    # import the Kagi Small Web list now
 *   npx tsx scripts/indie-index-refresh.ts --site jvns.ca   # refresh one site now, due or not
 *
 * Uses DATABASE_URL and NEXT_PUBLIC_BASE_URL from the environment.
 */

import './load-env';
import { db } from '../lib/config/database/connection';
import { harvestSignals } from '../lib/indie-index/harvest';
import { botUserAgent, createHttpFetcher, politeFetcher } from '../lib/indie-index/http';
import { runKagiImport, runNightly } from '../lib/indie-index/nightly';
import { refreshSites } from '../lib/indie-index/refresh';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://homepageagain.com';
const log = (line: string) => console.log(`${new Date().toISOString()} ${line}`);

async function main() {
  const args = process.argv.slice(2);
  const plain = createHttpFetcher({ userAgent: botUserAgent(baseUrl) });
  const polite = politeFetcher(plain, { gapMs: 2000 });

  if (args.includes('--harvest-only')) {
    const result = await harvestSignals(db, { baseUrl });
    log(`Harvest: ${JSON.stringify(result)}`);
    return;
  }
  if (args.includes('--import-kagi')) {
    await runKagiImport(db, { listFetcher: plain, log });
    return;
  }
  const siteAt = args.indexOf('--site');
  if (siteAt !== -1) {
    const key = args[siteAt + 1];
    if (!key) throw new Error('--site needs a key, like jvns.ca');
    const stats = await refreshSites(db, { fetcher: polite, baseUrl, onlyKeys: [key], log });
    log(`Refresh: ${JSON.stringify(stats)}`);
    return;
  }

  log(`Indie Index nightly run as ${botUserAgent(baseUrl)}`);
  await runNightly(db, { fetcher: polite, listFetcher: plain, baseUrl, log });
  log('Done');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
