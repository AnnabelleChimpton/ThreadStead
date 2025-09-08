import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getTemplatePreviewStyle, TEMPLATE_PREVIEW_STYLES } from '@/lib/templates/rendering/template-preview-styles';
import { ProfileTemplateType } from '@/lib/templates/default-profile-templates';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';

// Custom animations for floating particles
const floatingAnimations = `
  @keyframes animate-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
    50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
  }
  @keyframes animate-float-delay {
    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
    50% { transform: translateY(-15px) rotate(-180deg); opacity: 1; }
  }
  @keyframes animate-float-slow {
    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
    50% { transform: translateY(-10px) rotate(90deg); opacity: 0.3; }
  }
  .animate-float { animation: animate-float 3s ease-in-out infinite; }
  .animate-float-delay { animation: animate-float-delay 4s ease-in-out infinite 1s; }
  .animate-float-slow { animation: animate-float-slow 5s ease-in-out infinite 2s; }
`;

interface SignupFinaleAnimationProps {
  username: string;
  selectedTheme?: ProfileTemplateType;
  onComplete?: () => void;
}

interface LoadingBox {
  id: string;
  message: string;
  emoji: string;
  completed: boolean;
  progress: number;
}

export default function SignupFinaleAnimation({ username, selectedTheme, onComplete }: SignupFinaleAnimationProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentStep, setCurrentStep] = useState<'fadeOut' | 'terminal' | 'fadeIn'>('fadeOut');
  const [terminalText, setTerminalText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [loadingBoxes, setLoadingBoxes] = useState<LoadingBox[]>([]);
  
  // Use global audio context for seamless playback
  const globalAudio = useGlobalAudio();

  const terminalMessages = [
    '~ Weaving your digital threads...',
    '~ Building your corner of the internet...',
    '~ Almost ready to step into your new world! ✨'
  ];

  const nostalgicLoadingTasks = [
    { id: 'neighbors', message: 'Finding neighbors...', emoji: '👋', delay: 1200 },
    { id: 'plumbing', message: 'Connecting plumbing...', emoji: '🔧', delay: 2000 },
    { id: 'electricity', message: 'Hooking up electricity...', emoji: '⚡', delay: 2800 },
    { id: 'mailbox', message: 'Installing mailbox...', emoji: '📬', delay: 3600 },
    { id: 'garden', message: 'Planting digital garden...', emoji: '🌱', delay: 4500 },
    { id: 'doorbell', message: 'Testing doorbell...', emoji: '🔔', delay: 5400 },
    { id: 'windows', message: 'Polishing windows...', emoji: '🪟', delay: 6200 },
    { id: 'welcome', message: 'Hanging welcome mat...', emoji: '🏠', delay: 7000 }
  ];

  // Get theme colors for styling
  const themeColors = selectedTheme ? TEMPLATE_PREVIEW_STYLES[selectedTheme] : null;
  const primaryColor = themeColors?.primaryColor || '#8B5CF6';
  const secondaryColor = themeColors?.secondaryColor || '#EC4899';
  const backgroundColor = themeColors?.backgroundColor || '#F8FAFC';


  // Typewriter effect
  useEffect(() => {
    if (currentStep !== 'terminal') return;

    let messageIndex = 0;
    let charIndex = 0;
    let currentMessage = '';

    const typeNextChar = () => {
      if (messageIndex >= terminalMessages.length) {
        // Finished typing, start fade to user page after a longer pause to watch loading boxes
        setTimeout(() => {
          setCurrentStep('fadeIn');
        }, 2000);
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

  // Loading boxes animation
  useEffect(() => {
    if (currentStep !== 'terminal') return;

    // Start loading boxes after a brief delay
    const boxTimers = nostalgicLoadingTasks.map(task => 
      setTimeout(() => {
        setLoadingBoxes(prev => [...prev, {
          id: task.id,
          message: task.message,
          emoji: task.emoji,
          completed: false,
          progress: 0
        }]);

        // Animate progress and complete the task
        let progress = 0;
        const progressTimer = setInterval(() => {
          progress += Math.random() * 20 + 8; // Slightly slower random progress increments
          if (progress >= 100) {
            progress = 100;
            setLoadingBoxes(prev => prev.map(box => 
              box.id === task.id 
                ? { ...box, progress: 100, completed: true }
                : box
            ));
            clearInterval(progressTimer);
          } else {
            setLoadingBoxes(prev => prev.map(box => 
              box.id === task.id 
                ? { ...box, progress }
                : box
            ));
          }
        }, 180); // Slightly slower interval

      }, task.delay)
    );

    return () => boxTimers.forEach(timer => clearTimeout(timer));
  }, [currentStep]);

  // Audio effects using global audio context
  useEffect(() => {
    if (currentStep === 'terminal') {
      // Play nostalgic computer startup sound
      if (audioRef.current) {
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }, 100);
      }
      
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
        // Audio will continue seamlessly via global context - no need for sessionStorage!
        
        router.push(`/resident/${username}?welcomeHome=true`);
        onComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, username, router, onComplete]);

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Inject custom animations */}
      <style dangerouslySetInnerHTML={{ __html: floatingAnimations }} />
      {/* Enhanced background with pattern and animation */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          currentStep === 'fadeOut' ? 'opacity-100' : 
          currentStep === 'terminal' ? 'opacity-100' : 
          'opacity-100'  // Keep overlay visible during fadeIn/navigation
        }`}
        style={{
          background: themeColors 
            ? `
              radial-gradient(circle at 25% 25%, ${primaryColor}25 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, ${secondaryColor}25 0%, transparent 50%),
              linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 50%, ${backgroundColor} 100%)
            `
            : `
              radial-gradient(circle at 25% 25%, rgba(102, 126, 234, 0.25) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(118, 75, 162, 0.25) 0%, transparent 50%),
              linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)
            `
        }}
      />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-float-slow"
          style={{
            background: `radial-gradient(circle, ${primaryColor}40, transparent)`,
            top: '10%',
            left: '10%',
            animationDuration: '15s'
          }}
        ></div>
        <div 
          className="absolute w-64 h-64 rounded-full blur-2xl opacity-15 animate-float-delay"
          style={{
            background: `radial-gradient(circle, ${secondaryColor}40, transparent)`,
            top: '60%',
            right: '15%',
            animationDuration: '20s'
          }}
        ></div>
        <div 
          className="absolute w-80 h-80 rounded-full blur-3xl opacity-10 animate-float"
          style={{
            background: `radial-gradient(circle, ${primaryColor}30, transparent)`,
            bottom: '20%',
            left: '30%',
            animationDuration: '25s'
          }}
        ></div>
      </div>

      {/* Whimsical retro interface */}
      {(currentStep === 'terminal' || currentStep === 'fadeIn') && (
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto transition-opacity duration-700 ${
            currentStep === 'fadeIn' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="max-w-2xl w-full space-y-4">
            {/* Main cozy window */}
            <div 
              className="rounded-xl shadow-2xl border-2 overflow-hidden backdrop-blur-sm"
              style={{
                background: `linear-gradient(to right, ${primaryColor}20, ${secondaryColor}20), rgba(255, 255, 255, 0.9)`,
                backgroundBlendMode: 'overlay',
                borderColor: primaryColor + '40'
              }}
            >
              {/* Window header */}
              <div 
                className="px-4 py-3 flex items-center gap-2 border-b-2"
                style={{
                  background: `linear-gradient(to right, ${primaryColor}20, ${secondaryColor}20)`,
                  borderBottomColor: primaryColor + '40'
                }}
              >
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-300 to-red-400 shadow-sm"></div>
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 shadow-sm"></div>
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-300 to-green-400 shadow-sm"></div>
                </div>
                <div 
                  className="flex-1 text-center text-sm sm:text-base font-medium text-gray-800"
                >
                  ✨ Building Your Digital Home ✨
                </div>
              </div>

              {/* Content area */}
              <div className="p-4 sm:p-8 min-h-[150px] sm:min-h-[200px] relative">
                <div 
                  className="whitespace-pre-wrap text-lg sm:text-xl leading-relaxed font-medium text-gray-800"
                >
                  {terminalText}
                  {showCursor && (
                    <span 
                      className="text-white px-1 rounded-sm animate-pulse"
                      style={{ backgroundColor: primaryColor }}
                    >_</span>
                  )}
                </div>
                
                {/* Theme-colored sparkle effects */}
                <div className="absolute top-4 right-4 sm:right-6 text-xl sm:text-2xl animate-bounce">✨</div>
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8 text-lg animate-pulse">🌟</div>
                <div className="absolute top-1/2 right-8 sm:right-12 text-sm animate-ping">✦</div>
                
                {/* Theme-colored floating particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div 
                    className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full animate-float"
                    style={{ backgroundColor: primaryColor + '60' }}
                  ></div>
                  <div 
                    className="absolute top-3/4 right-1/3 w-1 h-1 rounded-full animate-float-delay"
                    style={{ backgroundColor: secondaryColor + '60' }}
                  ></div>
                  <div 
                    className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 rounded-full animate-float-slow"
                    style={{ backgroundColor: primaryColor + '40' }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Nostalgic loading boxes - mobile responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {loadingBoxes.map(box => (
                <div 
                  key={box.id}
                  className="p-3 sm:p-4 rounded-lg shadow-lg border transition-all duration-500"
                  style={{
                    background: box.completed 
                      ? `linear-gradient(to right, ${primaryColor}30, ${secondaryColor}30), rgba(255, 255, 255, 0.9)`
                      : 'rgba(255, 255, 255, 0.85)',
                    backgroundBlendMode: box.completed ? 'overlay' : 'normal',
                    borderColor: box.completed ? primaryColor + '80' : primaryColor + '50'
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <span className="text-lg sm:text-xl">{box.emoji}</span>
                    <span 
                      className="font-medium text-sm sm:text-base flex-1 text-gray-800"
                    >
                      {box.message}
                    </span>
                    {box.completed && (
                      <span className="text-green-500 text-lg">✓</span>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-2 rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${box.progress}%`,
                        background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Soft glowing effect around main window */}
            <div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-2xl h-64 rounded-xl blur-2xl -z-10 opacity-30"
              style={{
                background: `radial-gradient(circle, ${primaryColor}40, ${secondaryColor}20, transparent)`
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Audio elements */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/computer-startup.mp3" type="audio/mpeg" />
        <source src="/sounds/computer-startup.wav" type="audio/wav" />
        {/* Fallback: Create simple beep sounds using Web Audio API if files don't exist */}
      </audio>
      
      {/* Global audio context handles MIDI/audio playback seamlessly across pages */}

    </div>
  );
}