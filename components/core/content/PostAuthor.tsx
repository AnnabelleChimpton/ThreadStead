// components/PostAuthor.tsx
import React from 'react'
import Link from 'next/link'
import ImprovedBadgeDisplay from '../../shared/ImprovedBadgeDisplay'
import { UserWithRole } from '@/lib/utils/features/feature-flags'

interface PostAuthorProps {
  author?: { 
    id: string
    primaryHandle?: string
    profile?: { displayName?: string } 
  }
  intent?: string | null
  showBadges?: boolean
  badgeLayout?: 'inline' | 'compact' | 'tooltip' | 'showcase'
  className?: string
  currentUser?: UserWithRole | null
}

export default function PostAuthor({ 
  author, 
  intent, 
  showBadges = true,
  badgeLayout = 'showcase',
  className = '',
  currentUser
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
      {showBadges && author.id && (
        <ImprovedBadgeDisplay 
          userId={author.id} 
          context="posts" 
          layout={badgeLayout}
        />
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