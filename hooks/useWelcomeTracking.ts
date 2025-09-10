import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { updateWelcomeProgress, getWelcomeProgress } from '@/lib/welcome/progress';
import { celebrateAction } from '@/lib/welcome/celebrations';

export function useWelcomeTracking() {
  const router = useRouter();

  useEffect(() => {
    // Track page visits
    const handleRouteChange = (url: string) => {
      const progress = getWelcomeProgress();
      
      // Track profile visit
      if (url.includes('/resident/') && !progress.visitedProfile) {
        updateWelcomeProgress({ visitedProfile: true });
        celebrateAction('visitedProfile');
      }
      
      // Track ThreadRings browsing
      if (url.includes('/threadrings') && !progress.browseRings) {
        updateWelcomeProgress({ browseRings: true });
        celebrateAction('browseRings');
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
}

// Function to track post reading
export function trackPostRead(postId: string) {
  const progress = getWelcomeProgress();
  
  if (!progress.readFirstPost) {
    updateWelcomeProgress({ readFirstPost: true });
    celebrateAction('firstPost');
  }
}

// Function to track comment creation
export function trackCommentCreated() {
  const progress = getWelcomeProgress();
  
  if (!progress.leftFirstComment) {
    updateWelcomeProgress({ leftFirstComment: true });
    celebrateAction('firstComment');
  }
}