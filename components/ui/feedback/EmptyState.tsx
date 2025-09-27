import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'first-time' | 'encouraging';
  className?: string;
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
  className = ''
}: EmptyStateProps) {
  const variantStyles = {
    default: {
      container: 'bg-gray-50 border-gray-200 text-gray-600',
      title: 'text-gray-800',
      action: 'bg-blue-200 hover:bg-blue-100 border-black text-gray-800'
    },
    'first-time': {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      title: 'text-yellow-800',
      action: 'bg-yellow-200 hover:bg-yellow-100 border-black text-yellow-800'
    },
    encouraging: {
      container: 'bg-green-50 border-green-200 text-green-700',
      title: 'text-green-800',
      action: 'bg-green-200 hover:bg-green-100 border-black text-green-800'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`p-8 rounded-lg border-2 text-center space-y-4 ${styles.container} ${className}`}>
      <div className="text-4xl mb-2">{icon}</div>
      <h3 className={`text-lg font-medium ${styles.title}`}>{title}</h3>
      <p className="text-sm max-w-sm mx-auto">{description}</p>

      {(actionLabel && (actionHref || onAction)) && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className={`inline-block px-4 py-2 rounded font-medium text-sm shadow-[2px_2px_0_#000] transition-all transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] ${styles.action}`}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className={`inline-block px-4 py-2 rounded font-medium text-sm shadow-[2px_2px_0_#000] transition-all transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] ${styles.action}`}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized empty state components for common scenarios
export function FirstPostEmptyState({ username }: { username?: string }) {
  return (
    <EmptyState
      icon="✍️"
      title="Ready for your first post?"
      description={`${username ? `Welcome ${username}! ` : ''}Share something with the community to get started. Introduce yourself, share a project, or just say hello!`}
      actionLabel="Create Your First Post"
      actionHref="/post/new"
      variant="first-time"
    />
  );
}

export function NoPostsEmptyState() {
  return (
    <EmptyState
      icon="📝"
      title="No posts yet"
      description="This user hasn't shared anything yet. Check back later or explore other profiles!"
      actionLabel="Explore More Profiles"
      actionHref="/directory"
      variant="default"
    />
  );
}

export function NoHomesEmptyState() {
  return (
    <EmptyState
      icon="🏠"
      title="No homes to explore yet"
      description="The neighborhood is still growing! Be one of the first to create a pixel home."
      actionLabel="Create Your Home"
      actionHref="/home/create"
      variant="encouraging"
    />
  );
}

export function NoThreadRingsEmptyState() {
  return (
    <EmptyState
      icon="💍"
      title="No ThreadRings yet"
      description="Communities are forming! Create the first ThreadRing around your interests."
      actionLabel="Create a ThreadRing"
      actionHref="/threadrings/create"
      variant="encouraging"
    />
  );
}

export function NoBookmarksEmptyState() {
  return (
    <EmptyState
      icon="🔖"
      title="No bookmarks saved"
      description="When you find posts you love, bookmark them to save for later. Start exploring to find interesting content!"
      actionLabel="Explore Posts"
      actionHref="/feed"
      variant="default"
    />
  );
}

export function NoGuestbookEntriesEmptyState({ isOwner = false }: { isOwner?: boolean }) {
  if (isOwner) {
    return (
      <EmptyState
        icon="📝"
        title="Your guestbook is empty"
        description="When visitors leave messages on your profile, they'll appear here. Share your profile link to get your first entry!"
        actionLabel="Share Your Profile"
        onAction={() => {
          if (navigator.share) {
            navigator.share({ url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
        variant="encouraging"
      />
    );
  }

  return (
    <EmptyState
      icon="✨"
      title="Be the first to sign their guestbook!"
      description="Leave a friendly message to let them know you visited."
      actionLabel="Sign Guestbook"
      onAction={() => {
        document.getElementById('guestbook-form')?.scrollIntoView({ behavior: 'smooth' });
      }}
      variant="encouraging"
    />
  );
}