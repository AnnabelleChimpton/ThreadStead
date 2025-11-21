import React, { useState, useEffect } from 'react';
import { MarkdownWithEmojis } from '@/lib/comment-markup';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  type: 'announcement' | 'feature' | 'maintenance' | 'community';
  priority: 'high' | 'medium' | 'low';
  author?: string;
}

interface SiteNewsData {
  news: NewsItem[];
  hasMore: boolean;
  total: number;
}

export default function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/site-news?limit=10', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: SiteNewsData = await response.json();
        setAnnouncements(data.news);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (publishedAt: string) => {
    if (!isClient) return 'Recently'; // Static text during SSR

    const date = new Date(publishedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'announcement': return '📢';
      case 'feature': return '✨';
      case 'maintenance': return '🔧';
      case 'community': return '🌟';
      default: return '📰';
    }
  };

  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 sm:p-4 mb-3 sm:mb-4 w-full max-w-full overflow-hidden">
      <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-[#2E4B3F] px-1">
        📢 Announcements
      </h3>

      <div className="p-2 sm:p-3">
        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-[#D4C4A8] rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-[#D4C4A8] rounded w-full mb-1"></div>
                <div className="h-3 bg-[#D4C4A8] rounded w-5/6"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && announcements.length === 0 && (
          <div className="text-center py-6 text-thread-sage">
            <p className="text-sm sm:text-base mb-2">No announcements yet</p>
            <p className="text-xs sm:text-sm text-thread-sage/70">Check back later for updates!</p>
          </div>
        )}

        {/* Announcements List */}
        {!loading && announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="border-b border-[#D4C4A8] pb-3 last:border-b-0 last:pb-0"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm sm:text-base text-[#2E4B3F] flex-1">
                    {announcement.title}
                  </h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Priority Indicator */}
                    <div
                      className={`w-2 h-2 rounded-full ${getPriorityColor(announcement.priority)}`}
                      title={`${announcement.priority} priority`}
                    />
                    {/* Type Badge */}
                    <span className="text-xs bg-[#E8DFC8] px-1.5 py-0.5 rounded border border-[#A18463]">
                      {getTypeEmoji(announcement.type)}
                    </span>
                  </div>
                </div>

                {/* Time */}
                <p className="text-xs text-thread-sage/70 mb-2">
                  {formatTimeAgo(announcement.publishedAt)}
                </p>

                {/* Summary */}
                <div className="text-thread-sage text-xs sm:text-sm leading-relaxed mb-2">
                  <MarkdownWithEmojis markdown={announcement.summary} />
                </div>

                {/* Read More Link */}
                <a
                  href={announcement.url}
                  className="inline-block text-xs sm:text-sm text-[#2E4B3F] hover:text-[#4A6B5A] underline font-semibold"
                >
                  Read more →
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
