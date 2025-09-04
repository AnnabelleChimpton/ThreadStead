import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

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
  const [state, setState] = useState<GlobalAudioState>({
    isPlaying: false,
    volume: 0.7,
    fadeState: 'idle'
  });
  
  const [adminAudio, setAdminAudio] = useState<AudioConfig>({ enabled: false });
  
  // Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const midiPlayerRef = useRef<any>(null); // Will hold MidiPlayer component instance
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
    
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTrack: undefined,
      fadeState: 'idle'
    }));
  }, [clearFadeInterval]);

  const playMidiAudio = useCallback(async (midiUrl: string, targetVolume: number) => {
    
    try {
      // Fetch MIDI file
      const response = await fetch(midiUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Parse MIDI using @tonejs/midi
      const { Midi } = await import('@tonejs/midi');
      const midi = new Midi(arrayBuffer);

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Simple piano-like sound for background audio
      const playNote = (frequency: number, startTime: number, duration: number, velocity: number) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        
        const gainValue = (velocity / 127) * targetVolume * 0.25; // Quieter for background
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 2.0));
        
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        osc.start(startTime);
        osc.stop(startTime + Math.min(duration, 2.0));
      };
      
      // Convert MIDI note to frequency
      const noteToFrequency = (note: number): number => {
        return 440 * Math.pow(2, (note - 69) / 12);
      };
      
      const currentTime = audioContext.currentTime;
      
      // Schedule notes for looping playback
      const scheduleNotes = () => {
        midi.tracks.forEach((track: any) => {
          track.notes.forEach((note: any) => {
            const frequency = noteToFrequency(note.midi);
            const startTime = currentTime + note.time;
            const duration = Math.max(note.duration, 0.1);
            const velocity = note.velocity * 127;
            
            playNote(frequency, startTime, duration, velocity);
          });
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
      
      
    } catch (e) {
      console.error('MIDI playback failed, falling back to Web Audio:', e);
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
    if (state.isPlaying) {
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
    if (!state.isPlaying) return;
    
    setState(prev => ({ ...prev, volume }));
    
    // Apply volume to regular audio
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.volume = volume;
    }
    
    // Volume control for background audio
    // Note: Real-time volume control is limited for pre-scheduled Web Audio notes
  }, [state.isPlaying]);

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