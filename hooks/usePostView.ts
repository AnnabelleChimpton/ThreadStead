import { useEffect, useState, useRef } from 'react';

export type ViewType =
  | 'full_page'
  | 'comment_expand'
  | 'read_more'
  | 'ring_view'
  | 'profile_view'
  | 'feed_view'
  | 'widget_click';

interface UsePostViewOptions {
  postId: string | null | undefined;
  viewType: ViewType;
  enabled?: boolean;
  delay?: number;
}

/**
 * Hook to track post views
 * @param options Configuration for view tracking
 */
export function usePostView({
  postId,
  viewType,
  enabled = true,
  delay = 0,
}: UsePostViewOptions) {
  const [tracked, setTracked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !enabled || tracked) return;

    const trackView = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/posts/view/${postId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewType }),
        });

        const data = await response.json();

        if (response.ok) {
          setTracked(true);
        } else {
          setError(data.error || 'Failed to track view');
        }
      } catch (err) {
        console.error('Error tracking view:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    if (delay > 0) {
      const timer = setTimeout(trackView, delay);
      return () => clearTimeout(timer);
    } else {
      trackView();
    }
  }, [postId, viewType, enabled, tracked, delay]);

  return { tracked, loading, error };
}

/**
 * Hook to track post viewport visibility (for feeds)
 * @param postId Post ID
 * @param threshold Visibility threshold (0-1)
 * @param minTime Minimum time visible (ms)
 */
export function useViewportTracking(
  postId: string | null | undefined,
  viewType: ViewType = 'feed_view',
  threshold = 0.5,
  minTime = 2000
) {
  const ref = useRef<HTMLElement>(null);
  const [tracked, setTracked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!postId || tracked || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            // Start timer when post becomes visible
            timerRef.current = setTimeout(async () => {
              try {
                const response = await fetch(`/api/posts/view/${postId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ viewType }),
                });

                if (response.ok) {
                  setTracked(true);
                }
              } catch (err) {
                console.error('Error tracking viewport view:', err);
              }
            }, minTime);
          } else {
            // Clear timer if post becomes invisible
            if (timerRef.current) {
              clearTimeout(timerRef.current);
            }
          }
        });
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [postId, viewType, threshold, minTime, tracked]);

  return ref;
}

/**
 * Track engagement actions (like comment expansion)
 * @param postId Post ID
 * @param viewType Type of engagement
 */
export async function trackEngagement(
  postId: string,
  viewType: ViewType
): Promise<boolean> {
  try {
    const response = await fetch(`/api/posts/view/${postId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewType }),
    });

    const data = await response.json();
    return data.counted === true;
  } catch (err) {
    console.error('Error tracking engagement:', err);
    return false;
  }
}