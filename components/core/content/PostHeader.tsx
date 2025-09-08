// components/PostHeader.tsx
import React from 'react'
import Link from 'next/link'
import PostAuthor from './PostAuthor'
import { UserWithRole } from '@/lib/utils/features/feature-flags'

interface PostHeaderProps {
  post: {
    id: string
    title?: string | null
    intent?: string | null
    isExternal?: boolean
    externalUrl?: string
    author?: { 
      id: string
      primaryHandle?: string
      profile?: { displayName?: string } 
    }
  }
  className?: string
  currentUser?: UserWithRole | null
}

export default function PostHeader({ post, className = '', currentUser }: PostHeaderProps) {
  const { title = 'Untitled Post', intent, author, isExternal, externalUrl } = post
  const username = author?.primaryHandle?.split('@')[0]

  // Determine if we should link the title to the post page
  const canLinkToLocalPost = username && author?.primaryHandle && !isExternal
  const canLinkToExternalPost = isExternal && externalUrl

  const titleElement = (
    <h2 className="text-xl font-semibold text-black leading-tight">
      {title}
      {isExternal && <span className="ml-2 text-sm text-gray-500">↗</span>}
    </h2>
  )

  const titleWithLink = canLinkToLocalPost ? (
    <Link 
      href={`/resident/${username}/post/${post.id}`}
      className="block hover:bg-gray-50 -m-2 p-2 rounded transition-colors"
    >
      {titleElement}
    </Link>
  ) : canLinkToExternalPost ? (
    <a 
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block hover:bg-gray-50 -m-2 p-2 rounded transition-colors"
    >
      {titleElement}
    </a>
  ) : titleElement

  return (
    <div className={`blog-post-title mb-3 ${className}`}>
      {intent ? (
        <div className="space-y-1">
          <PostAuthor 
            author={author} 
            intent={intent}
            showBadges={true}
            currentUser={currentUser}
          />
          {titleWithLink}
        </div>
      ) : (
        <div className="space-y-1">
          {titleWithLink}
          <PostAuthor 
            author={author} 
            intent={null}
            showBadges={true}
            currentUser={currentUser}
          />
        </div>
      )}
    </div>
  )
}