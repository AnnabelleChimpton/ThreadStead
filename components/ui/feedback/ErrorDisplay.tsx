import React from 'react';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';

interface ErrorDisplayProps {
  title?: React.ReactNode;
  message?: React.ReactNode;
  icon?: PixelIconName;
  /** A link out (e.g. "Sign in") */
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** "error" (sunset edge) or "notice" for a softer can't-do-that (sky edge) */
  variant?: 'error' | 'notice';
  className?: string;
}

/**
 * Something didn't load or isn't allowed: a notebook card with a coloured
 * left edge (matches the toasts), the page's own words, and a retry or a
 * link when there's something to do about it.
 */
export default function ErrorDisplay({
  title = 'Something went wrong',
  message,
  icon = 'alert',
  actionLabel,
  actionHref,
  onRetry,
  retryLabel = 'Try again',
  variant = 'error',
  className = ''
}: ErrorDisplayProps) {
  const edge = variant === 'error' ? 'border-l-thread-sunset' : 'border-l-thread-sky';
  const iconColor = variant === 'error' ? 'text-nb-rose-ink' : 'text-nb-ink-mid';

  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={`ts-error flex items-start gap-3 bg-nb-paper text-nb-ink border-2 border-nb-ink-mid border-l-8 ${edge} rounded-cozy shadow-nb-sm p-4 ${className}`}
    >
      <span className={`flex-shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true">
        <PixelIcon name={icon} size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold">{title}</p>
        {message && <div className="text-sm mt-1 [&_p]:mb-1">{message}</div>}
        {((actionHref && actionLabel) || onRetry) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
            {actionHref && actionLabel && (
              <ButtonLink href={actionHref} size="sm" variant={onRetry ? 'secondary' : 'primary'}>
                {actionLabel}
              </ButtonLink>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
