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
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode; endTime: number; id: string }>>([]); // Track active notes
  const autoplayTriggeredRef = useRef<boolean>(false);
  
  // Advanced performance optimization refs
  const nodePoolRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode; available: boolean }>>([]);
  const instrumentGainsRef = useRef<Map<number, GainNode>>(new Map()); // Per-instrument gain nodes
  const channelGainsRef = useRef<Map<number, GainNode>>(new Map()); // Per-channel gain nodes
  const scheduledEventsRef = useRef<Array<{ id: string; startTime: number }>>([]);
  const voiceStealingRef = useRef<{ enabled: boolean; lastStealTime: number }>({ enabled: false, lastStealTime: 0 });
  
  // Enhanced synthesis refs
  const pianoBuffersRef = useRef<Map<number, AudioBuffer>>(new Map()); // Pre-generated piano samples
  const activeHarmoniesRef = useRef<Map<number, Set<number>>>(new Map()); // Track active notes per channel for chord detection
  const voiceImportanceRef = useRef<Map<string, number>>(new Map()); // Track voice importance scores
  
  // Musical analysis refs
  const rhythmicAnalysisRef = useRef<Map<string, any>>(new Map()); // Rhythmic importance per note
  const musicalPhrasesRef = useRef<Array<any>>([]); // Detected musical phrases
  const bassLineNotesRef = useRef<Set<number>>(new Set()); // Important bass notes
  const timeSignatureRef = useRef<{ numerator: number; denominator: number }>({ numerator: 4, denominator: 4 });

  // Initialize optimized audio graph with per-instrument and per-channel routing
  const initializeOptimizedAudioGraph = () => {
    if (!audioContextRef.current) return;

    // Create per-instrument gain nodes for better mixing
    const instrumentNumbers = [0, 3, 32, 40, 43, 57, 128]; // Common instruments
    instrumentNumbers.forEach(instrument => {
      if (!instrumentGainsRef.current.has(instrument)) {
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = getInstrumentVolume(instrument);
        gainNode.connect(masterGainRef.current!);
        instrumentGainsRef.current.set(instrument, gainNode);
      }
    });

    // Create per-channel gain nodes
    for (let channel = 0; channel < 16; channel++) {
      if (!channelGainsRef.current.has(channel)) {
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = channel === 9 ? 0.7 : 1.0; // Drums slightly quieter
        gainNode.connect(masterGainRef.current!);
        channelGainsRef.current.set(channel, gainNode);
      }
    }
  };

  const getInstrumentVolume = (instrument: number): number => {
    // Balanced instrument volumes
    if (instrument >= 0 && instrument <= 7) return 1.0; // Piano
    if (instrument >= 24 && instrument <= 31) return 0.8; // Guitar
    if (instrument >= 32 && instrument <= 39) return 1.2; // Bass
    if (instrument >= 40 && instrument <= 47) return 1.1; // Strings
    if (instrument >= 56 && instrument <= 63) return 0.9; // Brass
    if (instrument === 128) return 0.8; // Drums
    return 1.0;
  };

  // Generate high-quality piano samples procedurally
  const generatePianoSample = (frequency: number, duration: number = 3.0): AudioBuffer => {
    const sampleRate = audioContextRef.current!.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = audioContextRef.current!.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Multi-harmonic piano synthesis with realistic decay
    const fundamentalFreq = frequency;
    const harmonics = [
      { freq: fundamentalFreq, amp: 1.0, decay: 1.0 },
      { freq: fundamentalFreq * 2, amp: 0.7, decay: 1.5 },
      { freq: fundamentalFreq * 3, amp: 0.4, decay: 2.0 },
      { freq: fundamentalFreq * 4, amp: 0.3, decay: 2.5 },
      { freq: fundamentalFreq * 5, amp: 0.2, decay: 3.0 },
      { freq: fundamentalFreq * 6, amp: 0.15, decay: 3.5 },
      { freq: fundamentalFreq * 7, amp: 0.1, decay: 4.0 },
    ];
    
    // Add some slight random variations for realism
    const randomSeed = Math.sin(frequency * 0.001) * 0.02;
    
    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      let sample = 0;
      
      for (const harmonic of harmonics) {
        // Exponential decay envelope with slight variations
        const decayRate = harmonic.decay + randomSeed;
        const envelope = Math.exp(-time * decayRate);
        
        // Add slight frequency modulation for realism
        const modulation = 1 + Math.sin(time * 5 + harmonic.freq * 0.001) * 0.002;
        
        sample += harmonic.amp * envelope * Math.sin(2 * Math.PI * harmonic.freq * modulation * time);
      }
      
      // Add subtle attack transient for more realistic piano sound
      if (time < 0.01) {
        const attackEnv = time / 0.01;
        sample *= attackEnv;
      }
      
      // Soft saturation for warmth
      sample = Math.tanh(sample * 0.7) * 0.8;
      
      channelData[i] = sample;
    }
    
    return buffer;
  };

  // Pre-generate piano samples for common notes (C3 to C6 range)
  const initializePianoSamples = async () => {
    if (!audioContextRef.current || pianoBuffersRef.current.size > 0) return;
    
    console.log('🎹 Generating high-quality piano samples...');
    
    // Generate samples for every 3rd note (fill gaps with pitch shifting)
    for (let midiNote = 48; midiNote <= 84; midiNote += 3) { // C3 to C6, every 3 semitones
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      const buffer = generatePianoSample(frequency);
      pianoBuffersRef.current.set(midiNote, buffer);
    }
    
    console.log(`🎹 Generated ${pianoBuffersRef.current.size} piano samples`);
  };

  // Chord detection and harmony analysis
  const getNoteName = (midiNote: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return noteNames[midiNote % 12];
  };

  const areNotesHarmonicallyRelated = (note1: number, note2: number): boolean => {
    const interval = Math.abs(note1 - note2) % 12;
    // Perfect consonances: unison(0), octave(0), fifth(7), fourth(5)
    // Pleasant consonances: major third(4), minor third(3), major sixth(9), minor sixth(8)
    const consonantIntervals = [0, 3, 4, 5, 7, 8, 9];
    return consonantIntervals.includes(interval);
  };

  // Detect time signature from MIDI data
  const detectTimeSignature = (notes: any[], timeDivision: number) => {
    // Analyze note spacing patterns to detect time signature
    if (notes.length < 10) return { numerator: 4, denominator: 4 };
    
    const noteTimes = notes.map(note => note.time).sort((a, b) => a - b);
    const intervals = [];
    
    // Calculate intervals between consecutive notes
    for (let i = 1; i < Math.min(noteTimes.length, 100); i++) {
      intervals.push(noteTimes[i] - noteTimes[i-1]);
    }
    
    // Find most common interval (likely beat length)
    const intervalCounts = new Map();
    intervals.forEach(interval => {
      const rounded = Math.round(interval * 4) / 4; // Round to quarter notes
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
    });
    
    // Simple heuristic: default to 4/4 for most music
    // Could be enhanced with more sophisticated analysis
    return { numerator: 4, denominator: 4 };
  };

  // Calculate rhythmic importance for a note
  const calculateRhythmicImportance = (noteTime: number, timeDivision: number = 384) => {
    const timeSignature = timeSignatureRef.current;
    
    // Convert time to musical beats (assuming 120 BPM for analysis)
    const quarterNoteLength = 0.5; // seconds at 120 BPM
    const measureLength = quarterNoteLength * timeSignature.numerator;
    
    // Calculate position within measure
    const measurePosition = (noteTime % measureLength) / quarterNoteLength;
    const beat = Math.floor(measurePosition) + 1;
    const subdivision = measurePosition - Math.floor(measurePosition);
    
    let rhythmicImportance = 0.5; // Base importance
    
    // Downbeats (beat 1) are most important - NEVER STEAL
    if (beat === 1 && subdivision < 0.1) {
      rhythmicImportance = 1.0; // Maximum protection
    }
    // Strong beats (beat 3 in 4/4) are very important
    else if (beat === 3 && timeSignature.numerator === 4 && subdivision < 0.1) {
      rhythmicImportance = 0.9;
    }
    // Weak beats (2 and 4 in 4/4) are moderately important
    else if ((beat === 2 || beat === 4) && subdivision < 0.1) {
      rhythmicImportance = 0.7;
    }
    // Off-beat notes (syncopation) can be important
    else if (subdivision > 0.4 && subdivision < 0.6) {
      rhythmicImportance = 0.75; // Syncopated notes
    }
    // Eighth note positions
    else if (Math.abs(subdivision - 0.5) < 0.1) {
      rhythmicImportance = 0.6;
    }
    
    return rhythmicImportance;
  };

  // Detect and analyze bass line notes
  const analyzeBassLine = (notes: any[]): Set<number> => {
    const bassNotes = new Set<number>();
    
    // Find notes below C3 (MIDI note 48) - likely bass notes
    const lowNotes = notes.filter(note => {
      const midiNote = Math.round(12 * Math.log2(note.frequency / 440) + 69);
      return midiNote < 48;
    });
    
    // Group by time and find lowest note at each time point
    const timeGroups = new Map();
    lowNotes.forEach(note => {
      const timeKey = Math.round(note.time * 4); // Quarter note resolution
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }
      timeGroups.get(timeKey)!.push(note);
    });
    
    // For each time group, mark the lowest note as important bass
    timeGroups.forEach(group => {
      if (group.length > 0) {
        const lowestNote = group.reduce((lowest: any, note: any) => {
          const midiNote1 = Math.round(12 * Math.log2(lowest.frequency / 440) + 69);
          const midiNote2 = Math.round(12 * Math.log2(note.frequency / 440) + 69);
          return midiNote2 < midiNote1 ? note : lowest;
        });
        
        const midiNote = Math.round(12 * Math.log2(lowestNote.frequency / 440) + 69);
        bassNotes.add(midiNote % 12); // Store pitch class (0-11) for easier comparison
      }
    });
    
    return bassNotes;
  };

  // Detect musical phrases based on timing gaps and melodic contour
  const detectMusicalPhrases = (notes: any[]) => {
    if (notes.length < 5) return [];
    
    const phrases = [];
    let currentPhrase = [];
    let lastNoteTime = 0;
    
    // Sort notes by time
    const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
    
    for (const note of sortedNotes) {
      const gap = note.time - lastNoteTime;
      
      // Phrase break detected (gap > 1 second or significant tempo change)
      if (gap > 1.0 && currentPhrase.length > 0) {
        const phrase = {
          startTime: currentPhrase[0].time,
          endTime: currentPhrase[currentPhrase.length - 1].time + currentPhrase[currentPhrase.length - 1].duration,
          notes: currentPhrase,
          importance: calculatePhraseImportance(currentPhrase),
          channel: currentPhrase[0].channel || 0
        };
        phrases.push(phrase);
        currentPhrase = [];
      }
      
      currentPhrase.push(note);
      lastNoteTime = note.time + note.duration;
    }
    
    // Add final phrase
    if (currentPhrase.length > 0) {
      const phrase = {
        startTime: currentPhrase[0].time,
        endTime: currentPhrase[currentPhrase.length - 1].time + currentPhrase[currentPhrase.length - 1].duration,
        notes: currentPhrase,
        importance: calculatePhraseImportance(currentPhrase),
        channel: currentPhrase[0].channel || 0
      };
      phrases.push(phrase);
    }
    
    return phrases;
  };

  const calculatePhraseImportance = (notes: any[]) => {
    let importance = 0;
    
    // Longer phrases are more important
    importance += Math.min(notes.length / 20, 0.4);
    
    // Higher average velocity = more important
    const avgVelocity = notes.reduce((sum, note) => sum + note.velocity, 0) / notes.length;
    importance += (avgVelocity / 127) * 0.3;
    
    // Melodic movement (larger intervals) = more important
    if (notes.length > 1) {
      let totalMovement = 0;
      for (let i = 1; i < notes.length; i++) {
        const midiNote1 = Math.round(12 * Math.log2(notes[i-1].frequency / 440) + 69);
        const midiNote2 = Math.round(12 * Math.log2(notes[i].frequency / 440) + 69);
        const interval = Math.abs(midiNote2 - midiNote1);
        totalMovement += Math.min(interval / 12, 1.0); // Normalize to octave
      }
      importance += Math.min(totalMovement / notes.length, 0.3);
    }
    
    return Math.min(importance, 1.0);
  };

  // Check if a note is in an important musical phrase
  const isInImportantPhrase = (noteTime: number, channel: number = 0) => {
    for (const phrase of musicalPhrasesRef.current) {
      if (noteTime >= phrase.startTime && 
          noteTime <= phrase.endTime && 
          phrase.channel === channel &&
          phrase.importance > 0.7) {
        return true;
      }
    }
    return false;
  };

  const calculateMusicalImportance = (voice: any, newNote: { note: number; velocity: number; channel: number; instrument: number }): number => {
    if (!voice.id) return 0;
    
    let importance = 0;
    const now = audioContextRef.current?.currentTime || 0;
    
    // Extract note info from voice ID
    const voiceIdParts = voice.id.split('-');
    const voiceNote = parseInt(voiceIdParts[2]) || 0;
    const voiceVelocity = parseFloat(voiceIdParts[3]) || 0;
    const voiceChannel = parseInt(voiceIdParts[4]) || 0;
    
    // Extract timing from voice start time (approximate)
    const voiceStartTime = parseFloat(voiceIdParts[1]) || now;
    
    // 1. RHYTHMIC IMPORTANCE (25% weight) - NEW!
    const voiceRhythmicImportance = calculateRhythmicImportance(voiceStartTime);
    importance += voiceRhythmicImportance * 0.25;
    
    // NEVER steal downbeat notes (beat 1)
    if (voiceRhythmicImportance >= 1.0) {
      importance += 1.0; // Make it nearly impossible to steal
    }
    
    // 2. BASS LINE PROTECTION (20% weight) - NEW!
    if (voiceNote < 48) { // Below C3
      importance += 0.2;
      
      // Extra protection for identified bass line notes
      if (bassLineNotesRef.current.has(voiceNote % 12)) {
        importance += 0.15; // Strong bass protection
      }
    }
    
    // 3. PHRASE PROTECTION (15% weight) - NEW!
    if (isInImportantPhrase(voiceStartTime, voiceChannel)) {
      importance += 0.15; // Protect notes in important phrases
    }
    
    // 4. Channel priority (15% weight)
    if (voiceChannel === 0) importance += 0.15; // Main melody
    if (voiceChannel === 9) importance += 0.1; // Drums important for rhythm
    
    // 5. Velocity priority (10% weight)
    importance += (voiceVelocity / 127) * 0.1;
    
    // 6. Remaining time priority (5% weight)
    const remainingTime = Math.max(0, voice.endTime - now);
    importance += Math.min(remainingTime / 2.0, 0.05);
    
    // 7. Harmonic relationship penalty (10% weight)
    if (areNotesHarmonicallyRelated(voiceNote, newNote.note)) {
      importance += 0.1; // Protect harmonious notes
    }
    
    // 8. Instrument priority (5% weight)
    if (newNote.instrument >= 0 && newNote.instrument <= 7) importance += 0.05; // Piano priority
    
    return Math.min(importance, 2.0); // Allow higher importance scores for critical notes
  };

  // Enhanced voice stealing with musical intelligence
  const stealVoiceIfNeeded = (newNote: { note: number; velocity: number; channel: number; instrument: number; priority: number }): boolean => {
    const now = audioContextRef.current?.currentTime || 0;
    const activeVoices = activeNodesRef.current.filter(node => node.endTime > now);
    
    // Increased limit to 200 voices
    if (activeVoices.length < 200) return true;
    
    // Find least important voice to steal using musical intelligence
    let weakestVoice = null;
    let weakestImportance = newNote.priority + 0.1; // New note needs to be more important
    
    for (const voice of activeVoices) {
      const importance = calculateMusicalImportance(voice, newNote);
      
      if (importance < weakestImportance) {
        weakestVoice = voice;
        weakestImportance = importance;
      }
    }
    
    if (weakestVoice) {
      // Update active harmonies tracking
      const voiceIdParts = weakestVoice.id.split('-');
      const voiceNote = parseInt(voiceIdParts[2]) || 0;
      const voiceChannel = parseInt(voiceIdParts[4]) || 0;
      const voiceStartTime = parseFloat(voiceIdParts[1]) || now;
      
      if (activeHarmoniesRef.current.has(voiceChannel)) {
        activeHarmoniesRef.current.get(voiceChannel)!.delete(voiceNote % 12);
      }
      
      // Fade out quickly and stop
      try {
        weakestVoice.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        weakestVoice.osc.stop(now + 0.02);
        activeNodesRef.current = activeNodesRef.current.filter(v => v !== weakestVoice);
        voiceStealingRef.current.lastStealTime = now;
        
        const voiceRhythmicImportance = calculateRhythmicImportance(voiceStartTime);
        const rhythmicInfo = voiceRhythmicImportance >= 1.0 ? ' [DOWNBEAT!]' : voiceRhythmicImportance >= 0.9 ? ' [STRONG]' : '';
        const bassInfo = voiceNote < 48 ? ' [BASS]' : '';
        const phraseInfo = isInImportantPhrase(voiceStartTime, voiceChannel) ? ' [PHRASE]' : '';
        
        console.log(`🎵 Voice stolen: Note ${voiceNote}${rhythmicInfo}${bassInfo}${phraseInfo} (importance: ${weakestImportance.toFixed(2)}) for new note ${newNote.note} (priority: ${newNote.priority.toFixed(2)})`);
        return true;
      } catch (e) {
        // Voice already stopped
      }
    }
    
    return false;
  };

  // Enhanced piano player using generated samples
  const playPianoNote = (frequency: number, startTime: number, duration: number, velocity: number, channel: number): any => {
    if (!audioContextRef.current) return null;
    
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    // Find closest sample (every 3rd note)
    let closestSample = 48; // Default to C3
    let minDistance = 999;
    
    for (const sampleNote of pianoBuffersRef.current.keys()) {
      const distance = Math.abs(midiNote - sampleNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestSample = sampleNote;
      }
    }
    
    const sampleBuffer = pianoBuffersRef.current.get(closestSample);
    if (!sampleBuffer) return null;
    
    const source = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    
    source.buffer = sampleBuffer;
    
    // Pitch shifting for notes not exactly matching samples
    const pitchRatio = frequency / (440 * Math.pow(2, (closestSample - 69) / 12));
    source.playbackRate.value = pitchRatio;
    
    // Velocity-sensitive volume and tone
    const baseGain = (velocity / 127) * 0.4;
    gainNode.gain.setValueAtTime(baseGain, startTime);
    
    // Natural piano decay envelope
    const decayTime = Math.min(duration, 2.5);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(baseGain * 0.1, 0.001), startTime + decayTime);
    
    source.connect(gainNode);
    
    // Route to appropriate channel gain
    const routingGain = channelGainsRef.current.get(channel) || masterGainRef.current;
    if (routingGain) {
      gainNode.connect(routingGain);
    }
    
    source.start(startTime);
    source.stop(startTime + decayTime);
    
    const noteId = `piano-${startTime}-${midiNote}-${velocity}-${channel}`;
    const voiceData = { osc: source as any, gain: gainNode, endTime: startTime + duration, id: noteId };
    
    // Track harmony
    if (!activeHarmoniesRef.current.has(channel)) {
      activeHarmoniesRef.current.set(channel, new Set());
    }
    activeHarmoniesRef.current.get(channel)!.add(midiNote % 12);
    
    return voiceData;
  };

  // Highly optimized note player with advanced features
  const playNoteAdvanced = (frequency: number, startTime: number, duration: number, velocity: number, instrument: number, channel: number = 0, priority: number = 1.0) => {
    if (!audioContextRef.current) return null;

    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    // Adaptive quality settings based on system load
    const activeNodeCount = activeNodesRef.current.length;
    const systemLoad = activeNodeCount / 200; // Updated for 200 voice limit
    
    // Dynamic quality thresholds
    const minVelocity = Math.max(3, systemLoad * 30); // More permissive
    const minDuration = Math.max(0.03, systemLoad * 0.2);
    
    if (velocity < minVelocity || duration < minDuration) return null;

    // Voice stealing for polyphony management with musical intelligence
    const newNote = { note: midiNote, velocity, channel, instrument, priority };
    if (!stealVoiceIfNeeded(newNote)) return null;

    // Channel 9 is drums - use optimized drum sounds
    if (channel === 9 || instrument === 128) {
      return playOptimizedDrum(startTime, velocity, frequency);
    }

    // Use piano samples for piano instruments (0-7) if available
    if (instrument >= 0 && instrument <= 7 && pianoBuffersRef.current.size > 0) {
      const pianoVoice = playPianoNote(frequency, startTime, duration, velocity, channel);
      if (pianoVoice) {
        activeNodesRef.current.push(pianoVoice);
        return pianoVoice;
      }
    }

    // Fallback to oscillator synthesis for other instruments
    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    const noteId = `synth-${startTime}-${midiNote}-${velocity}-${channel}`;
    
    // Optimized waveform selection
    const waveTypes: Record<number, OscillatorType> = {
      0: 'triangle',   // Piano (fallback)
      24: 'sawtooth',  // Guitar  
      40: 'sine',      // Strings
      56: 'square'     // Brass
    };
    
    const instrumentFamily = Math.floor(instrument / 8) * 8;
    osc.type = waveTypes[instrumentFamily] || 'triangle';
    osc.frequency.value = frequency;
    
    // Velocity-based gain with instrument balancing
    const instrumentVolume = getInstrumentVolume(instrument);
    const baseGain = (velocity / 127) * 0.3 * instrumentVolume;
    
    // Optimized envelope - fewer automation points for better performance
    const now = startTime;
    const maxDuration = Math.min(duration, 3.0); // Allow longer notes
    
    try {
      // Simple but effective envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(baseGain, now + 0.01);
      
      if (instrument >= 40 && instrument <= 47) {
        // Strings - sustained
        gainNode.gain.linearRampToValueAtTime(baseGain * 0.8, now + maxDuration * 0.7);
      } else if (instrument >= 0 && instrument <= 7) {
        // Piano - decay
        gainNode.gain.exponentialRampToValueAtTime(Math.max(baseGain * 0.3, 0.001), now + 0.5);
      }
      
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + maxDuration);
      
      osc.connect(gainNode);
      
      // Route through appropriate channel/instrument gain
      const routingGain = channelGainsRef.current.get(channel) || 
                         instrumentGainsRef.current.get(instrument) || 
                         masterGainRef.current;
      
      if (routingGain) {
        gainNode.connect(routingGain);
      } else {
        gainNode.connect(audioContextRef.current.destination);
      }
      
      osc.start(startTime);
      osc.stop(startTime + maxDuration);
      
      const voiceData = { osc, gain: gainNode, endTime: startTime + duration, id: noteId };
      activeNodesRef.current.push(voiceData);
      
      // Track harmony for non-piano instruments too
      if (!activeHarmoniesRef.current.has(channel)) {
        activeHarmoniesRef.current.set(channel, new Set());
      }
      activeHarmoniesRef.current.get(channel)!.add(midiNote % 12);
      
      return voiceData;
      
    } catch (error) {
      console.warn('Note scheduling error:', error);
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (e) { /* ignore */ }
      return null;
    }
  };

  // Optimized drum sounds with better performance
  const playOptimizedDrum = (startTime: number, velocity: number, frequency: number) => {
    if (!audioContextRef.current) return null;
    
    // Use a single noise buffer shared across all drum hits
    const drumGain = audioContextRef.current.createGain();
    const filter = audioContextRef.current.createBiquadFilter();
    
    // Determine drum type from frequency/MIDI note
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    let noiseType: 'white' | 'pink' | 'brown' = 'white';
    let filterFreq = 400;
    let duration = 0.1;
    
    if (midiNote >= 35 && midiNote <= 36) {
      // Kick drum
      noiseType = 'brown';
      filterFreq = 80;
      duration = 0.3;
    } else if (midiNote >= 38 && midiNote <= 40) {
      // Snare
      noiseType = 'white';
      filterFreq = 800;
      duration = 0.15;
    } else if (midiNote >= 42 && midiNote <= 46) {
      // Hi-hat
      noiseType = 'white';
      filterFreq = 8000;
      duration = 0.05;
    }
    
    // Simple noise generation
    const osc = audioContextRef.current.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = filterFreq;
    
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 5;
    
    const drumVolume = (velocity / 127) * 0.4;
    drumGain.gain.setValueAtTime(drumVolume, startTime);
    drumGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.connect(filter);
    filter.connect(drumGain);
    
    // Route to channel 9 gain
    const drumChannelGain = channelGainsRef.current.get(9) || masterGainRef.current;
    if (drumChannelGain) {
      drumGain.connect(drumChannelGain);
    }
    
    osc.start(startTime);
    osc.stop(startTime + duration);
    
    const noteId = `drum-${startTime}-${midiNote}`;
    const voiceData = { osc, gain: drumGain, endTime: startTime + duration, id: noteId };
    activeNodesRef.current.push(voiceData);
    
    return voiceData;
  };

  // Legacy function for backward compatibility
  const playNoteSimple = (frequency: number, startTime: number, duration: number, velocity: number, instrument: number) => {
    return playNoteAdvanced(frequency, startTime, duration, velocity, instrument, instrument === 128 ? 9 : 0, velocity / 127);
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
    const noteId1 = `legacy-${startTime}-${frequency}-1`;
    const noteId2 = `legacy-${startTime}-${frequency}-2`;
    activeNodesRef.current.push(
      { osc: osc1, gain, endTime: startTime + duration, id: noteId1 },
      { osc: osc2, gain, endTime: startTime + duration, id: noteId2 }
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
    const drumNoteId = `legacy-drum-${startTime}-${frequency}`;
    activeNodesRef.current.push(
      { osc, gain, endTime: startTime + drumDuration, id: drumNoteId }
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

  // Play the MIDI with optimized note scheduling
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
    playbackStartTimeRef.current = Date.now() - (startOffset * 1000);

    // Advanced note collection with intelligent filtering
    const allNotes: Array<{
      time: number;
      frequency: number;
      duration: number;
      velocity: number;
      instrument: number;
      channel: number;
      priority: number;
      trackIndex: number;
    }> = [];

    // Calculate track importance for smart reduction
    const trackStats = midi.tracks.map((track: any, trackIndex: number) => ({
      trackIndex,
      noteCount: track.notes.length,
      channel: track.channel ?? trackIndex,
      instrument: track.instrument?.number ?? (track.channel === 9 ? 128 : trackIndex),
      isDrums: (track.channel ?? trackIndex) === 9
    }));

    // Collect all notes with priority scoring
    midi.tracks.forEach((track: any, trackIndex: number) => {
      const trackStat = trackStats[trackIndex];
      const baseTrackPriority = trackStat.isDrums ? 0.9 : // Drums are important
                                trackStat.channel === 0 ? 1.0 : // Main piano melody
                                trackStat.noteCount > 1000 ? 0.8 : // Dense tracks lower priority
                                0.7; // Other tracks

      track.notes.forEach((note: any) => {
        if (note.time >= startOffset) {
          const channel = track.channel ?? trackIndex;
          const instrument = track.instrument?.number ?? (channel === 9 ? 128 : channel);
          
          // Calculate note priority (0-1, higher = more important)
          let priority = baseTrackPriority;
          priority *= note.velocity; // Louder notes are more important
          priority *= Math.min(1.0, note.duration / 0.5); // Longer notes (up to 0.5s) are more important
          
          // Boost important instruments
          if (instrument >= 0 && instrument <= 7) priority *= 1.1; // Piano
          if (instrument >= 56 && instrument <= 63) priority *= 1.05; // Brass
          if (channel === 9) priority *= 0.95; // Drums slightly less important for complex files
          
          allNotes.push({
            time: note.time,
            frequency: noteToFrequency(note.midi),
            duration: Math.max(note.duration, 0.1),
            velocity: note.velocity * 127,
            instrument: instrument,
            channel: channel,
            priority: priority,
            trackIndex: trackIndex
          });
        }
      });
    });

    // Sort notes by priority (highest first), then by time
    allNotes.sort((a, b) => {
      if (Math.abs(a.time - b.time) < 0.1) {
        // Notes at similar times - sort by priority
        return b.priority - a.priority;
      }
      return a.time - b.time;
    });

    const totalChannels = Math.max(...allNotes.map(n => n.channel)) + 1;
    console.log(`Loaded MIDI with ${allNotes.length} notes across ${totalChannels} channels`);
    console.log(`Track breakdown:`, trackStats.map((t: any) => `T${t.trackIndex + 1}:${t.noteCount}n`).join(', '));

    // Initialize optimized audio graph and piano samples
    initializeOptimizedAudioGraph();
    await initializePianoSamples();
    
    // MUSICAL ANALYSIS PHASE - NEW!
    console.log(`🎼 Performing musical analysis...`);
    
    // Detect time signature
    timeSignatureRef.current = detectTimeSignature(allNotes, 384);
    console.log(`🎵 Time signature: ${timeSignatureRef.current.numerator}/${timeSignatureRef.current.denominator}`);
    
    // Analyze bass lines
    bassLineNotesRef.current = analyzeBassLine(allNotes);
    console.log(`🎸 Identified ${bassLineNotesRef.current.size} important bass notes`);
    
    // Detect musical phrases
    musicalPhrasesRef.current = detectMusicalPhrases(allNotes);
    const importantPhrases = musicalPhrasesRef.current.filter(p => p.importance > 0.7);
    console.log(`🎶 Detected ${musicalPhrasesRef.current.length} phrases (${importantPhrases.length} important)`);
    
    // Calculate rhythmic importance for all notes
    let downbeatCount = 0;
    let strongBeatCount = 0;
    allNotes.forEach(note => {
      const rhythmicImportance = calculateRhythmicImportance(note.time);
      rhythmicAnalysisRef.current.set(`${note.time}-${note.frequency}`, rhythmicImportance);
      
      if (rhythmicImportance >= 1.0) downbeatCount++;
      else if (rhythmicImportance >= 0.9) strongBeatCount++;
    });
    console.log(`🥁 Rhythmic analysis: ${downbeatCount} downbeats, ${strongBeatCount} strong beats protected`);
    
    // Enhanced limits with intelligent voice management
    const MAX_CONCURRENT_NOTES = 200; // Increased from 120
    let MAX_TOTAL_NOTES = 7500; // Increased from 6000 for better quality
    let VELOCITY_THRESHOLD = 3; // Very permissive
    
    // Adjust limits based on complexity - less aggressive for better quality
    if (allNotes.length > 8000) {
      MAX_TOTAL_NOTES = 6500; // Allow 77% of notes vs previous 60%
      VELOCITY_THRESHOLD = 5;
      console.log(`🎹 Very complex MIDI detected (${allNotes.length} notes), using musically-intelligent mode`);
    } else if (allNotes.length > 5000) {
      MAX_TOTAL_NOTES = 7000; // Allow 95%+ for medium complexity  
      VELOCITY_THRESHOLD = 4;
      console.log(`🎹 Complex MIDI detected (${allNotes.length} notes), using enhanced musical mode`);
    }

    // Much more permissive note selection
    let selectedNotes = allNotes.filter(note => note.velocity >= VELOCITY_THRESHOLD);
    
    if (selectedNotes.length > MAX_TOTAL_NOTES) {
      // Use priority-based selection but keep much more
      selectedNotes.sort((a, b) => b.priority - a.priority);
      selectedNotes = selectedNotes.slice(0, MAX_TOTAL_NOTES);
      // Re-sort by time for playback
      selectedNotes.sort((a, b) => a.time - b.time);
      
      console.log(`Smart note selection: ${allNotes.length} → ${selectedNotes.length} notes (${((selectedNotes.length / allNotes.length) * 100).toFixed(1)}% kept)`);
    } else {
      console.log(`Playing full MIDI: ${selectedNotes.length} notes (${((selectedNotes.length / allNotes.length) * 100).toFixed(1)}% kept after velocity filtering)`);
    }

    const notesToPlay = selectedNotes;

    // Schedule notes in batches with lookahead scheduling
    let scheduledCount = 0;
    const SCHEDULE_AHEAD_TIME = 5; // seconds
    let nextNoteIndex = 0;

    const scheduleNextBatch = () => {
      if (!audioContextRef.current) return;
      
      const currentAudioTime = audioContextRef.current.currentTime;
      const scheduleUntilTime = currentAudioTime + SCHEDULE_AHEAD_TIME;
      
      // Schedule notes that should play within the next few seconds
      while (nextNoteIndex < notesToPlay.length) {
        const note = notesToPlay[nextNoteIndex];
        const adjustedStartTime = note.time - startOffset;
        const startTime = currentTime + adjustedStartTime;
        
        if (startTime > scheduleUntilTime) break;
        
        // Use advanced note player with voice stealing
        const result = playNoteAdvanced(
          note.frequency, 
          startTime, 
          note.duration, 
          note.velocity, 
          note.instrument, 
          note.channel,
          note.priority
        );
        
        if (result) {
          scheduledCount++;
        }
        
        nextNoteIndex++;
      }
    };

    // Initial batch scheduling
    scheduleNextBatch();
    
    setIsPlaying(true);

    // Optimized progress tracking with batched scheduling
    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - playbackStartTimeRef.current) / 1000;
      const progressPercent = duration > 0 ? (elapsed / duration) * 100 : 0;
      
      // Schedule more notes as we progress
      scheduleNextBatch();
      
      // Efficient cleanup with performance monitoring
      if (Date.now() % 1000 < 100) { // Every ~1000ms for less frequent cleanup
        const currentTime = audioContextRef.current?.currentTime || 0;
        const initialLength = activeNodesRef.current.length;
        
        // More efficient filtering - only remove nodes that are definitely finished
        activeNodesRef.current = activeNodesRef.current.filter(node => {
          const isFinished = node.endTime < (currentTime - 0.1); // 100ms grace period
          if (isFinished) {
            try {
              // Ensure nodes are disconnected
              node.osc.disconnect();
              node.gain.disconnect();
            } catch (e) {
              // Already disconnected
            }
          }
          return !isFinished;
        });
        
        if (activeNodesRef.current.length !== initialLength) {
          const cleaned = initialLength - activeNodesRef.current.length;
          const voiceStealCount = voiceStealingRef.current.lastStealTime > currentTime - 1 ? 1 : 0;
          const pianoVoices = activeNodesRef.current.filter(v => v.id.startsWith('piano-')).length;
          const synthVoices = activeNodesRef.current.filter(v => v.id.startsWith('synth-')).length;
          const drumVoices = activeNodesRef.current.filter(v => v.id.startsWith('drum-')).length;
          
          console.log(`🎹 Enhanced Performance: ${cleaned} cleaned, ${activeNodesRef.current.length}/200 active (🎹${pianoVoices} 🎵${synthVoices} 🥁${drumVoices}), ${voiceStealCount} stolen, ${scheduledCount} scheduled`);
        }
      }

      if (progressPercent >= 100) {
        setProgress(100);
        setIsPlaying(false);
        resetPauseState();
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        // Clean up any remaining nodes
        activeNodesRef.current = [];
        console.log(`MIDI playback completed. Scheduled ${scheduledCount} notes total.`);

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