import { useState, useEffect } from 'react';
import { MarkdownWithEmojis } from '@/lib/comment-markup';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  type: 'announcement' | 'feature' | 'maintenance' | 'community';
  priority: 'high' | 'medium' | 'low';
}

interface AnnouncementPreviewProps {
  announcement: NewsItem;
}

export default function AnnouncementPreview({ announcement }: AnnouncementPreviewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatTimeAgo = (publishedAt: string) => {
    if (!isClient) return 'Recently';

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
    <article className="border-b border-[#D4C4A8] pb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-bold text-sm text-[#2E4B3F] flex-1">
          {announcement.title}
        </h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${getPriorityColor(announcement.priority)}`}
            title={`${announcement.priority} priority`}
          />
          <span className="text-xs bg-[#E8DFC8] px-1.5 py-0.5 rounded border border-[#A18463]">
            {getTypeEmoji(announcement.type)}
          </span>
        </div>
      </div>

      <p className="text-xs text-thread-sage/70 mb-2">
        {formatTimeAgo(announcement.publishedAt)}
      </p>

      <div className="text-thread-sage text-xs leading-relaxed mb-2">
        <MarkdownWithEmojis markdown={announcement.summary} />
      </div>

      <a
        href={announcement.url}
        className="inline-block text-xs text-[#2E4B3F] hover:text-[#4A6B5A] underline font-semibold"
      >
        Read more →
      </a>
    </article>
  );
}
