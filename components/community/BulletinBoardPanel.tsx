import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getBulletinColor, type BulletinCategory } from '@/lib/helpers/bulletinHelpers';
import Link from 'next/link';
import UserQuickView from '@/components/ui/feedback/UserQuickView';

interface Bulletin {
  id: string;
  category: BulletinCategory;
  text: string;
  linkUrl: string | null;
  createdAt: string;
  expiresAt: string;
  user: {
    id: string;
    primaryHandle: string | null;
    profile: {
      displayName: string | null;
    } | null;
  };
}

interface BulletinsData {
  bulletins: Bulletin[];
}

export default function BulletinBoardPanel() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const { loggedIn } = useCurrentUser();

  useEffect(() => {
    fetchBulletins();
  }, []);

  const fetchBulletins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/community/bulletins?limit=5', {
        credentials: 'include'
      });

      if (response.ok) {
        const data: BulletinsData = await response.json();
        setBulletins(data.bulletins);
      }
    } catch (err) {
      console.error('Error fetching bulletins:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplay = (bulletin: Bulletin) => {
    return bulletin.user.profile?.displayName || bulletin.user.primaryHandle || 'Anonymous';
  };

  const getUsername = (bulletin: Bulletin): string | null => {
    if (!bulletin.user.primaryHandle) return null;
    // Strip @domain from primaryHandle (e.g., "user@homepageagain" -> "user")
    return bulletin.user.primaryHandle.split('@')[0];
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-bold text-[#2E4B3F] px-1">Bulletin Board</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-[#D4C4A8] rounded p-3 h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-bold text-[#2E4B3F] px-1">Bulletin Board</h3>
      </div>

      <p className="text-xs sm:text-sm text-[#5A5A5A] mb-3 px-1">
        Quick notes from around the neighborhood.
      </p>

      {bulletins.length === 0 ? (
        <div className="text-center py-6 px-3">
          <p className="text-sm text-[#5A5A5A] mb-3">
            The board is quiet right now.
          </p>
          <Link
            href="/bulletin"
            className="inline-block text-sm text-[#2E4B3F] hover:text-[#4FAF6D] font-medium transition-colors"
          >
            Be the first to post a note →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {bulletins.map((bulletin) => {
            const colorConfig = getBulletinColor(bulletin.category);
            const hasLink = !!bulletin.linkUrl;
            const username = getUsername(bulletin);

            return (
              <div
                key={bulletin.id}
                className={`${colorConfig.bg} border border-[#A18463] rounded p-2.5 shadow-sm ${
                  !hasLink && username ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                }`}
                onClick={() => {
                  if (!hasLink && username) {
                    setSelectedUsername(username);
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#2E4B3F]">
                        {colorConfig.label}
                      </span>
                      <span className="text-xs text-[#5A5A5A]">•</span>
                      <span className="text-xs text-[#5A5A5A]">
                        {getUserDisplay(bulletin)}
                      </span>
                    </div>
                    <p className="text-sm text-[#2F2F2F] line-clamp-2">
                      {bulletin.text}
                    </p>
                  </div>
                  {hasLink && (
                    <div className="flex-shrink-0">
                      <a
                        href={bulletin.linkUrl || '#'}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#2E4B3F] hover:text-[#4FAF6D] transition-colors"
                        title="Visit link"
                      >
                        →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#D4C4A8]">
        <Link
          href="/bulletin"
          className="text-xs sm:text-sm text-[#2E4B3F] hover:text-[#4FAF6D] font-medium transition-colors"
        >
          View full board →
        </Link>
        {loggedIn && (
          <Link
            href="/bulletin"
            className="text-xs sm:text-sm px-3 py-1.5 border border-[#A18463] rounded bg-[#FCFAF7] hover:bg-[#F5E9D4] transition-colors shadow-[1px_1px_0_#A18463] active:translate-x-[1px] active:translate-y-[1px]"
          >
            Post a note
          </Link>
        )}
      </div>

      {selectedUsername && (
        <UserQuickView
          username={selectedUsername}
          isOpen={!!selectedUsername}
          onClose={() => setSelectedUsername(null)}
        />
      )}
    </div>
  );
}
