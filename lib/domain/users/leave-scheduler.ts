/**
 * Deletes the accounts of residents whose leaving time has come
 * (finishDueLeaves in lib/domain/users/leaving.ts). Ticks hourly, so an
 * account goes within the hour after deletesAt, however often deploys restart
 * the process; one that can't go yet is tried again next hour. Production
 * only; started from instrumentation.ts, like the Bluesky re-check.
 */
import { finishDueLeaves } from './leaving';

const HOUR = 60 * 60 * 1000;
// Let the server finish starting before the first look
const FIRST_RUN_DELAY_MS = 10 * 60 * 1000;

const globalForLeaves = globalThis as unknown as { __leaveSchedulerStarted?: boolean };
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const stats = await finishDueLeaves();
    if (stats.deleted + stats.waiting > 0) console.log(`Leaving accounts: ${JSON.stringify(stats)}`);
  } catch (error) {
    console.error('Deleting leaving accounts failed:', error);
  } finally {
    running = false;
  }
}

export function startLeaveScheduler(): void {
  if (globalForLeaves.__leaveSchedulerStarted) return;
  if (process.env.NODE_ENV !== 'production') return;
  globalForLeaves.__leaveSchedulerStarted = true;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), HOUR).unref();
  }, FIRST_RUN_DELAY_MS).unref();
}
