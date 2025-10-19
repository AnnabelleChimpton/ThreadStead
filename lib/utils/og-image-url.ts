/**
 * Utility to generate cache-busted OG image URLs
 * Automatically uses file modification time as version parameter
 */

import fs from 'fs';
import path from 'path';

let cachedOgImageUrl: string | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache to avoid excessive filesystem reads

/**
 * Get the OG image URL with automatic cache-busting based on file modification time
 * @returns Versioned OG image URL (e.g., "/og-image.png?v=1697654321000")
 */
export function getOgImageUrl(): string {
  const now = Date.now();

  // Return cached version if still valid
  if (cachedOgImageUrl && (now - cacheTime) < CACHE_DURATION) {
    return cachedOgImageUrl;
  }

  try {
    const imagePath = path.join(process.cwd(), 'public', 'og-image.png');
    const stats = fs.statSync(imagePath);
    const timestamp = Math.floor(stats.mtimeMs);

    cachedOgImageUrl = `/og-image.png?v=${timestamp}`;
    cacheTime = now;

    return cachedOgImageUrl;
  } catch (error) {
    console.error('Failed to get og-image.png stats:', error);
    // Fallback to current timestamp if file doesn't exist or can't be read
    return `/og-image.png?v=${Date.now()}`;
  }
}
