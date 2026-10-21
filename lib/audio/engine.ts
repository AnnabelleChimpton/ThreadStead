import type { Midi } from '@tonejs/midi';

/**
 * A voice engine: what turns a parsed MIDI song into sound. The "now
 * playing" store (lib/audio/now-playing.ts) owns one at a time and hands it
 * the shared AudioContext and an output node. Today's engine is the
 * hand-rolled synth (engines/legacy-synth.ts); MIDI plan Phase 3 swaps in a
 * soundfont sampler behind the same interface.
 */
export interface MidiEngine {
  load(midi: Midi): void;
  /** Seconds */
  readonly duration: number;
  /** Start at `from` seconds. False when it couldn't (the context isn't running). */
  play(from: number): Promise<boolean>;
  /** Stop the notes where they are; returns the position, in seconds */
  pause(): number;
  /** Seconds into the song, on the audio clock */
  position(): number;
  setLoop(loop: boolean): void;
  /** The song reached its end without looping */
  onEnded(callback: () => void): void;
  /** Stop everything and let go of the audio nodes */
  dispose(): void;
}
