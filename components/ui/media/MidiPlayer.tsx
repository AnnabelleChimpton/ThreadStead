import React, { useEffect, useRef, useState } from 'react';

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
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(0); // Track where we paused (in seconds)
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const midiDataRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null); // Master gain node for volume control
  const activeNodesRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode; endTime: number }>>([]); // Track active notes
  const autoplayTriggeredRef = useRef<boolean>(false); // Track if autoplay has been triggered

  // Enhanced but simple note player with instrument variety
  const playNoteSimple = (frequency: number, startTime: number, duration: number, velocity: number, instrument: number) => {
    if (!audioContextRef.current) return;

    // Channel 9 is drums - use noise burst
    if (instrument === 9 || instrument === 128) {
      playSimpleDrum(startTime, velocity);
      return;
    }

    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    // Simple instrument variety based on General MIDI families
    if (instrument >= 0 && instrument <= 7) {
      // Piano family - triangle wave
      osc.type = 'triangle';
    } else if (instrument >= 24 && instrument <= 31) {
      // Guitar family - sawtooth for brightness
      osc.type = 'sawtooth';
    } else if (instrument >= 40 && instrument <= 47) {
      // Strings - sine wave for smoothness
      osc.type = 'sine';
    } else if (instrument >= 56 && instrument <= 63) {
      // Brass - square wave for brightness
      osc.type = 'square';
    } else {
      // Default - triangle wave
      osc.type = 'triangle';
    }
    
    osc.frequency.value = frequency;
    
    const baseGain = Math.max((velocity / 127) * 0.25, 0.001); // Remove volume from individual notes - master gain handles this
    
    // Simple envelope variety by instrument family
    if (instrument >= 0 && instrument <= 7) {
      // Piano - quick attack, medium decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(baseGain, startTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(baseGain * 0.3, 0.001), startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 2.0));
    } else if (instrument >= 24 && instrument <= 31) {
      // Guitar - sharp attack, quick decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(baseGain, startTime + 0.001);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(baseGain * 0.2, 0.001), startTime + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 1.5));
    } else if (instrument >= 40 && instrument <= 47) {
      // Strings - slow attack, sustained
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(Math.max(baseGain * 0.8, 0.001), startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(Math.max(baseGain * 0.6, 0.001), startTime + duration * 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 2.0));
    } else {
      // Default envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(baseGain, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 2.0));
    }
    
    osc.connect(gainNode);
    
    // Connect to master gain if available, otherwise directly to destination
    if (masterGainRef.current) {
      gainNode.connect(masterGainRef.current);
    } else {
      gainNode.connect(audioContextRef.current.destination);
    }
    
    osc.start(startTime);
    osc.stop(startTime + Math.min(duration, 2.0));
    
    activeNodesRef.current.push({ osc, gain: gainNode, endTime: startTime + duration });
  };

  // Simple drum sounds using noise
  const playSimpleDrum = (startTime: number, velocity: number) => {
    if (!audioContextRef.current) return;
    
    // Create noise buffer for drum sound
    const bufferSize = audioContextRef.current.sampleRate * 0.1; // 100ms of noise
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    const filter = audioContextRef.current.createBiquadFilter();
    
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 200; // Drum-like frequency
    
    const drumGain = (velocity / 127) * (volume / 100) * 0.15; // Quieter drums
    gainNode.gain.setValueAtTime(drumGain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    noise.start(startTime);
    noise.stop(startTime + 0.1);
  };

  // Complex instrument sound generator (keeping for reference but not used)
  const playNote = (frequency: number, startTime: number, duration: number, velocity: number, instrument: number) => {
    if (!audioContextRef.current) {
      return;
    }

    // Channel 9 is always drums
    if (instrument === 9 || instrument === 128) {
      playDrumSound(frequency, startTime, duration, velocity);
      return;
    }

    const osc1 = audioContextRef.current.createOscillator();
    const osc2 = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    const filter = audioContextRef.current.createBiquadFilter();
    const osc2Gain = audioContextRef.current.createGain();

    // General MIDI instrument families - based on webaudio-tinysynth patterns
    if (instrument >= 0 && instrument <= 7) {
      // Piano family - soft attack, triangle + sine harmonics
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc2.frequency.value = frequency * 2; // Second harmonic for brightness
      osc2Gain.gain.value = 0.25; // Subtle harmonic content
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 3; // More controlled brightness
      filter.Q.value = 0.3; // Gentle filtering
      
    } else if (instrument >= 8 && instrument <= 15) {
      // Chromatic Percussion - bright attack
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc2.frequency.value = frequency * 3; // Third harmonic
      osc2Gain.gain.value = 0.2;
      filter.type = 'bandpass';
      filter.frequency.value = frequency * 2;
      filter.Q.value = 2;
      
    } else if (instrument >= 16 && instrument <= 23) {
      // Organ family - sustained, rich
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc2.frequency.value = frequency * 1.5; // Fifth harmonic
      osc2Gain.gain.value = 0.4;
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 3;
      filter.Q.value = 0.7;
      
    } else if (instrument >= 24 && instrument <= 31) {
      // Guitar family - sawtooth + detuning for pluck simulation
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc2.frequency.value = frequency * 0.996; // Slight chorus detuning
      osc2Gain.gain.value = 0.4; // Moderate blend
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 2.5; // Guitar-like tone shaping
      filter.Q.value = 1.2; // Some resonance for body
      
    } else if (instrument >= 32 && instrument <= 39) {
      // Bass family - sawtooth + sub-octave for depth
      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc2.frequency.value = frequency * 0.5; // Sub-octave fundamental
      osc2Gain.gain.value = 0.6; // Strong sub-bass presence
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 1.8; // Warmer bass tone
      filter.Q.value = 0.4; // Smooth low-end
      
    } else if (instrument >= 40 && instrument <= 47) {
      // String family - sawtooth + slight detune for ensemble effect
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc2.frequency.value = frequency * 1.004; // Ensemble detune
      osc2Gain.gain.value = 0.5; // Balanced blend
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 2.2; // String-like filtering
      filter.Q.value = 0.7; // Some string resonance
      
    } else if (instrument >= 56 && instrument <= 63) {
      // Brass family - square wave + harmonics for bright brass tone
      osc1.type = 'square';
      osc2.type = 'square';
      osc2.frequency.value = frequency * 2.01; // Second harmonic with slight detune
      osc2Gain.gain.value = 0.3; // Harmonic richness
      filter.type = 'bandpass';
      filter.frequency.value = frequency * 1.8; // Brass formant
      filter.Q.value = 1.5; // Characteristic brass bite
      
    } else if (instrument >= 64 && instrument <= 71) {
      // Reed family - square + odd harmonics for clarinet/sax character
      osc1.type = 'square';
      osc2.type = 'triangle';
      osc2.frequency.value = frequency * 3.02; // Third harmonic with detune
      osc2Gain.gain.value = 0.2; // Subtle harmonic color
      filter.type = 'bandpass';
      filter.frequency.value = frequency * 2.1; // Reed formant
      filter.Q.value = 2.0; // Woody resonance
      
    } else if (instrument >= 16 && instrument <= 23) {
      // Organ family - square + sine for classic organ tone
      osc1.type = 'square';
      osc2.type = 'sine';
      osc2.frequency.value = frequency * 2; // Octave doubling
      osc2Gain.gain.value = 0.4; // Classic organ harmonic mix
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 3;
      filter.Q.value = 0.2; // Clean organ tone
      
    } else {
      // Default synth sound - triangle + harmonic
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc2.frequency.value = frequency * 1.5; // Fifth interval
      osc2Gain.gain.value = 0.25;
      filter.type = 'lowpass';
      filter.frequency.value = frequency * 2.5;
      filter.Q.value = 0.5;
    }

    osc1.frequency.value = frequency;
    
    // Normalized volume levels per instrument family
    const baseGainValue = (velocity / 127) * (volume / 100) * 0.4; // Reduced base volume
    let instrumentMultiplier = 1.0;
    
    // Volume normalization per instrument family
    if (instrument >= 0 && instrument <= 7) {
      // Piano family - standard volume
      instrumentMultiplier = 1.0;
    } else if (instrument >= 8 && instrument <= 15) {
      // Chromatic Percussion - slightly quieter
      instrumentMultiplier = 0.8;
    } else if (instrument >= 16 && instrument <= 23) {
      // Organ family - quieter (can be overpowering)
      instrumentMultiplier = 0.7;
    } else if (instrument >= 24 && instrument <= 31) {
      // Guitar family - standard volume
      instrumentMultiplier = 1.0;
    } else if (instrument >= 32 && instrument <= 39) {
      // Bass family - louder (often too quiet)
      instrumentMultiplier = 1.4;
    } else if (instrument >= 40 && instrument <= 47) {
      // String family - slightly louder
      instrumentMultiplier = 1.2;
    } else if (instrument >= 48 && instrument <= 55) {
      // Ensemble family - quieter (multiple voices)
      instrumentMultiplier = 0.8;
    } else if (instrument >= 56 && instrument <= 63) {
      // Brass family - quieter (can be harsh)
      instrumentMultiplier = 0.8;
    } else if (instrument >= 64 && instrument <= 71) {
      // Reed family - standard volume
      instrumentMultiplier = 1.0;
    } else {
      // Default - standard volume
      instrumentMultiplier = 1.0;
    }
    
    const gainValue = baseGainValue * instrumentMultiplier;
    
    if (instrument >= 0 && instrument <= 7) {
      // Piano - quick attack, medium decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(gainValue * 0.3, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
    } else if (instrument >= 24 && instrument <= 31) {
      // Guitar - sharp attack, quick decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.001);
      gain.gain.exponentialRampToValueAtTime(gainValue * 0.1, startTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
    } else if (instrument >= 40 && instrument <= 47) {
      // Strings - slow attack, sustained
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue * 0.8, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(gainValue * 0.6, startTime + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
    } else if (instrument >= 56 && instrument <= 63) {
      // Brass - medium attack, sustained with slight decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue * 0.3, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(gainValue * 0.7, startTime + duration * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
    } else {
      // Default envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(gainValue * 0.3, startTime + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    }

    // Connect audio graph with reverb
    const dryGain = audioContextRef.current.createGain();
    const wetGain = audioContextRef.current.createGain();
    
    // Adjust wet/dry mix based on instrument
    if (instrument >= 40 && instrument <= 47) {
      // Strings - more reverb
      dryGain.gain.value = 0.6;
      wetGain.gain.value = 0.4;
    } else if (instrument >= 24 && instrument <= 31) {
      // Guitar - less reverb
      dryGain.gain.value = 0.8;
      wetGain.gain.value = 0.2;
    } else {
      // Default mix
      dryGain.gain.value = 0.7;
      wetGain.gain.value = 0.3;
    }
    
    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(gain);
    
    // Split to dry and wet paths
    gain.connect(dryGain);
    gain.connect(wetGain);
    
    // Debug the effects references
    if (!compressorRef.current || !reverbRef.current) {
      return;
    }
    
    // Dry path goes directly to compressor
    dryGain.connect(compressorRef.current);
    
    // Wet path goes through reverb then compressor
    wetGain.connect(reverbRef.current);

    // Start oscillators
    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    
    // Track active notes for stopping
    activeNodesRef.current.push(
      { osc: osc1, gain, endTime: startTime + duration },
      { osc: osc2, gain, endTime: startTime + duration }
    );
  };

  // Specialized drum sound generator
  const playDrumSound = (frequency: number, startTime: number, duration: number, velocity: number) => {
    if (!audioContextRef.current) return;

    // Convert frequency back to MIDI note to identify drum type
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    const filter = audioContextRef.current.createBiquadFilter();
    
    // Normalized percussion volumes
    let gainValue = (velocity / 127) * (volume / 100) * 0.6; // Reduced base percussion volume
    
    // Normalize specific percussion instruments
    if (midiNote >= 35 && midiNote <= 36) {
      // Kick drum - standard volume
      gainValue *= 1.0;
    } else if (midiNote >= 38 && midiNote <= 40) {
      // Snare - slightly louder
      gainValue *= 1.1;
    } else if (midiNote >= 42 && midiNote <= 46) {
      // Hi-hat - quieter
      gainValue *= 0.7;
    } else if (midiNote === 75 || midiNote === 76) {
      // Claves - much quieter
      gainValue *= 0.12;
      // Claves are much quieter now
    } else if (midiNote >= 77 && midiNote <= 82) {
      // Wood blocks - quieter
      gainValue *= 0.25;
    } else if (midiNote >= 47 && midiNote <= 59) {
      // Toms and other drums - standard volume
      gainValue *= 0.9;
    } else {
      // Other percussion - quieter default
      gainValue *= 0.8;
    }
    
    if (midiNote >= 35 && midiNote <= 36) {
      // Kick drum - low sine wave with quick decay
      osc.type = 'sine';
      osc.frequency.value = 60;
      filter.type = 'lowpass';
      filter.frequency.value = 100;
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      
    } else if (midiNote >= 38 && midiNote <= 40) {
      // Snare - noise-like square wave
      osc.type = 'square';
      osc.frequency.value = 200;
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 2;
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      
    } else if (midiNote >= 42 && midiNote <= 46) {
      // Hi-hat - high frequency noise
      osc.type = 'sawtooth';
      osc.frequency.value = 1000;
      filter.type = 'highpass';
      filter.frequency.value = 800;
      filter.Q.value = 1;
      
      const drumDuration = 0.05;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue * 0.6, startTime + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + drumDuration);
      
    } else if (midiNote === 75 || midiNote === 76) {
      // Claves - short, sharp, woody sound
      osc.type = 'square';
      osc.frequency.value = 800;
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 4;
      
      const drumDuration = 0.08; // Very short
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + drumDuration);
      
    } else {
      // Other percussion - generic drum sound
      osc.type = 'square';
      osc.frequency.value = 150;
      filter.type = 'bandpass';
      filter.frequency.value = 300;
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
    }

    osc.connect(filter);
    filter.connect(gain);
    
    // Drums get minimal reverb, claves get even less
    const dryGain = audioContextRef.current.createGain();
    const wetGain = audioContextRef.current.createGain();
    
    if (midiNote === 75 || midiNote === 76) {
      // Claves get almost no reverb - very dry sound
      dryGain.gain.value = 0.95;
      wetGain.gain.value = 0.05;
    } else {
      dryGain.gain.value = 0.9;
      wetGain.gain.value = 0.1;
    }
    
    gain.connect(dryGain);
    gain.connect(wetGain);
    dryGain.connect(compressorRef.current!);
    wetGain.connect(reverbRef.current!);
    
    osc.start(startTime);
    const drumDuration = Math.min(duration, 0.3);
    osc.stop(startTime + drumDuration);
    
    // Track active drum notes for stopping
    activeNodesRef.current.push(
      { osc, gain, endTime: startTime + drumDuration }
    );
  };

  // Convert MIDI note number to frequency
  const noteToFrequency = (note: number): number => {
    return 440 * Math.pow(2, (note - 69) / 12);
  };

  // Create reverb impulse response
  const createReverbImpulse = (audioContext: AudioContext, length: number, decay: number): AudioBuffer => {
    const sampleRate = audioContext.sampleRate;
    const bufferLength = sampleRate * length;
    const impulse = audioContext.createBuffer(2, bufferLength, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < bufferLength; i++) {
        const n = bufferLength - i;
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / bufferLength, decay);
      }
    }
    
    return impulse;
  };

  // Load and parse MIDI file
  const loadMidi = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch MIDI file
      const response = await fetch(midiUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Parse MIDI using @tonejs/midi
      const { Midi } = await import('@tonejs/midi');
      const midi = new Midi(arrayBuffer);

      midiDataRef.current = midi;
      setDuration(midi.duration);
      
      setIsLoading(false);

    } catch (err) {
      console.error('Error loading MIDI:', err);
      setError('Failed to load MIDI file');
      setIsLoading(false);
    }
  };

  // Play the MIDI
  const playMidi = async (startOffset: number = 0) => {
    if (!midiDataRef.current) return;

    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Create master gain node for volume control (always needed)
    if (!masterGainRef.current) {
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.setValueAtTime(volume / 100, audioContextRef.current.currentTime);
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
    
    // Initialize effects (separate from AudioContext creation)
    if (!reverbRef.current || !compressorRef.current) {
      // Create reverb effect
      reverbRef.current = audioContextRef.current.createConvolver();
      const reverbBuffer = createReverbImpulse(audioContextRef.current, 2, 0.3);
      reverbRef.current.buffer = reverbBuffer;
      
      // Create compressor for better dynamics
      compressorRef.current = audioContextRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.value = -24;
      compressorRef.current.knee.value = 30;
      compressorRef.current.ratio.value = 12;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.25;
      
      // Connect effects chain: reverb -> compressor -> masterGain -> destination
      reverbRef.current.connect(compressorRef.current);
      compressorRef.current.connect(masterGainRef.current);
      // masterGain already connected to destination above
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const midi = midiDataRef.current;
    const currentTime = audioContextRef.current.currentTime;
    playbackStartTimeRef.current = Date.now() - (startOffset * 1000); // Adjust for resume offset


    // Schedule notes starting from the offset position
    let noteCount = 0;
    
    midi.tracks.forEach((track: any, trackIndex: number) => {
      track.notes.forEach((note: any) => {
        // Skip notes that have already played (before the startOffset)
        if (note.time < startOffset) {
          return;
        }
        
        const frequency = noteToFrequency(note.midi);
        const adjustedStartTime = note.time - startOffset; // Adjust timing relative to pause point
        const startTime = currentTime + adjustedStartTime;
        const duration = Math.max(note.duration, 0.1);
        const velocity = note.velocity * 127;
        const instrument = track.instrument?.number ?? (track.channel === 9 ? 128 : trackIndex);

        // Use simplified playback like GlobalAudioContext
        playNoteSimple(frequency, startTime, duration, velocity, instrument);
        noteCount++;
      });
    });
    
    setIsPlaying(true);

    // Start progress tracking and cleanup
    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - playbackStartTimeRef.current) / 1000;
      const progressPercent = duration > 0 ? (elapsed / duration) * 100 : 0;
      
      // Clean up finished notes
      const currentTime = audioContextRef.current?.currentTime || 0;
      activeNodesRef.current = activeNodesRef.current.filter(node => node.endTime > currentTime);

      if (progressPercent >= 100) {
        setProgress(100);
        setIsPlaying(false);
        resetPauseState(); // Reset pause state when song ends naturally
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        // Clean up any remaining nodes
        activeNodesRef.current = [];

        if (loop) {
          setTimeout(() => playMidi(), 100);
        }
      } else {
        setProgress(progressPercent);
      }
    }, 100);
  };

  const stopAllAudio = () => {
    // Stop all currently playing notes immediately
    const currentTime = audioContextRef.current?.currentTime || 0;
    
    activeNodesRef.current.forEach(node => {
      try {
        // Fade out quickly to avoid clicks
        if (node.gain && node.gain.gain) {
          node.gain.gain.cancelScheduledValues(currentTime);
          node.gain.gain.setValueAtTime(node.gain.gain.value, currentTime);
          node.gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.05);
        }
        
        // Stop oscillator after fade
        if (node.osc && node.osc.stop) {
          node.osc.stop(currentTime + 0.05);
        }
      } catch (e) {
        // Ignore errors from already-stopped oscillators
      }
    });
    
    // Clear the active nodes array
    activeNodesRef.current = [];
    
    // Clean up master gain node
    if (masterGainRef.current) {
      try {
        masterGainRef.current.disconnect();
        masterGainRef.current = null;
      } catch (e) {
        console.warn('Error cleaning up master gain:', e);
      }
    }
    // All audio stopped
  };

  // Separate function to reset pause state (only call when truly stopping/resetting)
  const resetPauseState = () => {
    setIsPaused(false);
    setPausedAt(0);
  };

  const play = async () => {
    if (!midiDataRef.current) {
      await loadMidi();
    }

    if (isPlaying) {
      // Pause playback - calculate current position
      const elapsed = (Date.now() - playbackStartTimeRef.current) / 1000;
      setPausedAt(elapsed);
      setIsPaused(true);
      
      stopAllAudio();
      setIsPlaying(false);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      // Resume playback from pause point or start from beginning
      const startOffset = isPaused ? pausedAt : 0;
      setIsPaused(false);
      
      await playMidi(startOffset);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    
    // Apply volume change to master gain node in real-time
    if (masterGainRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      masterGainRef.current.gain.setValueAtTime(newVolume / 100, currentTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (autoplay) {
      loadMidi();
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Stop any playing audio when component unmounts
      stopAllAudio();
      resetPauseState(); // Reset pause state when component unmounts
    };
  }, [midiUrl, autoplay]);

  // Simple autoplay handling - only run once when MIDI is loaded
  useEffect(() => {
    if (autoplay && midiDataRef.current && !isLoading && !isPlaying && !autoplayTriggeredRef.current) {
      // Use setTimeout to avoid immediate execution conflicts
      const timer = setTimeout(() => {
        if (midiDataRef.current && !isPlaying && !autoplayTriggeredRef.current) {
          autoplayTriggeredRef.current = true; // Mark autoplay as triggered
          play();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoplay, isLoading, isPlaying]); // Restore isPlaying dependency but prevent multiple triggers

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border-2 border-black p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <span className="animate-spin">⏳</span>
          <span className="ml-2">Loading MIDI...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border-2 border-black p-6 ${className}`}>
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          ❌ {error}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border-2 border-black p-3 z-50 ${className}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={play}
            className="w-10 h-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
            aria-label={isPlaying ? 'Stop' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <div className="flex-1">
            <div className="text-sm font-medium truncate max-w-[150px]">{title}</div>
            {isPlaying && (
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="text-gray-600 hover:text-gray-800"
              aria-label="Volume"
            >
              🔊
            </button>
            
            {showVolumeSlider && (
              <div className="absolute bottom-full right-0 mb-2 p-2 bg-white border-2 border-black rounded shadow-lg">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24"
                  aria-label="Volume slider"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 border-black p-6 ${className}`}>
      <h3 className="text-lg font-bold mb-4">🎵 {title}</h3>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={play}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          
          {loop && (
            <span className="text-sm text-gray-600">🔁 Loop enabled</span>
          )}
        </div>
        
        {duration > 0 && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{formatTime((progress / 100) * duration)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <span className="text-sm">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1"
            aria-label="Volume"
          />
          <span className="text-sm text-gray-600">{volume}%</span>
        </div>
      </div>
    </div>
  );
}