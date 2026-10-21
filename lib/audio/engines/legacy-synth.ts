/**
 * The old hand-rolled synth, moved out of MidiPlayer.tsx (MIDI plan Phase 2)
 * behind the MidiEngine interface. Since Phase 3 songs play through the
 * soundfont sampler (sampler.ts); this one only plays a song whose sound
 * bank isn't there yet, and goes in Phase 4.
 *
 * Left behind in the move: four note players nothing called, and the
 * analysis worker, whose results only fed a voice stealer that almost never
 * runs (the same analyses run here on the main thread).
 */
import type { Midi } from '@tonejs/midi';
import type { MidiEngine, SongFiles } from '../engine';

type Ref<T> = { current: T };
const ref = <T,>(current: T): Ref<T> => ({ current });

export function createLegacySynth(ctx: AudioContext, output: AudioNode): MidiEngine {
  const audioContextRef = ref<AudioContext | null>(ctx);
  const midiDataRef = ref<any>(null);
  const progressIntervalRef = ref<ReturnType<typeof setInterval> | null>(null);
  const reverbRef = ref<ConvolverNode | null>(null);
  const compressorRef = ref<DynamicsCompressorNode | null>(null);
  const masterGainRef = ref<GainNode | null>(null);
  const eqLowRef = ref<BiquadFilterNode | null>(null);
  const eqMidRef = ref<BiquadFilterNode | null>(null);
  const eqHighRef = ref<BiquadFilterNode | null>(null);
  const chorusDelayRef = ref<DelayNode | null>(null);
  const chorusLfoRef = ref<OscillatorNode | null>(null);
  const chorusGainRef = ref<GainNode | null>(null);
  const limiterRef = ref<DynamicsCompressorNode | null>(null);
  const stereoWidenerRef = ref<{ left: GainNode; right: GainNode; delay: DelayNode } | null>(null);
  const effectsInputRef = ref<GainNode | null>(null);
  const analyzerRef = ref<AnalyserNode | null>(null);
  const activeNodesRef = ref<Array<{ osc: OscillatorNode; gain: GainNode; endTime: number; id: string }>>([]);
  const instrumentGainsRef = ref<Map<number, GainNode>>(new Map());
  const channelGainsRef = ref<Map<number, GainNode>>(new Map());
  const voiceStealingRef = ref<{ enabled: boolean; lastStealTime: number }>({ enabled: false, lastStealTime: 0 });
  const pianoBuffersRef = ref<Map<number, AudioBuffer>>(new Map());
  const stringBuffersRef = ref<Map<number, AudioBuffer>>(new Map());
  const brassBuffersRef = ref<Map<number, AudioBuffer>>(new Map());
  const activeHarmoniesRef = ref<Map<number, Set<number>>>(new Map());
  const rhythmicAnalysisRef = ref<Map<string, any>>(new Map());
  const musicalPhrasesRef = ref<Array<any>>([]);
  const bassLineNotesRef = ref<Set<number>>(new Set());
  const timeSignatureRef = ref<{ numerator: number; denominator: number }>({ numerator: 4, denominator: 4 });
  const frequencyMaskingRef = ref<Map<number, { level: number; lastUpdate: number }>>(new Map());
  const temporalMaskingRef = ref<Array<{ frequency: number; level: number; endTime: number }>>([]);
  const criticalBandsRef = ref<Array<{ notes: string[]; dominantLevel: number }>>(Array(24).fill(null).map(() => ({ notes: [], dominantLevel: 0 })));
  const pianoSustainRef = ref<{ enabled: boolean; sustainedNotes: Map<string, GainNode> }>({
    enabled: false,
    sustainedNotes: new Map()
  });
  const stringVibratoRef = ref<Map<string, { lfo: OscillatorNode; depth: GainNode }>>(new Map());
  const brassDynamicsRef = ref<Map<string, { breathController: GainNode; muteFilter: BiquadFilterNode }>>(new Map());
  const loopRef = ref<boolean>(false);
  // Song position 0, on the audio clock, for the current play
  let anchor = 0;
  let playing = false;
  let pausedAt = 0;
  let playToken = 0;
  let endedCallback: (() => void) | null = null;

  const position = (): number => {
    const length = midiDataRef.current?.duration ?? 0;
    if (!playing) return pausedAt;
    return Math.max(0, Math.min(length, ctx.currentTime - anchor));
  };

  // Fade the sounding notes out quickly (no clicks) and forget them
  const stopNotes = () => {
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
      } catch {
        // Already stopped
      }
    });
    activeNodesRef.current = [];
  };

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
    
    // Only near-silent notes are skipped. A "system load" filter here
    // counted every note in the 5 s lookahead as load and then dropped notes
    // under 0.1 s: every drum hit, so busy songs lost most of their drums.
    // Real overload is the voice limit's job (stealVoiceIfNeeded).
    if (velocity < 3) return null;

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
    
    // Create filter for warmer, less squeaky sound
    const filter = audioContextRef.current!.createBiquadFilter();
    filter.type = 'lowpass';

    // Warmer waveform selection based on frequency
    const instrumentFamily = Math.floor(instrument / 8) * 8;

    // Use smoother waveforms for high frequencies to avoid squeakiness
    if (frequency > 800) {
      // High notes - use sine to avoid harshness
      osc.type = 'sine';
      filter.frequency.value = Math.min(frequency * 2, 2500); // Gentle filtering
    } else if (frequency > 400) {
      // Mid notes - triangle for warmth
      osc.type = 'triangle';
      filter.frequency.value = Math.min(frequency * 3, 3000);
    } else {
      // Low notes - can use richer waveforms
      const waveTypes: Record<number, OscillatorType> = {
        0: 'triangle',   // Piano
        24: 'triangle',  // Guitar (was sawtooth - too harsh)
        40: 'sine',      // Strings
        56: 'triangle'   // Brass (was square - way too harsh)
      };
      osc.type = waveTypes[instrumentFamily] || 'sine';
      filter.frequency.value = frequency * 4;
    }

    filter.Q.value = 0.5; // Very gentle resonance for warmth
    osc.frequency.value = frequency;

    // Add subtle detuning for analog warmth
    osc.detune.value = (Math.random() - 0.5) * 3; // ±1.5 cents

    // Frequency-dependent gain (reduce high frequency volume)
    const frequencyAttenuation = frequency > 1500 ? 0.5 : frequency > 800 ? 0.7 : frequency > 400 ? 0.85 : 1.0;

    // Velocity-based gain with instrument balancing
    const instrumentVolume = getInstrumentVolume(instrument);
    const baseGain = (velocity / 127) * 0.3 * instrumentVolume * frequencyAttenuation;

    // Optimized envelope - fewer automation points for better performance
    const now = startTime;
    const maxDuration = Math.min(duration, 3.0); // Allow longer notes

    try {
      // Smoother envelope with longer attack to prevent clicks
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(baseGain, now + 0.025); // 25ms attack (was 10ms)
      
      if (instrument >= 40 && instrument <= 47) {
        // Strings - sustained
        gainNode.gain.linearRampToValueAtTime(baseGain * 0.8, now + maxDuration * 0.7);
      } else if (instrument >= 0 && instrument <= 7) {
        // Piano - decay
        gainNode.gain.exponentialRampToValueAtTime(Math.max(baseGain * 0.3, 0.001), now + 0.5);
      }

      gainNode.gain.exponentialRampToValueAtTime(0.001, now + maxDuration);

      // Connect through filter for warmer sound
      osc.connect(filter);
      filter.connect(gainNode);
      
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
    // Volume, mute and fades happen after the engine (the store's output)
    masterGainRef.current.gain.value = 1;
    
    // Professional effects chain routing:
    // Input -> EQ (Low->Mid->High) -> Chorus -> Reverb -> Compressor -> Limiter -> Master -> Output
    
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

    // Parallel reverb processing (removed stereo widener - mono instruments play equally from both speakers)
    chorusMixer.connect(dryGain);
    chorusMixer.connect(wetGain);
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
    masterGainRef.current.connect(output);
    
    
    return inputGain; // Return the input node for instruments to connect to
  };

  const playMidi = async (startOffset: number = 0): Promise<boolean> => {
    if (!midiDataRef.current) return false;
    const ctx = audioContextRef.current!;
    if (ctx.state !== 'running') return false;
    // A pause or a new play while the samples build retires this one
    const token = ++playToken;

    // Initialize professional audio effects chain (only once)
    if (!effectsInputRef.current) {
      effectsInputRef.current = initializeProfessionalEffects(ctx);
    }

    const midi = midiDataRef.current;

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

    // Initialize optimized audio graph and all instrument samples
    initializeOptimizedAudioGraph();
    
    // Generate samples in parallel for better performance
    await Promise.all([
      initializePianoSamples(),
      initializeStringSamples(), 
      initializeBrassSamples()
    ]);
    if (token !== playToken || !midiDataRef.current) return false;
    
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
    
    // Every audible note plays. Big songs used to be cut to 6,500 notes by a
    // priority over the whole song, which dropped short notes first: every
    // drum hit, and whole stretches of other tracks. Notes are scheduled 5 s
    // ahead, so a big song never puts more than that in flight; the voice
    // limit in playNoteAdvanced handles anything denser.
    const VELOCITY_THRESHOLD = 3;
    const notesToPlay = allNotes.filter(note => note.velocity >= VELOCITY_THRESHOLD);

    // Read the clock now, after the samples are built. It used to be read
    // before, so every note due during that wait started at once when it
    // ended (seconds of the opening, bunched, on a slow phone).
    const currentTime = ctx.currentTime;
    anchor = currentTime - startOffset;
    playing = true;

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
    

    // Keep the lookahead fed, tidy finished voices, and notice the end
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (token !== playToken) return;
      scheduleNextBatch();

      if (Date.now() % 1000 < 100) {
        const now = audioContextRef.current?.currentTime || 0;
        activeNodesRef.current = activeNodesRef.current.filter(node => {
          const isFinished = node.endTime < (now - 0.1);
          if (isFinished) {
            try {
              node.osc.disconnect();
              node.gain.disconnect();
            } catch {
              // Already disconnected
            }
          }
          return !isFinished;
        });
      }

      if (position() >= (midiDataRef.current?.duration ?? 0)) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        activeNodesRef.current = [];
        playing = false;
        pausedAt = 0;
        if (loopRef.current) {
          setTimeout(() => {
            if (token === playToken && loopRef.current) playMidi(0);
          }, 100);
        } else {
          endedCallback?.();
        }
      }
    }, 100);
    return true;
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

      // The channel and instrument gains were wired into the effects input
      // disconnected above, and initializeOptimizedAudioGraph only builds the
      // ones that are missing. Kept, they sent every later note into that
      // dead end: after going from one music profile to another the player
      // stayed silent until a reload.
      [channelGainsRef, instrumentGainsRef].forEach(ref => {
        ref.current.forEach(gain => {
          try { gain.disconnect(); } catch { /* ignore */ }
        });
        ref.current.clear();
      });
      if (analyzerRef.current) {
        try { analyzerRef.current.disconnect(); } catch { /* ignore */ }
        analyzerRef.current = null;
      }
      pianoSustainRef.current.sustainedNotes.clear();
      stringVibratoRef.current.clear();
      brassDynamicsRef.current.clear();
      criticalBandsRef.current = criticalBandsRef.current.map(() => ({ notes: [], dominantLevel: 0 }));
      
    } catch (e) {
    }
    
    // All audio stopped
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
      // Depth in cents (0.02 → ±10 cents). It was frequency × 0.02, about ±9,
      // fed into playbackRate, whose normal value is 1: violins swung across
      // octaves five times a second.
      const cents = intensity * 500;
      lfo.connect(depthGain);
      if (sourceNode.detune) {
        depthGain.gain.value = cents;
        depthGain.connect(sourceNode.detune);
      } else if (sourceNode.frequency) {
        depthGain.gain.value = frequency * (Math.pow(2, cents / 1200) - 1);
        depthGain.connect(sourceNode.frequency);
      }
      
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
      
      // The note goes through breath and mute instead of straight to its
      // channel, not as well: brass played twice, about 10 dB louder than
      // everything else. (Brass is never on the drum channel, whose gain is
      // the only one that isn't 1, so skipping the channel gain is the same.)
      gainNode.disconnect();
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

  return {
    async load(song: SongFiles) {
      const { Midi: MidiFile } = await import('@tonejs/midi');
      const midi = new MidiFile(song.midi);
      if (!midi.tracks?.length) throw new Error('This file has no playable tracks');
      playToken++;
      midiDataRef.current = midi;
      playing = false;
      pausedAt = 0;
    },
    get duration() {
      return midiDataRef.current?.duration ?? 0;
    },
    play(from: number) {
      return playMidi(from);
    },
    pause() {
      const at = position();
      playToken++;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      stopNotes();
      playing = false;
      pausedAt = at;
      return at;
    },
    position,
    setLoop(loop: boolean) {
      loopRef.current = loop;
    },
    onEnded(callback: () => void) {
      endedCallback = callback;
    },
    dispose() {
      playToken++;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      playing = false;
      stopAllAudio();
      midiDataRef.current = null;
      endedCallback = null;
    },
  };
}
