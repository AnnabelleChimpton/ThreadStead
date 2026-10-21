import React, { createContext, useContext, useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/router';
import * as nowPlaying from '@/lib/audio/now-playing';

interface AudioConfig {
  enabled: boolean;
  url?: string;
  volume?: number;
  originalName?: string;
}

interface GlobalAudioState {
  isPlaying: boolean;
  currentTrack?: string;
  volume: number;
  fadeState: 'idle' | 'fading-in' | 'fading-out';
  profileMidiPlaying: boolean; // Track if profile MIDI is active
}

interface GlobalAudioContextType {
  state: GlobalAudioState;
  startSignupAudio: () => Promise<void>;
  stopAudio: () => void;
  fadeOut: (duration?: number) => Promise<void>;
  setVolume: (volume: number) => void;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | null>(null);

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Load saved volume from localStorage or default to 0.7
  const getSavedVolume = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('threadstead-audio-volume');
      if (saved) {
        const volume = parseFloat(saved);
        return isNaN(volume) ? 0.7 : Math.max(0, Math.min(1, volume)); // Clamp between 0-1
      }
    }
    return 0.7;
  };

  const [state, setState] = useState<GlobalAudioState>({
    isPlaying: false,
    volume: getSavedVolume(),
    fadeState: 'idle',
    profileMidiPlaying: false
  });
  
  const [adminAudio, setAdminAudio] = useState<AudioConfig>({ enabled: false });
  
  // Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // A MIDI welcome song plays through the page's one song
  // (lib/audio/now-playing.ts); this lets go of it
  const releaseMidiRef = useRef<(() => void) | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Profile music playing takes over from the welcome music
  const song = useSyncExternalStore(nowPlaying.subscribe, nowPlaying.getSnapshot, nowPlaying.getServerSnapshot);
  const profileMidiPlaying = song.owner === 'profile' && song.status === 'playing';

  // Fetch admin audio config on mount
  useEffect(() => {
    fetch('/api/signup-audio')
      .then(res => res.json())
      .then(data => {
        setAdminAudio(data);
      })
      .catch(err => {
        console.error('Failed to fetch global audio config:', err);
        setAdminAudio({ enabled: false });
      });
  }, []);

  // Create audio element on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    // Stop regular audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }

    // Let go of the welcome song; if nothing else holds it, it stops
    if (releaseMidiRef.current) {
      releaseMidiRef.current();
      releaseMidiRef.current = null;
    }

    clearFadeInterval();

    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTrack: undefined,
      fadeState: 'idle'
    }));
  }, [clearFadeInterval]);

  // A MIDI welcome song: the profile player's engine plays it, with a
  // gentle fade-in and on a loop. (It used to have a synth of its own, one
  // soft tone for every instrument, drums included.)
  const playMidiAudio = useCallback(async (midiUrl: string, targetVolume: number) => {
    releaseMidiRef.current?.();
    releaseMidiRef.current = nowPlaying.claim(midiUrl, { title: 'Welcome music', loop: true, owner: 'signup' });
    nowPlaying.setVolume(targetVolume);
    nowPlaying.fadeTo(0, 0);
    const started = await nowPlaying.play();
    if (!started) {
      releaseMidiRef.current?.();
      releaseMidiRef.current = null;
      return;
    }
    // Start at zero and fade in over 3 seconds, so it doesn't startle
    nowPlaying.fadeTo(1, 3);
    setState(prev => ({
      ...prev,
      isPlaying: true,
      currentTrack: midiUrl,
      volume: targetVolume,
      fadeState: 'fading-in'
    }));
    setTimeout(() => {
      setState(prev => (prev.fadeState === 'fading-in' ? { ...prev, fadeState: 'idle' } : prev));
    }, 3000);
  }, []);

  const playRegularAudio = useCallback(async (audioUrl: string, targetVolume: number) => {
    if (!audioRef.current) return;
    
    try {
      
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.volume = 0;
      audio.loop = true;
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Load timeout')), 3000);
        
        audio.addEventListener('loadeddata', () => {
          clearTimeout(timeout);
          resolve(null);
        }, { once: true });
        
        audio.addEventListener('error', (e) => {
          clearTimeout(timeout);
          reject(e);
        }, { once: true });
        
        audio.load();
      });
      
      await audio.play();
      
      setState(prev => ({
        ...prev,
        isPlaying: true,
        currentTrack: audioUrl,
        volume: targetVolume,
        fadeState: 'fading-in'
      }));
      
      // Smoother fade in over 3 seconds
      let volume = 0;
      const fadeSteps = 60; // More steps for smoother fade
      const fadeIncrement = targetVolume / fadeSteps;
      
      fadeIntervalRef.current = setInterval(() => {
        if (!audioRef.current) {
          clearFadeInterval();
          return;
        }
        volume += fadeIncrement;
        if (volume >= targetVolume) {
          volume = targetVolume;
          clearFadeInterval();
          setState(prev => ({ ...prev, fadeState: 'idle' }));
        }
        audioRef.current.volume = volume;
      }, 50); // Shorter intervals for smoother transition
      
      
    } catch (e) {
      console.error('Failed to play global audio:', e);
      setState(prev => ({ ...prev, fadeState: 'idle' }));
    }
  }, [clearFadeInterval]);

  const startSignupAudio = useCallback(async () => {
    if (state.isPlaying || profileMidiPlaying) {
      return;
    }

    if (!adminAudio.enabled || !adminAudio.url) {
      return;
    }
    
    // Check if it's a MIDI file
    if (adminAudio.url.toLowerCase().endsWith('.mid') || adminAudio.url.toLowerCase().endsWith('.midi')) {
      await playMidiAudio(adminAudio.url, adminAudio.volume || 0.7);
    } else {
      await playRegularAudio(adminAudio.url, adminAudio.volume || 0.7);
    }
  }, [state.isPlaying, profileMidiPlaying, adminAudio, playMidiAudio, playRegularAudio]);

  const fadeOut = useCallback(async (duration: number = 2000): Promise<void> => {
    if (!state.isPlaying || state.fadeState === 'fading-out') {
      return;
    }
    
    setState(prev => ({ ...prev, fadeState: 'fading-out' }));
    if (releaseMidiRef.current) nowPlaying.fadeTo(0, duration / 1000);

    return new Promise((resolve) => {
      const steps = duration / 100; // 100ms intervals
      let currentStep = 0;
      
      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        const fadeProgress = currentStep / steps;
        
        if (fadeProgress >= 1) {
          // Fade complete - stop audio
          stopAudio();
          resolve();
          return;
        }
        
        const newVolume = state.volume * (1 - fadeProgress);
        
        // Regular audio fades here; MIDI fades on its own ramp (above)
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.volume = newVolume;
        }
      }, 100);
    });
  }, [state.isPlaying, state.fadeState, state.volume, stopAudio]);

  const setVolume = useCallback((volume: number) => {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));

    setState(prev => ({ ...prev, volume: clampedVolume }));

    // Save to localStorage for persistence across sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('threadstead-audio-volume', clampedVolume.toString());
    }

    // Apply volume to regular audio
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.volume = clampedVolume;
    }

    // And to a MIDI welcome song
    if (releaseMidiRef.current) nowPlaying.setVolume(clampedVolume);
  }, []);

  // Profile music took over the page's one song: the welcome song is gone,
  // and a regular-audio welcome track stops too
  useEffect(() => {
    if (releaseMidiRef.current && song.owner !== 'signup') {
      releaseMidiRef.current = null;
      setState(prev => ({ ...prev, isPlaying: false, currentTrack: undefined, fadeState: 'idle' }));
    }
    if (profileMidiPlaying && audioRef.current && !audioRef.current.paused) {
      stopAudio();
    }
  }, [song.owner, profileMidiPlaying, stopAudio]);

  // Stop signup audio when navigating away from the page signup lands on
  // (the logged-in home's welcome view, or a profile), but not during signup
  useEffect(() => {
    const isWelcomeLanding = (path: string) => path.includes('/resident/') || path.startsWith('/?welcome=1');

    const handleRouteChangeStart = (url: string) => {
      // Only handle cleanup if audio is playing
      if (state.isPlaying) {
        const currentPath = router.asPath;

        // Check if we're currently on a profile page
        const isCurrentlyOnProfile = isWelcomeLanding(currentPath);

        // Check if we're navigating to a profile page
        const isNavigatingToProfile = isWelcomeLanding(url);

        // Check if we're coming from signup (signup page would be in the path)
        const isComingFromSignup = currentPath.includes('/signup');

        // Preserve audio during signup → profile transition
        if (isComingFromSignup && isNavigatingToProfile) {
          // This is the signup completion flow - keep audio playing
          return;
        }

        // Stop audio when navigating AWAY from a profile page
        if (isCurrentlyOnProfile && !isNavigatingToProfile) {
          fadeOut(1000); // Fade out over 1 second when leaving profiles
        }

        // Also stop when switching between different user profiles
        if (isCurrentlyOnProfile && isNavigatingToProfile) {
          // Extract usernames to check if switching profiles
          const currentUser = currentPath.match(/\/resident\/([^/?]+)/)?.[1];
          const newUser = url.match(/\/resident\/([^/?]+)/)?.[1];

          if (currentUser && newUser && currentUser !== newUser) {
            fadeOut(1000); // Fade out when switching to a different user's profile
          }
        }
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [state.isPlaying, router.asPath, router.events, fadeOut]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const contextValue: GlobalAudioContextType = {
    state: { ...state, profileMidiPlaying },
    startSignupAudio,
    stopAudio,
    fadeOut,
    setVolume,
  };

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
    </GlobalAudioContext.Provider>
  );
}

export function useGlobalAudio(): GlobalAudioContextType {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
}