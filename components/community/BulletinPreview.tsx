import { useState } from 'react';
import { getBulletinColor, type BulletinCategory } from '@/lib/helpers/bulletinHelpers';
import UserQuickView from '@/components/ui/feedback/UserQuickView';

interface Bulletin {
  id: string;
  category: BulletinCategory;
  text: string;
  linkUrl: string | null;
  user: {
    id: string;
    primaryHandle: string | null;
    profile: {
      displayName: string | null;
    } | null;
  };
}

interface BulletinPreviewProps {
  bulletin: Bulletin;
}

export default function BulletinPreview({ bulletin }: BulletinPreviewProps) {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  const getUserDisplay = () => {
    return bulletin.user.profile?.displayName || bulletin.user.primaryHandle || 'Anonymous';
  };

  const getUsername = (): string | null => {
    if (!bulletin.user.primaryHandle) return null;
    return bulletin.user.primaryHandle.split('@')[0];
  };

  const colorConfig = getBulletinColor(bulletin.category);
  const hasLink = !!bulletin.linkUrl;
  const username = getUsername();

  return (
    <>
      <div
        className={`${colorConfig.bg} border border-[#A18463] rounded p-3 shadow-sm ${
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
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-[#2E4B3F]">
                {colorConfig.label}
              </span>
              <span className="text-xs text-[#5A5A5A]">•</span>
              <span className="text-xs text-[#5A5A5A]">
                {getUserDisplay()}
              </span>
            </div>
            <p className="text-sm text-[#2F2F2F]">
              {bulletin.text}
            </p>
          </div>
          {hasLink && (
            <div className="flex-shrink-0">
              <a
                href={bulletin.linkUrl || '#'}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-[#2E4B3F] hover:text-[#4FAF6D] transition-colors"
                title="Visit link"
              >
                →
              </a>
            </div>
          )}
        </div>
      </div>

      {selectedUsername && (
        <UserQuickView
          username={selectedUsername}
          isOpen={!!selectedUsername}
          onClose={() => setSelectedUsername(null)}
        />
      )}
    </>
  );
}
