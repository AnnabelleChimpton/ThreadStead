#!/usr/bin/env npx tsx

/**
 * One-off: move the IndexedSite rows a person chose into the Indie Index
 * (SEARCH_PLAN.md §3.5, lib/indie-index/legacy.ts).
 *
 * Moves rows with `submittedBy` or `verifiedBy` (24 on prod, 2026-10-18).
 * Their submitters, verifiers and up-voters become vouches, and the sites
 * stay listed (grandfathered). The ~15,000 seeded and crawled rows don't
 * move; they go when the old tables are dropped.
 *
 * Usage (needs the 20261019000000_add_indie_index migration applied):
 *   npx tsx scripts/indie-index-migrate-legacy.ts           # dry run: what would move
 *   npx tsx scripts/indie-index-migrate-legacy.ts --apply   # write it
 *
 * Uses DATABASE_URL from the environment. Run the dry run first and check the
 * host it prints. Safe to run twice.
 */

import './load-env';
import { db } from '../lib/config/database/connection';
import { applyLegacyMove, planLegacyMove } from '../lib/indie-index/legacy';

async function main() {
  const apply = process.argv.includes('--apply');
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').host || '(unknown)';
    } catch {
      return '(unparseable DATABASE_URL)';
    }
  })();
  console.log(`Database: ${host}`);
  console.log(apply ? 'Mode: APPLY\n' : 'Mode: dry run (pass --apply to write)\n');

  const plan = await planLegacyMove(db);
  console.log(`IndexedSite rows a person submitted or verified: ${plan.considered}`);
  console.log(`Sites to move: ${plan.sites.length}`);
  for (const site of plan.sites) {
    const merged = site.fromUrls.length > 1 ? ` (${site.fromUrls.length} rows merged)` : '';
    console.log(`  ${site.key}  vouches: ${site.voucherIds.length}${merged}`);
  }
  if (plan.skipped.length > 0) {
    console.log(`Skipped: ${plan.skipped.length}`);
    for (const s of plan.skipped) console.log(`  ${s.url}  (${s.reason})`);
  }

  if (!apply) {
    console.log('\nNothing written. Re-run with --apply to move these.');
    return;
  }
  const result = await applyLegacyMove(db, plan);
  console.log(`\nSites created: ${result.sitesCreated}, already there: ${result.sitesUpdated}, vouches added: ${result.vouchesCreated}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
