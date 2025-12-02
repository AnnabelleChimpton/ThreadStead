import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSwipeGesture, SwipeDirection } from '../../hooks/useSwipeGesture';
import EnhancedHouseCanvas from './EnhancedHouseCanvas';

interface HomeDecoration {
  id: string;
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal';
  decorationId: string;
  variant?: string;
  size?: 'small' | 'medium' | 'large';
  x: number;
  y: number;
  layer: number;
  renderSvg?: string | null;
}

interface NeighborhoodMember {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  homeConfig: {
    houseTemplate: string;
    palette: string;
    seasonalOptIn: boolean;
    houseCustomizations?: {
      windowStyle?: string | null;
      doorStyle?: string | null;
      roofTrim?: string | null;
      wallColor?: string | null;
      roofColor?: string | null;
      trimColor?: string | null;
      windowColor?: string | null;
      detailColor?: string | null;
      houseTitle?: string | null;
      houseDescription?: string | null;
      houseBoardText?: string | null;
    };
    atmosphere?: {
      sky: string;
      weather: string;
      timeOfDay: string;
    };
    hasDecorations?: boolean;
    decorationCount?: number;
    decorations?: HomeDecoration[];
  };
  stats: {
    isActive: boolean;
  };
  connection?: {
    mutualRings?: number;
    mutualFriends?: number;
    isFollowing?: boolean;
  };
}

interface NeighborhoodCardViewProps {
  members: NeighborhoodMember[];
  currentUserId?: string;
  onCardChange?: (index: number) => void;
  onSwipeUp?: (member: NeighborhoodMember) => void;
  weatherData?: {
    temp: number;
    condition: string;
    icon: string;
  };
}

type CardState = 'current' | 'next' | 'prev' | 'hidden';
type CardAnimation = 'swiping-left' | 'swiping-right' | 'swiping-up' | 'entering-from-left' | 'entering-from-right' | null;

