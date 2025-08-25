// components/ProfileBadgeDisplay.tsx
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ThreadRing88x31Badge from './ThreadRing88x31Badge'

interface ProfileBadge {
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

interface ProfileBadgeDisplayProps {
  username: string
  className?: string
  showTitle?: boolean
  layout?: 'horizontal' | 'grid'
  maxBadges?: number
}

export default function ProfileBadgeDisplay({ 
  username, 
  className = '', 
  showTitle = true,
  layout = 'grid',
  maxBadges 
}: ProfileBadgeDisplayProps) {
  const [badges, setBadges] = useState<ProfileBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserBadges = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/badges`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setBadges([])
          return
        }
        throw new Error('Failed to load user badges')
      }

      const data = await response.json()
      setBadges(data.badges || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badges')
      setBadges([])
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    loadUserBadges()
  }, [username, loadUserBadges])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Failed to load badges
      </div>
    )
  }

  const displayBadges = maxBadges ? badges.slice(0, maxBadges) : badges

  if (displayBadges.length === 0) {
    return null
  }

  const badgeElements = displayBadges.map((badge) => (
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
        className="w-full"
      />
    </Link>
  ))

  return (
    <div className={className}>
      {showTitle && (
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          ThreadRing Badges
        </h3>
      )}
      
      {layout === 'horizontal' ? (
        <div className="flex flex-wrap gap-2">
          {badgeElements}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {badgeElements}
        </div>
      )}
      
      {maxBadges && badges.length > maxBadges && (
        <div className="mt-2 text-xs text-gray-500">
          +{badges.length - maxBadges} more badge{badges.length - maxBadges !== 1 ? 's' : ''}
        </div>
      )}
      
      {badges.length > 0 && (
        <div className="mt-3 text-center">
          <Link 
            href={`/resident/${username}/badges`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Full Badge Collection →
          </Link>
        </div>
      )}
    </div>
  )
}