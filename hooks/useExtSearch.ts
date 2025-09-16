/**
 * External Search Hook
 * React hook for fetching results from the meta-search API
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ExtSearchResponse, ExtSearchQuery } from '@/lib/extsearch/types';

interface UseExtSearchOptions {
  enabled?: boolean;
  page?: number;
  perPage?: number;
  category?: 'general' | 'blogs' | 'indie' | 'news';
  safeSearch?: boolean;
  debounceMs?: number;
  filters?: {
    indieOnly?: boolean;
    privacyOnly?: boolean;
    noTrackers?: boolean;
    contentTypes?: string[];
  };
  engines?: string[];
}

interface UseExtSearchResult {
  data: ExtSearchResponse | null;
  loading: boolean;
  error: Error | null;
  search: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for external search functionality
 */
export function useExtSearch(
  query: string,
  options?: UseExtSearchOptions
): UseExtSearchResult {
  const [data, setData] = useState<ExtSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for debouncing and abort control
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cache for recent searches (in-memory, cleared on unmount)
  const cacheRef = useRef<Map<string, { data: ExtSearchResponse; timestamp: number }>>(
    new Map()
  );

  const {
    enabled = true,
    page = 0,
    perPage = 20,
    category,
    safeSearch = false,
    debounceMs = 300,
    filters,
    engines
  } = options || {};

  // Stabilize complex objects to prevent infinite re-renders
  const stableFilters = useMemo(() => filters, [
    filters?.indieOnly,
    filters?.privacyOnly,
    filters?.noTrackers,
    filters?.contentTypes?.join(',')
  ]);

  const stableEngines = useMemo(() => engines, [engines?.join(',')]);

  const searchParamsRef = useRef({
    query: '',
    page: 0,
    perPage: 20,
    category: undefined as string | undefined,
    safeSearch: false,
    filters: undefined as any,
    engines: undefined as any
  });

  // Only update search params when they actually change
  useEffect(() => {
    searchParamsRef.current = {
      query,
      page,
      perPage,
      category,
      safeSearch,
      filters: stableFilters,
      engines: stableEngines
    };
  }, [query, page, perPage, category, safeSearch, stableFilters, stableEngines]);

  const performSearch = useCallback(async () => {
    const params = searchParamsRef.current;
    console.log('performSearch called with:', { query: params.query.trim(), featureEnabled: process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH });

    // Don't search if no query
    if (!params.query.trim()) {
      console.log('Search skipped - empty query');
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if external search is enabled
    const isFeatureEnabled = process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH === 'true';
    if (!isFeatureEnabled) {
      setError(new Error('External search is not enabled'));
      setLoading(false);
      return;
    }

    // Build cache key
    const cacheKey = JSON.stringify({
      query: params.query,
      page: params.page,
      perPage: params.perPage,
      category: params.category,
      safeSearch: params.safeSearch,
      filters: params.filters,
      engines: params.engines
    });

    // Check cache (5 minute TTL)
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const urlParams = new URLSearchParams({
        q: params.query,
        page: String(params.page),
        perPage: String(params.perPage),
        safe: String(params.safeSearch)
      });

      if (params.category) urlParams.append('category', params.category);

      // Add filters
      if (params.filters?.indieOnly) urlParams.append('indie', 'true');
      if (params.filters?.privacyOnly) urlParams.append('privacy', 'true');
      if (params.filters?.noTrackers) urlParams.append('notrackers', 'true');
      if (params.filters?.contentTypes?.length) {
        urlParams.append('types', params.filters.contentTypes.join(','));
      }

      // Add engine selection
      if (params.engines?.length) {
        urlParams.append('engines', params.engines.join(','));
      }

      const response = await fetch(
        `/api/extsearch?${urlParams}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Search failed: ${response.status} ${response.statusText}`
        );
      }

      const responseData: ExtSearchResponse = await response.json();

      // Update cache
      cacheRef.current.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      // Clean old cache entries (keep max 20)
      if (cacheRef.current.size > 20) {
        const oldestKey = Array.from(cacheRef.current.keys())[0];
        cacheRef.current.delete(oldestKey);
      }

      setData(responseData);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }

      console.error('External search error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since we use refs

  // Don't auto-search - only search manually
  useEffect(() => {
    // Cleanup function only
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Manual refetch function
  const refetch = useCallback(async () => {
    // Clear cache for current search
    const cacheKey = JSON.stringify({
      query,
      page,
      perPage,
      category,
      safeSearch,
      filters,
      engines
    });
    cacheRef.current.delete(cacheKey);

    // Perform search immediately
    await performSearch();
  }, [performSearch]);

  // Manual search function (same as performSearch but exposed)
  const search = useCallback(async () => {
    await performSearch();
  }, [performSearch]);

  return {
    data,
    loading,
    error,
    search,
    refetch
  };
}

/**
 * Hook to check engine status
 */
export function useExtSearchStatus() {
  const [engines, setEngines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/extsearch?status=true');
        if (!response.ok) {
          throw new Error('Failed to fetch engine status');
        }
        const data = await response.json();
        setEngines(data.engines || []);
      } catch (err) {
        console.error('Failed to check engine status:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_ENABLE_EXTSEARCH === 'true') {
      checkStatus();
    } else {
      setLoading(false);
    }
  }, []);

  return { engines, loading, error };
}