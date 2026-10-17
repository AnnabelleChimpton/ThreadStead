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
  }
}
