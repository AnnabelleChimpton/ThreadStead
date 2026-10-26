/**
 * Next.js Instrumentation
 * This file is called when the server starts up
 * Use it for startup validation and initialization
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Typed env: throws in production on a missing/malformed variable
    const { validateEnvAtBoot } = await import('./lib/config/env');
    validateEnvAtBoot();

    // Validate beta keys configuration on startup
    const { validateBetaKeysConfig } = await import('./lib/config/beta-keys');
    validateBetaKeysConfig();

    // ThreadRing counter reconciliation (production only; see the bootstrap).
    // Started here, once per process, rather than from _app, whose module
    // graph is evaluated once per page bundle in dev.
    await import('./lib/domain/threadrings/reconciliation-bootstrap');

    // Daily re-check of residents' Bluesky handles (production only)
    const { startBlueskyRecheck } = await import('./lib/domain/bluesky/recheck-scheduler');
    startBlueskyRecheck();

    // Deleting the accounts of residents who left, once their 14 days are up (production only)
    const { startLeaveScheduler } = await import('./lib/domain/users/leave-scheduler');
    startLeaveScheduler();

    // Forgetting stored IP addresses once they've done their job (production only)
    const { startIpRetention } = await import('./lib/privacy/ip-retention');
    startIpRetention();
  }
}
