import { useState, useCallback } from 'react';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  isDefault: boolean;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SaveBookmarkParams {
  url: string;
  title: string;
  description?: string;
  sourceType: 'community_index' | 'site_content' | 'external_search' | 'manual';
  sourceMetadata?: Record<string, any>;
  collectionId?: string;
  tags?: string[];
  notes?: string;
}

interface BookmarkResult {
  id: string;
  url: string;
  title: string;
  description?: string;
  collectionName?: string;
  createdAt: string;
}

export function useBookmarks() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveBookmark = useCallback(async (params: SaveBookmarkParams): Promise<BookmarkResult | null> => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/bookmarks/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Already bookmarked
          setError('Already saved to your bookmarks');
          return null;
        }
        throw new Error(data.error || 'Failed to save bookmark');
      }

      return data.bookmark;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save bookmark';
      setError(errorMessage);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  // Convenience methods for different source types
  const saveFromCommunityIndex = useCallback(async (site: any) => {
    return saveBookmark({
      url: site.url,
      title: site.title,
      description: site.description,
      sourceType: 'community_index',
      sourceMetadata: {
        community_site_id: site.id,
        community_score: site.communityScore,
        discovery_method: site.discoveryMethod,
        site_type: site.siteType
      }
    });
  }, [saveBookmark]);

  const saveFromSiteContent = useCallback(async (item: any) => {
    return saveBookmark({
      url: item.url,
      title: item.title,
      description: item.description,
      sourceType: 'site_content',
      sourceMetadata: {
        content_type: item.type,
        content_id: item.id
      }
    });
  }, [saveBookmark]);

  const saveFromExternalSearch = useCallback(async (result: any, searchQuery?: string) => {
    return saveBookmark({
      url: result.url,
      title: result.title,
      description: result.snippet || result.description,
      sourceType: 'external_search',
      sourceMetadata: {
        engine: result.engine,
        search_query: searchQuery,
        privacy_score: result.privacyScore,
        is_indie_web: result.isIndieWeb,
        content_type: result.contentType,
        published_date: result.publishedDate
      }
    });
  }, [saveBookmark]);

  return {
    saving,
    error,
    saveBookmark,
    saveFromCommunityIndex,
    saveFromSiteContent,
    saveFromExternalSearch,
  };
}