/**
 * Surprise Me Button Component
 * A fun discovery button inspired by StumbleUpon and old web surfing
 */

import { useState } from 'react';

interface SurpriseMeButtonProps {
  className?: string;
  mode?: 'search' | 'curated' | 'mixed';
  onBeforeSurprise?: () => void;
}

export default function SurpriseMeButton({
  className = '',
  mode = 'mixed',
  onBeforeSurprise
}: SurpriseMeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSurprise, setLastSurprise] = useState<any>(null);

  const handleSurprise = async () => {
    if (isLoading) return;

    // Call callback if provided (e.g., to close modals)
    onBeforeSurprise?.();

    setIsLoading(true);

    try {
      const response = await fetch(`/api/extsearch/surprise?mode=${mode}`);
      if (response.ok) {
        const data = await response.json();

        if (data.surprise?.url) {
          setLastSurprise(data.surprise);

          // Open in new tab (classic web surfing style)
          window.open(data.surprise.url, '_blank');

          // Optional: Show a toast or modal with info about the site
          if (data.message) {
            console.log(data.message, data.surprise.title);
          }
        }
      }
    } catch (error) {
      console.error('Surprise failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed button text
  const buttonText = '🎲 Surprise Me!';

  return (
    <div className={`inline-block ${className}`}>
      <button
        onClick={handleSurprise}
        disabled={isLoading}
        className={`
          relative px-5 py-2
          bg-gradient-to-r from-purple-500 to-pink-500
          hover:from-purple-600 hover:to-pink-600
          text-white font-bold rounded-lg
          shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000]
          hover:translate-x-[1px] hover:translate-y-[1px]
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          transform active:scale-95
          ${isLoading ? 'animate-pulse' : ''}
        `}
        title="Discover a random interesting website!"
      >
        <span className="flex items-center gap-2">
          {isLoading ? (
            <>
              <span className="animate-spin">🎲</span>
              <span>Finding something cool...</span>
            </>
          ) : (
            buttonText
          )}
        </span>
      </button>

      {/* Optional: Show last surprise info */}
      {lastSurprise && !isLoading && (
        <div className="mt-2 text-xs text-gray-600 text-center">
          Last find: <span className="font-medium">{lastSurprise.title}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for embedding in search bars
 */
export function SurpriseMeButtonCompact({
  onBeforeSurprise,
  mode = 'mixed'
}: {
  onBeforeSurprise?: () => void;
  mode?: 'threadstead' | 'curated' | 'mixed';
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSurprise = async () => {
    if (isLoading) return;

    onBeforeSurprise?.();
    setIsLoading(true);

    try {
      if (mode === 'threadstead') {
        // For ThreadStead mode, get a random local content
        const surpriseType = Math.random();

        if (surpriseType < 0.33) {
          // Random ThreadRing
          const response = await fetch('/api/threadrings?limit=20&sortBy=random');
          if (response.ok) {
            const data = await response.json();
            if (data.threadrings && data.threadrings.length > 0) {
              const randomRing = data.threadrings[Math.floor(Math.random() * data.threadrings.length)];
              window.open(`/rings/${randomRing.slug}`, '_blank');
            }
          }
        } else if (surpriseType < 0.66) {
          // Random user profile
          const response = await fetch('/api/directory?limit=20&sortBy=random');
          if (response.ok) {
            const data = await response.json();
            if (data.users && data.users.length > 0) {
              const randomUser = data.users[Math.floor(Math.random() * data.users.length)];
              window.open(`/resident/${randomUser.handle}`, '_blank');
            }
          }
        } else {
          // Random post
          const response = await fetch('/api/feed/trending?limit=20');
          if (response.ok) {
            const data = await response.json();
            if (data.posts && data.posts.length > 0) {
              const randomPost = data.posts[Math.floor(Math.random() * data.posts.length)];
              window.open(`/resident/${randomPost.author.handle}/post/${randomPost.id}`, '_blank');
            }
          }
        }
      } else {
        // For curated/mixed mode, use the external surprise API
        const response = await fetch(`/api/extsearch/surprise?mode=${mode === 'curated' ? 'curated' : 'mixed'}`);
        if (response.ok) {
          const data = await response.json();
          if (data.surprise?.url) {
            window.open(data.surprise.url, '_blank');
          }
        }
      }
    } catch (error) {
      console.error('Surprise failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTooltip = () => {
    if (mode === 'threadstead') {
      return "Surprise me with random ThreadStead content!";
    } else if (mode === 'curated') {
      return "Surprise me with a random indie website!";
    }
    return "Surprise me with something interesting!";
  };

  const getButtonStyle = () => {
    if (mode === 'threadstead') {
      // ThreadStead mode: blue gradient
      return `
        bg-gradient-to-r from-blue-500 to-cyan-500
        hover:from-blue-600 hover:to-cyan-600
        shadow-[2px_2px_0_#2563eb]
        hover:shadow-[1px_1px_0_#2563eb]
      `;
    } else {
      // Web mode: purple-pink gradient
      return `
        bg-gradient-to-r from-purple-500 to-pink-500
        hover:from-purple-600 hover:to-pink-600
        shadow-[2px_2px_0_#8b5cf6]
        hover:shadow-[1px_1px_0_#8b5cf6]
      `;
    }
  };

  return (
    <button
      onClick={handleSurprise}
      disabled={isLoading}
      className={`
        px-3 py-2
        ${getButtonStyle()}
        text-white font-medium text-sm rounded-lg
        hover:translate-x-[1px] hover:translate-y-[1px]
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isLoading ? 'animate-pulse' : ''}
      `}
      title={getTooltip()}
    >
      {isLoading ? '🎲' : '✨'} Surprise!
    </button>
  );
}