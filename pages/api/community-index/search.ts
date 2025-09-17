/**
 * API endpoint for advanced community index search
 * Provides faceted search with filtering and suggestions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { AdvancedSearchEngine, SearchFilters } from '@/lib/community-index/search/advanced-search';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const searchEngine = new AdvancedSearchEngine();
    const { action = 'search' } = req.query;

    switch (action) {
      case 'search':
        return await handleSearch(req, res, searchEngine);

      case 'suggest':
        return await handleSuggestions(req, res, searchEngine);

      case 'popular':
        return await handlePopularSearches(req, res, searchEngine);

      default:
        return res.status(400).json({
          error: 'Invalid action. Use: search, suggest, or popular'
        });
    }

  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle main search requests
 */
async function handleSearch(
  req: NextApiRequest,
  res: NextApiResponse,
  searchEngine: AdvancedSearchEngine
) {
  const {
    q: query,
    categories,
    tags,
    discoveryMethods,
    scoreMin,
    scoreMax,
    dateStart,
    dateEnd,
    validationStatus = 'validated',
    sortBy = 'relevance',
    sortOrder = 'desc',
    limit = '20',
    offset = '0'
  } = req.query;

  // Parse filters
  const filters: SearchFilters = {
    query: query as string,
    categories: categories ? (categories as string).split(',') : undefined,
    tags: tags ? (tags as string).split(',') : undefined,
    discoveryMethods: discoveryMethods ? (discoveryMethods as string).split(',') : undefined,
    validationStatus: validationStatus as 'validated' | 'pending' | 'all',
    sortBy: sortBy as any,
    sortOrder: sortOrder as 'asc' | 'desc',
    limit: parseInt(limit as string) || 20,
    offset: parseInt(offset as string) || 0
  };

  // Parse score range
  if (scoreMin || scoreMax) {
    filters.communityScoreRange = {
      min: scoreMin ? parseInt(scoreMin as string) : 0,
      max: scoreMax ? parseInt(scoreMax as string) : 999
    };
  }

  // Parse date range
  if (dateStart || dateEnd) {
    filters.dateRange = {
      start: dateStart ? new Date(dateStart as string) : new Date(0),
      end: dateEnd ? new Date(dateEnd as string) : new Date()
    };
  }

  const results = await searchEngine.search(filters);

  return res.json({
    success: true,
    ...results
  });
}

/**
 * Handle search suggestions and autocomplete
 */
async function handleSuggestions(
  req: NextApiRequest,
  res: NextApiResponse,
  searchEngine: AdvancedSearchEngine
) {
  const { q: query, limit = '10' } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter required for suggestions' });
  }

  const suggestions = await searchEngine.getSuggestions(
    query as string,
    parseInt(limit as string) || 10
  );

  return res.json({
    success: true,
    query: query as string,
    suggestions
  });
}

/**
 * Handle popular searches and trending content
 */
async function handlePopularSearches(
  req: NextApiRequest,
  res: NextApiResponse,
  searchEngine: AdvancedSearchEngine
) {
  const popular = await searchEngine.getPopularSearches();

  return res.json({
    success: true,
    popular
  });
}