import React from 'react';
import Link from 'next/link';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  emoji?: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  variant?: 'warning' | 'error' | 'info';
  className?: string;
}

export default function ErrorDisplay({
  title = 'Something went wrong',
  message,
  emoji = '⚠️',
  actionLabel,
  actionHref,
  onRetry,
  variant = 'error',
  className = ''
}: ErrorDisplayProps) {
  const variantClasses = {
    error: 'border-red-400 bg-red-100 text-red-700',
    warning: 'border-yellow-400 bg-yellow-100 text-yellow-700',
    info: 'border-blue-400 bg-blue-100 text-blue-700'
  };

  return (
    <div className={`border rounded-lg shadow-[2px_2px_0_#000] p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0" role="img" aria-hidden="true">
          {emoji}
        </span>
        <div className="flex-1">
          <h3 className="font-medium text-sm mb-1">{title}</h3>
          <p className="text-sm mb-3">{message}</p>

          {(actionHref || onRetry) && (
            <div className="flex gap-2">
              {actionHref && actionLabel && (
                <Link
                  href={actionHref}
                  className="inline-block px-3 py-1 bg-white border border-current rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  {actionLabel}
                </Link>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-block px-3 py-1 bg-white border border-current rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  🔄 Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Specialized error components for common use cases
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Connection Problem"
      message="We're having trouble connecting to our servers. Please check your internet connection and try again."
      emoji="📶"
      onRetry={onRetry}
      variant="warning"
    />
  );
}

export function NotFoundError({
  resourceName = 'page',
  homeHref = '/'
}: {
  resourceName?: string;
  homeHref?: string;
}) {
  return (
    <ErrorDisplay
      title={`${resourceName} not found`}
      message={`Sorry, we couldn't find the ${resourceName} you're looking for. It may have been moved or deleted.`}
      emoji="🔍"
      actionLabel="🏠 Go Home"
      actionHref={homeHref}
      variant="info"
    />
  );
}

export function PermissionError({
  message = "You don't have permission to access this resource.",
  loginHref = '/login'
}: {
  message?: string;
  loginHref?: string;
}) {
  return (
    <ErrorDisplay
      title="Access Denied"
      message={message}
      emoji="🔒"
      actionLabel="🔑 Sign In"
      actionHref={loginHref}
      variant="warning"
    />
  );
}