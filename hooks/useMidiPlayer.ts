import { useEffect, useSyncExternalStore } from 'react';
import {
  claim,
  getServerSnapshot,
  getSnapshot,
  setLoop,
  subscribe,
  type NowPlayingOwner,
  type NowPlayingState,
} from '@/lib/audio/now-playing';

/**
 * A player's view of the page's one song (lib/audio/now-playing.ts). It
 * holds `url` while mounted and lets go when it goes. It re-renders on state
 * changes only (loading, playing, paused…), not as the song moves: read
 * position() in a requestAnimationFrame loop for that.
 */
export function useMidiPlayer(
  url: string,
  options: { title?: string; loop?: boolean; owner?: NowPlayingOwner } = {}
): NowPlayingState & { mine: boolean } {
  const { title, loop = false, owner = 'profile' } = options;

  useEffect(() => claim(url, { title, loop, owner }),
    // Claimed per song; title and loop changes go through below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, owner]);

  useEffect(() => {
    if (getSnapshot().url === url) setLoop(loop);
  }, [url, loop]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...state, mine: state.url === url };
}
