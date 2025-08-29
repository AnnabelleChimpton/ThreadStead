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
  const channelSynthsRef = useRef<Map<number, Tone.PolySynth>>(new Map());
  const midiDataRef = useRef<Midi | null>(null);
  const scheduledEventsRef = useRef<any[]>([]);
  const startTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize synth
  useEffect(() => {
    // BitMIDI-style synthesizer - bright, clean, simple
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle" // BitMIDI uses softer, rounder sounds
      },
      envelope: {
        attack: 0.02,    // Slightly slower attack for smoother sound
        decay: 0.3,      // BitMIDI has longer decay for fuller sound
        sustain: 0.6,    // Higher sustain for more "held" notes
        release: 1.0,    // Longer release for smoother note endings
      },
      volume: -8         // BitMIDI keeps volumes moderate to prevent distortion
    }).toDestination();
    
    // BitMIDI uses higher polyphony for complex classical pieces
    synthRef.current.maxPolyphony = 32;
    
    // Set initial volume
    Tone.Destination.volume.value = Tone.gainToDb(volume / 100);

    console.log('Initialized BitMIDI-style synthesizer');

    return () => {
      // Clean up main synth
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      
      // Clean up channel synths
      channelSynthsRef.current.forEach(synth => synth.dispose());
      channelSynthsRef.current.clear();
    };
  }, []);

  // Create or get synthesizer for specific channel - BitMIDI style
  const getSynthForChannel = (channel: number): Tone.PolySynth => {
    if (channelSynthsRef.current.has(channel)) {
      return channelSynthsRef.current.get(channel)!;
    }
    
    // BitMIDI uses consistent, simple sounds across channels
    // with only subtle differences for drums vs melodic instruments
    const channelSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        // BitMIDI uses triangle waves for everything, with slight variations
        type: channel === 9 ? "triangle4" : "triangle2" // Drums get slightly more harmonics
      },
      envelope: {
        attack: channel === 9 ? 0.005 : 0.02,  // Drums slightly faster
        decay: channel === 9 ? 0.15 : 0.3,     // Drums shorter decay
        sustain: channel === 9 ? 0.1 : 0.6,    // Drums much less sustain
        release: channel === 9 ? 0.3 : 1.0,    // Drums quicker release
      },
      volume: channel === 9 ? -6 : -8  // Drums slightly louder like BitMIDI
    }).toDestination();
    
    // BitMIDI uses moderate polyphony per channel
    channelSynth.maxPolyphony = 12;
    channelSynthsRef.current.set(channel, channelSynth);
    
    console.log(`Created BitMIDI-style synth for channel ${channel}`);
    return channelSynth;
  };

  // Update volume
  useEffect(() => {
    if (Tone.Destination) {
      Tone.Destination.volume.value = Tone.gainToDb(volume / 100);
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
      
      // Analyze each track
      midi.tracks.forEach((track, i) => {
        console.log(`Track ${i}:`, {
          name: track.name || 'Unnamed',
          channel: track.channel || 0,
          notes: track.notes.length,
          instrument: track.instrument?.name || 'Unknown',
          controlChanges: track.controlChanges ? Object.keys(track.controlChanges).length : 0,
          pitchBends: track.pitchBends?.length || 0
        });
        
        // Log first few notes for debugging
        if (track.notes.length > 0) {
          console.log(`First 3 notes:`, track.notes.slice(0, 3).map(n => ({
            name: n.name,
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
      setError(`MIDI Load Error: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  // Play MIDI
  const play = async () => {
    if (!midiDataRef.current || !synthRef.current) {
      setError('MIDI not loaded or synthesizer not ready');
      return;
    }
    
    try {
      console.log('Starting MIDI playback...');
      
      // Start Tone.js if needed
      if (Tone.context.state !== 'running') {
        console.log('Starting Tone.js context...');
        await Tone.start();
      }
      
      const midi = midiDataRef.current;
      const now = Tone.now();
      startTimeRef.current = now;
      
      // Clear any previously scheduled events
      scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
      scheduledEventsRef.current = [];
      
      let totalNotes = 0;
      
      // Schedule all notes with channel-specific handling
      midi.tracks.forEach((track, trackIndex) => {
        console.log(`Track ${trackIndex}: ${track.notes.length} notes, channel: ${track.channel}`);
        
        // Get or create synth for this track's channel
        const trackChannel = track.channel || 0;
        const channelSynth = getSynthForChannel(trackChannel);
        
        track.notes.forEach(note => {
          // Filter out invalid notes
          if (!note.name || note.name === 'undefined' || isNaN(note.time)) {
            console.warn('Skipping invalid note:', note);
            return;
          }
          
          const eventId = Tone.Transport.schedule((time) => {
            try {
              // Standard MIDI duration handling
              const duration = Math.max(0.05, Math.min(note.duration, 8));
              
              // Standard MIDI velocity curve (0-127 -> 0.1-1.0)
              const rawVelocity = note.velocity || 0.7;
              const velocity = 0.1 + (rawVelocity * 0.9);
              
              // Use channel-specific synthesizer
              channelSynth.triggerAttackRelease(
                note.name,
                duration,
                time,
                velocity
              );
            } catch (noteErr) {
              console.warn('Error playing note:', note.name, noteErr);
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown playback error';
      setError(`Playback Error: ${errorMessage}`);
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
    
    // Immediately silence all synthesizers to stop any currently playing notes
    if (synthRef.current) {
      synthRef.current.releaseAll();
    }
    
    channelSynthsRef.current.forEach(synth => {
      synth.releaseAll();
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