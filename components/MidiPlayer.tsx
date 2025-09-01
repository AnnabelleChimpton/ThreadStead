import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

interface MidiPlayerProps {
  midiUrl: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
  className?: string;
  compact?: boolean;
}

export default function MidiPlayer({ 
  midiUrl, 
  title = 'Background Music',
  autoplay = false, 
  loop = false,
  className = '',
  compact = false
}: MidiPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const channelSynthsRef = useRef<Map<number, any>>(new Map());
  const channelInstrumentsRef = useRef<Map<number, number>>(new Map());
  const drumSynthsRef = useRef<Map<number, any>>(new Map());
  const midiDataRef = useRef<Midi | null>(null);
  const scheduledEventsRef = useRef<any[]>([]);
  const startTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simple initialization
  useEffect(() => {
    // Just set a reasonable master volume
    Tone.Destination.volume.value = 0; // 0dB - let individual synths control their levels

    console.log('MIDI Player initialized');

    return () => {
      // Clean up any synths
      channelSynthsRef.current.forEach(synth => {
        if (synth && synth.dispose) {
          synth.dispose();
        }
      });
      channelSynthsRef.current.clear();
    };
  }, []);

  // Simplified drum kit - louder levels for audibility
  const createDrumKit = () => {
    return {
      // Louder drums with better settings
      kick: new Tone.MembraneSynth({ 
        pitchDecay: 0.08, 
        octaves: 6, 
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.5 },
        volume: 6 // Much louder
      }).toDestination(),
      snare: new Tone.MembraneSynth({ 
        pitchDecay: 0.02, 
        octaves: 4, 
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 },
        volume: 3 // Louder
      }).toDestination(),
      hihat: new Tone.Synth({ 
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
        volume: 0 // Normal level
      }).toDestination()
    };
  };

  // Update volume
  useEffect(() => {
    if (Tone.Destination) {
      // Convert volume slider (0-100) to reasonable dB range (-20 to 0)
      const dbValue = -20 + (volume / 100) * 20;
      Tone.Destination.volume.value = dbValue;
      console.log('Master volume set to:', dbValue, 'dB');
    }
  }, [volume]);

  // Load MIDI file
  const loadMidi = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading MIDI from:', midiUrl);
      
      const response = await fetch(midiUrl, {
        method: 'GET',
        credentials: 'omit', // Don't send credentials for external resources
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('MIDI file loaded, size:', arrayBuffer.byteLength);
      
      const midi = new Midi(arrayBuffer);
      midiDataRef.current = midi;
      
      console.log('MIDI parsed successfully:');
      console.log('- Tracks:', midi.tracks.length);
      console.log('- PPQ (ticks per quarter):', midi.header.ppq);
      console.log('- Tempo changes:', midi.header.tempos?.length || 0);
      
      // Analyze each track and detect instruments
      midi.tracks.forEach((track, i) => {
        const instrumentInfo = track.instrument;
        const programNumber = instrumentInfo?.number ?? 0;
        const instrumentName = instrumentInfo?.name || `Program ${programNumber}`;
        
        console.log(`Track ${i}:`, {
          name: track.name || 'Unnamed',
          channel: track.channel ?? 0,
          notes: track.notes.length,
          instrument: `${instrumentName} (Program ${programNumber})`,
          controlChanges: track.controlChanges ? Object.keys(track.controlChanges).length : 0,
          pitchBends: track.pitchBends?.length || 0,
          programChanges: track.programChanges?.length || 0
        });
        
        // Log control changes for debugging
        if (track.controlChanges) {
          Object.entries(track.controlChanges).forEach(([cc, changes]) => {
            if (changes.length > 0) {
              console.log(`  CC${cc}: ${changes.length} changes`);
            }
          });
        }
        
        // We'll create synths during playback now, no pre-loading needed
        
        // Log first few notes for debugging
        if (track.notes.length > 0) {
          console.log(`First 3 notes:`, track.notes.slice(0, 3).map(n => ({
            name: n.name,
            midi: n.midi,
            time: n.time.toFixed(3),
            duration: n.duration.toFixed(3),
            velocity: n.velocity
          })));
        }
      });
      
      // Calculate duration
      const trackEndTimes = midi.tracks.map(track => {
        if (track.notes.length === 0) return 0;
        return Math.max(...track.notes.map(note => note.time + note.duration));
      });
      
      const lastEventTime = trackEndTimes.length > 0 ? Math.max(...trackEndTimes) : 0;
      setDuration(lastEventTime);
      
      console.log('MIDI duration:', lastEventTime.toFixed(2), 'seconds');
      
      setIsLoading(false);
      
      // Autoplay if enabled
      if (autoplay) {
        play();
      }
    } catch (err) {
      console.error('Error loading MIDI:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load MIDI file';
      console.error('Full error details:', err);
      setError(`Load Error: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  // Play MIDI
  const play = async () => {
    if (!midiDataRef.current) {
      setError('MIDI not loaded');
      return;
    }

    if (isPlaying) {
      console.log('Already playing, ignoring play request');
      return;
    }
    
    try {
      console.log('Starting MIDI playback...');
      
      // Start Tone.js if needed
      if (Tone.context.state !== 'running') {
        console.log('Starting Tone.js context...');
        await Tone.start();
      }
      
      // Clear any existing error
      setError(null);
      
      const midi = midiDataRef.current;
      const now = Tone.now();
      startTimeRef.current = now;
      
      // Clear any previously scheduled events
      scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
      scheduledEventsRef.current = [];
      
      let totalNotes = 0;
      
      // Simple approach: Use one synth per track, schedule all notes directly
      midi.tracks.forEach((track, trackIndex) => {
        if (track.notes.length === 0) return; // Skip empty tracks
        
        console.log(`Track ${trackIndex}: ${track.notes.length} notes, channel: ${track.channel}`);
        
        // Create one synth per track - much simpler approach
        let trackSynth: any;
        
        if (track.channel === 9) {
          // Drum track - create a collection of drum sounds
          trackSynth = createDrumKit();
        } else {
          // Melodic track - use simple PolySynth
          trackSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 1.0 }
          }).toDestination();
          trackSynth.maxPolyphony = 16;
        }
        
        // Store synth for cleanup
        channelSynthsRef.current.set(trackIndex, trackSynth);
        
        // Schedule all notes for this track
        track.notes.forEach(note => {
          if (!note.name || isNaN(note.time)) return;
          
          const eventId = Tone.Transport.schedule((time) => {
            try {
              const duration = Math.max(0.1, note.duration);
              const velocity = note.velocity || 0.8;
              
              if (track.channel === 9) {
                // Drums - simple mapping to 3 basic sounds with boosted velocity
                let drumSound, drumPitch;
                if (note.midi >= 35 && note.midi <= 36) {
                  drumSound = trackSynth.kick; // Bass drums
                  drumPitch = 'C2'; // Low pitch for kick
                } else if (note.midi >= 38 && note.midi <= 40) {
                  drumSound = trackSynth.snare; // Snare drums
                  drumPitch = 'D3'; // Mid pitch for snare
                } else {
                  drumSound = trackSynth.hihat; // Everything else (hi-hats, cymbals, etc.)
                  drumPitch = 'F#4'; // High pitch for hihat
                }
                // Boost drum velocity to make them more audible
                const drumVelocity = Math.min(1.0, velocity * 1.5);
                drumSound.triggerAttackRelease(drumPitch, duration, time, drumVelocity);
              } else {
                // Melodic - use note name
                trackSynth.triggerAttackRelease(note.name, duration, time, velocity);
              }
            } catch (err) {
              console.warn('Note error:', err);
            }
          }, now + note.time);
          
          scheduledEventsRef.current.push(eventId);
          totalNotes++;
        });
      });
      
      console.log(`Scheduled ${totalNotes} notes for playback`);
      
      if (totalNotes === 0) {
        setError('MIDI file contains no playable notes');
        return;
      }
      
      // Set tempo if specified in MIDI file
      if (midi.header.tempos && midi.header.tempos.length > 0) {
        try {
          const initialTempo = midi.header.tempos[0];
          const bpm = initialTempo.bpm || 120;
          Tone.Transport.bpm.value = bpm;
          console.log('Set tempo to:', bpm, 'BPM');
          
          // Schedule tempo changes
          midi.header.tempos.forEach(tempoChange => {
            const changeBpm = tempoChange.bpm || 120;
            const changeTime = tempoChange.time || 0;
            
            if (changeTime > 0) {
              Tone.Transport.schedule((time) => {
                Tone.Transport.bpm.value = changeBpm;
                console.log('Tempo change at', changeTime.toFixed(2), 's to', changeBpm, 'BPM');
              }, now + changeTime);
            }
          });
        } catch (tempoErr) {
          console.warn('Error setting tempo:', tempoErr);
          Tone.Transport.bpm.value = 120;
        }
      } else {
        // Default tempo for MIDI files without tempo info
        Tone.Transport.bpm.value = 120;
        console.log('Using default tempo: 120 BPM');
      }
      
      // Start transport
      Tone.Transport.start();
      setIsPlaying(true);
      setError(null); // Clear any previous errors
      
      console.log('MIDI playback started');
      
      // Update progress
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Tone.now() - startTimeRef.current;
        const progressPercent = duration > 0 ? (elapsed / duration) * 100 : 0;
        setProgress(Math.min(progressPercent, 100));
        
        // Check if finished
        if (elapsed >= duration && duration > 0) {
          if (loop) {
            console.log('Looping MIDI...');
            stop();
            setTimeout(() => play(), 100); // Small delay before restart
          } else {
            console.log('MIDI playback finished');
            stop();
          }
        }
      }, 100);
      
    } catch (err) {
      console.error('Error playing MIDI:', err);
      console.error('Full playback error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown playback error';
      setError(`Play Error: ${errorMessage}`);
      setIsPlaying(false);
    }
  };

  // Stop MIDI
  const stop = () => {
    console.log('Stopping MIDI playback...');
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Clear scheduled events
    scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
    scheduledEventsRef.current = [];
    
    // Stop and reset transport
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    
    // Simple cleanup - just release all notes
    channelSynthsRef.current.forEach(synth => {
      if (synth && synth.releaseAll) {
        synth.releaseAll();
      }
    });
    
    setIsPlaying(false);
    setProgress(0);
    
    console.log('MIDI playback stopped');
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  };

  // Load MIDI on mount or URL change
  useEffect(() => {
    if (midiUrl) {
      loadMidi();
    }
    
    return () => {
      stop();
    };
  }, [midiUrl]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    // Compact floating player for profile pages
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-lg shadow-lg p-3 flex items-center gap-3 max-w-xs">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={isLoading || !!error}
            className="w-10 h-10 flex items-center justify-center bg-purple-200 hover:bg-purple-300 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : isPlaying ? (
              <span className="text-lg">⏸️</span>
            ) : (
              <span className="text-lg">▶️</span>
            )}
          </button>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">
              {title}
            </div>
            {error ? (
              <div className="text-xs text-red-600 truncate" title={error}>
                ❌ Error
              </div>
            ) : isPlaying ? (
              <div className="text-xs text-gray-600">
                🎵 Playing...
              </div>
            ) : isLoading ? (
              <div className="text-xs text-gray-600">
                Loading...
              </div>
            ) : (
              <div className="text-xs text-gray-600">
                Ready to play
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="relative">
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="w-8 h-8 flex items-center justify-center hover:bg-purple-100 rounded transition-colors"
              title="Volume"
            >
              🔊
            </button>
            
            {showVolumeSlider && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-purple-200 rounded-lg p-2 shadow-lg">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-24 h-2"
                  title={`Volume: ${volume}%`}
                />
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={stop}
            className="w-6 h-6 flex items-center justify-center hover:bg-purple-100 rounded transition-colors"
            title="Stop"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Full player for media sections
  return (
    <div className={`bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <div>
            <h4 className="font-semibold">{title}</h4>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>
        
        {/* Loop indicator */}
        {loop && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            🔁 Loop
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="relative">
          <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-600">
            <span>{formatTime((progress / 100) * duration)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={isLoading || !!error}
            className="w-12 h-12 flex items-center justify-center bg-purple-200 hover:bg-purple-300 rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : isPlaying ? (
              <span className="text-xl">⏸️</span>
            ) : (
              <span className="text-xl">▶️</span>
            )}
          </button>

          {/* Stop */}
          <button
            onClick={stop}
            disabled={!isPlaying}
            className="w-10 h-10 flex items-center justify-center bg-purple-100 hover:bg-purple-200 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Stop"
          >
            <span>⏹️</span>
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <span className="text-sm">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1"
            title={`Volume: ${volume}%`}
          />
          <span className="text-sm text-gray-600 w-10 text-right">{volume}%</span>
        </div>

        {/* Status */}
        {isPlaying && (
          <div className="text-center">
            <span className="text-sm text-purple-600 animate-pulse">
              ♪ ♫ Now Playing ♫ ♪
            </span>
          </div>
        )}
      </div>
    </div>
  );
}