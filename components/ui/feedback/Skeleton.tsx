import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rectangle';
  width?: string;
  height?: string;
  shimmer?: boolean;
}

/**
 * Base Skeleton component for loading states
 * Matches ThreadStead's retro/cozy design aesthetic
 */
export default function Skeleton({
  className = '',
  variant = 'rectangle',
  width,
  height,
  shimmer = true
}: SkeletonProps) {
  const baseClasses = 'bg-thread-cream/70 animate-pulse';

  const variantClasses = {
    text: 'rounded h-4',
    circle: 'rounded-full',
    rectangle: 'rounded-cozy'
  };

  const shimmerClasses = shimmer ? 'skeleton-shimmer' : '';

  const style: React.CSSProperties = {
    ...(width && { width }),
    ...(height && { height })
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${shimmerClasses} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Specialized skeleton components for common patterns

/**
 * Skeleton for text lines with varying widths
 */
export function SkeletonText({
  lines = 1,
  className = ''
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for avatar/profile images
 */
export function SkeletonAvatar({
  size = 'md',
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <Skeleton
      variant="circle"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}

/**
 * Skeleton for buttons
 */
export function SkeletonButton({
  className = ''
}: {
  className?: string;
}) {
  return (
    <Skeleton
      className={`h-10 w-32 ${className}`}
    />
  );
}

/**
 * Skeleton for tags/pills
 */
export function SkeletonTag({
  className = ''
}: {
  className?: string;
}) {
  return (
    <Skeleton
      className={`h-6 w-16 rounded-full ${className}`}
    />
  );
}
