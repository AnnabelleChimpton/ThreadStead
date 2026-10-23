/**
 * Re-checks verified Bluesky handles once a day (lib/domain/bluesky/handle-links.ts).
 * It ticks hourly and takes links last checked 20+ hours ago, so each one is
 * looked at about daily however often deploys restart the process. Runs in
 * the web process, so a revoked link leaves the endpoint's memory at once.
 * Production only; started from instrumentation.ts.
 */
import { recheckBlueskyLinks } from './handle-links';

const HOUR = 60 * 60 * 1000;
// Let the server finish starting before the first look
const FIRST_RUN_DELAY_MS = 10 * 60 * 1000;

const globalForRecheck = globalThis as unknown as { __blueskyRecheckStarted?: boolean };
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const stats = await recheckBlueskyLinks();
    if (stats.checked > 0) console.log(`Bluesky handles re-checked: ${JSON.stringify(stats)}`);
  } catch (error) {
    console.error('Bluesky handle re-check failed:', error);
  } finally {
    running = false;
  }
}

export function startBlueskyRecheck(): void {
  if (globalForRecheck.__blueskyRecheckStarted) return;
  if (process.env.NODE_ENV !== 'production') return;
  globalForRecheck.__blueskyRecheckStarted = true;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), HOUR).unref();
  }, FIRST_RUN_DELAY_MS).unref();
}
