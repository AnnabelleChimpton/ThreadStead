/**
 * External Search API Route
 * Provides meta-search across privacy-focused indie search engines
 */

import { apiHandler, ApiError } from '@/lib/api/handler';
import { getEngineStatus } from '@/lib/extsearch/registry';
import { cachedExtSearch } from '@/lib/extsearch/cache';
import type { ExtSearchQuery } from '@/lib/extsearch/types';
import { parseIntParam } from '@/lib/search/query';

// Cache control headers for CDN caching
const CACHE_CONTROL_HEADER = 'public, s-maxage=60, stale-while-revalidate=300';

export default apiHandler(
  // Public, and a cache miss can spend paid Brave quota: rate-limit per IP
  // (per user when signed in) and serve repeats from the in-process cache.
  { methods: ['GET'], auth: 'none', rateLimit: 'search' },
  async (req, res) => {
    // Check if feature is enabled
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH === 'true';
    if (!isEnabled) {
      return res.status(404).json({ error: 'External search is not enabled' });
    }

    try {
      // Special endpoint to check engine status
      if (req.query.status === 'true') {
        const status = getEngineStatus();
        res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
        return res.status(200).json({ engines: status });
      }

      // Parse and validate query parameters
      const query = String(req.query.q || '').trim();
      if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      // Limit query length
      if (query.length > 200) {
        return res.status(400).json({ error: 'Query too long (max 200 characters)' });
      }

      // Parse pagination parameters
      // (NaN used to flow through to the engines and into the cache key)
      const page = parseIntParam(req.query.page, 'page', { fallback: 0, min: 0, max: 9 });
      const perPage = parseIntParam(req.query.perPage, 'perPage', { fallback: 20, min: 1, max: 50 });

      // Parse optional parameters
      const category = req.query.category as 'general' | 'blogs' | 'indie' | 'news' | undefined;
      const safeSearch = req.query.safe === 'true';
      const siteScope = req.query.site ? String(req.query.site) : undefined;

      // Parse filter parameters
      const indieOnly = req.query.indie === 'true';
      const privacyOnly = req.query.privacy === 'true';
      const noTrackers = req.query.notrackers === 'true';
      const contentTypes = req.query.types
        ? String(req.query.types).split(',').filter(t =>
            ['blog', 'forum', 'personal', 'wiki', 'commercial'].includes(t)
          )
        : undefined;

      // Parse engine selection
      const enabledEngines = req.query.engines
        ? String(req.query.engines).split(',').filter(e =>
            ['searchmysite', 'searxng', 'brave', 'mojeek'].includes(e)
          ) as any[]
        : undefined;

      // Build search query
      const searchQuery: ExtSearchQuery = {
        q: query,
        page,
        perPage,
        category,
        safeSearch,
        siteScope
      };

      // Build filter options
      const filters = (indieOnly || privacyOnly || noTrackers || contentTypes) ? {
        indieOnly,
        privacyOnly,
        noTrackers,
        contentTypes
      } : undefined;

      // Run the search with timeout (cached; meta.cacheHit says which)
      const searchResponse = await cachedExtSearch(searchQuery, {
        timeout: 4000, // 4 second timeout for API route
        enabledEngines,
        filters,
        boost: {
          // Could add ring members and community data here
          // based on user session if authenticated
          enableRecencyBoost: true
        }
      });

      // Set cache headers for CDN
      res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);

      // Return response
      return res.status(200).json(searchResponse);

    } catch (error) {
      // Bad page/perPage → apiHandler's 400
      if (error instanceof ApiError) throw error;
      console.error('External search error:', error);

      // Don't cache errors
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// API route configuration
export const config = {
  api: {
    responseLimit: '2mb', // Limit response size
  },
};