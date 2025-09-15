import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

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
  setProfileMidiPlaying: (playing: boolean) => void;
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
  const midiPlayerRef = useRef<any>(null); // Will hold MidiPlayer component instance
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Shared audio context management to prevent browser limits
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Failed to create AudioContext:', error);
        return null;
      }
    }

    // Handle suspended state (required on some browsers)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err =>
        console.warn('Failed to resume AudioContext:', err)
      );
    }

    return audioContextRef.current;
  }, []);
  
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
    
    // Stop MIDI player
    if (midiPlayerRef.current) {
      try {
        midiPlayerRef.current = null; // Stop the scheduling loop
      } catch (e) {
        console.warn('Error stopping MIDI player:', e);
      }
    }
    
    // Clear fade interval
    clearFadeInterval();
    
    // Clean up Web Audio context (but don't close it, just clear references)
    if (masterGainRef.current && audioContextRef.current) {
      try {
        // Disconnect the master gain to stop all audio
        masterGainRef.current.disconnect();
        masterGainRef.current = null;
      } catch (e) {
        console.warn('Error cleaning up master gain:', e);
      }
    }
    
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTrack: undefined,
      fadeState: 'idle'
    }));
  }, [clearFadeInterval]);

  const playMidiAudio = useCallback(async (midiUrl: string, targetVolume: number) => {
    try {
      // Fetch MIDI file with retry logic
      let response: Response;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch(midiUrl, {
            headers: {
              'Accept': 'audio/midi, audio/x-midi, application/x-midi, */*'
            }
          });

          if (response.ok) break;

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
          lastError = error as Error;
          if (attempt === 3) throw lastError;

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }

      const arrayBuffer = await response!.arrayBuffer();

      // Validate MIDI file size (reasonable limits)
      if (arrayBuffer.byteLength === 0) {
        throw new Error('MIDI file is empty');
      }
      if (arrayBuffer.byteLength > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('MIDI file too large (>5MB)');
      }

      // Parse MIDI using @tonejs/midi with error handling
      let midi: any;
      try {
        const { Midi } = await import('@tonejs/midi');
        midi = new Midi(arrayBuffer);

        if (!midi.tracks || midi.tracks.length === 0) {
          throw new Error('MIDI file contains no tracks');
        }
      } catch (midiError) {
        const errorMessage = midiError instanceof Error ? midiError.message : 'Unknown parsing error';
        throw new Error(`Failed to parse MIDI file: ${errorMessage}`);
      }

      // Use shared audio context
      const audioContext = getOrCreateAudioContext();
      if (!audioContext) {
        throw new Error('Could not create AudioContext');
      }
      
      // Create master gain node for volume control
      if (!masterGainRef.current) {
        masterGainRef.current = audioContext.createGain();
        masterGainRef.current.connect(audioContext.destination);
        // Start at zero for gentle fade-in (prevents startling users)
        masterGainRef.current.gain.setValueAtTime(0, audioContext.currentTime);
        // Gentle 3-second fade-in for autoplay
        masterGainRef.current.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 3);
      }
      
      // Warmer, smoother piano-like sound for background audio
      const playNote = (frequency: number, startTime: number, duration: number, velocity: number) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        // Use sine wave for smoother sound, especially in high frequencies
        // Mix between sine and triangle based on frequency for warmth
        if (frequency > 800) {
          osc.type = 'sine'; // Pure sine for high notes to avoid squeakiness
        } else {
          osc.type = 'triangle'; // Triangle for lower notes for more character
        }
        osc.frequency.value = frequency;

        // Add slight detuning for warmth (more detuning for higher notes)
        const detuneAmount = Math.min(frequency / 1000, 5); // Max 5 cents detune
        osc.detune.value = (Math.random() - 0.5) * detuneAmount;

        // Low-pass filter to remove harsh high frequencies
        filter.type = 'lowpass';
        // Lower cutoff for higher notes to reduce squeakiness
        filter.frequency.value = Math.min(frequency * 3, 2000); // Cap at 2kHz
        filter.Q.value = 1; // Gentle resonance

        // Adjust gain based on frequency (reduce volume for high notes)
        const frequencyAttenuation = frequency > 1000 ? 0.6 : frequency > 500 ? 0.8 : 1.0;
        const gainValue = (velocity / 127) * 0.25 * frequencyAttenuation;

        // Smoother envelope with longer attack to avoid clicks
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.03); // Slower attack (30ms)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 2.0));

        // Connect through filter for warmer sound
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGainRef.current!); // Connect to master gain instead of destination

        osc.start(startTime);
        const stopTime = startTime + Math.min(duration, 2.0);
        osc.stop(stopTime);

        // Properly cleanup audio nodes to prevent memory leaks
        osc.addEventListener('ended', () => {
          try {
            osc.disconnect();
            filter.disconnect();
            gainNode.disconnect();
          } catch (e) {
            // Nodes may already be disconnected
          }
        });
      };
      
      // Convert MIDI note to frequency
      const noteToFrequency = (note: number): number => {
        return 440 * Math.pow(2, (note - 69) / 12);
      };
      
      const currentTime = audioContext.currentTime;
      
      // Optimized note scheduling for looping playback
      const scheduleNotes = () => {
        let noteCount = 0;
        const MAX_GLOBAL_NOTES = 500; // Lower limit for background audio
        
        // Collect and intelligently limit notes
        const allNotes: Array<{time: number, frequency: number, duration: number, velocity: number}> = [];

        midi.tracks.forEach((track: any) => {
          track.notes.forEach((note: any) => {
            if (noteCount < MAX_GLOBAL_NOTES) {
              allNotes.push({
                time: note.time,
                frequency: noteToFrequency(note.midi),
                duration: Math.max(note.duration, 0.1),
                velocity: note.velocity * 127
              });
              noteCount++;
            }
          });
        });

        // Voice limiting: filter out notes that would cause overload
        const MAX_SIMULTANEOUS_VOICES = 12; // Reasonable limit for background audio
        const activeVoices = new Map<number, number>(); // time -> voice count
        const filteredNotes = allNotes.filter(note => {
          const timeSlot = Math.floor(note.time * 10); // 100ms time slots
          const count = activeVoices.get(timeSlot) || 0;

          if (count >= MAX_SIMULTANEOUS_VOICES) {
            return false; // Skip this note
          }

          activeVoices.set(timeSlot, count + 1);
          return true; // Keep this note
        });
        
        // Sort by time and schedule (use filtered notes)
        filteredNotes.sort((a, b) => a.time - b.time);

        filteredNotes.forEach(note => {
          const startTime = currentTime + note.time;
          playNote(note.frequency, startTime, note.duration, note.velocity);
        });
                
        // Schedule next loop
        setTimeout(() => {
          if (midiPlayerRef.current === 'playing') {
            scheduleNotes();
          }
        }, midi.duration * 1000);
      };
      
      scheduleNotes();
      
      setState(prev => ({
        ...prev,
        isPlaying: true,
        currentTrack: midiUrl,
        volume: targetVolume,
        fadeState: 'idle'
      }));
      
      // Store playing state
      midiPlayerRef.current = 'playing';
      

    } catch (error) {
      console.error('MIDI playback failed:', error);

      // Provide user-friendly error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('HTTP')) {
        console.warn('Network issue loading MIDI, using fallback audio');
      } else if (errorMessage.includes('parse')) {
        console.warn('Invalid MIDI file format, using fallback audio');
      } else {
        console.warn('MIDI playback failed, using fallback audio:', errorMessage);
      }

      // Fallback to simple audio
      createFallbackAudio(targetVolume);

      setState(prev => ({
        ...prev,
        isPlaying: true,
        currentTrack: midiUrl,
        volume: targetVolume,
        fadeState: 'idle'
      }));
    }
  }, []);

  const createFallbackAudio = useCallback((targetVolume: number = 0.7) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a gentle, magical tone
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 2);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 4);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume * 0.1, audioContext.currentTime + 1);
      gainNode.gain.linearRampToValueAtTime(targetVolume * 0.05, audioContext.currentTime + 3);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 4);
      
    } catch (e) {
      console.error('Global Web Audio fallback failed:', e);
    }
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
    if (state.isPlaying || state.profileMidiPlaying) {
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
  }, [state.isPlaying, adminAudio, playMidiAudio, playRegularAudio]);

  const fadeOut = useCallback(async (duration: number = 2000): Promise<void> => {
    if (!state.isPlaying || state.fadeState === 'fading-out') {
      return;
    }
    
    setState(prev => ({ ...prev, fadeState: 'fading-out' }));
    
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
        
        // Apply fade to regular audio only
        // For MIDI, we'll just stop it at the end (MidiPlayer component manages its own volume)
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

    // Apply volume to Web Audio MIDI via master gain node
    if (masterGainRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      masterGainRef.current.gain.setValueAtTime(clampedVolume, currentTime);
    }
  }, []);

  const setProfileMidiPlaying = useCallback((playing: boolean) => {
    setState(prev => ({ ...prev, profileMidiPlaying: playing }));
  }, []);

  // Stop signup audio when navigating away from profile page (but not during signup flow)
  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      // Only handle cleanup if audio is playing
      if (state.isPlaying) {
        const currentPath = router.asPath;

        // Check if we're currently on a profile page
        const isCurrentlyOnProfile = currentPath.includes('/resident/');

        // Check if we're navigating to a profile page
        const isNavigatingToProfile = url.includes('/resident/');

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
    state,
    startSignupAudio,
    stopAudio,
    fadeOut,
    setVolume,
    setProfileMidiPlaying,
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