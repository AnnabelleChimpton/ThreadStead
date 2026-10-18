import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import dynamic from 'next/dynamic';
import { PixelIcon } from '@/components/ui/PixelIcon';

// Dynamically import MidiPlayer to avoid SSR issues
const MidiPlayer = dynamic(() => import('@/components/ui/media/MidiPlayer'), {
  ssr: false,
  loading: () => <div className="hidden" />
});

interface SignupFinaleAnimationProps {
  username: string;
  onComplete?: () => void;
}

export default function SignupFinaleAnimation({ onComplete }: SignupFinaleAnimationProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentStep, setCurrentStep] = useState<'fadeOut' | 'terminal' | 'fadeIn'>('fadeOut');
  const [terminalText, setTerminalText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showMidiPlayer, setShowMidiPlayer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.7);
  
  // Use global audio context for seamless playback
  const globalAudio = useGlobalAudio();

  const terminalMessages = [
    '~ Weaving your digital threads...',
    '~ Building your corner of the internet...',
    '~ Almost ready — opening the front door...'
  ];

  // Typewriter effect
  useEffect(() => {
    if (currentStep !== 'terminal') return;

    let messageIndex = 0;
    let charIndex = 0;
    let currentMessage = '';

    const typeNextChar = () => {
      if (messageIndex >= terminalMessages.length) {
        // Finished typing: a short pause, then fade to the user's page
        setTimeout(() => {
          setCurrentStep('fadeIn');
        }, 1000);
        return;
      }

      const message = terminalMessages[messageIndex];
      
      if (charIndex < message.length) {
        currentMessage += message[charIndex];
        setTerminalText(currentMessage);
        charIndex++;
        setTimeout(typeNextChar, Math.random() * 50 + 30); // Variable typing speed
      } else {
        // Finished current message, move to next
        messageIndex++;
        if (messageIndex < terminalMessages.length) {
          currentMessage += '\n';
          setTerminalText(currentMessage);
          charIndex = 0;
          setTimeout(typeNextChar, 800); // Pause between messages
        } else {
          // All messages done
          setTimeout(typeNextChar, 100);
        }
      }
    };

    // Start typing after fade out
    const timer = setTimeout(typeNextChar, 500);
    
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Cursor blink effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    
    return () => clearInterval(interval);
  }, []);

  // Audio effects using global audio context
  useEffect(() => {
    if (currentStep === 'terminal') {
      // Play nostalgic computer startup sound
      if (audioRef.current) {
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {
              // Fallback: Create simple beep sound using Web Audio API
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
              } catch (e) {
                // Silent fallback if Web Audio isn't supported
              }
            });
          }
        }, 100);
      }
      
      // Show MidiPlayer first, then start audio
      setShowMidiPlayer(true);
      
      // Start global signup audio after a brief delay
      setTimeout(() => {
        globalAudio.startSignupAudio();
      }, 1500);
    }
  }, [currentStep, globalAudio]);

  // Step progression
  useEffect(() => {
    if (currentStep === 'fadeOut') {
      // Start with fade to theme colors
      const timer = setTimeout(() => {
        setCurrentStep('terminal');
      }, 800);
      return () => clearTimeout(timer);
    } else if (currentStep === 'fadeIn') {
      // Give fade animation a moment to start, then navigate for seamless transition
      const timer = setTimeout(() => {
        // Land on the logged-in home: the new house and the first-steps list.
        // The welcome music keeps playing via the global audio context.
        router.push('/?welcome=1');
        onComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, router, onComplete]);

  return (
    <div className="thread-surface fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {(currentStep === 'terminal' || currentStep === 'fadeIn') && (
        <div
          className={`w-full max-w-xl transition-opacity duration-700 motion-reduce:transition-none ${
            currentStep === 'fadeIn' ? 'opacity-0' : 'opacity-100'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="thread-module">
          <p className="thread-label pb-2 mb-4 border-b-2 border-dotted border-nb-ink-mid/40">
            Moving you in…
          </p>
          <div className="whitespace-pre-wrap font-mono text-base sm:text-lg leading-relaxed text-nb-ink min-h-[6.5rem]">
            {terminalText}
            <span aria-hidden="true" className={showCursor ? 'opacity-100' : 'opacity-0 motion-reduce:opacity-100'}>_</span>
          </div>
          </div>
        </div>
      )}

      {/* Mute control for the welcome music */}
      {showMidiPlayer && (
        <div className="fixed right-4 z-[10000]" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center gap-3 p-3 bg-nb-paper border-2 border-nb-ink-mid rounded-cozy shadow-nb-sm">
            <button
              onClick={() => {
                if (isMuted) {
                  // Unmute: restore previous volume
                  globalAudio.setVolume(previousVolume);
                  setIsMuted(false);
                } else {
                  // Mute: save current volume and set to 0
                  setPreviousVolume(globalAudio.state.volume);
                  globalAudio.setVolume(0);
                  setIsMuted(true);
                }
              }}
              className="ts-icon-button"
              aria-label={isMuted ? 'Unmute Music' : 'Mute Music'}
            >
              <PixelIcon name="speaker" size={20} className={isMuted ? 'opacity-40' : ''} />
            </button>
            <div>
              <div className="text-sm font-medium text-nb-ink">Welcome Music</div>
              <div className="text-xs text-nb-ink-mid">
                {isMuted ? 'Click to unmute' : 'Click to mute'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio elements - fallback startup sound */}
      <audio 
        ref={audioRef} 
        preload="none"
        onError={() => {
          // Fallback: Create simple beep sound using Web Audio API if files don't exist
          if (audioRef.current) {
            audioRef.current.src = '';
          }
        }}
      >
        <source src="/sounds/computer-startup.mp3" type="audio/mpeg" />
        <source src="/sounds/computer-startup.wav" type="audio/wav" />
      </audio>
      
      {/* Global audio context handles MIDI/audio playback seamlessly across pages */}

    </div>
  );
}