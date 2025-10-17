import React from 'react';
import Skeleton, { SkeletonAvatar, SkeletonText, SkeletonTag, SkeletonButton } from '../../ui/feedback/Skeleton';

/**
 * Loading skeleton for FeedPost component
 * Mirrors the structure and styling of a real post card
 */
export default function PostSkeleton() {
  return (
    <article className="bg-thread-paper border border-thread-sage/30 p-6 mb-4 rounded-cozy shadow-cozySm">
      {/* Author Info Header */}
      <header className="flex items-center gap-3 mb-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </header>

      {/* Post Title */}
      <div className="mb-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2" />
      </div>

      {/* Post Content */}
      <div className="mb-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <SkeletonTag />
        <SkeletonTag className="w-20" />
        <SkeletonTag className="w-14" />
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-thread-sage/20 pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </footer>
    </article>
  );
}

/**
 * Container component for multiple post skeletons
 * Shows a loading state for the feed with 3-4 skeleton posts
 */
export function PostSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-0" role="status" aria-label="Loading posts">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
      <span className="sr-only">Loading posts...</span>
    </div>
  );
}
