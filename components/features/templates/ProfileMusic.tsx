import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

// The real profile player (Web Audio synth), client-only like on the
// standard layout.
const MidiPlayer = dynamic(() => import('@/components/ui/media/MidiPlayer'), {
  ssr: false,
  loading: () => null,
});

interface ProfileMusicProps extends UniversalCSSProps {
  className?: string;
}

/** The profile owner's song (Settings → Music), played in the page. */
export default function ProfileMusic(props: ProfileMusicProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className } = componentProps;
  const { owner, viewer, profileMidi } = useResidentData();

  if (!profileMidi?.url) {
    // Only the owner hears about a missing song; visitors see nothing.
    if (!viewer?.id || viewer.id !== owner?.id) return null;
    return (
      <p className={`ts-profile-music ts-profile-music--empty text-sm ${className ?? ''}`} style={applyCSSProps(cssProps)}>
        No profile song yet. <Link href="/settings?tab=music">Pick one in Settings</Link> and it plays here.
      </p>
    );
  }

  return (
    <div className={`ts-profile-music w-full max-w-sm min-w-0 ${className ?? ''}`} style={applyCSSProps(cssProps)}>
      <MidiPlayer
        midiUrl={profileMidi.url}
        title={profileMidi.title}
        credit={profileMidi.credit}
        autoplay={profileMidi.autoplay}
        loop={profileMidi.loop}
        placement="inline"
      />
    </div>
  );
}
