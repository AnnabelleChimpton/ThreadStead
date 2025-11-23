import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface TickerItem {
  id: string;
  text: string;
  type: 'poll' | 'bulletin' | 'announcement' | 'fun';
  icon: 'chart' | 'chat' | 'speaker' | 'users' | 'lightbulb' | 'gift' | 'heart';
}

// Fun random phrases to mix in
const funPhrases: Array<{ text: string; icon: TickerItem['icon'] }> = [
  { text: "Wondering what the neighbors are saying?", icon: 'users' },
  { text: "Your community is buzzing with activity!", icon: 'chat' },
  { text: "Check out what's happening in the neighborhood", icon: 'lightbulb' },
  { text: "See what your neighbors are up to today", icon: 'heart' },
  { text: "Fresh community activity just for you", icon: 'gift' },
  { text: "The bulletin board has new notes!", icon: 'chat' },
];

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

        // Mix in 2-3 random fun phrases
        const numFunPhrases = Math.min(2 + Math.floor(Math.random() * 2), funPhrases.length);
        const shuffledFun = [...funPhrases].sort(() => Math.random() - 0.5).slice(0, numFunPhrases);
        shuffledFun.forEach((phrase, idx) => {
          tickerItems.push({
            id: `fun-${idx}`,
            text: phrase.text,
            type: 'fun',
            icon: phrase.icon
          });
        });

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
        <div className="bg-[#E8F5E9] border-2 border-[#A18463] rounded-lg shadow-[3px_3px_0_#A18463] p-3">
          <div className="text-sm text-[#2E4B3F] flex items-center gap-2">
            <PixelIcon name="clock" size={16} className="text-thread-meadow" />
            <span>Loading community activity...</span>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  // Duplicate items for seamless infinite scroll
  const displayItems = [...items, ...items];

  return (
    <div className="w-full mb-6">
      <div
        className="bg-[#E8F5E9] border-2 border-[#A18463] rounded-lg shadow-[3px_3px_0_#A18463] overflow-hidden cursor-pointer hover:shadow-[4px_4px_0_#A18463] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all duration-200"
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
          <div className="flex items-center gap-64 whitespace-nowrap text-sm text-[#2E4B3F] animate-scroll">
            {displayItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center gap-2">
                <PixelIcon name={item.icon} size={16} className="text-thread-meadow flex-shrink-0" />
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
          animation: scroll 90s linear infinite;
        }
      `}</style>
    </div>
  );
}
