import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { updateWelcomeProgress, getWelcomeProgress } from '@/lib/welcome/progress';
import { celebrateAction } from '@/lib/welcome/celebrations';

export function useWelcomeRingTracking(ringSlug?: string) {
  const router = useRouter();
  
  // Only track if we're on the welcome ring
  const isWelcomeRing = ringSlug === 'welcome' || router.asPath.includes('/tr/welcome');

  useEffect(() => {
    if (!isWelcomeRing) return;

    // Track when comment sections are opened
    const handleCommentToggle = (event: Event) => {
      const target = event.target as HTMLElement;
      
      // Check if target has closest method (some nodes might not)
      if (!target || typeof target.closest !== 'function') return;
      
      const button = target.closest('button');
      
      // Check if click was on the Comments button
      if (button && button.textContent?.includes('Comments')) {
        const progress = getWelcomeProgress();
        if (progress && !progress.readFirstPost) {
          updateWelcomeProgress({ readFirstPost: true });
          celebrateAction('firstPost');
        }
      }
    };

    // Track profile visits (when username links are clicked)
    const handleProfileClick = (event: Event) => {
      const target = event.target as HTMLElement;
      
      // Check if target has closest method (some nodes might not)
      if (!target || typeof target.closest !== 'function') return;
      
      const link = target.closest('a[href*="/resident/"]') as HTMLAnchorElement;
      
      if (link) {
        const progress = getWelcomeProgress();
        if (progress && !progress.visitedProfile) {
          updateWelcomeProgress({ visitedProfile: true });
          celebrateAction('visitedProfile');
        }
      }
    };

    // Add event listeners
    document.addEventListener('click', handleCommentToggle);
    document.addEventListener('click', handleProfileClick);

    return () => {
      document.removeEventListener('click', handleCommentToggle);
      document.removeEventListener('click', handleProfileClick);
    };
  }, [isWelcomeRing]);

  // Function to track comment creation (call this when comments are submitted)
  const trackCommentCreated = () => {
    if (!isWelcomeRing) return;
    
    const progress = getWelcomeProgress();
    if (progress && !progress.leftFirstComment) {
      updateWelcomeProgress({ leftFirstComment: true });
      celebrateAction('firstComment');
    }
  };

  return {
    trackCommentCreated,
    isWelcomeRing
  };
}