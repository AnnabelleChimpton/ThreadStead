// components/PostAuthor.tsx
import React from 'react'
import Link from 'next/link'
import CompactBadgeDisplay from './CompactBadgeDisplay'
import { featureFlags } from '@/lib/feature-flags'

interface PostAuthorProps {
  author?: { 
    id: string
    primaryHandle?: string
    profile?: { displayName?: string } 
  }
  intent?: string | null
  showBadges?: boolean
  badgeSize?: 'small' | 'medium'
  className?: string
}

export default function PostAuthor({ 
  author, 
  intent, 
  showBadges = true,
  badgeSize = 'small',
  className = '' 
}: PostAuthorProps) {
  if (!author) {
    return (
      <div className={`text-sm text-gray-600 ${className}`}>
        <span className="font-medium">Anonymous</span>
        {intent && <span> is {intent}</span>}
      </div>
    )
  }

  const displayName = author.profile?.displayName || author.primaryHandle?.split('@')[0] || 'User'
  const username = author.primaryHandle?.split('@')[0]

  const content = (
    <>
      <div className="text-sm text-gray-600">
        <span className="font-medium">{displayName}</span>
        {intent && <span> is {intent}</span>}
      </div>
      {featureFlags.threadrings() && showBadges && author.id && (
        <div className="mt-1">
          <CompactBadgeDisplay 
            userId={author.id} 
            context="posts" 
            size={badgeSize}
          />
        </div>
      )}
    </>
  )

  if (username) {
    return (
      <Link 
        href={`/resident/${username}`}
        className={`block hover:bg-gray-50 -m-1 p-1 rounded transition-colors ${className}`}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={className}>
      {content}
    </div>
  )
}