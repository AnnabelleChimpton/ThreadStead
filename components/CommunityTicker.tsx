import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { PixelIcon } from '@/components/ui/PixelIcon';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';

interface TickerItem {
  id: string;
  text: string;
  type: 'poll' | 'bulletin' | 'announcement' | 'empty';
  icon: 'chart' | 'chat' | 'speaker' | 'pin';
}

// Shown when there are no polls, bulletins or announcements to scroll
const EMPTY_ITEM: TickerItem = {
  id: 'empty',
  text: 'Quiet on the street. Pin a note to the bulletin board →',
  type: 'empty',
  icon: 'pin'
};

export default function CommunityTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Set client flag for hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch community data
  useEffect(() => {
    if (!isClient) return;

    const fetchCommunityData = async () => {
      try {
        const [pollsRes, bulletinsRes, announcementsRes] = await Promise.all([
          fetch('/api/polls', { credentials: 'include' }),
          fetch('/api/community/bulletins?limit=5', { credentials: 'include' }),
          fetch('/api/site-news?limit=5', { credentials: 'include' })
        ]);

        const tickerItems: TickerItem[] = [];

        // Add active polls
        if (pollsRes.ok) {
          const pollsData = await pollsRes.json();
          const activePolls = pollsData.polls?.filter((p: any) => !p.isClosed).slice(0, 3) || [];
          activePolls.forEach((poll: any) => {
            tickerItems.push({
              id: `poll-${poll.id}`,
              text: `Poll: ${poll.question}`,
              type: 'poll',
              icon: 'chart'
            });
          });
        }

        // Add recent bulletins
        if (bulletinsRes.ok) {
          const bulletinsData = await bulletinsRes.json();
          const bulletins = bulletinsData.bulletins?.slice(0, 3) || [];
          bulletins.forEach((bulletin: any) => {
            const categoryLabel = getCategoryLabel(bulletin.category);
            tickerItems.push({
              id: `bulletin-${bulletin.id}`,
              text: `${categoryLabel}: ${bulletin.text}`,
              type: 'bulletin',
              icon: 'chat'
            });
          });
        }

        // Add recent announcements
        if (announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          const announcements = announcementsData.news?.slice(0, 3) || [];
          announcements.forEach((announcement: any) => {
            tickerItems.push({
              id: `announcement-${announcement.id}`,
              text: announcement.title,
              type: 'announcement',
              icon: 'speaker'
            });
          });
        }

        if (tickerItems.length === 0) {
          setItems([EMPTY_ITEM]);
          return;
        }

        // Shuffle all items for variety
        const shuffled = tickerItems.sort(() => Math.random() - 0.5);
        setItems(shuffled);
      } catch (err) {
        console.error('Error fetching community data for ticker:', err);
      }
    };

    fetchCommunityData();

    // Refresh every 5 minutes
    const refreshInterval = setInterval(fetchCommunityData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [isClient]);

  // Helper function
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'looking_for': 'Looking For',
      'offering': 'Offering',
      'event': 'Event',
      'announcement': 'Announcement',
      'discussion': 'Discussion'
    };
    return labels[category] || category;
  };

  const handleClick = () => {
    router.push('/community');
  };

  // Don't render during SSR to avoid hydration issues
  if (!isClient) {
    return (
      <div className="w-full mb-6">
        <div className="bg-nb-paper border-2 border-nb-ink-mid rounded-cozy shadow-nb-sm p-3">
          <LoadingSpinner layout="row" message="Loading community activity..." className="justify-start" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  // Duplicate items for seamless infinite scroll
  const displayItems = [...items, ...items];

  // Scale scroll speed with content so short lists don't crawl
  const scrollDuration = Math.max(30, items.length * 15);

  return (
    <div className="w-full mb-6">
      <div
        className="bg-nb-paper border-2 border-nb-ink-mid rounded-cozy shadow-nb-sm overflow-hidden cursor-pointer ticker-shell"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
        aria-label="View community activity"
      >
        <div className="relative py-3 px-4 overflow-hidden">
          <div
            className="flex items-center gap-64 whitespace-nowrap text-sm text-nb-ink animate-scroll"
            style={{ animationDuration: `${scrollDuration}s` }}
          >
            {displayItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center gap-2">
                <PixelIcon name={item.icon} size={16} className="text-nb-ink-mid flex-shrink-0" />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll linear infinite;
        }
        .ticker-shell:hover .animate-scroll {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-scroll {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
