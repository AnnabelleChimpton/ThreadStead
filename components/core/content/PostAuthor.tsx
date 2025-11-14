// components/PostAuthor.tsx
import React from 'react'
import ImprovedBadgeDisplay from '../../shared/ImprovedBadgeDisplay'
import { UserWithRole } from '@/lib/utils/features/feature-flags'
import UserMention from '@/components/ui/navigation/UserMention'

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
  badgeLayout = 'inline',
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

  if (username) {
    return (
      <div className={`block -m-1 p-1 rounded ${className}`}>
        <div className="text-sm text-gray-600">
          <UserMention
            username={username}
            displayName={displayName}
            className="font-medium"
          />
          {intent && <span> is {intent}</span>}
        </div>
        {showBadges && author.id && (
          <ImprovedBadgeDisplay
            userId={author.id}
            context="posts"
            layout={badgeLayout}
          />
        )}
      </div>
    )
  }

  return (
    <div className={className}>
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
    </div>
  )
}