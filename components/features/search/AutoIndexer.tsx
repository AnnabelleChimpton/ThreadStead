/**
 * Auto-Indexer Component
 * Automatically submits sites to community index when users discover them
 */

import { useCallback } from 'react';

export function useAutoIndexer(searchQuery?: string) {
  const autoIndexSite = useCallback(async (
    url: string,
    title: string,
    snippet?: string,
    source: string = 'external_search'
  ) => {
    try {
      // First check if site is already indexed
      const checkResponse = await fetch(
        `/api/community-index/check-indexed?url=${encodeURIComponent(url)}`
      );
      const checkData = await checkResponse.json();

      if (checkData.indexed) {
        return;
      }

      // Auto-submit for indexing (won't be validated until reviewed)
      await fetch('/api/community-index/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title,
          description: snippet || `Discovered through ${source}`,
          discoveryMethod: 'user_discovery',
          autoSubmit: true // Flag for auto-submission
        })
      });
    } catch (error) {
      console.error('Failed to auto-index site:', error);
    }
  }, []);

  const trackAndIndex = useCallback((
    url: string,
    title: string,
    snippet?: string,
    source: string = 'external_search'
  ) => {
    // Use the new smart click tracking endpoint that includes quality evaluation and auto-validation
    fetch('/api/community-index/track-click-and-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: {
          url,
          title,
          snippet,
          engine: source === 'external_search' ? 'web' : source,
          // Default metadata for unified results
          isIndieWeb: false,
          privacyScore: undefined,
          hasTrackers: undefined
        },
        searchQuery: searchQuery || 'unified search',
        searchTab: 'all',
        sessionId: Date.now().toString()
      })
    }).then(response => {
      if (response.ok) {
        return response.json().then(data => {
          if (data.submission?.action === 'submitted') {
            if (data.submission.autoValidated) {
            }
          }
        });
      }
    }).catch(console.error);

    // Open the site
    window.open(url, '_blank');
  }, [searchQuery]);

  return {
    autoIndexSite,
    trackAndIndex
  };
}

// Optional notification component
export function IndexingNotification() {
  return (
    <div
      id="indexing-notification"
      className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hidden z-50"
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 4v16m8-8H4"></path>
        </svg>
        <span className="text-sm">Added to community review queue</span>
      </div>
    </div>
  );
}

// Helper to show notifications
if (typeof window !== 'undefined') {
  (window as any).showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const notification = document.getElementById('indexing-notification');
    if (notification) {
      const span = notification.querySelector('span');
      if (span) {
        span.textContent = message;
      }
      notification.classList.remove('hidden');
      setTimeout(() => {
        notification.classList.add('hidden');
      }, 3000);
    }
  };
}