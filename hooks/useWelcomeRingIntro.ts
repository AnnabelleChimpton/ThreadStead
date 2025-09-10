import { useState, useEffect } from 'react';

const WELCOME_INTRO_KEY = 'threadstead_welcome_intro_shown';

export function useWelcomeRingIntro(ringSlug?: string) {
  const [shouldShowIntro, setShouldShowIntro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only show intro for welcome ring
    if (ringSlug !== 'welcome') {
      setShouldShowIntro(false);
      setIsLoading(false);
      return;
    }

    try {
      // Check if user has seen the intro before
      const hasSeenIntro = localStorage.getItem(WELCOME_INTRO_KEY);
      
      if (!hasSeenIntro) {
        setShouldShowIntro(true);
      } else {
        setShouldShowIntro(false);
      }
    } catch (error) {
      // If localStorage fails, default to not showing intro
      setShouldShowIntro(false);
    }
    
    setIsLoading(false);
  }, [ringSlug]);

  const markIntroAsSeen = () => {
    try {
      localStorage.setItem(WELCOME_INTRO_KEY, 'true');
      setShouldShowIntro(false);
    } catch (error) {
      // If localStorage fails, still update state
      setShouldShowIntro(false);
    }
  };

  const resetIntro = () => {
    try {
      localStorage.removeItem(WELCOME_INTRO_KEY);
      setShouldShowIntro(true);
    } catch (error) {
      // If localStorage fails, still update state
      setShouldShowIntro(true);
    }
  };

  return {
    shouldShowIntro,
    isLoading,
    markIntroAsSeen,
    resetIntro
  };
}