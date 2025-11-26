import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PollPreview from '@/components/community/PollPreview';
import BulletinPreview from '@/components/community/BulletinPreview';
import AnnouncementPreview from '@/components/community/AnnouncementPreview';

const communityActivityConfig: WidgetConfig = {
  id: 'community-activity',
  title: 'Community Activity',
  description: 'Live feed of polls, bulletins, and announcements',
  category: 'community',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 60000 // 1 minute
};

type ContentType = 'poll' | 'bulletin' | 'announcement';

interface CommunityActivityData {
  poll: any | null;
  bulletin: any | null;
  announcement: any | null;
}

function CommunityActivityWidget({ data, isLoading, error, onRefresh }: WidgetProps & { data?: CommunityActivityData }) {
  const [currentType, setCurrentType] = useState<ContentType>('poll');
  const [rotationIndex, setRotationIndex] = useState(0);

  // Rotation sequence: poll -> bulletin -> announcement -> poll...
  const rotationSequence: ContentType[] = ['poll', 'bulletin', 'announcement'];

  // Auto-rotate every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % rotationSequence.length);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Update current type based on rotation index
  useEffect(() => {
    setCurrentType(rotationSequence[rotationIndex]);
  }, [rotationIndex]);

  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const getCurrentLabel = () => {
    switch (currentType) {
      case 'poll': return 'Active Poll';
      case 'bulletin': return 'Bulletin Board';
      case 'announcement': return 'Latest News';
    }
  };

  const getCurrentIcon = () => {
    switch (currentType) {
      case 'poll': return 'chart';
      case 'bulletin': return 'chat';
      case 'announcement': return 'zap';
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse">
          <div className="h-4 bg-[#D4C4A8] rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-[#D4C4A8] rounded w-full mb-2"></div>
          <div className="h-3 bg-[#D4C4A8] rounded w-5/6 mb-2"></div>
          <div className="h-8 bg-[#D4C4A8] rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-thread-sage mb-2">Unable to load community activity</p>
        <button
          onClick={handleManualRefresh}
          className="text-xs text-[#2E4B3F] hover:text-[#4FAF6D] underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Check if we have any content
  const hasContent = data && (data.poll || data.bulletin || data.announcement);

  if (!hasContent) {
    return (
      <div className="text-center py-6">
        <PixelIcon name="chat" size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm mb-2 text-thread-sage">No community activity yet</p>
        <Link
          href="/community"
          className="text-xs text-[#2E4B3F] hover:text-[#4FAF6D] underline"
        >
          Visit community page →
        </Link>
      </div>
    );
  }

  // Get current content based on rotation
  let currentContent = null;
  if (currentType === 'poll' && data.poll) {
    currentContent = <PollPreview poll={data.poll} onVoted={handleManualRefresh} />;
  } else if (currentType === 'bulletin' && data.bulletin) {
    currentContent = <BulletinPreview bulletin={data.bulletin} />;
  } else if (currentType === 'announcement' && data.announcement) {
    currentContent = <AnnouncementPreview announcement={data.announcement} />;
  }

  // Fallback to any available content if current type has no data
  if (!currentContent) {
    if (data.poll) {
      currentContent = <PollPreview poll={data.poll} onVoted={handleManualRefresh} />;
    } else if (data.bulletin) {
      currentContent = <BulletinPreview bulletin={data.bulletin} />;
    } else if (data.announcement) {
      currentContent = <AnnouncementPreview announcement={data.announcement} />;
    }
  }

  return (
    <div className="space-y-3">
      {/* Header with current content indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <PixelIcon name={getCurrentIcon() as any} size={16} />
          <span className="text-xs font-medium text-thread-sage">
            {getCurrentLabel()}
          </span>
        </div>
        <button
          onClick={handleManualRefresh}
          className="text-xs text-thread-sage/70 hover:text-thread-sage transition-colors"
          title="Refresh"
        >
          <PixelIcon name="reload" size={14} />
        </button>
      </div>

      {/* Current content */}
      <div className="transition-opacity duration-300">
        {currentContent}
      </div>

      {/* Footer CTA */}
      <div className="pt-2 border-t border-[#D4C4A8]">
        <Link
          href="/community"
          className="text-xs text-[#2E4B3F] hover:text-[#4FAF6D] font-medium transition-colors"
        >
          See all community activity →
        </Link>
      </div>
    </div>
  );
}

export const communityActivityWidget = {
  config: communityActivityConfig,
  component: CommunityActivityWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async () => {
    try {
      const [pollsRes, bulletinsRes, announcementsRes] = await Promise.all([
        fetch('/api/polls', { credentials: 'include' }),
        fetch('/api/community/bulletins?limit=1', { credentials: 'include' }),
        fetch('/api/site-news?limit=1', { credentials: 'include' })
      ]);

      const data: CommunityActivityData = {
        poll: null,
        bulletin: null,
        announcement: null
      };

      // Get first active poll
      if (pollsRes.ok) {
        const pollsData = await pollsRes.json();
        const activePoll = pollsData.polls?.find((p: any) => !p.isClosed);
        if (activePoll) {
          data.poll = activePoll;
        }
      }

      // Get most recent bulletin
      if (bulletinsRes.ok) {
        const bulletinsData = await bulletinsRes.json();
        if (bulletinsData.bulletins?.length > 0) {
          data.bulletin = bulletinsData.bulletins[0];
        }
      }

      // Get latest announcement
      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json();
        if (announcementsData.news?.length > 0) {
          data.announcement = announcementsData.news[0];
        }
      }

      return data;
    } catch (error) {
      console.error('Error fetching community activity:', error);
      throw error;
    }
  }
};
