// Web Worker for MIDI analysis to prevent UI blocking
// This runs in a separate thread for better performance

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'ANALYZE_MIDI':
        const result = analyzeMIDIStructure(data);
        self.postMessage({ type: 'ANALYSIS_COMPLETE', result });
        break;
        
      case 'ANALYZE_RHYTHM':
        const rhythmResult = analyzeRhythmicStructure(data);
        self.postMessage({ type: 'RHYTHM_COMPLETE', result: rhythmResult });
        break;
        
      case 'DETECT_PHRASES':
        const phrasesResult = detectMusicalPhrases(data);
        self.postMessage({ type: 'PHRASES_COMPLETE', result: phrasesResult });
        break;
        
      case 'ANALYZE_BASS':
        const bassResult = analyzeBassLines(data);
        self.postMessage({ type: 'BASS_COMPLETE', result: bassResult });
        break;
        
      default:
        self.postMessage({ type: 'ERROR', error: 'Unknown analysis type' });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};

function analyzeMIDIStructure(allNotes) {  
  // Detect time signature
  const timeSignature = detectTimeSignature(allNotes);
  
  // Calculate note density and complexity metrics
  const complexity = {
    totalNotes: allNotes.length,
    averageVelocity: allNotes.reduce((sum, note) => sum + note.velocity, 0) / allNotes.length,
    durationRange: {
      min: Math.min(...allNotes.map(note => note.duration)),
      max: Math.max(...allNotes.map(note => note.duration))
    },
    pitchRange: {
      min: Math.min(...allNotes.map(note => note.frequency)),
      max: Math.max(...allNotes.map(note => note.frequency))
    }
  };
  
  // Channel analysis
  const channels = {};
  allNotes.forEach(note => {
    const channel = note.channel || 0;
    if (!channels[channel]) {
      channels[channel] = { noteCount: 0, instruments: new Set() };
    }
    channels[channel].noteCount++;
    channels[channel].instruments.add(note.instrument || 0);
  });
  
  // Convert Sets to arrays for serialization
  Object.keys(channels).forEach(channel => {
    channels[channel].instruments = Array.from(channels[channel].instruments);
  });
  
  return {
    timeSignature,
    complexity,
    channels,
    processingTime: Date.now()
  };
}

