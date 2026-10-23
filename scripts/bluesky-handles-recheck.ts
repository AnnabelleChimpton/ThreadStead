#!/usr/bin/env npx tsx

/**
 * Re-check verified Bluesky handles now, rather than waiting for the web
 * process's daily pass (lib/domain/bluesky/recheck-scheduler.ts). A link
 * whose DID document names another handle is revoked. The web process
 * notices within a minute.
 *
 * Usage:
 *   npx tsx scripts/bluesky-handles-recheck.ts
 */

import './load-env';
import { db } from '../lib/config/database/connection';
import { recheckBlueskyLinks } from '../lib/domain/bluesky/handle-links';

async function main() {
  const stats = await recheckBlueskyLinks();
  console.log(`Checked ${stats.checked}: ${stats.verified} still verified, ${stats.revoked} revoked, ${stats.unreachable} couldn't be reached.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
