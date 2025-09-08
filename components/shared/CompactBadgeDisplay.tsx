// components/CompactBadgeDisplay.tsx
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ThreadRing88x31Badge from '../core/threadring/ThreadRing88x31Badge'

interface CompactBadge {
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  templateId?: string
  backgroundColor: string
  textColor: string
  threadRing: {
    id: string
    name: string
    slug: string
  }
}

// Global cache for badge data to prevent multiple API calls
const badgeCache = new Map<string, CompactBadge[]>();
const badgeLoadingPromises = new Map<string, Promise<CompactBadge[]>>();

// Cached badge loading function
async function loadUserBadgesWithCache(userId: string, context: 'posts' | 'comments'): Promise<CompactBadge[]> {
  const cacheKey = `${userId}:${context}`;
  
  // Return cached data if available
  if (badgeCache.has(cacheKey)) {
    return badgeCache.get(cacheKey)!;
  }

  // Return existing promise if already loading
  if (badgeLoadingPromises.has(cacheKey)) {
    return badgeLoadingPromises.get(cacheKey)!;
  }

  // Create new loading promise
  const loadingPromise = (async () => {
    try {
      const response = await fetch(`/api/users/badges-for-display?userId=${encodeURIComponent(userId)}&context=${context}`);
      
      let badges: CompactBadge[] = [];
      if (response.ok) {
        const data = await response.json();
        badges = data.badges || [];
      }
      
      // Cache the result
      badgeCache.set(cacheKey, badges);
      return badges;
    } catch (err) {
      console.error('Failed to load compact badges:', err);
      // Cache empty result to prevent retries
      badgeCache.set(cacheKey, []);
      return [];
    } finally {
      // Remove from loading promises
      badgeLoadingPromises.delete(cacheKey);
    }
  })();

  badgeLoadingPromises.set(cacheKey, loadingPromise);
  return loadingPromise;
}

interface CompactBadgeDisplayProps {
  userId: string
  context: 'posts' | 'comments'
  className?: string
  size?: 'small' | 'medium'
}

export default function CompactBadgeDisplay({ 
  userId, 
  context, 
  className = '',
  size = 'small'
}: CompactBadgeDisplayProps) {
  const [badges, setBadges] = useState<CompactBadge[]>([])
  const [loading, setLoading] = useState(true)

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
        console.error('Failed to load compact badges:', err);
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
      <div className={`animate-pulse flex space-x-1 ${className}`}>
        <div className={`bg-gray-200 rounded ${size === 'small' ? 'w-12 h-3' : 'w-16 h-4'}`}></div>
        <div className={`bg-gray-200 rounded ${size === 'small' ? 'w-12 h-3' : 'w-16 h-4'}`}></div>
      </div>
    )
  }

  if (badges.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges.map((badge) => (
        <Link 
          key={badge.id} 
          href={`/tr/${badge.threadRing.slug}`}
          className="block hover:scale-105 transition-transform duration-200"
          title={`Member of ${badge.threadRing.name}`}
        >
          <ThreadRing88x31Badge
            title={badge.title}
            subtitle={badge.subtitle}
            imageUrl={badge.imageUrl}
            templateId={badge.templateId}
            backgroundColor={badge.backgroundColor}
            textColor={badge.textColor}
            className={size === 'small' ? 'w-12 h-3 text-[6px]' : 'w-16 h-4 text-[8px]'}
          />
        </Link>
      ))}
    </div>
  )
}