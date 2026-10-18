#!/usr/bin/env npx tsx

/**
 * One-off: remove visitors' search words from Indie Index rows.
 *
 * Until 2026-10-17, clicking an off-site search result could add the site to
 * the index with the search query in two public fields:
 *   - description:      `Discovered through search: "<query>"` (when there was no snippet)
 *   - discoveryContext: the raw query (discoveryMethod = 'user_click')
 * The click route now writes `null` / 'search_click' instead
 * (pages/api/community-index/track-click-and-submit.ts). This brings old rows
 * into line with that.
 *
 * Usage:
 *   npx tsx scripts/scrub-search-query-leaks.ts           # dry run: counts + a few samples
 *   npx tsx scripts/scrub-search-query-leaks.ts --apply   # write the changes
 *
 * Uses DATABASE_URL from the environment. Run the dry run first and check the
 * host it prints.
 */

import './load-env';
import { db } from '../lib/config/database/connection';

const DESCRIPTION_PREFIX = 'Discovered through search:';
const NEUTRAL_CONTEXT = 'search_click';

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

  const descriptionWhere = { description: { startsWith: DESCRIPTION_PREFIX } };
  // Every user_click row's context was either the query or the literal 'search'.
  const contextWhere = {
    discoveryMethod: 'user_click',
    OR: [{ discoveryContext: null }, { discoveryContext: { not: NEUTRAL_CONTEXT } }],
  };

  const [descriptionCount, contextCount] = await Promise.all([
    db.indexedSite.count({ where: descriptionWhere }),
    db.indexedSite.count({ where: contextWhere }),
  ]);
  console.log(`Rows with a "${DESCRIPTION_PREFIX} ..." description: ${descriptionCount}`);
  console.log(`user_click rows with a non-neutral discoveryContext: ${contextCount}`);

  if (!apply) {
    // Show URLs only, not the query text, so the dry run doesn't echo it back.
    const samples = await db.indexedSite.findMany({
      where: { OR: [descriptionWhere, contextWhere] },
      select: { url: true },
      take: 5,
    });
    if (samples.length) {
      console.log('\nSample rows:');
      for (const s of samples) console.log(`  ${s.url}`);
    }
    return;
  }

  const [descriptions, contexts] = await db.$transaction([
    db.indexedSite.updateMany({ where: descriptionWhere, data: { description: null } }),
    db.indexedSite.updateMany({ where: contextWhere, data: { discoveryContext: NEUTRAL_CONTEXT } }),
  ]);
  console.log(`\nCleared ${descriptions.count} descriptions, reset ${contexts.count} discoveryContext values.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
