// components/ImprovedBadgeDisplay.tsx
import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Badge {
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  backgroundColor: string
  textColor: string
  threadRing: {
    id: string
    name: string
    slug: string
  }
}

// Global cache for badge data
const badgeCache = new Map<string, Badge[]>();
const badgeLoadingPromises = new Map<string, Promise<Badge[]>>();

async function loadUserBadgesWithCache(userId: string, context: 'posts' | 'comments'): Promise<Badge[]> {
  const cacheKey = `${userId}:${context}`;
  
  if (badgeCache.has(cacheKey)) {
    return badgeCache.get(cacheKey)!;
  }

  if (badgeLoadingPromises.has(cacheKey)) {
    return badgeLoadingPromises.get(cacheKey)!;
  }

  const loadingPromise = (async () => {
    try {
      const response = await fetch(`/api/users/badges-for-display?userId=${encodeURIComponent(userId)}&context=${context}`);
      
      let badges: Badge[] = [];
      if (response.ok) {
        const data = await response.json();
        badges = data.badges || [];
      }
      
      badgeCache.set(cacheKey, badges);
      return badges;
    } catch (err) {
      console.error('Failed to load badges:', err);
      badgeCache.set(cacheKey, []);
      return [];
    } finally {
      badgeLoadingPromises.delete(cacheKey);
    }
  })();

  badgeLoadingPromises.set(cacheKey, loadingPromise);
  return loadingPromise;
}

interface ImprovedBadgeDisplayProps {
  userId: string
  context: 'posts' | 'comments'
  className?: string
  layout?: 'inline' | 'compact' | 'tooltip' | 'showcase'
}

export default function ImprovedBadgeDisplay({ 
  userId, 
  context, 
  className = '',
  layout = 'compact'
}: ImprovedBadgeDisplayProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    let cancelled = false;

    const loadBadges = async () => {
      try {
        setLoading(true);
        const badges = await loadUserBadgesWithCache(userId, context);
        
        if (!cancelled) {
          setBadges(badges);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load badges:', err);
        if (!cancelled) {
          setBadges([]);
          setLoading(false);
        }
      }
    };

    loadBadges();

    return () => {
      cancelled = true;
    };
  }, [userId, context])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {layout === 'inline' ? (
          <div className="inline-flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
            <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
          </div>
        ) : (
          <div className="flex gap-1">
            <div className="w-12 h-6 bg-gray-200 rounded"></div>
            <div className="w-12 h-6 bg-gray-200 rounded"></div>
          </div>
        )}
      </div>
    )
  }

  if (badges.length === 0) {
    return null
  }

  // Inline layout - shows small indicators next to name
  if (layout === 'inline') {
    return (
      <div className={`inline-flex items-center gap-1 ml-2 ${className}`}>
        {badges.slice(0, 3).map((badge) => (
          <Link 
            key={badge.id} 
            href={`/tr/${badge.threadRing.slug}`}
            className="block"
            title={`Member of ${badge.threadRing.name}: ${badge.title}`}
          >
            {badge.imageUrl ? (
              <img
                src={badge.imageUrl}
                alt={badge.title}
                className="inline-badge-image object-contain hover:scale-110 transition-transform"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div 
                className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[8px] font-bold hover:scale-110 transition-transform"
                style={{ 
                  backgroundColor: badge.backgroundColor, 
                  color: badge.textColor 
                }}
              >
                {badge.title.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        ))}
        {badges.length > 3 && (
          <div className="text-xs text-gray-500 font-medium">
            +{badges.length - 3}
          </div>
        )}
      </div>
    )
  }

  // Tooltip layout - shows count with hover details
  if (layout === 'tooltip') {
    return (
      <div 
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="inline-flex items-center gap-1 ml-2 cursor-help">
          <div className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
            {badges.length}
          </div>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            {badges.length === 1 ? 'badge' : 'badges'}
          </span>
        </div>
        
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 shadow-lg">
            <div className="space-y-1">
              {badges.slice(0, 5).map((badge) => (
                <div key={badge.id} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: badge.backgroundColor }}
                  />
                  <span>{badge.threadRing.name}: {badge.title}</span>
                </div>
              ))}
              {badges.length > 5 && (
                <div className="text-gray-300">...and {badges.length - 5} more</div>
              )}
            </div>
            <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
    )
  }

  // Showcase layout - emphasizes custom badges with proper sizing
  if (layout === 'showcase') {
    return (
      <div className={`flex flex-wrap gap-2 mt-2 ${className}`}>
        {badges.map((badge) => (
          <Link 
            key={badge.id} 
            href={`/tr/${badge.threadRing.slug}`}
            className="block hover:scale-105 transition-transform"
            title={`Member of ${badge.threadRing.name}: ${badge.title}`}
          >
            {badge.imageUrl ? (
              <img
                src={badge.imageUrl}
                alt={badge.title}
                className="mobile-badge-showcase hover:shadow-md"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div 
                className="mobile-badge-showcase border border-gray-400 hover:shadow-md flex flex-col items-center justify-center text-center"
                style={{ 
                  backgroundColor: badge.backgroundColor, 
                  color: badge.textColor,
                  borderColor: badge.backgroundColor
                }}
              >
                <div className="text-xs font-bold leading-tight">
                  {badge.title}
                </div>
                {badge.subtitle && (
                  <div className="text-[10px] opacity-90 leading-tight">
                    {badge.subtitle}
                  </div>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    )
  }

  // Compact layout - improved version of current system
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${className}`}>
      {badges.slice(0, 4).map((badge) => (
        <Link 
          key={badge.id} 
          href={`/tr/${badge.threadRing.slug}`}
          className="block hover:scale-105 transition-transform"
          title={`Member of ${badge.threadRing.name}: ${badge.title}`}
        >
          {badge.imageUrl ? (
            <img
              src={badge.imageUrl}
              alt={badge.title}
              className="mobile-badge-compact-image hover:shadow-sm"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div 
              className="px-2 py-0.5 rounded text-xs font-medium border hover:shadow-sm mobile-badge-compact"
              style={{ 
                backgroundColor: badge.backgroundColor, 
                color: badge.textColor,
                borderColor: badge.backgroundColor
              }}
            >
              <div className="truncate max-w-16 sm:max-w-20">
                {badge.title}
              </div>
            </div>
          )}
        </Link>
      ))}
      {badges.length > 4 && (
        <div className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">
          +{badges.length - 4}
        </div>
      )}
    </div>
  )
}