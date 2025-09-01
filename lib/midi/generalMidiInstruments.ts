import * as Tone from 'tone';

export interface InstrumentConfig {
  name: string;
  category: string;
  synthType: 'PolySynth' | 'Sampler' | 'FMSynth' | 'AMSynth' | 'MetalSynth' | 'MembraneSynth' | 'PluckSynth';
  synthOptions: any;
}

export const GENERAL_MIDI_INSTRUMENTS: InstrumentConfig[] = [
  // Piano (0-7) - More realistic piano sounds
  { name: 'Acoustic Grand Piano', category: 'Piano', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle2' }, envelope: { attack: 0.008, decay: 0.2, sustain: 0.4, release: 2.0 } } },
  { name: 'Bright Acoustic Piano', category: 'Piano', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth2' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.35, release: 1.8 } } },
  { name: 'Electric Grand Piano', category: 'Piano', synthType: 'FMSynth', synthOptions: { harmonicity: 2.01, modulationIndex: 12, envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 1.5 } } },
  { name: 'Honky-tonk Piano', category: 'Piano', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square2' }, envelope: { attack: 0.008, decay: 0.12, sustain: 0.25, release: 1.0 } } },
  { name: 'Electric Piano 1', category: 'Piano', synthType: 'FMSynth', synthOptions: { harmonicity: 2, modulationIndex: 15, envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 1 } } },
  { name: 'Electric Piano 2', category: 'Piano', synthType: 'AMSynth', synthOptions: { harmonicity: 2.5, envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 } } },
  { name: 'Harpsichord', category: 'Piano', synthType: 'PluckSynth', synthOptions: { attackNoise: 1, dampening: 4000, resonance: 0.7 } },
  { name: 'Clavinet', category: 'Piano', synthType: 'PluckSynth', synthOptions: { attackNoise: 0.5, dampening: 3000, resonance: 0.8 } },

  // Chromatic Percussion (8-15)
  { name: 'Celesta', category: 'Chromatic Percussion', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 2 } } },
  { name: 'Glockenspiel', category: 'Chromatic Percussion', synthType: 'MetalSynth', synthOptions: { frequency: 200, envelope: { attack: 0.001, decay: 0.4, release: 0.2 }, harmonicity: 5.1, modulationIndex: 32, resonance: 8000, octaves: 1.5 } },
  { name: 'Music Box', category: 'Chromatic Percussion', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 1.5 } } },
  { name: 'Vibraphone', category: 'Chromatic Percussion', synthType: 'FMSynth', synthOptions: { harmonicity: 3.01, modulationIndex: 14, envelope: { attack: 0.01, decay: 0.6, sustain: 0.2, release: 0.8 } } },
  { name: 'Marimba', category: 'Chromatic Percussion', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.5 } } },
  { name: 'Xylophone', category: 'Chromatic Percussion', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.008, octaves: 2, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 } } },
  { name: 'Tubular Bells', category: 'Chromatic Percussion', synthType: 'MetalSynth', synthOptions: { frequency: 150, envelope: { attack: 0.005, decay: 1.5, release: 2 }, harmonicity: 8.5, modulationIndex: 40, resonance: 4000, octaves: 2 } },
  { name: 'Dulcimer', category: 'Chromatic Percussion', synthType: 'PluckSynth', synthOptions: { attackNoise: 2, dampening: 2000, resonance: 0.9 } },

  // Organ (16-23)
  { name: 'Drawbar Organ', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.5 } } },
  { name: 'Percussive Organ', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine2' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.8, release: 0.3 } } },
  { name: 'Rock Organ', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.2 } } },
  { name: 'Church Organ', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.1, decay: 0, sustain: 1, release: 1 } } },
  { name: 'Reed Organ', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.05, decay: 0, sustain: 1, release: 0.5 } } },
  { name: 'Accordion', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square2' }, envelope: { attack: 0.03, decay: 0, sustain: 1, release: 0.3 } } },
  { name: 'Harmonica', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0, sustain: 0.9, release: 0.1 } } },
  { name: 'Tango Accordion', category: 'Organ', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth2' }, envelope: { attack: 0.02, decay: 0, sustain: 1, release: 0.4 } } },

  // Guitar (24-31)
  { name: 'Acoustic Guitar (nylon)', category: 'Guitar', synthType: 'PluckSynth', synthOptions: { attackNoise: 1, dampening: 4000, resonance: 0.95 } },
  { name: 'Acoustic Guitar (steel)', category: 'Guitar', synthType: 'PluckSynth', synthOptions: { attackNoise: 2, dampening: 3500, resonance: 0.98 } },
  { name: 'Electric Guitar (jazz)', category: 'Guitar', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.1, sustain: 0.5, release: 0.8 } } },
  { name: 'Electric Guitar (clean)', category: 'Guitar', synthType: 'PluckSynth', synthOptions: { attackNoise: 0.5, dampening: 3000, resonance: 0.85 } },
  { name: 'Electric Guitar (muted)', category: 'Guitar', synthType: 'PluckSynth', synthOptions: { attackNoise: 0.2, dampening: 5000, resonance: 0.5 } },
  { name: 'Overdriven Guitar', category: 'Guitar', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.9, release: 0.3 } } },
  { name: 'Distortion Guitar', category: 'Guitar', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.05, sustain: 1, release: 0.2 } } },
  { name: 'Guitar Harmonics', category: 'Guitar', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 1 } } },

  // Bass (32-39)
  { name: 'Acoustic Bass', category: 'Bass', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.7 } } },
  { name: 'Electric Bass (finger)', category: 'Bass', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.5 } } },
  { name: 'Electric Bass (pick)', category: 'Bass', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.002, decay: 0.1, sustain: 0.4, release: 0.3 } } },
  { name: 'Fretless Bass', category: 'Bass', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.5 } } },
  { name: 'Slap Bass 1', category: 'Bass', synthType: 'PluckSynth', synthOptions: { attackNoise: 3, dampening: 2000, resonance: 0.7 } },
  { name: 'Slap Bass 2', category: 'Bass', synthType: 'PluckSynth', synthOptions: { attackNoise: 4, dampening: 1500, resonance: 0.8 } },
  { name: 'Synth Bass 1', category: 'Bass', synthType: 'FMSynth', synthOptions: { harmonicity: 0.5, modulationIndex: 10, envelope: { attack: 0.001, decay: 0.2, sustain: 0.3, release: 0.2 } } },
  { name: 'Synth Bass 2', category: 'Bass', synthType: 'AMSynth', synthOptions: { harmonicity: 0.5, envelope: { attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.3 } } },

  // Strings (40-47) - More authentic string sounds
  { name: 'Violin', category: 'Strings', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth3' }, envelope: { attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.8 } } },
  { name: 'Viola', category: 'Strings', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth4' }, envelope: { attack: 0.18, decay: 0.1, sustain: 0.9, release: 0.9 } } },
  { name: 'Cello', category: 'Strings', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth6' }, envelope: { attack: 0.2, decay: 0.1, sustain: 0.9, release: 1.0 } } },
  { name: 'Contrabass', category: 'Strings', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth8' }, envelope: { attack: 0.25, decay: 0.1, sustain: 0.9, release: 1.2 } } },
  { name: 'Tremolo Strings', category: 'Strings', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.05, decay: 0, sustain: 0.9, release: 0.3 } } },
  { name: 'Pizzicato Strings', category: 'Strings', synthType: 'PluckSynth', synthOptions: { attackNoise: 0.5, dampening: 3000, resonance: 0.6 } },
  { name: 'Orchestral Harp', category: 'Strings', synthType: 'PluckSynth', synthOptions: { attackNoise: 0.3, dampening: 1500, resonance: 0.99 } },
  { name: 'Timpani', category: 'Strings', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 1.5 } } },

  // Ensemble (48-55)
  { name: 'String Ensemble 1', category: 'Ensemble', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.3, decay: 0, sustain: 1, release: 0.8 } } },
  { name: 'String Ensemble 2', category: 'Ensemble', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth2' }, envelope: { attack: 0.4, decay: 0, sustain: 1, release: 1 } } },
  { name: 'Synth Strings 1', category: 'Ensemble', synthType: 'FMSynth', synthOptions: { harmonicity: 3, modulationIndex: 10, envelope: { attack: 0.2, decay: 0, sustain: 1, release: 0.7 } } },
  { name: 'Synth Strings 2', category: 'Ensemble', synthType: 'AMSynth', synthOptions: { harmonicity: 2, envelope: { attack: 0.3, decay: 0, sustain: 1, release: 0.9 } } },
  { name: 'Choir Aahs', category: 'Ensemble', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.4, decay: 0, sustain: 1, release: 1.2 } } },
  { name: 'Voice Oohs', category: 'Ensemble', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.3, decay: 0, sustain: 1, release: 1 } } },
  { name: 'Synth Voice', category: 'Ensemble', synthType: 'FMSynth', synthOptions: { harmonicity: 2, modulationIndex: 20, envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.5 } } },
  { name: 'Orchestra Hit', category: 'Ensemble', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 } } },

  // Brass (56-63) - More brassy sounds
  { name: 'Trumpet', category: 'Brass', synthType: 'FMSynth', synthOptions: { harmonicity: 1.005, modulationIndex: 8, envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.4 } } },
  { name: 'Trombone', category: 'Brass', synthType: 'FMSynth', synthOptions: { harmonicity: 1.01, modulationIndex: 10, envelope: { attack: 0.03, decay: 0.1, sustain: 0.75, release: 0.5 } } },
  { name: 'Tuba', category: 'Brass', synthType: 'FMSynth', synthOptions: { harmonicity: 1.02, modulationIndex: 12, envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.6 } } },
  { name: 'Muted Trumpet', category: 'Brass', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.2 } } },
  { name: 'French Horn', category: 'Brass', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.05, sustain: 0.9, release: 0.6 } } },
  { name: 'Brass Section', category: 'Brass', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0, sustain: 0.9, release: 0.4 } } },
  { name: 'Synth Brass 1', category: 'Brass', synthType: 'FMSynth', synthOptions: { harmonicity: 1, modulationIndex: 15, envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 } } },
  { name: 'Synth Brass 2', category: 'Brass', synthType: 'AMSynth', synthOptions: { harmonicity: 1, envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4 } } },

  // Reed (64-71)
  { name: 'Soprano Sax', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.03, decay: 0.05, sustain: 0.7, release: 0.3 } } },
  { name: 'Alto Sax', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square2' }, envelope: { attack: 0.04, decay: 0.05, sustain: 0.7, release: 0.4 } } },
  { name: 'Tenor Sax', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square4' }, envelope: { attack: 0.05, decay: 0.05, sustain: 0.7, release: 0.5 } } },
  { name: 'Baritone Sax', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square8' }, envelope: { attack: 0.06, decay: 0.05, sustain: 0.7, release: 0.6 } } },
  { name: 'Oboe', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'pulse' }, envelope: { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.3 } } },
  { name: 'English Horn', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'pulse' }, envelope: { attack: 0.03, decay: 0.05, sustain: 0.8, release: 0.4 } } },
  { name: 'Bassoon', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.04, decay: 0.05, sustain: 0.7, release: 0.5 } } },
  { name: 'Clarinet', category: 'Reed', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.3 } } },

  // Pipe (72-79)
  { name: 'Piccolo', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.02, sustain: 0.8, release: 0.2 } } },
  { name: 'Flute', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine2' }, envelope: { attack: 0.02, decay: 0.02, sustain: 0.8, release: 0.3 } } },
  { name: 'Recorder', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.02, sustain: 0.9, release: 0.2 } } },
  { name: 'Pan Flute', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.05, decay: 0.02, sustain: 0.7, release: 0.4 } } },
  { name: 'Blown Bottle', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0, sustain: 0.9, release: 0.3 } } },
  { name: 'Shakuhachi', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.15, decay: 0.02, sustain: 0.6, release: 0.5 } } },
  { name: 'Whistle', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0, sustain: 1, release: 0.1 } } },
  { name: 'Ocarina', category: 'Pipe', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0, sustain: 0.9, release: 0.3 } } },

  // Synth Lead (80-87)
  { name: 'Lead 1 (square)', category: 'Synth Lead', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.8, release: 0.2 } } },
  { name: 'Lead 2 (sawtooth)', category: 'Synth Lead', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.9, release: 0.3 } } },
  { name: 'Lead 3 (calliope)', category: 'Synth Lead', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'pulse' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0.6, release: 0.4 } } },
  { name: 'Lead 4 (chiff)', category: 'Synth Lead', synthType: 'FMSynth', synthOptions: { harmonicity: 0.5, modulationIndex: 20, envelope: { attack: 0.001, decay: 0.3, sustain: 0.5, release: 0.3 } } },
  { name: 'Lead 5 (charang)', category: 'Synth Lead', synthType: 'AMSynth', synthOptions: { harmonicity: 1.5, envelope: { attack: 0.001, decay: 0.2, sustain: 0.7, release: 0.3 } } },
  { name: 'Lead 6 (voice)', category: 'Synth Lead', synthType: 'FMSynth', synthOptions: { harmonicity: 2, modulationIndex: 25, envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.5 } } },
  { name: 'Lead 7 (fifths)', category: 'Synth Lead', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.9, release: 0.2 } } },
  { name: 'Lead 8 (bass + lead)', category: 'Synth Lead', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.1, sustain: 1, release: 0.1 } } },

  // Synth Pad (88-95)
  { name: 'Pad 1 (new age)', category: 'Synth Pad', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.8, decay: 0, sustain: 1, release: 2 } } },
  { name: 'Pad 2 (warm)', category: 'Synth Pad', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.6, decay: 0, sustain: 1, release: 1.5 } } },
  { name: 'Pad 3 (polysynth)', category: 'Synth Pad', synthType: 'FMSynth', synthOptions: { harmonicity: 3, modulationIndex: 5, envelope: { attack: 0.5, decay: 0, sustain: 1, release: 1.8 } } },
  { name: 'Pad 4 (choir)', category: 'Synth Pad', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.7, decay: 0, sustain: 1, release: 2.5 } } },
  { name: 'Pad 5 (bowed)', category: 'Synth Pad', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.4, decay: 0, sustain: 1, release: 1.2 } } },
  { name: 'Pad 6 (metallic)', category: 'Synth Pad', synthType: 'MetalSynth', synthOptions: { frequency: 100, envelope: { attack: 0.5, decay: 1, release: 3 }, harmonicity: 10, modulationIndex: 20, resonance: 2000, octaves: 1 } },
  { name: 'Pad 7 (halo)', category: 'Synth Pad', synthType: 'AMSynth', synthOptions: { harmonicity: 3, envelope: { attack: 1, decay: 0, sustain: 1, release: 3 } } },
  { name: 'Pad 8 (sweep)', category: 'Synth Pad', synthType: 'FMSynth', synthOptions: { harmonicity: 1, modulationIndex: 30, envelope: { attack: 1.5, decay: 0, sustain: 1, release: 2 } } },

  // Synth Effects (96-103)
  { name: 'FX 1 (rain)', category: 'Synth Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.5, decay: 0.5, sustain: 0.5, release: 2 } } },
  { name: 'FX 2 (soundtrack)', category: 'Synth Effects', synthType: 'FMSynth', synthOptions: { harmonicity: 5, modulationIndex: 8, envelope: { attack: 0.3, decay: 0.3, sustain: 0.7, release: 1.5 } } },
  { name: 'FX 3 (crystal)', category: 'Synth Effects', synthType: 'MetalSynth', synthOptions: { frequency: 300, envelope: { attack: 0.01, decay: 2, release: 2 }, harmonicity: 15, modulationIndex: 50, resonance: 5000, octaves: 3 } },
  { name: 'FX 4 (atmosphere)', category: 'Synth Effects', synthType: 'AMSynth', synthOptions: { harmonicity: 4, envelope: { attack: 1, decay: 0.5, sustain: 0.8, release: 3 } } },
  { name: 'FX 5 (brightness)', category: 'Synth Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.2, decay: 0.2, sustain: 0.9, release: 1 } } },
  { name: 'FX 6 (goblins)', category: 'Synth Effects', synthType: 'FMSynth', synthOptions: { harmonicity: 0.5, modulationIndex: 40, envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.8 } } },
  { name: 'FX 7 (echoes)', category: 'Synth Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'triangle' }, envelope: { attack: 0.1, decay: 1, sustain: 0.2, release: 3 } } },
  { name: 'FX 8 (sci-fi)', category: 'Synth Effects', synthType: 'FMSynth', synthOptions: { harmonicity: 0.25, modulationIndex: 50, envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1 } } },

  // Ethnic (104-111)
  { name: 'Sitar', category: 'Ethnic', synthType: 'PluckSynth', synthOptions: { attackNoise: 3, dampening: 1000, resonance: 0.99 } },
  { name: 'Banjo', category: 'Ethnic', synthType: 'PluckSynth', synthOptions: { attackNoise: 4, dampening: 3000, resonance: 0.95 } },
  { name: 'Shamisen', category: 'Ethnic', synthType: 'PluckSynth', synthOptions: { attackNoise: 2, dampening: 2500, resonance: 0.9 } },
  { name: 'Koto', category: 'Ethnic', synthType: 'PluckSynth', synthOptions: { attackNoise: 1, dampening: 2000, resonance: 0.98 } },
  { name: 'Kalimba', category: 'Ethnic', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 } } },
  { name: 'Bagpipe', category: 'Ethnic', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.1, decay: 0, sustain: 1, release: 0.1 } } },
  { name: 'Fiddle', category: 'Ethnic', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.05, decay: 0, sustain: 1, release: 0.3 } } },
  { name: 'Shanai', category: 'Ethnic', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.02, decay: 0, sustain: 0.9, release: 0.2 } } },

  // Percussive (112-119)
  { name: 'Tinkle Bell', category: 'Percussive', synthType: 'MetalSynth', synthOptions: { frequency: 500, envelope: { attack: 0.001, decay: 0.3, release: 0.5 }, harmonicity: 20, modulationIndex: 60, resonance: 6000, octaves: 1.5 } },
  { name: 'Agogo', category: 'Percussive', synthType: 'MetalSynth', synthOptions: { frequency: 400, envelope: { attack: 0.001, decay: 0.1, release: 0.2 }, harmonicity: 12, modulationIndex: 40, resonance: 3000, octaves: 0.5 } },
  { name: 'Steel Drums', category: 'Percussive', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.01, octaves: 3, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.5 } } },
  { name: 'Woodblock', category: 'Percussive', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.001, octaves: 0.5, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 } } },
  { name: 'Taiko Drum', category: 'Percussive', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.05, octaves: 5, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.8 } } },
  { name: 'Melodic Tom', category: 'Percussive', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 } } },
  { name: 'Synth Drum', category: 'Percussive', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.008, octaves: 4, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.2 } } },
  { name: 'Reverse Cymbal', category: 'Percussive', synthType: 'MetalSynth', synthOptions: { frequency: 200, envelope: { attack: 1, decay: 0, release: 0.1 }, harmonicity: 5, modulationIndex: 100, resonance: 8000, octaves: 3 } },

  // Sound Effects (120-127)
  { name: 'Guitar Fret Noise', category: 'Sound Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 } } },
  { name: 'Breath Noise', category: 'Sound Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0, sustain: 0.3, release: 0.3 } } },
  { name: 'Seashore', category: 'Sound Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 2, decay: 0, sustain: 0.5, release: 3 } } },
  { name: 'Bird Tweet', category: 'Sound Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 } } },
  { name: 'Telephone Ring', category: 'Sound Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.001 } } },
  { name: 'Helicopter', category: 'Sound Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 } } },
  { name: 'Applause', category: 'Sound Effects', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.2, decay: 0.1, sustain: 0.5, release: 1 } } },
  { name: 'Gunshot', category: 'Sound Effects', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.001, octaves: 8, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.3 } } }
];

// General MIDI Drum Map (Channel 10) - Optimized for realism
export const GM_DRUM_MAP: { [key: number]: InstrumentConfig } = {
  35: { name: 'Acoustic Bass Drum', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.08, octaves: 8, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.8 } } },
  36: { name: 'Bass Drum 1', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.06, octaves: 7, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.6 } } },
  37: { name: 'Side Stick', category: 'Drums', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.01, sustain: 0, release: 0.03 } } },
  38: { name: 'Acoustic Snare', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.02, octaves: 4, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.15 } } },
  39: { name: 'Hand Clap', category: 'Drums', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.05 } } },
  40: { name: 'Electric Snare', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.015, octaves: 5, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.12 } } },
  41: { name: 'Low Floor Tom', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.03, octaves: 3, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.3 } } },
  42: { name: 'Closed Hi-Hat', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 800, envelope: { attack: 0.001, decay: 0.02, release: 0.03 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 0.5 } },
  43: { name: 'High Floor Tom', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.025, octaves: 2.5, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.25 } } },
  44: { name: 'Pedal Hi-Hat', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 600, envelope: { attack: 0.001, decay: 0.05, release: 0.08 }, harmonicity: 5.1, modulationIndex: 32, resonance: 3000, octaves: 0.5 } },
  45: { name: 'Low Tom', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 } } },
  46: { name: 'Open Hi-Hat', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 800, envelope: { attack: 0.001, decay: 0.1, release: 0.3 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 0.5 } },
  47: { name: 'Low-Mid Tom', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.018, octaves: 1.8, envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.18 } } },
  48: { name: 'Hi-Mid Tom', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.015, octaves: 1.5, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.15 } } },
  49: { name: 'Crash Cymbal 1', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 300, envelope: { attack: 0.001, decay: 0.3, release: 2 }, harmonicity: 5.1, modulationIndex: 50, resonance: 8000, octaves: 2 } },
  50: { name: 'High Tom', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.012, octaves: 1.2, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.12 } } },
  51: { name: 'Ride Cymbal 1', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 400, envelope: { attack: 0.001, decay: 0.5, release: 3 }, harmonicity: 5.1, modulationIndex: 40, resonance: 6000, octaves: 1.5 } },
  52: { name: 'Chinese Cymbal', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 350, envelope: { attack: 0.001, decay: 0.4, release: 1.5 }, harmonicity: 7, modulationIndex: 60, resonance: 7000, octaves: 2.5 } },
  53: { name: 'Ride Bell', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 500, envelope: { attack: 0.001, decay: 0.2, release: 0.8 }, harmonicity: 10, modulationIndex: 30, resonance: 5000, octaves: 1 } },
  54: { name: 'Tambourine', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 700, envelope: { attack: 0.001, decay: 0.05, release: 0.1 }, harmonicity: 15, modulationIndex: 80, resonance: 9000, octaves: 0.5 } },
  55: { name: 'Splash Cymbal', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 450, envelope: { attack: 0.001, decay: 0.15, release: 0.5 }, harmonicity: 6, modulationIndex: 45, resonance: 7500, octaves: 1.8 } },
  56: { name: 'Cowbell', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 560, envelope: { attack: 0.001, decay: 0.08, release: 0.15 }, harmonicity: 12, modulationIndex: 35, resonance: 3000, octaves: 0.3 } },
  57: { name: 'Crash Cymbal 2', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 280, envelope: { attack: 0.001, decay: 0.35, release: 2.5 }, harmonicity: 5.5, modulationIndex: 55, resonance: 8500, octaves: 2.2 } },
  58: { name: 'Vibraslap', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 100, envelope: { attack: 0.001, decay: 0.3, release: 0.5 }, harmonicity: 3, modulationIndex: 100, resonance: 2000, octaves: 4 } },
  59: { name: 'Ride Cymbal 2', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 420, envelope: { attack: 0.001, decay: 0.6, release: 3.5 }, harmonicity: 5.2, modulationIndex: 42, resonance: 6500, octaves: 1.6 } },
  60: { name: 'Hi Bongo', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.008, octaves: 1, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.08 } } },
  61: { name: 'Low Bongo', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.01, octaves: 1.2, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 } } },
  62: { name: 'Mute Hi Conga', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.006, octaves: 0.8, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.06 } } },
  63: { name: 'Open Hi Conga', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.012, octaves: 1.5, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.15 } } },
  64: { name: 'Low Conga', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.015, octaves: 1.8, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 } } },
  65: { name: 'High Timbale', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.005, octaves: 0.5, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 } } },
  66: { name: 'Low Timbale', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.008, octaves: 0.8, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.15 } } },
  67: { name: 'High Agogo', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 480, envelope: { attack: 0.001, decay: 0.08, release: 0.12 }, harmonicity: 14, modulationIndex: 38, resonance: 3500, octaves: 0.4 } },
  68: { name: 'Low Agogo', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 320, envelope: { attack: 0.001, decay: 0.1, release: 0.15 }, harmonicity: 10, modulationIndex: 42, resonance: 2500, octaves: 0.6 } },
  69: { name: 'Cabasa', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 900, envelope: { attack: 0.001, decay: 0.02, release: 0.05 }, harmonicity: 20, modulationIndex: 90, resonance: 10000, octaves: 0.2 } },
  70: { name: 'Maracas', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 1000, envelope: { attack: 0.001, decay: 0.015, release: 0.04 }, harmonicity: 25, modulationIndex: 95, resonance: 11000, octaves: 0.15 } },
  71: { name: 'Short Whistle', category: 'Drums', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 } } },
  72: { name: 'Long Whistle', category: 'Drums', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sine' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 } } },
  73: { name: 'Short Guiro', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 600, envelope: { attack: 0.001, decay: 0.03, release: 0.05 }, harmonicity: 18, modulationIndex: 70, resonance: 5000, octaves: 1 } },
  74: { name: 'Long Guiro', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 550, envelope: { attack: 0.001, decay: 0.1, release: 0.2 }, harmonicity: 16, modulationIndex: 75, resonance: 4500, octaves: 1.2 } },
  75: { name: 'Claves', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.001, octaves: 0.1, envelope: { attack: 0.001, decay: 0.01, sustain: 0, release: 0.03 } } },
  76: { name: 'Hi Wood Block', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.001, octaves: 0.3, envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.05 } } },
  77: { name: 'Low Wood Block', category: 'Drums', synthType: 'MembraneSynth', synthOptions: { pitchDecay: 0.001, octaves: 0.5, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.08 } } },
  78: { name: 'Mute Cuica', category: 'Drums', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 } } },
  79: { name: 'Open Cuica', category: 'Drums', synthType: 'PolySynth', synthOptions: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.2, release: 0.2 } } },
  80: { name: 'Mute Triangle', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 700, envelope: { attack: 0.001, decay: 0.1, release: 0.2 }, harmonicity: 22, modulationIndex: 50, resonance: 7000, octaves: 0.8 } },
  81: { name: 'Open Triangle', category: 'Drums', synthType: 'MetalSynth', synthOptions: { frequency: 700, envelope: { attack: 0.001, decay: 0.3, release: 0.8 }, harmonicity: 22, modulationIndex: 50, resonance: 7000, octaves: 0.8 } }
};

