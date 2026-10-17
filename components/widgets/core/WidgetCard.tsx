import React from 'react';
import { WidgetSize } from '../types/widget';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface WidgetCardProps {
  title: string;
  size: WidgetSize;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  children: React.ReactNode;
}

// The card frame comes from BaseWidget's .widget-container; this only lays
// out the header and body using the site theme's widget-* hooks.
export default function WidgetCard({
  title,
  size,
  isLoading = false,
  error = null,
  onRefresh,
  children
}: WidgetCardProps) {
  return (
    <div className="widget-card h-fit w-full max-w-full overflow-hidden">
      <div className="widget-header flex items-center gap-2 mb-2">
        <h3 className="widget-title font-headline text-base font-bold leading-tight text-nb-ink">{title}</h3>
        {onRefresh && (
          <div className="widget-actions ml-auto flex">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="ts-icon-button disabled:opacity-50"
              aria-label="Refresh widget"
            >
              <PixelIcon name="reload" size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="widget-body widget-content">
        {error ? (
          <div className="text-center py-4">
            <div className="text-thread-sunset text-sm mb-2">{error}</div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="thread-button text-xs"
              >
                Try again
              </button>
            )}
          </div>
        ) : isLoading ? (
          <div className="text-center py-4 thread-label">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
