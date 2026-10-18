import React from 'react';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import ButtonLink from '@/components/ui/ButtonLink';
import Button from '@/components/ui/Button';

interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional small icon above the title; most empty states don't need one */
  icon?: PixelIconName;
  /** A single link-button; for anything else pass `actions` */
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** Buttons or links under the text, e.g. two ButtonLinks */
  actions?: React.ReactNode;
  /** "card" (default): a notebook card. "plain": no frame, for inside a card or panel */
  variant?: 'card' | 'plain';
  /** Heading level for the title (default h3) */
  as?: 'h2' | 'h3' | 'p';
  className?: string;
}

/**
 * "Nothing here yet": a headline, the page's own explanation and,
 * when there's a next step, one button for it.
 */
export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  onAction,
  actions,
  variant = 'card',
  as: Heading = 'h3',
  className = ''
}: EmptyStateProps) {
  const frame = variant === 'card' ? 'thread-module p-4 sm:p-6 md:p-8' : 'p-6';
  const action =
    actions ??
    (actionLabel && actionHref ? (
      <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
    ) : actionLabel && onAction ? (
      <Button onClick={onAction}>{actionLabel}</Button>
    ) : null);

  return (
    <div className={`ts-empty ${frame} text-center ${className}`}>
      {icon && (
        <div className="flex justify-center mb-3 text-nb-ink-mid" aria-hidden="true">
          <PixelIcon name={icon} size={24} />
        </div>
      )}
      <Heading className="thread-headline text-lg font-bold mb-2">{title}</Heading>
      {description && (
        <div className="text-nb-ink max-w-prose mx-auto [&_p]:mb-2 [&_p:last-child]:mb-0">{description}</div>
      )}
      {action && <div className="flex flex-wrap justify-center gap-2 mt-4">{action}</div>}
    </div>
  );
}