export function createSynthForInstrument(programNumber: number): Tone.PolySynth | Tone.Synth {
  const config = GENERAL_MIDI_INSTRUMENTS[programNumber] || GENERAL_MIDI_INSTRUMENTS[0];
  
  let synth: any;
  
  // Simple, audible volume levels
  switch (config.synthType) {
    case 'FMSynth':
      synth = new Tone.PolySynth(Tone.FMSynth, config.synthOptions).toDestination();
      break;
    case 'AMSynth':
      synth = new Tone.PolySynth(Tone.AMSynth, config.synthOptions).toDestination();
      break;
    case 'MetalSynth':
    case 'MembraneSynth':
    case 'PluckSynth':
      // Fallback to regular synth
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: config.synthOptions.oscillator || { type: 'triangle' },
        envelope: config.synthOptions.envelope || { attack: 0.02, decay: 0.3, sustain: 0.6, release: 1.0 }
      }).toDestination();
      break;
    case 'PolySynth':
    default:
      synth = new Tone.PolySynth(Tone.Synth, config.synthOptions).toDestination();
      break;
  }
  
  // Reasonable polyphony
  if (synth.maxPolyphony !== undefined) {
    synth.maxPolyphony = 12;
  }
  
  return synth;
}

export function createDrumSynth(note: number): Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth {
  const config = GM_DRUM_MAP[note];
  
  // Simple drum sounds
  if (!config) {
    return new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 }
    }).toDestination();
  }

  let synth: any;
  
  switch (config.synthType) {
    case 'MembraneSynth':
      synth = new Tone.MembraneSynth(config.synthOptions).toDestination();
      break;
    case 'MetalSynth':
      synth = new Tone.MetalSynth(config.synthOptions).toDestination();
      break;
    case 'PolySynth':
      synth = new Tone.Synth(config.synthOptions).toDestination();
      break;
    default:
      synth = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 }
      }).toDestination();
      break;
  }
  
  return synth;
}