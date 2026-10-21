/**
 * Whether an uploaded MIDI is a song the player can play (MIDI plan Phase
 * 5): read with the same parser the sampler uses, and refuse one that can't
 * be read or has no notes. The upload route already checked the "MThd"
 * header; that alone let through files that were broken after it. Server
 * only.
 */
import { BasicMIDI } from 'spessasynth_core';

export class SongCheckError extends Error {}

/** Throws SongCheckError, with a sentence for the uploader, when it isn't playable */
export function checkSong(midi: Buffer): { seconds: number } {
  let song: BasicMIDI;
  try {
    song = BasicMIDI.fromArrayBuffer(midi.buffer.slice(midi.byteOffset, midi.byteOffset + midi.byteLength) as ArrayBuffer);
  } catch {
    throw new SongCheckError("That MIDI file is broken, so it can't be played.");
  }
  if (!song.tracks.length || !(song.duration > 0)) {
    throw new SongCheckError('That MIDI file has no notes to play.');
  }
  return { seconds: song.duration };
}
