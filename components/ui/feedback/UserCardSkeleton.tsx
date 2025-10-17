import React from 'react';
import Skeleton, { SkeletonAvatar, SkeletonButton } from './Skeleton';

/**
 * Loading skeleton for UserCard component
 * Mirrors the structure and styling of a real user card in the directory
 */
export default function UserCardSkeleton() {
  return (
    <div className="user-card bg-thread-paper border border-thread-sage/30 p-5 rounded-cozy shadow-cozySm h-full flex flex-col">
      {/* Header with Avatar and Name */}
      <div className="flex items-start gap-4 mb-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Bio */}
      <div className="mb-4 flex-grow space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Stats */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Join Date */}
      <div className="mb-4 pt-3 border-t border-thread-sage/20">
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Action Button */}
      <div className="mt-auto">
        <SkeletonButton className="w-full" />
      </div>
    </div>
  );
}

/**
 * Grid container for multiple user card skeletons
 * Shows a loading state for the directory with 6 skeleton cards
 */
export function UserCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      role="status"
      aria-label="Loading residents"
    >
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading residents...</span>
    </div>
  );
}
