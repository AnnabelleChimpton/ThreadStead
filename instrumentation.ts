/**
 * Next.js Instrumentation
 * This file is called when the server starts up
 * Use it for startup validation and initialization
 */

import { validateBetaKeysConfig } from './lib/config/beta-keys';

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate beta keys configuration on startup
    validateBetaKeysConfig();
  }
}
