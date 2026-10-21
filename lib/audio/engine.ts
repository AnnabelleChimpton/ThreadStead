/**
 * A voice engine: what turns a MIDI song into sound. The "now playing"
 * store (lib/audio/now-playing.ts) owns one at a time and hands it the
 * shared AudioContext and an output node.
 *
 * - engines/sampler.ts plays the song through its own trimmed General MIDI
 *   sound bank (GeneralUser GS), on the audio thread. Every song uploaded
 *   since MIDI plan Phase 3 has one.
 * - engines/legacy-synth.ts is the old hand-rolled synth, for songs whose
 *   bank isn't there (not backfilled yet, or the trim failed).
 */
export interface SongFiles {
  /** The MIDI file */
  midi: ArrayBuffer;
  /** Its sound bank (SF2), or null when there isn't one */
  bank: ArrayBuffer | null;
}

export interface MidiEngine {
  /** Read the song. Rejects with a sentence a visitor can read when it can't be played. */
  load(song: SongFiles): Promise<void>;
  /** Seconds */
  readonly duration: number;
  /** Start at `from` seconds. False when it couldn't (the context isn't running). */
  play(from: number): Promise<boolean>;
  /** Stop the notes where they are; returns the position, in seconds */
  pause(): number;
  /** Seconds into the song */
  position(): number;
  setLoop(loop: boolean): void;
  /** The song reached its end without looping */
  onEnded(callback: () => void): void;
  /** Stop everything and let go of the audio nodes */
  dispose(): void;
}
