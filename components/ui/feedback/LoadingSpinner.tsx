import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  /** "row" puts the icon beside the text (inline in lists and buttons) */
  layout?: 'stack' | 'row';
  /** "inherit" takes the surrounding text colour (profile pages, where the owner's CSS sets it) */
  tone?: 'muted' | 'inherit';
  className?: string;
}

const ICON_SIZES = { sm: 12, md: 16, lg: 24 };
const TEXT_SIZES = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

/**
 * The one loading indicator: a pixel reload icon (it only turns when the
 * visitor allows motion) and the page's own words. Announced politely.
 */
export default function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  layout = 'stack',
  tone = 'muted',
  className = ''
}: LoadingSpinnerProps) {
  const arrangement = layout === 'row' ? 'flex-row gap-2' : 'flex-col gap-2';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`ts-loading flex items-center justify-center ${tone === 'muted' ? 'text-nb-ink-mid' : ''} ${arrangement} ${className}`}
    >
      <span className="motion-safe:animate-spin inline-flex" aria-hidden="true">
        <PixelIcon name="reload" size={ICON_SIZES[size]} />
      </span>
      <span className={TEXT_SIZES[size]}>{message}</span>
    </div>
  );
}

/** A loading block that holds roughly the space of what's coming */
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return <LoadingSpinner size="lg" message={message} className="min-h-[40vh] py-12" />;
}

/** In-card loading: a notebook card with the indicator centred */
export function CardLoading({ message = 'Loading...', className = '' }: { message?: string; className?: string }) {
  return (
    <div className={`thread-module ${className}`}>
      <LoadingSpinner message={message} className="py-8" />
    </div>
  );
}
