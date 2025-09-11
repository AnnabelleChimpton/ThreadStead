import React, { useEffect, useRef, useState } from 'react';

type PlayerMode = 'compact' | 'hybrid' | 'full';

interface MidiPlayerProps {
  midiUrl: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
  className?: string;
  compact?: boolean; // Deprecated, use defaultMode instead
  defaultMode?: PlayerMode;
}

export default function MidiPlayer({ 
  midiUrl, 
  title = 'Background Music',
  autoplay = false, 
  loop = false,
  className = '',
  compact = false,
  defaultMode = 'compact'
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
  const [showVisualization, setShowVisualization] = useState(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>(compact ? 'compact' : defaultMode);
  
  // Visualization state
  const [activeNotes, setActiveNotes] = useState<Array<{frequency: number, velocity: number, instrument: number, startTime: number, midiNote?: number}>>([]);
  const [spectrumData, setSpectrumData] = useState<Uint8Array>(new Uint8Array(256));
  const [waveformData, setWaveformData] = useState<Uint8Array>(new Uint8Array(256));
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const midiDataRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  
  // Professional audio effects chain refs
  const eqLowRef = useRef<BiquadFilterNode | null>(null);
  const eqMidRef = useRef<BiquadFilterNode | null>(null);
  const eqHighRef = useRef<BiquadFilterNode | null>(null);
  const chorusDelayRef = useRef<DelayNode | null>(null);
  const chorusLfoRef = useRef<OscillatorNode | null>(null);
  const chorusGainRef = useRef<GainNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const stereoWidenerRef = useRef<{ left: GainNode; right: GainNode; delay: DelayNode } | null>(null);
  const effectsInputRef = useRef<GainNode | null>(null);
  
  // Audio analysis refs for visualization
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const visualizationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const activeNodesRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode; endTime: number; id: string }>>([]); // Track active notes
  const autoplayTriggeredRef = useRef<boolean>(false);
  const playButtonClickedRef = useRef<boolean>(false);
  
  // Advanced performance optimization refs
  const nodePoolRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode; available: boolean }>>([]);
  const instrumentGainsRef = useRef<Map<number, GainNode>>(new Map()); // Per-instrument gain nodes
  const channelGainsRef = useRef<Map<number, GainNode>>(new Map()); // Per-channel gain nodes
  const scheduledEventsRef = useRef<Array<{ id: string; startTime: number }>>([]);
  const voiceStealingRef = useRef<{ enabled: boolean; lastStealTime: number }>({ enabled: false, lastStealTime: 0 });
  
  // Enhanced synthesis refs
  const pianoBuffersRef = useRef<Map<number, AudioBuffer>>(new Map()); // Pre-generated piano samples
  const stringBuffersRef = useRef<Map<number, AudioBuffer>>(new Map()); // Pre-generated string samples
  const brassBuffersRef = useRef<Map<number, AudioBuffer>>(new Map()); // Pre-generated brass samples
  const activeHarmoniesRef = useRef<Map<number, Set<number>>>(new Map()); // Track active notes per channel for chord detection
  const voiceImportanceRef = useRef<Map<string, number>>(new Map()); // Track voice importance scores
  
  // Musical analysis refs
  const rhythmicAnalysisRef = useRef<Map<string, any>>(new Map()); // Rhythmic importance per note
  const musicalPhrasesRef = useRef<Array<any>>([]); // Detected musical phrases
  const bassLineNotesRef = useRef<Set<number>>(new Set()); // Important bass notes
  const timeSignatureRef = useRef<{ numerator: number; denominator: number }>({ numerator: 4, denominator: 4 });
  
  // Advanced psychoacoustic voice stealing refs
  const frequencyMaskingRef = useRef<Map<number, { level: number; lastUpdate: number }>>(new Map());
  const temporalMaskingRef = useRef<Array<{ frequency: number; level: number; endTime: number }>>([]); 
  const criticalBandsRef = useRef<Array<{ notes: string[]; dominantLevel: number }>>(Array(24).fill(null).map(() => ({ notes: [], dominantLevel: 0 })));
  
  // Instrument-specific effects refs
  const pianoSustainRef = useRef<{ enabled: boolean; sustainedNotes: Map<string, GainNode> }>({
    enabled: false,
    sustainedNotes: new Map()
  });
  const stringVibratoRef = useRef<Map<string, { lfo: OscillatorNode; depth: GainNode }>>

  (new Map());
  const brassDynamicsRef = useRef<Map<string, { breathController: GainNode; muteFilter: BiquadFilterNode }>>

  (new Map());
  
  // Web Worker refs
  const midiWorkerRef = useRef<Worker | null>(null);
  const workerPromisesRef = useRef<Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>>(new Map());

  // Initialize optimized audio graph with per-instrument and per-channel routing
  const initializeOptimizedAudioGraph = () => {
    if (!audioContextRef.current || !effectsInputRef.current) return;

    // Create per-instrument gain nodes for better mixing
    const instrumentNumbers = [0, 3, 32, 40, 43, 57, 128]; // Common instruments
    instrumentNumbers.forEach(instrument => {
      if (!instrumentGainsRef.current.has(instrument)) {
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = getInstrumentVolume(instrument);
        gainNode.connect(effectsInputRef.current!); // Route through professional effects chain
        instrumentGainsRef.current.set(instrument, gainNode);
      }
    });

    // Create per-channel gain nodes
    for (let channel = 0; channel < 16; channel++) {
      if (!channelGainsRef.current.has(channel)) {
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = channel === 9 ? 0.7 : 1.0; // Drums slightly quieter
        gainNode.connect(effectsInputRef.current!); // Route through professional effects chain
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

  // Generate realistic string samples with bowed characteristics
  const generateStringSample = (frequency: number, duration: number = 4.0): AudioBuffer => {
    const sampleRate = audioContextRef.current!.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = audioContextRef.current!.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // String synthesis with realistic bowing simulation
    const fundamentalFreq = frequency;
    const bowPressure = 0.9; // Consistent bow pressure
    
    // Complex harmonic structure for strings
    const harmonics = [
      { freq: fundamentalFreq, amp: 1.0, decay: 0.5 },
      { freq: fundamentalFreq * 2, amp: 0.8, decay: 0.7 },
      { freq: fundamentalFreq * 3, amp: 0.6, decay: 1.0 },
      { freq: fundamentalFreq * 4, amp: 0.4, decay: 1.2 },
      { freq: fundamentalFreq * 5, amp: 0.3, decay: 1.5 },
      { freq: fundamentalFreq * 6, amp: 0.2, decay: 1.8 },
      { freq: fundamentalFreq * 7, amp: 0.15, decay: 2.0 },
    ];
    
    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      let sample = 0;
      
      // Slow attack characteristic of bowed strings
      const attackTime = 0.06; // Consistent 60ms attack
      const attackEnv = time < attackTime ? time / attackTime : 1.0;
      
      // Smooth bow vibrato simulation
      const vibrato = 1 + Math.sin(time * 6.2) * 0.006 * bowPressure;
      
      for (const harmonic of harmonics) {
        // Natural string decay
        const envelope = Math.exp(-time * harmonic.decay) * attackEnv;
        
        // Subtle frequency modulation from bow pressure
        const modulation = vibrato + Math.sin(time * 3.2) * 0.002;
        
        sample += harmonic.amp * envelope * Math.sin(2 * Math.PI * harmonic.freq * modulation * time);
      }
      
      // Remove formant filtering to eliminate potential buzziness
      
      // Gentle saturation for warmth
      sample = Math.tanh(sample * 0.8) * 0.7;
      
      channelData[i] = sample;
    }
    
    return buffer;
  };

  // Generate realistic brass samples with breath characteristics
  const generateBrassSample = (frequency: number, duration: number = 3.5): AudioBuffer => {
    const sampleRate = audioContextRef.current!.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = audioContextRef.current!.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Brass synthesis with breath simulation
    const fundamentalFreq = frequency;
    const breathPressure = 0.8; // Consistent breath pressure
    
    // Rich harmonic content typical of brass
    const harmonics = [
      { freq: fundamentalFreq, amp: 1.0, decay: 0.3 },
      { freq: fundamentalFreq * 2, amp: 0.9, decay: 0.4 },
      { freq: fundamentalFreq * 3, amp: 0.7, decay: 0.6 },
      { freq: fundamentalFreq * 4, amp: 0.5, decay: 0.8 },
      { freq: fundamentalFreq * 5, amp: 0.4, decay: 1.0 },
      { freq: fundamentalFreq * 6, amp: 0.3, decay: 1.2 },
      { freq: fundamentalFreq * 7, amp: 0.2, decay: 1.4 },
      { freq: fundamentalFreq * 8, amp: 0.15, decay: 1.6 },
    ];
    
    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      let sample = 0;
      
      // Sharp attack characteristic of brass
      const attackTime = 0.02; // 20ms attack
      const attackEnv = time < attackTime ? Math.pow(time / attackTime, 0.5) : 1.0;
      
      // Smooth vibrato without random noise  
      const vibrato = 1 + Math.sin(time * 5.2) * 0.008 * breathPressure;
      const breathNoise = Math.sin(time * 13.7) * 0.003 * breathPressure; // Controlled breath effect
      
      for (const harmonic of harmonics) {
        // Brass sustain and decay
        const sustainLevel = 0.8;
        const sustainTime = duration * 0.7;
        let envelope;
        
        if (time < sustainTime) {
          envelope = attackEnv * sustainLevel;
        } else {
          const decayProgress = (time - sustainTime) / (duration - sustainTime);
          envelope = attackEnv * sustainLevel * (1 - decayProgress);
        }
        
        // Frequency modulation with vibrato and breath effects
        const modulation = vibrato + breathNoise;
        
        sample += harmonic.amp * envelope * Math.sin(2 * Math.PI * harmonic.freq * modulation * time);
      }
      
      // Add subtle brass "brassy" distortion for realism
      if (sample > 0.3) {
        sample = 0.3 + (sample - 0.3) * 0.7; // Soft limiting
      }
      
      // Remove resonance boost to eliminate buzziness
      
      channelData[i] = sample * 0.8;
    }
    
    return buffer;
  };

  // Pre-generate piano samples for common notes (C3 to C6 range)
  const initializePianoSamples = async () => {
    if (!audioContextRef.current || pianoBuffersRef.current.size > 0) return;
    
    
    // Generate samples for every 3rd note (fill gaps with pitch shifting)
    for (let midiNote = 48; midiNote <= 84; midiNote += 3) { // C3 to C6, every 3 semitones
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      const buffer = generatePianoSample(frequency);
      pianoBuffersRef.current.set(midiNote, buffer);
    }
    
  };

  // Pre-generate string samples for violin/viola/cello range
  const initializeStringSamples = async () => {
    if (!audioContextRef.current || stringBuffersRef.current.size > 0) return;
    
    
    // String instruments typically cover G3 to E7 range
    for (let midiNote = 55; midiNote <= 88; midiNote += 4) { // Every 4th note for strings
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      const buffer = generateStringSample(frequency);
      stringBuffersRef.current.set(midiNote, buffer);
    }
    
  };

  // Pre-generate brass samples for trumpet/trombone range  
  const initializeBrassSamples = async () => {
    if (!audioContextRef.current || brassBuffersRef.current.size > 0) return;
    
    
    // Brass instruments typically cover Bb2 to Bb6 range
    for (let midiNote = 46; midiNote <= 82; midiNote += 4) { // Every 4th note for brass
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      const buffer = generateBrassSample(frequency);
      brassBuffersRef.current.set(midiNote, buffer);
    }
    
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

  // Advanced psychoacoustic voice stealing with musical intelligence
  const stealVoiceIfNeeded = (newNote: { note: number; velocity: number; channel: number; instrument: number; priority: number }): boolean => {
    const now = audioContextRef.current?.currentTime || 0;
    const activeVoices = activeNodesRef.current.filter(node => node.endTime > now);
    
    // Increased limit to 200 voices
    if (activeVoices.length < 200) return true;
    
    // Use psychoacoustic model to select voices for stealing
    const voicesToSteal = selectVoicesForStealing(199); // Keep one slot for new note
    
    if (voicesToSteal.length === 0) {
      // Fallback to traditional importance-based stealing
      let weakestVoice = null;
      let weakestImportance = newNote.priority + 0.1;
      
      for (const voice of activeVoices) {
        const importance = calculateMusicalImportance(voice, newNote);
        if (importance < weakestImportance) {
          weakestVoice = voice;
          weakestImportance = importance;
        }
      }
      
      if (weakestVoice) {
        voicesToSteal.push(weakestVoice.id);
      }
    }
    
    // Steal selected voices
    for (const voiceId of voicesToSteal) {
      const voice = activeNodesRef.current.find(v => v.id === voiceId);
      if (!voice) continue;
      
      // Update active harmonies tracking
      const voiceIdParts = voice.id.split('-');
      const voiceNote = parseInt(voiceIdParts[2]) || 0;
      const voiceChannel = parseInt(voiceIdParts[6]) || 0;
      const voiceStartTime = parseFloat(voiceIdParts[1]) || now;
      
      if (activeHarmoniesRef.current.has(voiceChannel)) {
        activeHarmoniesRef.current.get(voiceChannel)!.delete(voiceNote % 12);
      }
      
      // Fade out quickly and stop
      try {
        voice.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        voice.osc.stop(now + 0.02);
        activeNodesRef.current = activeNodesRef.current.filter(v => v !== voice);
        voiceStealingRef.current.lastStealTime = now;
        
        const voiceRhythmicImportance = calculateRhythmicImportance(voiceStartTime);
        const rhythmicInfo = voiceRhythmicImportance >= 1.0 ? ' [DOWNBEAT!]' : voiceRhythmicImportance >= 0.9 ? ' [STRONG]' : '';
        const bassInfo = voiceNote < 48 ? ' [BASS]' : '';
        const phraseInfo = isInImportantPhrase(voiceStartTime, voiceChannel) ? ' [PHRASE]' : '';
        
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
    
    // Update psychoacoustic model
    updatePsychoacousticModel(frequency, velocity, startTime, noteId);
    
    // Apply piano-specific effects
    applyInstrumentEffects(noteId, gainNode, source, frequency, velocity, 0);
    
    // Track harmony
    if (!activeHarmoniesRef.current.has(channel)) {
      activeHarmoniesRef.current.set(channel, new Set());
    }
    activeHarmoniesRef.current.get(channel)!.add(midiNote % 12);
    
    return voiceData;
  };

  // Enhanced string player using generated samples
  const playStringNote = (frequency: number, startTime: number, duration: number, velocity: number, channel: number): any => {
    if (!audioContextRef.current) return null;
    
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    // Find closest string sample (every 4th note)
    let closestSample = 55; // Default to G3
    let minDistance = 999;
    
    for (const sampleNote of stringBuffersRef.current.keys()) {
      const distance = Math.abs(midiNote - sampleNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestSample = sampleNote;
      }
    }
    
    const sampleBuffer = stringBuffersRef.current.get(closestSample);
    if (!sampleBuffer) return null;
    
    const source = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    
    source.buffer = sampleBuffer;
    
    // Pitch shifting for notes not exactly matching samples
    const pitchRatio = frequency / (440 * Math.pow(2, (closestSample - 69) / 12));
    source.playbackRate.value = pitchRatio;
    
    // Velocity-sensitive volume with string characteristics
    const baseGain = (velocity / 127) * 0.35; // Slightly louder than piano
    
    // String-specific envelope - slow attack, sustained
    const attackTime = 0.08; // Slower attack for bowing
    const decayTime = Math.min(duration, 3.5);
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(baseGain * 0.7, startTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(baseGain, startTime + attackTime * 2);
    gainNode.gain.linearRampToValueAtTime(baseGain * 0.6, startTime + decayTime * 0.8);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(baseGain * 0.1, 0.001), startTime + decayTime);
    
    source.connect(gainNode);
    
    // Route to appropriate channel gain
    const routingGain = channelGainsRef.current.get(channel) || masterGainRef.current;
    if (routingGain) {
      gainNode.connect(routingGain);
    }
    
    source.start(startTime);
    source.stop(startTime + decayTime);
    
    const noteId = `string-${startTime}-${midiNote}-${velocity}-${channel}`;
    const voiceData = { osc: source as any, gain: gainNode, endTime: startTime + duration, id: noteId };
    
    // Update psychoacoustic model
    updatePsychoacousticModel(frequency, velocity, startTime, noteId);
    
    // Apply string-specific effects  
    applyInstrumentEffects(noteId, gainNode, source, frequency, velocity, 40);
    
    // Track harmony
    if (!activeHarmoniesRef.current.has(channel)) {
      activeHarmoniesRef.current.set(channel, new Set());
    }
    activeHarmoniesRef.current.get(channel)!.add(midiNote % 12);
    
    return voiceData;
  };

  // Enhanced brass player using generated samples  
  const playBrassNote = (frequency: number, startTime: number, duration: number, velocity: number, channel: number): any => {
    if (!audioContextRef.current) return null;
    
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    
    // Find closest brass sample (every 4th note)
    let closestSample = 58; // Default to Bb3
    let minDistance = 999;
    
    for (const sampleNote of brassBuffersRef.current.keys()) {
      const distance = Math.abs(midiNote - sampleNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestSample = sampleNote;
      }
    }
    
    const sampleBuffer = brassBuffersRef.current.get(closestSample);
    if (!sampleBuffer) return null;
    
    const source = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    
    source.buffer = sampleBuffer;
    
    // Pitch shifting for notes not exactly matching samples
    const pitchRatio = frequency / (440 * Math.pow(2, (closestSample - 69) / 12));
    source.playbackRate.value = pitchRatio;
    
    // Velocity-sensitive volume with brass characteristics
    const baseGain = (velocity / 127) * 0.3; // Strong but controlled
    
    // Brass-specific envelope - sharp attack, sustained, controlled decay
    const attackTime = 0.025; // Quick brass attack
    const sustainTime = Math.min(duration * 0.7, 2.0);
    const decayTime = Math.min(duration, 3.0);
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(baseGain, startTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(baseGain * 0.85, startTime + sustainTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(baseGain * 0.1, 0.001), startTime + decayTime);
    
    source.connect(gainNode);
    
    // Route to appropriate channel gain
    const routingGain = channelGainsRef.current.get(channel) || masterGainRef.current;
    if (routingGain) {
      gainNode.connect(routingGain);
    }
    
    source.start(startTime);
    source.stop(startTime + decayTime);
    
    const noteId = `brass-${startTime}-${midiNote}-${velocity}-${channel}`;
    const voiceData = { osc: source as any, gain: gainNode, endTime: startTime + duration, id: noteId };
    
    // Update psychoacoustic model
    updatePsychoacousticModel(frequency, velocity, startTime, noteId);
    
    // Apply brass-specific effects
    applyInstrumentEffects(noteId, gainNode, source, frequency, velocity, 56);
    
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

    // Use appropriate sample-based synthesis for different instrument families
    
    // Piano instruments (0-7)
    if (instrument >= 0 && instrument <= 7 && pianoBuffersRef.current.size > 0) {
      const pianoVoice = playPianoNote(frequency, startTime, duration, velocity, channel);
      if (pianoVoice) {
        activeNodesRef.current.push(pianoVoice);
        return pianoVoice;
      }
    }
    
    // String instruments (40-47: violin, viola, cello, contrabass, etc.)
    if (instrument >= 40 && instrument <= 47 && stringBuffersRef.current.size > 0) {
      const stringVoice = playStringNote(frequency, startTime, duration, velocity, channel);
      if (stringVoice) {
        activeNodesRef.current.push(stringVoice);
        return stringVoice;
      }
    }
    
    // Brass instruments (56-63: trumpet, trombone, tuba, french horn, etc.)
    if (instrument >= 56 && instrument <= 63 && brassBuffersRef.current.size > 0) {
      const brassVoice = playBrassNote(frequency, startTime, duration, velocity, channel);
      if (brassVoice) {
        activeNodesRef.current.push(brassVoice);
        return brassVoice;
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
        // Fallback to effects input if no specific routing
        gainNode.connect(effectsInputRef.current || audioContextRef.current.destination);
      }
      
      osc.start(startTime);
      osc.stop(startTime + maxDuration);
      
      const voiceData = { osc, gain: gainNode, endTime: startTime + duration, id: noteId };
      activeNodesRef.current.push(voiceData);
      
      // Update psychoacoustic model for advanced voice stealing
      updatePsychoacousticModel(frequency, velocity, startTime, noteId);
      
      // Track harmony for non-piano instruments too
      if (!activeHarmoniesRef.current.has(channel)) {
        activeHarmoniesRef.current.set(channel, new Set());
      }
      activeHarmoniesRef.current.get(channel)!.add(midiNote % 12);
      
      return voiceData;
      
    } catch (error) {
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
    gainNode.connect(effectsInputRef.current || audioContextRef.current.destination);
    
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

  // Initialize professional audio effects chain
  const initializeProfessionalEffects = (audioContext: AudioContext): GainNode => {
    // Create a 3-band EQ
    eqLowRef.current = audioContext.createBiquadFilter();
    eqLowRef.current.type = 'lowshelf';
    eqLowRef.current.frequency.value = 320;
    eqLowRef.current.gain.value = 2; // Slight bass boost
    
    eqMidRef.current = audioContext.createBiquadFilter();
    eqMidRef.current.type = 'peaking';
    eqMidRef.current.frequency.value = 1000;
    eqMidRef.current.Q.value = 1;
    eqMidRef.current.gain.value = 1; // Slight mid boost for clarity
    
    eqHighRef.current = audioContext.createBiquadFilter();
    eqHighRef.current.type = 'highshelf';
    eqHighRef.current.frequency.value = 3200;
    eqHighRef.current.gain.value = 3; // High frequency presence
    
    // Create chorus effect for richness
    chorusDelayRef.current = audioContext.createDelay(0.05);
    chorusDelayRef.current.delayTime.value = 0.015; // 15ms base delay
    
    chorusLfoRef.current = audioContext.createOscillator();
    chorusLfoRef.current.type = 'sine';
    chorusLfoRef.current.frequency.value = 0.5; // 0.5 Hz LFO
    
    chorusGainRef.current = audioContext.createGain();
    chorusGainRef.current.gain.value = 0.005; // 5ms modulation depth
    
    // Connect chorus LFO to delay modulation
    chorusLfoRef.current.connect(chorusGainRef.current);
    chorusGainRef.current.connect(chorusDelayRef.current.delayTime);
    chorusLfoRef.current.start();
    
    // Create stereo widener for spacious sound
    const splitter = audioContext.createChannelSplitter(2);
    const merger = audioContext.createChannelMerger(2);
    
    stereoWidenerRef.current = {
      left: audioContext.createGain(),
      right: audioContext.createGain(),
      delay: audioContext.createDelay(0.01)
    };
    
    stereoWidenerRef.current.delay.delayTime.value = 0.005; // 5ms delay for width
    stereoWidenerRef.current.left.gain.value = 1.0;
    stereoWidenerRef.current.right.gain.value = 1.0;
    
    // Enhanced reverb
    reverbRef.current = audioContext.createConvolver();
    const reverbBuffer = createReverbImpulse(audioContext, 3, 0.4); // Longer, more lush reverb
    reverbRef.current.buffer = reverbBuffer;
    
    // Multi-stage compression
    compressorRef.current = audioContext.createDynamicsCompressor();
    compressorRef.current.threshold.value = -18; // More aggressive
    compressorRef.current.knee.value = 40;
    compressorRef.current.ratio.value = 8;
    compressorRef.current.attack.value = 0.002;
    compressorRef.current.release.value = 0.2;
    
    // Final limiter for safety
    limiterRef.current = audioContext.createDynamicsCompressor();
    limiterRef.current.threshold.value = -3;
    limiterRef.current.knee.value = 0;
    limiterRef.current.ratio.value = 20; // Hard limiting
    limiterRef.current.attack.value = 0.001;
    limiterRef.current.release.value = 0.01;
    
    // Create analyzer node for visualization
    analyzerRef.current = audioContext.createAnalyser();
    analyzerRef.current.fftSize = 512; // 256 frequency bins
    analyzerRef.current.smoothingTimeConstant = 0.8;
    
    // Master gain remains the same
    masterGainRef.current = audioContext.createGain();
    masterGainRef.current.gain.value = volume / 100;
    
    // Professional effects chain routing:
    // Input -> EQ (Low->Mid->High) -> Chorus -> Stereo Widener -> Reverb -> Compressor -> Limiter -> Master -> Output
    
    // Create input gain node for the chain
    const inputGain = audioContext.createGain();
    inputGain.gain.value = 1.0;
    
    // Create parallel processing for reverb
    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    dryGain.gain.value = 0.9; // 90% dry
    wetGain.gain.value = 0.1; // 10% wet (reduced from 20%)
    
    // EQ chain
    inputGain.connect(eqLowRef.current);
    eqLowRef.current.connect(eqMidRef.current);
    eqMidRef.current.connect(eqHighRef.current);
    
    // Parallel chorus processing
    const chorusSplitter = audioContext.createGain();
    const chorusMixer = audioContext.createGain();
    
    eqHighRef.current.connect(chorusSplitter);
    chorusSplitter.connect(chorusMixer); // Dry signal
    chorusSplitter.connect(chorusDelayRef.current); // Wet signal
    chorusDelayRef.current.connect(chorusMixer);
    chorusMixer.gain.value = 0.7; // Mix level
    
    // Stereo processing
    chorusMixer.connect(splitter);
    splitter.connect(stereoWidenerRef.current.left, 0);
    splitter.connect(stereoWidenerRef.current.right, 1);
    splitter.connect(stereoWidenerRef.current.delay, 1);
    
    stereoWidenerRef.current.left.connect(merger, 0, 0);
    stereoWidenerRef.current.right.connect(merger, 0, 1);
    stereoWidenerRef.current.delay.connect(merger, 0, 0);
    
    // Parallel reverb processing
    merger.connect(dryGain);
    merger.connect(wetGain);
    wetGain.connect(reverbRef.current);
    
    const reverbMixer = audioContext.createGain();
    dryGain.connect(reverbMixer);
    reverbRef.current.connect(reverbMixer);
    
    // Final compression and limiting
    reverbMixer.connect(compressorRef.current);
    compressorRef.current.connect(limiterRef.current);
    limiterRef.current.connect(masterGainRef.current);
    
    // Connect analyzer for visualization (parallel path)
    masterGainRef.current.connect(analyzerRef.current);
    masterGainRef.current.connect(audioContext.destination);
    
    
    return inputGain; // Return the input node for instruments to connect to
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
    
    // Initialize professional audio effects chain (only once)
    if (!effectsInputRef.current) {
      effectsInputRef.current = initializeProfessionalEffects(audioContextRef.current);
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

    // Perform background analysis using Web Worker (non-blocking)
    analyzeMidiInWorker(allNotes);

    // Initialize optimized audio graph and all instrument samples
    initializeOptimizedAudioGraph();
    
    // Generate samples in parallel for better performance
    await Promise.all([
      initializePianoSamples(),
      initializeStringSamples(), 
      initializeBrassSamples()
    ]);
    
    // MUSICAL ANALYSIS PHASE - NEW!
    
    // Detect time signature
    timeSignatureRef.current = detectTimeSignature(allNotes, 384);
    
    // Analyze bass lines
    bassLineNotesRef.current = analyzeBassLine(allNotes);
    
    // Detect musical phrases
    musicalPhrasesRef.current = detectMusicalPhrases(allNotes);
    const importantPhrases = musicalPhrasesRef.current.filter(p => p.importance > 0.7);
    
    // Calculate rhythmic importance for all notes
    let downbeatCount = 0;
    let strongBeatCount = 0;
    allNotes.forEach(note => {
      const rhythmicImportance = calculateRhythmicImportance(note.time);
      rhythmicAnalysisRef.current.set(`${note.time}-${note.frequency}`, rhythmicImportance);
      
      if (rhythmicImportance >= 1.0) downbeatCount++;
      else if (rhythmicImportance >= 0.9) strongBeatCount++;
    });
    
    // Enhanced limits with intelligent voice management
    const MAX_CONCURRENT_NOTES = 200; // Increased from 120
    let MAX_TOTAL_NOTES = 7500; // Increased from 6000 for better quality
    let VELOCITY_THRESHOLD = 3; // Very permissive
    
    // Adjust limits based on complexity - less aggressive for better quality
    if (allNotes.length > 8000) {
      MAX_TOTAL_NOTES = 6500; // Allow 77% of notes vs previous 60%
      VELOCITY_THRESHOLD = 5;
    } else if (allNotes.length > 5000) {
      MAX_TOTAL_NOTES = 7000; // Allow 95%+ for medium complexity  
      VELOCITY_THRESHOLD = 4;
    }

    // Much more permissive note selection
    let selectedNotes = allNotes.filter(note => note.velocity >= VELOCITY_THRESHOLD);
    
    if (selectedNotes.length > MAX_TOTAL_NOTES) {
      // Use priority-based selection but keep much more
      selectedNotes.sort((a, b) => b.priority - a.priority);
      selectedNotes = selectedNotes.slice(0, MAX_TOTAL_NOTES);
      // Re-sort by time for playback
      selectedNotes.sort((a, b) => a.time - b.time);
      
    } else {
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

    // Always start visualization when playing (it will only update if shown)
    startVisualization();

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
          const stringVoices = activeNodesRef.current.filter(v => v.id.startsWith('string-')).length;
          const brassVoices = activeNodesRef.current.filter(v => v.id.startsWith('brass-')).length;
          const synthVoices = activeNodesRef.current.filter(v => v.id.startsWith('synth-')).length;
          const drumVoices = activeNodesRef.current.filter(v => v.id.startsWith('drum-')).length;
          
        }
      }

      if (progressPercent >= 100) {
        setProgress(100);
        setIsPlaying(false);
        resetPauseState();
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        // Clean up any remaining nodes
        activeNodesRef.current = [];

        if (loop && isPlaying) {
          setTimeout(() => {
            // Double-check that we're still supposed to be playing
            if (isPlaying && loop) {
              playMidi();
            }
          }, 100);
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
    
    // Stop visualization
    stopVisualization();
    
    // Clean up professional effects chain
    try {
      if (chorusLfoRef.current) {
        chorusLfoRef.current.stop();
        chorusLfoRef.current = null;
      }
      
      // Clean up all effect nodes
      [masterGainRef, effectsInputRef, eqLowRef, eqMidRef, eqHighRef, 
       chorusDelayRef, chorusGainRef, reverbRef, compressorRef, limiterRef].forEach(ref => {
        if (ref.current) {
          try {
            ref.current.disconnect();
            ref.current = null;
          } catch (e) { /* ignore */ }
        }
      });
      
      // Clean up stereo widener
      if (stereoWidenerRef.current) {
        try {
          stereoWidenerRef.current.left.disconnect();
          stereoWidenerRef.current.right.disconnect();
          stereoWidenerRef.current.delay.disconnect();
          stereoWidenerRef.current = null;
        } catch (e) { /* ignore */ }
      }
      
    } catch (e) {
    }
    
    // All audio stopped
  };

  // Separate function to reset pause state (only call when truly stopping/resetting)
  const resetPauseState = () => {
    setIsPaused(false);
    setPausedAt(0);
    // Reset autoplay flag to prevent unexpected restarts
    autoplayTriggeredRef.current = false;
  };

  const play = async () => {
    // Prevent multiple concurrent calls and rapid clicking
    if (isLoading || playButtonClickedRef.current) {
      return;
    }
    
    playButtonClickedRef.current = true;
    
    // Reset the debounce flag after a delay
    setTimeout(() => {
      playButtonClickedRef.current = false;
    }, 300);

    if (!midiDataRef.current) {
      await loadMidi();
      // Double-check after loading in case component state changed
      if (!midiDataRef.current) {
        return;
      }
    }

    if (isPlaying) {
      // Stop playback
      const elapsed = (Date.now() - playbackStartTimeRef.current) / 1000;
      setPausedAt(elapsed);
      setIsPaused(true);
      
      // Stop only the active notes, not the entire audio chain
      const currentTime = audioContextRef.current?.currentTime || 0;
      activeNodesRef.current.forEach(node => {
        try {
          if (node.gain && node.gain.gain) {
            node.gain.gain.cancelScheduledValues(currentTime);
            node.gain.gain.setValueAtTime(node.gain.gain.value, currentTime);
            node.gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.05);
          }
          if (node.osc && node.osc.stop) {
            node.osc.stop(currentTime + 0.05);
          }
        } catch (e) {
          // Ignore errors
        }
      });
      
      // Clear the active nodes array
      activeNodesRef.current = [];
      
      // Stop visualization
      stopVisualization();
      
      setIsPlaying(false);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
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

  // Initialize Web Worker for background MIDI analysis
  const initializeWorker = () => {
    if (typeof window !== 'undefined' && !midiWorkerRef.current) {
      try {
        midiWorkerRef.current = new Worker('/midi-analyzer-worker.js');
        
        midiWorkerRef.current.onmessage = (event) => {
          const { type, result, error } = event.data;
          
          // Handle worker responses
          switch (type) {
            case 'WORKER_READY':
              break;
              
            case 'ANALYSIS_COMPLETE':
              handleAnalysisComplete(result);
              break;
              
            case 'RHYTHM_COMPLETE':
              handleRhythmAnalysisComplete(result);
              break;
              
            case 'PHRASES_COMPLETE':
              handlePhrasesComplete(result);
              break;
              
            case 'BASS_COMPLETE':
              handleBassAnalysisComplete(result);
              break;
              
            case 'ERROR':
              break;
          }
        };
        
        midiWorkerRef.current.onerror = (error) => {
          midiWorkerRef.current = null;
        };
        
      } catch (error) {
      }
    }
  };

  // Handle analysis results from worker
  const handleAnalysisComplete = (result: any) => {
    if (result) {
      const { timeSignature, complexity, channels } = result;
      timeSignatureRef.current = timeSignature;
    }
  };

  const handleRhythmAnalysisComplete = (result: any) => {
    if (result) {
      rhythmicAnalysisRef.current.clear();
      Object.entries(result.rhythmicImportance).forEach(([key, importance]) => {
        rhythmicAnalysisRef.current.set(key, importance);
      });
    }
  };

  const handlePhrasesComplete = (result: any) => {
    if (result && result.phrases) {
      musicalPhrasesRef.current = result.phrases;
    }
  };

  const handleBassAnalysisComplete = (result: any) => {
    if (result) {
      bassLineNotesRef.current.clear();
      result.bassNoteClasses.forEach((noteClass: number) => {
        bassLineNotesRef.current.add(noteClass);
      });
    }
  };

  // Analyze MIDI structure using Web Worker
  const analyzeMidiInWorker = (allNotes: any[]) => {
    if (!midiWorkerRef.current || allNotes.length === 0) return;
    
    try {
      // Send initial structure analysis
      midiWorkerRef.current.postMessage({
        type: 'ANALYZE_MIDI',
        data: allNotes
      });
      
      // Send rhythm analysis
      midiWorkerRef.current.postMessage({
        type: 'ANALYZE_RHYTHM',
        data: { notes: allNotes, timeSignature: timeSignatureRef.current }
      });
      
      // Send phrase detection
      midiWorkerRef.current.postMessage({
        type: 'DETECT_PHRASES',
        data: allNotes
      });
      
      // Send bass analysis
      midiWorkerRef.current.postMessage({
        type: 'ANALYZE_BASS',
        data: allNotes
      });
      
    } catch (error) {
    }
  };

  // Cleanup worker on unmount
  const cleanupWorker = () => {
    if (midiWorkerRef.current) {
      midiWorkerRef.current.terminate();
      midiWorkerRef.current = null;
    }
    workerPromisesRef.current.clear();
  };

  // Real-time visualization functions
  const updateVisualization = () => {
    if (!analyzerRef.current) {
      return;
    }

    // Check if audio context is running
    if (audioContextRef.current?.state !== 'running') {
      return;
    }

    // Update spectrum data (frequency analysis)
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzerRef.current.getByteFrequencyData(dataArray);
    
    // Check if we're getting any data
    const hasData = dataArray.some(value => value > 0);
    const maxValue = Math.max(...dataArray);
    const averageValue = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    
    
    setSpectrumData(dataArray);

    // Update waveform data (time domain)
    const waveformArray = new Uint8Array(bufferLength);
    analyzerRef.current.getByteTimeDomainData(waveformArray);
    setWaveformData(waveformArray);

    // Update active notes display
    const currentTime = audioContextRef.current?.currentTime || 0;
    const currentActiveNotes = activeNodesRef.current
      .filter(node => node.endTime > currentTime)
      .map((node, index) => {
        // Extract note info from node ID
        const parts = node.id.split('-');
        const instrumentType = parts[0]; // piano, string, brass, synth, drum, legacy
        const startTime = parseFloat(parts[1]) || currentTime;
        
        let frequency, velocity, midiNote;
        
        if (instrumentType === 'legacy') {
          // legacy-startTime-frequency-suffix
          frequency = parseFloat(parts[2]) || 440;
          velocity = 64; // Default for legacy
          midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
        } else if (instrumentType === 'drum') {
          // drum-startTime-midiNote
          midiNote = parseFloat(parts[2]) || 36;
          frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
          velocity = 64; // Default for drums
        } else {
          // piano/string/brass/synth-startTime-midiNote-velocity-channel
          midiNote = parseFloat(parts[2]) || 60;
          velocity = parseFloat(parts[3]) || 64;
          frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        }
        
        // Map instrument types to numbers for visualization
        const instrumentMap: Record<string, number> = {
          'piano': 0,
          'string': 40,
          'brass': 56,
          'synth': 80,
          'drum': 128,
          'legacy': 0
        };
        const instrument = instrumentMap[instrumentType] || 0;
        
        return { frequency, velocity, instrument, startTime, midiNote };
      })
      .slice(0, 32); // Limit to 32 visible notes for performance

    setActiveNotes(currentActiveNotes);
  };

  const startVisualization = () => {
    if (visualizationIntervalRef.current) return;
    
    
    visualizationIntervalRef.current = setInterval(updateVisualization, 50); // 20 FPS
  };

  const stopVisualization = () => {
    if (visualizationIntervalRef.current) {
      clearInterval(visualizationIntervalRef.current);
      visualizationIntervalRef.current = null;
    }
    setActiveNotes([]);
    setSpectrumData(new Uint8Array(256));
    setWaveformData(new Uint8Array(256));
  };

  // Advanced Psychoacoustic Voice Stealing System
  const frequencyToCriticalBand = (frequency: number): number => {
    // Convert frequency to Bark scale (critical bands)
    // 24 critical bands cover human hearing range
    const bark = 13 * Math.atan(0.00076 * frequency) + 3.5 * Math.atan(Math.pow(frequency / 7500, 2));
    return Math.min(23, Math.max(0, Math.floor(bark)));
  };

  const calculateMaskingThreshold = (frequency: number, currentTime: number): number => {
    const currentTimeMs = currentTime * 1000;
    let maskingLevel = 0;

    // Frequency masking - simultaneous masking
    const criticalBand = frequencyToCriticalBand(frequency);
    const bandWidth = criticalBand * 100; // Approximate bandwidth
    
    for (const [maskFreq, maskData] of frequencyMaskingRef.current) {
      if (currentTimeMs - maskData.lastUpdate > 100) continue; // Only recent masks
      
      const frequencyDiff = Math.abs(frequency - maskFreq);
      const bandDiff = Math.abs(frequencyToCriticalBand(maskFreq) - criticalBand);
      
      if (bandDiff <= 2) { // Within 2 critical bands
        // Masking strength decreases with frequency distance
        const maskingStrength = maskData.level * Math.exp(-frequencyDiff / bandWidth);
        maskingLevel = Math.max(maskingLevel, maskingStrength);
      }
    }

    // Temporal masking - sequential masking  
    const temporalMasks = temporalMaskingRef.current.filter(mask => mask.endTime > currentTime);
    for (const mask of temporalMasks) {
      const timeSinceEnd = currentTime - (mask.endTime - 0.1); // 100ms temporal window
      if (timeSinceEnd >= 0 && timeSinceEnd <= 0.1) {
        const frequencyDiff = Math.abs(frequency - mask.frequency);
        const bandDiff = Math.abs(frequencyToCriticalBand(mask.frequency) - criticalBand);
        
        if (bandDiff <= 1) {
          // Temporal masking decays quickly but can be significant
          const temporalDecay = Math.exp(-timeSinceEnd * 50); // 50ms decay
          const temporalMask = mask.level * 0.3 * temporalDecay; // 30% of original level
          maskingLevel = Math.max(maskingLevel, temporalMask);
        }
      }
    }

    return maskingLevel;
  };

  const updatePsychoacousticModel = (frequency: number, velocity: number, startTime: number, noteId: string) => {
    const currentTime = audioContextRef.current?.currentTime || 0;
    const level = velocity / 127;
    
    // Update frequency masking map
    frequencyMaskingRef.current.set(frequency, {
      level: level,
      lastUpdate: currentTime * 1000
    });

    // Add to temporal masking (for notes that just ended)
    const estimatedDuration = 0.5; // Rough estimate
    temporalMaskingRef.current.push({
      frequency: frequency,
      level: level,
      endTime: startTime + estimatedDuration
    });

    // Update critical band analysis
    const criticalBand = frequencyToCriticalBand(frequency);
    const band = criticalBandsRef.current[criticalBand];
    band.notes.push(noteId);
    band.dominantLevel = Math.max(band.dominantLevel, level);

    // Cleanup old temporal masks
    const cutoffTime = currentTime - 0.2; // 200ms history
    temporalMaskingRef.current = temporalMaskingRef.current.filter(mask => mask.endTime > cutoffTime);
  };

  const calculatePerceptualImportance = (frequency: number, velocity: number, startTime: number, instrument: number, channel: number): number => {
    const currentTime = audioContextRef.current?.currentTime || 0;
    let importance = velocity / 127; // Base importance from velocity
    
    // Psychoacoustic masking analysis
    const maskingThreshold = calculateMaskingThreshold(frequency, currentTime);
    const signalToMaskRatio = (velocity / 127) / Math.max(0.01, maskingThreshold);
    
    // If this note would be masked, reduce importance significantly
    if (signalToMaskRatio < 1.2) { // Less than 20% above masking threshold
      importance *= 0.3; // Heavily reduce importance
    } else if (signalToMaskRatio < 2.0) { // Barely audible
      importance *= 0.6; // Moderately reduce
    }

    // Critical band dominance - if this frequency band is already busy, reduce importance
    const criticalBand = frequencyToCriticalBand(frequency);
    const band = criticalBandsRef.current[criticalBand];
    if (band.notes.length > 3) { // Band is crowded
      importance *= 0.7;
    }
    if ((velocity / 127) < band.dominantLevel * 0.8) { // Much quieter than dominant note
      importance *= 0.5;
    }

    // Frequency range importance (human hearing sensitivity)
    if (frequency >= 1000 && frequency <= 4000) {
      importance *= 1.3; // Most sensitive hearing range
    } else if (frequency >= 200 && frequency <= 8000) {
      importance *= 1.1; // Good hearing range
    } else if (frequency < 80 || frequency > 16000) {
      importance *= 0.6; // Outside primary hearing range
    }

    // Instrument importance in mix
    if (instrument >= 32 && instrument <= 39) { // Bass
      importance *= 1.4; // Bass is crucial for mix
    } else if (channel === 9) { // Drums
      importance *= 1.2; // Rhythm is important
    } else if (instrument >= 0 && instrument <= 7) { // Piano/keyboard
      importance *= 1.1; // Lead instruments slightly more important
    }

    return Math.min(1.0, importance);
  };

  const selectVoicesForStealing = (maxVoices: number): string[] => {
    const currentTime = audioContextRef.current?.currentTime || 0;
    const activeVoices = activeNodesRef.current.filter(node => node.endTime > currentTime);
    
    if (activeVoices.length <= maxVoices) return [];

    // Calculate perceptual importance for each active voice
    const voicesWithImportance = activeVoices.map(node => {
      const parts = node.id.split('-');
      const frequency = parseFloat(parts[2]) || 440;
      const velocity = parseFloat(parts[3]) || 64;
      const instrument = parseInt(parts[5]) || 0;
      const channel = parseInt(parts[6]) || 0;
      const startTime = parseFloat(parts[1]) || currentTime;
      
      const importance = calculatePerceptualImportance(frequency, velocity, startTime, instrument, channel);
      
      return {
        node,
        importance,
        frequency,
        age: currentTime - startTime
      };
    });

    // Sort by importance (lowest first), then by age (oldest first)
    voicesWithImportance.sort((a, b) => {
      if (Math.abs(a.importance - b.importance) < 0.1) {
        return b.age - a.age; // Prefer older notes for stealing
      }
      return a.importance - b.importance; // Prefer less important notes
    });

    // Select least important voices for stealing
    const voicesToSteal = voicesWithImportance
      .slice(0, activeVoices.length - maxVoices)
      .map(voice => voice.node.id);

    return voicesToSteal;
  };

  // Instrument-Specific Effects System
  
  // Piano sustain pedal simulation
  const togglePianoSustain = (enabled: boolean) => {
    pianoSustainRef.current.enabled = enabled;
    
    if (!enabled) {
      // Release all sustained notes
      const currentTime = audioContextRef.current?.currentTime || 0;
      pianoSustainRef.current.sustainedNotes.forEach((gainNode, noteId) => {
        try {
          gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);
        } catch (e) { /* ignore */ }
      });
      pianoSustainRef.current.sustainedNotes.clear();
    }
    
  };

  const applyPianoSustain = (noteId: string, gainNode: GainNode, frequency: number) => {
    if (!pianoSustainRef.current.enabled) return;
    
    // Add sympathetic string resonance for piano
    const currentTime = audioContextRef.current?.currentTime || 0;
    
    // Create resonant filter for sympathetic strings
    if (audioContextRef.current) {
      const resonanceFilter = audioContextRef.current.createBiquadFilter();
      resonanceFilter.type = 'bandpass';
      resonanceFilter.frequency.value = frequency * 2; // Octave resonance
      resonanceFilter.Q.value = 10; // High resonance
      
      const resonanceGain = audioContextRef.current.createGain();
      resonanceGain.gain.value = 0.1; // Subtle effect
      
      // Connect: gainNode -> resonanceFilter -> resonanceGain -> effects input
      gainNode.connect(resonanceFilter);
      resonanceFilter.connect(resonanceGain);
      resonanceGain.connect(effectsInputRef.current || audioContextRef.current.destination);
      
      // Store for sustain control
      pianoSustainRef.current.sustainedNotes.set(noteId, resonanceGain);
    }
  };

  // String vibrato control
  const applyStringVibrato = (noteId: string, sourceNode: any, frequency: number, intensity: number = 0.02) => {
    if (!audioContextRef.current) return;
    
    try {
      // Create LFO for vibrato
      const lfo = audioContextRef.current.createOscillator();
      const depthGain = audioContextRef.current.createGain();
      
      lfo.type = 'sine';
      lfo.frequency.value = 5.5; // 5.5 Hz vibrato rate
      depthGain.gain.value = frequency * intensity; // Vibrato depth
      
      // Connect LFO to frequency modulation
      lfo.connect(depthGain);
      depthGain.connect(sourceNode.frequency || sourceNode.playbackRate);
      
      lfo.start();
      
      // Store for cleanup
      stringVibratoRef.current.set(noteId, { lfo, depth: depthGain });
      
      // Auto-cleanup after note ends
      setTimeout(() => {
        try {
          lfo.stop();
          stringVibratoRef.current.delete(noteId);
        } catch (e) { /* ignore */ }
      }, 5000); // 5 second max
      
    } catch (e) {
    }
  };

  // Brass breath dynamics
  const applyBrassDynamics = (noteId: string, gainNode: GainNode, velocity: number, frequency: number) => {
    if (!audioContextRef.current) return;
    
    try {
      const currentTime = audioContextRef.current.currentTime;
      
      // Create breath controller (envelope follower simulation)
      const breathController = audioContextRef.current.createGain();
      breathController.gain.value = 1.0;
      
      // Create mute filter for brass muting effects
      const muteFilter = audioContextRef.current.createBiquadFilter();
      muteFilter.type = 'lowpass';
      muteFilter.frequency.value = frequency * 2; // Start open
      muteFilter.Q.value = 1.0;
      
      // Breath pressure dynamics based on velocity
      const breathIntensity = velocity / 127;
      const breathRate = 3 + (breathIntensity * 2); // 3-5 Hz breathing
      
      // Create breath modulation
      const breathLfo = audioContextRef.current.createOscillator();
      const breathDepth = audioContextRef.current.createGain();
      
      breathLfo.type = 'sine';
      breathLfo.frequency.value = breathRate;
      breathDepth.gain.value = 0.15 * breathIntensity; // Breathing depth
      
      // Apply breath modulation to volume
      breathLfo.connect(breathDepth);
      breathDepth.connect(breathController.gain);
      breathLfo.start();
      
      // Dynamic mute effect for lower velocities
      if (velocity < 80) {
        const muteAmount = 1 - (velocity / 80);
        muteFilter.frequency.value = frequency * (1 - muteAmount * 0.5);
        muteFilter.Q.value = 1 + muteAmount * 3;
      }
      
      // Connect effects chain
      gainNode.connect(breathController);
      breathController.connect(muteFilter);
      muteFilter.connect(effectsInputRef.current || audioContextRef.current.destination);
      
      // Store for control
      brassDynamicsRef.current.set(noteId, { breathController, muteFilter });
      
      // Auto-cleanup
      setTimeout(() => {
        try {
          breathLfo.stop();
          brassDynamicsRef.current.delete(noteId);
        } catch (e) { /* ignore */ }
      }, 8000); // 8 second max
      
    } catch (e) {
    }
  };

  // Apply appropriate effects based on instrument
  const applyInstrumentEffects = (noteId: string, gainNode: GainNode, sourceNode: any, frequency: number, velocity: number, instrument: number) => {
    // Piano family (0-7)
    if (instrument >= 0 && instrument <= 7) {
      applyPianoSustain(noteId, gainNode, frequency);
    }
    
    // String family (40-47)
    else if (instrument >= 40 && instrument <= 47) {
      const vibratoIntensity = 0.015 + (velocity / 127) * 0.01; // 1.5-2.5% vibrato
      applyStringVibrato(noteId, sourceNode, frequency, vibratoIntensity);
    }
    
    // Brass family (56-63)
    else if (instrument >= 56 && instrument <= 63) {
      applyBrassDynamics(noteId, gainNode, velocity, frequency);
    }
  };

  // Handle visualization state changes
  useEffect(() => {
    if (showVisualization && isPlaying) {
      startVisualization();
    } else if (!showVisualization) {
      stopVisualization();
    }
  }, [showVisualization, isPlaying]);

  // Handle visualization when switching to modes that support it
  useEffect(() => {
    if ((playerMode === 'hybrid' || playerMode === 'full') && isPlaying && showVisualization) {
      if (!visualizationIntervalRef.current) {
        startVisualization();
      }
    } else if (playerMode === 'compact') {
      // Stop visualization when in compact mode
      if (visualizationIntervalRef.current) {
        stopVisualization();
      }
    }
  }, [playerMode, isPlaying, showVisualization]);

  useEffect(() => {
    // Initialize worker on component mount
    initializeWorker();
    
    if (autoplay) {
      loadMidi();
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      // Stop any playing audio when component unmounts
      stopAllAudio();
      resetPauseState(); // Reset pause state when component unmounts
      // Reset click debounce
      playButtonClickedRef.current = false;
      // Cleanup worker
      cleanupWorker();
    };
  }, [midiUrl, autoplay]);

  // Simple autoplay handling - only run once when MIDI is loaded
  useEffect(() => {
    if (autoplay && midiDataRef.current && !isLoading && !isPlaying && !autoplayTriggeredRef.current) {
      // Use setTimeout to avoid immediate execution conflicts
      const timer = setTimeout(() => {
        // Extra safety checks before autoplay
        if (midiDataRef.current && !isPlaying && !autoplayTriggeredRef.current && !isLoading) {
          autoplayTriggeredRef.current = true; // Mark autoplay as triggered
          play();
        } else {
        }
      }, 200); // Slightly longer delay to avoid conflicts
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

  // Compact mode (minimal floating player)
  if (playerMode === 'compact') {
    return (
      <div className={`fixed bottom-4 z-50 bg-white rounded-lg shadow-lg border-2 border-black p-3 ${className}
        sm:right-4 sm:left-auto
        max-sm:left-1/2 max-sm:transform max-sm:-translate-x-1/2 max-sm:max-w-[calc(100vw-2rem)]`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={play}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors flex-shrink-0"
            aria-label={isPlaying ? 'Stop' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-medium truncate">{title}</div>
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
          
          <button
            onClick={() => {
              setPlayerMode('hybrid');
              // Start visualization if playing
              if (isPlaying && !visualizationIntervalRef.current) {
                startVisualization();
              }
            }}
            className="text-gray-600 hover:text-gray-800 text-sm"
            title="Expand player"
          >
            ⬜
          </button>
        </div>
      </div>
    );
  }

  // Hybrid mode (floating with visualizer)
  if (playerMode === 'hybrid') {
    return (
      <div className={`fixed bottom-4 z-50 bg-white rounded-lg shadow-lg border-2 border-black p-4 ${className} 
        sm:right-4 sm:left-auto sm:max-w-[400px]
        max-sm:left-1/2 max-sm:transform max-sm:-translate-x-1/2 max-sm:max-w-[calc(100vw-2rem)] max-sm:w-full max-sm:mx-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">🎵 {title}</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setPlayerMode('compact')}
              className="text-gray-600 hover:text-gray-800 text-xs"
              title="Minimize"
            >
              ➖
            </button>
            <button
              onClick={() => {
                setPlayerMode('full');
                // Start visualization if playing
                if (isPlaying && !visualizationIntervalRef.current) {
                  startVisualization();
                }
              }}
              className="text-gray-600 hover:text-gray-800 text-xs"
              title="Full mode"
            >
              ⬜
            </button>
          </div>
        </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={play}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors flex-shrink-0"
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          
          {loop && (
            <span className="text-xs text-gray-600">🔁</span>
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
        
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm flex-shrink-0">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 min-w-0"
            aria-label="Volume"
          />
          <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">{volume}%</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const newState = !showVisualization;
                setShowVisualization(newState);
                if (newState && isPlaying) {
                  startVisualization();
                } else {
                  stopVisualization();
                }
              }}
              className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded transition-colors flex-shrink-0"
              title="Toggle retro visualizer"
            >
              📺
            </button>
            <button
              onClick={() => togglePianoSustain(!pianoSustainRef.current.enabled)}
              className={`px-2 py-1 text-sm rounded transition-colors flex-shrink-0 ${
                pianoSustainRef.current.enabled 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
              title="Piano sustain pedal"
            >
              🎹
            </button>
          </div>
        </div>

        {/* Retro Pixel-Art Visualizer - Compact */}
        {showVisualization && (
          <div className="bg-black rounded border-2 border-green-400 p-2 font-mono">
            <div className="text-green-400 text-xs mb-1 flex justify-between items-center">
              <span>◉ VISUALIZER</span>
              <span className="animate-pulse text-xs">●</span>
            </div>
            
            {/* Spectrum Analyzer - Compact */}
            <div className="mb-2">
              <div className="h-8 sm:h-12 bg-gray-900 border border-green-400 flex items-end gap-px p-1">
                {Array.from(spectrumData.slice(0, 24)).map((value, i) => {
                  const height = Math.max(2, (value / 255) * 40); // 2px min, 40px max
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-green-500 via-yellow-400 to-red-500"
                      style={{ 
                        height: `${height}px`,
                        filter: 'contrast(1.2) saturate(1.5)', // Retro CRT effect
                        imageRendering: 'pixelated'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Waveform - Compact */}
            <div className="mb-2">
              <div className="h-6 sm:h-8 bg-gray-900 border border-green-400 relative">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    points={Array.from(waveformData.slice(0, 48)).map((value, i) => {
                      const x = (i / 47) * 100;
                      const y = 16 - ((value - 128) / 127) * 16 + 16;
                      return `${x}%,${y}`;
                    }).join(' ')}
                    style={{ filter: 'drop-shadow(0 0 2px #10b981)' }}
                  />
                  {/* Retro grid lines */}
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#065f46" strokeWidth="0.5" opacity="0.3"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)"/>
                </svg>
              </div>
            </div>

            {/* Active Notes - Retro MIDI Monitor */}
            <div>
              <div className="text-green-400 text-xs mb-1">
                ACTIVE NOTES [{activeNotes.length}/32]
              </div>
              <div className="h-16 sm:h-20 bg-gray-900 border border-green-400 overflow-hidden">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-px p-1 h-full">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const note = activeNotes[i];
                    const isEmpty = !note;
                    
                    if (isEmpty) {
                      return (
                        <div 
                          key={i} 
                          className="bg-gray-800 border border-gray-700 opacity-30"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      );
                    }

                    // Get instrument color (retro palette)
                    const instrumentColors = {
                      0: 'bg-blue-500',    // Piano
                      40: 'bg-yellow-500', // Strings  
                      56: 'bg-red-500',    // Brass
                      80: 'bg-green-500',  // Synth
                      128: 'bg-purple-500', // Drums
                    };
                    
                    const instrFamily = note.instrument >= 40 && note.instrument <= 47 ? 40 :
                                       note.instrument >= 56 && note.instrument <= 63 ? 56 :
                                       note.instrument >= 80 && note.instrument <= 87 ? 80 :
                                       note.instrument === 128 ? 128 : 0;
                    
                    const color = instrumentColors[instrFamily as keyof typeof instrumentColors] || 'bg-green-500';
                    const intensity = Math.min(1, note.velocity / 127);
                    
                    return (
                      <div 
                        key={i}
                        className={`${color} border border-white animate-pulse`}
                        style={{ 
                          opacity: intensity,
                          imageRendering: 'pixelated',
                          animationDuration: '0.5s'
                        }}
                        title={`${getNoteName(note.midiNote || 60)} (${note.frequency.toFixed(1)}Hz) vel:${note.velocity}`}
                      />
                    );
                  })}
                </div>
              </div>
              
              {/* Retro Status Bar */}
              <div className="text-green-400 text-xs mt-2 flex justify-between gap-2 overflow-hidden">
                <span className="flex-shrink-0">CPU: {Math.min(99, activeNotes.length * 3)}%</span>
                <span className="flex-shrink-0 hidden sm:inline">VOICES: {activeNodesRef.current.length}</span>
                <span className="flex-shrink-0">FREQ: 44.1kHz</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  }

  // Full mode (large, non-floating)
  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 border-black p-4 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold truncate flex-1">🎵 {title}</h3>
        <button
          onClick={() => setPlayerMode('compact')}
          className="text-gray-600 hover:text-gray-800 text-sm flex-shrink-0 ml-2"
          title="Minimize to compact mode"
        >
          ➖
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={play}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex-shrink-0"
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
        
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm flex-shrink-0">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 min-w-0"
            aria-label="Volume"
          />
          <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">{volume}%</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const newState = !showVisualization;
                setShowVisualization(newState);
                if (newState && isPlaying) {
                  startVisualization();
                } else {
                  stopVisualization();
                }
              }}
              className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded transition-colors flex-shrink-0"
              title="Toggle retro visualizer"
            >
              📺
            </button>
            <button
              onClick={() => togglePianoSustain(!pianoSustainRef.current.enabled)}
              className={`px-2 py-1 text-sm rounded transition-colors flex-shrink-0 ${
                pianoSustainRef.current.enabled 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
              title="Piano sustain pedal"
            >
              🎹
            </button>
          </div>
        </div>

        {/* Full-size Retro Visualizer */}
        {showVisualization && (
          <div className="bg-black rounded border-2 border-green-400 p-4 font-mono">
            <div className="text-green-400 text-xs mb-2 flex justify-between items-center">
              <span>◉ AUDIO VISUALIZER v1.0</span>
              <span className="animate-pulse">●REC</span>
            </div>
            
            {/* Full spectrum analyzer */}
            <div className="mb-4">
              <div className="text-green-400 text-xs mb-1">SPECTRUM</div>
              <div className="h-16 bg-gray-900 border border-green-400 flex items-end gap-px p-1">
                {Array.from(spectrumData.slice(0, 32)).map((value, i) => {
                  const height = Math.max(2, (value / 255) * 56);
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-green-500 via-yellow-400 to-red-500"
                      style={{ 
                        height: `${height}px`,
                        filter: 'contrast(1.2) saturate(1.5)',
                        imageRendering: 'pixelated'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Full waveform */}
            <div className="mb-4">
              <div className="text-green-400 text-xs mb-1">WAVEFORM</div>
              <div className="h-12 bg-gray-900 border border-green-400 relative">
                <svg width="100%" height="48" className="absolute inset-0">
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    points={Array.from(waveformData.slice(0, 64)).map((value, i) => {
                      const x = (i / 63) * 100;
                      const y = 48 - ((value - 128) / 127) * 24 - 24;
                      return `${x}%,${y}`;
                    }).join(' ')}
                    style={{ filter: 'drop-shadow(0 0 2px #10b981)' }}
                  />
                </svg>
              </div>
            </div>

            {/* Full note activity */}
            <div>
              <div className="text-green-400 text-xs mb-1">
                ACTIVE NOTES [{activeNotes.length}/32]
              </div>
              <div className="h-16 sm:h-20 bg-gray-900 border border-green-400 overflow-hidden">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-px p-1 h-full">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const note = activeNotes[i];
                    if (!note) {
                      return (
                        <div 
                          key={i} 
                          className="bg-gray-800 border border-gray-700 opacity-30"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      );
                    }

                    const instrumentColors = {
                      0: 'bg-blue-500',
                      40: 'bg-yellow-500',
                      56: 'bg-red-500',
                      128: 'bg-purple-500',
                    };
                    
                    const instrFamily = note.instrument >= 40 && note.instrument <= 47 ? 40 :
                                       note.instrument >= 56 && note.instrument <= 63 ? 56 :
                                       note.instrument === 128 ? 128 : 0;
                    
                    const color = instrumentColors[instrFamily as keyof typeof instrumentColors] || 'bg-green-500';
                    const intensity = Math.min(1, note.velocity / 127);
                    
                    return (
                      <div 
                        key={i}
                        className={`${color} border border-white animate-pulse`}
                        style={{ 
                          opacity: intensity,
                          imageRendering: 'pixelated',
                          animationDuration: '0.5s'
                        }}
                        title={`${getNoteName(note.midiNote || 60)} (${note.frequency.toFixed(1)}Hz) vel:${note.velocity}`}
                      />
                    );
                  })}
                </div>
              </div>
              
              <div className="text-green-400 text-xs mt-2 flex justify-between">
                <span>CPU: {Math.min(99, activeNotes.length * 3)}%</span>
                <span>VOICES: {activeNodesRef.current.length}</span>
                <span>FREQ: 44.1kHz</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}