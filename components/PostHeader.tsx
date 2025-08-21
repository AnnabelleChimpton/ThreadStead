// components/PostHeader.tsx
import React from 'react'
import Link from 'next/link'
import PostAuthor from './PostAuthor'

interface PostHeaderProps {
  post: {
    id: string
    title?: string | null
    intent?: string | null
    author?: { 
      id: string
      primaryHandle?: string
      profile?: { displayName?: string } 
    }
  }
  className?: string
}

export default function PostHeader({ post, className = '' }: PostHeaderProps) {
  const { title = 'Untitled Post', intent, author } = post
  const username = author?.primaryHandle?.split('@')[0]

  // Determine if we should link the title to the post page
  const canLinkToPost = username && author?.primaryHandle

  const titleElement = (
    <h2 className="text-xl font-semibold text-black leading-tight">
      {title}
    </h2>
  )

  const titleWithLink = canLinkToPost ? (
    <Link 
      href={`/resident/${username}/post/${post.id}`}
      className="block hover:bg-gray-50 -m-2 p-2 rounded transition-colors"
    >
      {titleElement}
    </Link>
  ) : titleElement

  return (
    <div className={`blog-post-title mb-3 ${className}`}>
      {intent ? (
        <div className="space-y-1">
          <PostAuthor 
            author={author} 
            intent={intent}
            showBadges={true}
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
          />
        </div>
      )}
    </div>
  )
}