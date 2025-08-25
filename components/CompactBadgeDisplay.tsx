// components/CompactBadgeDisplay.tsx
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ThreadRing88x31Badge from './ThreadRing88x31Badge'

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
    loadUserBadges()
  }, [userId, context])

  const loadUserBadges = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/users/badges-for-display?userId=${encodeURIComponent(userId)}&context=${context}`)
      
      if (response.ok) {
        const data = await response.json()
        setBadges(data.badges || [])
      }
    } catch (err) {
      console.error('Failed to load compact badges:', err)
      setBadges([])
    } finally {
      setLoading(false)
    }
  }

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