const NeighborhoodCardView: React.FC<NeighborhoodCardViewProps> = ({
  members,
  currentUserId,
  onCardChange,
  onSwipeUp,
  weatherData,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardStates, setCardStates] = useState<Map<number, CardState>>(new Map());
  const [cardAnimations, setCardAnimations] = useState<Map<number, CardAnimation>>(new Map());
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');
  const isAnimatingRef = useRef(false);

  // Determine time of day for parallax background
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) setTimeOfDay('morning');
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon');
    else if (hour >= 17 && hour < 20) setTimeOfDay('evening');
    else setTimeOfDay('night');
  }, []);

  // Initialize card states
  useEffect(() => {
    const newStates = new Map<number, CardState>();
    members.forEach((_, index) => {
      if (index === currentIndex) newStates.set(index, 'current');
      else if (index === currentIndex + 1) newStates.set(index, 'next');
      else if (index === currentIndex - 1) newStates.set(index, 'prev');
      else newStates.set(index, 'hidden');
    });
    setCardStates(newStates);
  }, [currentIndex, members]);

  const handleSwipeLeft = useCallback(() => {
    if (isAnimatingRef.current || currentIndex >= members.length - 1) return;

    isAnimatingRef.current = true;

    // Set animation for current card
    setCardAnimations(prev => new Map(prev).set(currentIndex, 'swiping-left'));

    // After animation completes, move to next card
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setCardAnimations(new Map());
      isAnimatingRef.current = false;

      if (onCardChange) {
        onCardChange(currentIndex + 1);
      }
    }, 300);
  }, [currentIndex, members.length, onCardChange]);

  const handleSwipeRight = useCallback(() => {
    if (isAnimatingRef.current || currentIndex <= 0) return;

    isAnimatingRef.current = true;

    // Set animation for current card
    setCardAnimations(prev => new Map(prev).set(currentIndex, 'swiping-right'));

    // After animation completes, move to previous card
    setTimeout(() => {
      setCurrentIndex(prev => prev - 1);
      setCardAnimations(new Map());
      isAnimatingRef.current = false;

      if (onCardChange) {
        onCardChange(currentIndex - 1);
      }
    }, 300);
  }, [currentIndex, onCardChange]);

  const handleSwipeUp = useCallback(() => {
    if (isAnimatingRef.current || !onSwipeUp) return;

    const currentMember = members[currentIndex];
    if (currentMember) {
      onSwipeUp(currentMember);
    }
  }, [currentIndex, members, onSwipeUp]);

  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const { ref, isDragging, dragOffset } = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeUp: handleSwipeUp,
    onSwipeMove: (deltaX, deltaY) => {
      setDragPosition({ x: deltaX, y: deltaY });
    },
    onSwipeEnd: () => {
      setDragPosition({ x: 0, y: 0 });
    },
    minSwipeDistance: 75,
    minSwipeVelocity: 0.4,
  });

  // Sky gradient based on time of day
  const skyGradients = {
    morning: 'from-blue-200 via-blue-100 to-yellow-50',
    afternoon: 'from-blue-400 via-blue-200 to-blue-100',
    evening: 'from-purple-400 via-pink-300 to-orange-200',
    night: 'from-indigo-900 via-blue-900 to-blue-800',
  };

  // Celestial body (sun/moon)
  const CelestialBody = () => {
    const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
    return (
      <div
        className="absolute top-12 right-16 text-6xl"
        style={{
          transform: `translateX(${currentIndex * -5}px)`,
          transition: 'transform 0.5s ease-out',
        }}
      >
        {isNight ? '🌙' : '☀️'}
      </div>
    );
  };

  // Ground gradient
  const GroundLayer = () => (
    <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-b from-green-600 via-green-500 to-green-700 pointer-events-none">
      {/* Grass texture */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]"></div>
      </div>
    </div>
  );

  if (members.length === 0) {
    return (
      <div className="card-view-container flex items-center justify-center min-h-[500px]">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium text-gray-700">No houses to explore</p>
          <p className="text-sm text-gray-600 mt-2">Check back later or adjust your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="card-view-container">
      {/* Progress Indicator */}
      <div className="card-progress-indicator">
        {currentIndex + 1} / {members.length}
      </div>

      {/* Weather Widget Overlay */}
      {weatherData && (
        <div className="card-weather-overlay">
          {/* Mobile: Icon only */}
          <div className="md:hidden">
            <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center shadow-md">
              <span className="text-2xl">{weatherData.icon}</span>
            </div>
          </div>
          {/* Desktop: Full weather info */}
          <div className="hidden md:block">
            <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{weatherData.icon}</span>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{weatherData.temp}°F</div>
                  <div className="text-xs text-gray-600">{weatherData.condition}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Stack */}
      <div className="card-stack">
        {members.map((member, index) => {
          const state = cardStates.get(index) || 'hidden';
          const animation = cardAnimations.get(index);
          const isCurrent = index === currentIndex;

          // Calculate transform for dragging
          let transform = '';
          if (isCurrent && isDragging) {
            const rotation = dragOffset.x * 0.02; // Subtle rotation based on drag
            transform = `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`;
          }

          return (
            <div
              key={member.userId}
              className={`neighborhood-card ${state} ${animation || ''} ${isDragging && isCurrent ? 'dragging' : ''}`}
              style={transform ? { transform } : undefined}
              aria-label={`House ${index + 1} of ${members.length}: ${member.displayName || member.username}`}
              role="article"
            >
              {/* Sky Background with Parallax */}
              <div className={`card-sky-background bg-gradient-to-b ${skyGradients[timeOfDay]}`}>
                <CelestialBody />
                {/* Static clouds for card view */}
                <div className="absolute top-20 left-10 text-3xl opacity-60">☁️</div>
                <div className="absolute top-32 right-20 text-2xl opacity-50">☁️</div>
                <div className="absolute top-24 left-1/3 text-3xl opacity-55">☁️</div>
              </div>

              {/* Ground Layer */}
              <GroundLayer />

              {/* House Container */}
              <div className="card-house-container">
                <div className="w-full flex justify-center overflow-visible">
                  <div className="scale-75 sm:scale-90 md:scale-100 origin-center">
                    <EnhancedHouseCanvas
                      template={member.homeConfig.houseTemplate as any}
                      palette={member.homeConfig.palette as any}
                      houseCustomizations={(member.homeConfig.houseCustomizations || {}) as any}
                      decorations={(member.homeConfig.decorations || []).map(dec => ({
                        id: dec.id,
                        name: dec.decorationId,
                        decorationId: dec.decorationId,
                        type: dec.decorationType,
                        zone: 'front_yard' as const,
                        position: { x: dec.x, y: dec.y, layer: dec.layer },
                        variant: dec.variant,
                        size: dec.size,
                        renderSvg: dec.renderSvg ?? undefined
                      }))}
                      atmosphere={member.homeConfig.atmosphere as any}
                    />
                  </div>
                </div>
              </div>

              {/* User Info Overlay */}
              <div className="card-user-info">
                <div className="card-user-info-content">
                  <h2 className="card-username">
                    {member.displayName || member.username}
                  </h2>
                  <p className="card-handle">@{member.username}</p>

                  {/* House Title Badge */}
                  {member.homeConfig.houseCustomizations?.houseTitle && (
                    <div className="card-badges">
                      <div className="inline-flex items-center px-2 py-1 rounded-full bg-thread-sage bg-opacity-20 text-thread-sage text-xs font-medium border border-thread-sage">
                        {member.homeConfig.houseCustomizations.houseTitle}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="card-stats">
                    {member.stats.isActive && (
                      <div className="card-stat-item">
                        <span className="text-green-400">●</span>
                        <span>Active</span>
                      </div>
                    )}
                    {member.homeConfig.decorationCount !== undefined && member.homeConfig.decorationCount > 0 && (
                      <div className="card-stat-item">
                        <span>🎨</span>
                        <span>{member.homeConfig.decorationCount} decorations</span>
                      </div>
                    )}
                    {member.connection?.mutualRings !== undefined && member.connection.mutualRings > 0 && (
                      <div className="card-stat-item">
                        <span>🔗</span>
                        <span>{member.connection.mutualRings} mutual rings</span>
                      </div>
                    )}
                  </div>

                  {/* Swipe Up Hint - More prominent */}
                  <div className="text-center mt-4" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black bg-opacity-60 backdrop-blur-sm rounded-full border border-white border-opacity-40">
                      <span className="text-white text-sm font-medium">Swipe up for details</span>
                      <span className="text-white text-lg animate-bounce">↑</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Touch Feedback Indicators */}
              {isDragging && isCurrent && (
                <>
                  <div className="swipe-hint-left text-white text-opacity-70">←</div>
                  <div className="swipe-hint-right text-white text-opacity-70">→</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NeighborhoodCardView;