function detectTimeSignature(notes) {
  if (notes.length < 10) return { numerator: 4, denominator: 4 };
  
  // Analyze timing patterns
  const noteTimes = notes.map(note => note.time).sort((a, b) => a - b);
  const intervals = [];
  
  for (let i = 1; i < Math.min(noteTimes.length, 100); i++) {
    intervals.push(noteTimes[i] - noteTimes[i-1]);
  }
  
  // Find most common interval patterns
  const intervalCounts = {};
  intervals.forEach(interval => {
    const rounded = Math.round(interval * 8) / 8; // Round to eighth notes
    intervalCounts[rounded] = (intervalCounts[rounded] || 0) + 1;
  });
  
  // Simple heuristic based on most common intervals
  const sortedIntervals = Object.entries(intervalCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  // Default to 4/4 for most music
  return { numerator: 4, denominator: 4 };
}

function analyzeRhythmicStructure(data) {
  const { notes, timeSignature } = data;
    
  const rhythmicImportance = {};
  let downbeatCount = 0;
  let strongBeatCount = 0;
  
  notes.forEach(note => {
    const importance = calculateRhythmicImportance(note.time, timeSignature);
    const key = `${note.time}-${note.frequency}`;
    rhythmicImportance[key] = importance;
    
    if (importance >= 1.0) downbeatCount++;
    else if (importance >= 0.9) strongBeatCount++;
  });
  
  return {
    rhythmicImportance,
    downbeatCount,
    strongBeatCount,
    processingTime: Date.now()
  };
}

function calculateRhythmicImportance(noteTime, timeSignature = { numerator: 4, denominator: 4 }) {
  // Convert time to musical beats (assuming 120 BPM)
  const quarterNoteLength = 0.5; // seconds at 120 BPM
  const measureLength = quarterNoteLength * timeSignature.numerator;
  
  // Calculate position within measure
  const measurePosition = (noteTime % measureLength) / quarterNoteLength;
  const beat = Math.floor(measurePosition) + 1;
  const subdivision = measurePosition - Math.floor(measurePosition);
  
  let rhythmicImportance = 0.5; // Base importance
  
  // Downbeats (beat 1) are most important
  if (beat === 1 && subdivision < 0.1) {
    rhythmicImportance = 1.0;
  }
  // Strong beats (beat 3 in 4/4) are very important
  else if (beat === 3 && timeSignature.numerator === 4 && subdivision < 0.1) {
    rhythmicImportance = 0.9;
  }
  // Weak beats (2 and 4 in 4/4) are moderately important
  else if ((beat === 2 || beat === 4) && subdivision < 0.1) {
    rhythmicImportance = 0.7;
  }
  // Syncopated notes (off-beat)
  else if (subdivision > 0.4 && subdivision < 0.6) {
    rhythmicImportance = 0.75;
  }
  // Eighth note positions
  else if (Math.abs(subdivision - 0.5) < 0.1) {
    rhythmicImportance = 0.6;
  }
  
  return rhythmicImportance;
}

function detectMusicalPhrases(notes) {  
  if (notes.length < 5) return [];
  
  const phrases = [];
  let currentPhrase = [];
  let lastNoteTime = 0;
  
  // Sort notes by time
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  
  for (const note of sortedNotes) {
    const gap = note.time - lastNoteTime;
    
    // Phrase break detected (gap > 1 second)
    if (gap > 1.0 && currentPhrase.length > 0) {
      const phrase = {
        startTime: currentPhrase[0].time,
        endTime: currentPhrase[currentPhrase.length - 1].time + currentPhrase[currentPhrase.length - 1].duration,
        noteCount: currentPhrase.length,
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
      noteCount: currentPhrase.length,
      importance: calculatePhraseImportance(currentPhrase),
      channel: currentPhrase[0].channel || 0
    };
    phrases.push(phrase);
  }
  
  return {
    phrases,
    totalPhrases: phrases.length,
    importantPhrases: phrases.filter(p => p.importance > 0.7).length,
    processingTime: Date.now()
  };
}

function calculatePhraseImportance(notes) {
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
      const freq1 = notes[i-1].frequency;
      const freq2 = notes[i].frequency;
      const interval = Math.abs(Math.log2(freq2 / freq1)) * 12; // Semitones
      totalMovement += Math.min(interval / 12, 1.0); // Normalize to octave
    }
    importance += Math.min(totalMovement / notes.length, 0.3);
  }
  
  return Math.min(importance, 1.0);
}

function analyzeBassLines(notes) {  
  const bassNoteClasses = new Set();
  
  // Find notes below C3 (approximately 130.8 Hz)
  const lowNotes = notes.filter(note => note.frequency < 130.8);
  
  // Group by time and find lowest note at each time point
  const timeGroups = {};
  lowNotes.forEach(note => {
    const timeKey = Math.round(note.time * 4); // Quarter note resolution
    if (!timeGroups[timeKey]) {
      timeGroups[timeKey] = [];
    }
    timeGroups[timeKey].push(note);
  });
  
  // For each time group, mark the lowest note as important bass
  Object.values(timeGroups).forEach(group => {
    if (group.length > 0) {
      const lowestNote = group.reduce((lowest, note) => {
        return note.frequency < lowest.frequency ? note : lowest;
      });
      
      // Convert to pitch class (0-11)
      const midiNote = Math.round(12 * Math.log2(lowestNote.frequency / 440) + 69);
      bassNoteClasses.add(midiNote % 12);
    }
  });
  
  return {
    bassNoteClasses: Array.from(bassNoteClasses),
    bassNoteCount: bassNoteClasses.size,
    lowNoteCount: lowNotes.length,
    processingTime: Date.now()
  };
}

// Signal that the worker is ready
self.postMessage({ type: 'WORKER_READY' });