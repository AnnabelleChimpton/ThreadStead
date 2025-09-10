import React, { useState, useEffect, useRef } from 'react';
import { getTemplatePreviewStyle, TEMPLATE_PREVIEW_STYLES } from '@/lib/templates/rendering/template-preview-styles';
import { ProfileTemplateType } from '@/lib/templates/default-profile-templates';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';

interface WelcomeHomeOverlayProps {
  username: string;
  selectedTheme?: ProfileTemplateType;
  onComplete?: () => void;
}

export default function WelcomeHomeOverlay({ 
  username, 
  selectedTheme, 
  onComplete 
}: WelcomeHomeOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [foundersNote, setFoundersNote] = useState<string>('');
  const globalAudio = useGlobalAudio();

  // Get theme colors for styling
  const themeColors = selectedTheme ? TEMPLATE_PREVIEW_STYLES[selectedTheme] : null;
  const primaryColor = themeColors?.primaryColor || '#8B5CF6';
  const secondaryColor = themeColors?.secondaryColor || '#EC4899';
  const backgroundColor = themeColors?.backgroundColor || '#F8FAFC';

  // Fetch founder's note from admin settings
  useEffect(() => {
    fetch('/api/admin/founders-note')
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setFoundersNote(data.message);
        }
      })
      .catch(err => console.error('Failed to fetch founders note:', err));
  }, []);

  useEffect(() => {
    // Show welcome message after brief delay
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(true);
    }, 500);

    return () => {
      clearTimeout(welcomeTimer);
    };
  }, []);

  const handleClose = async () => {
    setShowWelcome(false);
    
    // Gentle fade out
    setTimeout(async () => {
      setIsVisible(false);
      onComplete?.();
    }, 500);
    
    // Note: We're NOT fading out the audio anymore - let it play continuously
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Theme-colored background overlay */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${
          showWelcome ? 'opacity-40' : 'opacity-0'
        }`}
        style={{
          background: themeColors 
            ? `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 50%, ${backgroundColor}50 100%)`
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 50%, rgba(248, 250, 252, 0.5) 100%)'
        }}
      />

      {/* Welcome Home message */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div 
          className={`max-w-4xl w-full transition-all duration-1000 transform ${
            showWelcome 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <div className="relative">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-3 rounded-full transition-all hover:scale-110 pointer-events-auto"
              style={{
                background: `${backgroundColor}90`,
                border: `2px solid ${primaryColor}40`,
                color: primaryColor
              }}
              aria-label="Close welcome message"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* Main welcome text with enhanced visibility */}
            <div 
              className="inline-block px-12 py-8 rounded-3xl shadow-2xl border-4 backdrop-blur-md mb-4 w-full"
              style={{
                background: `linear-gradient(135deg, ${backgroundColor}95 0%, ${primaryColor}15 50%, ${secondaryColor}15 100%)`,
                borderColor: primaryColor + '60',
                boxShadow: `0 25px 50px ${primaryColor}40, 0 0 0 1px ${primaryColor}30`
              }}
            >
              <h1 
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-4 tracking-wide text-center"
                style={{ 
                  color: primaryColor,
                  textShadow: `3px 3px 6px ${primaryColor}50, 0 0 30px ${primaryColor}30`
                }}
              >
                Welcome Home
              </h1>
              
              {/* Subtitle */}
              <p 
                className="text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-6"
                style={{ 
                  color: secondaryColor,
                  textShadow: `2px 2px 4px ${secondaryColor}50, 0 0 15px ${secondaryColor}30`
                }}
              >
                @{username}
              </p>
              
              {/* Founder's Note */}
              {foundersNote && (
                <div 
                  className="mt-8 p-6 rounded-2xl mx-auto max-w-2xl"
                  style={{
                    background: `${backgroundColor}80`,
                    border: `1px solid ${primaryColor}30`
                  }}
                >
                  <h3 
                    className="text-lg font-semibold mb-3 flex items-center justify-center gap-2"
                    style={{ color: primaryColor }}
                  >
                    <span>💌</span> A Note from the Founder
                  </h3>
                  <p 
                    className="text-base sm:text-lg leading-relaxed text-center"
                    style={{ color: primaryColor + 'DD' }}
                  >
                    {foundersNote}
                  </p>
                </div>
              )}
              
              {/* Welcome Ring Invitation - Compact */}
              <div 
                className="mt-6 p-4 rounded-xl mx-auto max-w-lg text-center"
                style={{
                  background: `${primaryColor}10`,
                  border: `1px solid ${primaryColor}30`
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span>🎓</span>
                  <span 
                    className="font-semibold"
                    style={{ color: primaryColor }}
                  >
                    New to ThreadRings?
                  </span>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => window.location.href = '/tr/welcome'}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-105 pointer-events-auto"
                    style={{
                      background: primaryColor,
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    Start Tutorial
                  </button>
                  <button
                    onClick={() => window.location.href = '/threadrings'}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-105 pointer-events-auto"
                    style={{
                      background: 'transparent',
                      color: primaryColor,
                      border: `1px solid ${primaryColor}40`
                    }}
                  >
                    Browse Rings
                  </button>
                </div>
              </div>
            </div>
            
            {/* Sparkle effects around the text */}
            <div className="absolute -top-4 -right-4 text-2xl sm:text-4xl animate-bounce">✨</div>
            <div className="absolute -bottom-2 -left-4 text-xl sm:text-3xl animate-pulse">🏡</div>
            <div className="absolute top-1/2 -right-8 text-lg sm:text-2xl animate-ping">🌟</div>
            <div className="absolute bottom-1/4 -left-8 text-sm sm:text-xl animate-bounce" style={{ animationDelay: '0.5s' }}>✦</div>
            
            {/* Floating theme-colored particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div 
                className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full animate-float opacity-60"
                style={{ backgroundColor: primaryColor }}
              ></div>
              <div 
                className="absolute top-3/4 right-1/3 w-2 h-2 rounded-full animate-float-delay opacity-50"
                style={{ backgroundColor: secondaryColor }}
              ></div>
              <div 
                className="absolute bottom-1/3 left-1/2 w-2.5 h-2.5 rounded-full animate-float-slow opacity-70"
                style={{ backgroundColor: primaryColor }}
              ></div>
            </div>
            
            {/* Soft glow effect */}
            <div 
              className="absolute inset-0 blur-3xl opacity-20 -z-10"
              style={{
                background: `radial-gradient(circle, ${primaryColor}40, ${secondaryColor}20, transparent)`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Global audio context handles seamless continuation */}

      {/* Inject floating animations */}
      <style dangerouslySetInnerHTML={{ __html: `
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
      ` }} />
    </div>
  );
}