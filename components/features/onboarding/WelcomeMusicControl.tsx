import React, { useState } from 'react';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { PixelIcon } from '@/components/ui/PixelIcon';

/**
 * Mute switch for the music that starts at the end of signup. Shown on the
 * page signup lands on, only while that music is playing.
 */
export default function WelcomeMusicControl() {
  const globalAudio = useGlobalAudio();
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.7);

  if (!globalAudio.state.isPlaying) return null;

  const toggle = () => {
    if (isMuted) {
      globalAudio.setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(globalAudio.state.volume);
      globalAudio.setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-cozy border-2 border-nb-ink-mid bg-nb-paper p-2 pr-4 text-nb-ink shadow-nb-sm">
      <button
        onClick={toggle}
        className="ts-icon-button"
        aria-label={isMuted ? 'Unmute welcome music' : 'Mute welcome music'}
      >
        <PixelIcon name={isMuted ? 'volume-x' : 'volume'} size={20} />
      </button>
      <span className="text-sm font-semibold">Welcome music</span>
    </div>
  );
}
