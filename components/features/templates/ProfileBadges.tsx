import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import ThreadRing88x31Badge from '../../core/threadring/ThreadRing88x31Badge';

interface ProfileBadgesProps {
  showTitle?: boolean;
  layout?: 'grid' | 'list';
  className?: string;
}

export default function ProfileBadges({ 
  showTitle = false, 
  layout = 'grid',
  className: customClassName 
}: ProfileBadgesProps) {
  const { owner, badges } = useResidentData();
  
  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName) 
    ? customClassName.join(' ')
    : customClassName;
  
  const containerClassName = normalizedCustomClassName 
    ? `profile-badges profile-tab-content space-y-6 ${normalizedCustomClassName}`
    : "profile-badges profile-tab-content space-y-6";

  if (!badges || badges.length === 0) {
    return (
      <div className={containerClassName}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-medium text-thread-pine mb-2">No badges yet</h3>
          <p className="text-thread-sage">
            {owner.displayName || owner.handle} hasn&apos;t earned any ThreadRing badges yet.
          </p>
        </div>
      </div>
    );
  }

  // Show up to 6 badges in template preview
  const displayBadges = badges.slice(0, 6);

  const badgeElements = displayBadges.map((badge) => (
    <div 
      key={badge.id}
      className="block hover:scale-105 transition-transform duration-200 cursor-default"
      title={`Member of ${badge.threadRing.name}`}
    >
      <ThreadRing88x31Badge
        title={badge.title}
        subtitle={badge.subtitle}
        imageUrl={badge.imageUrl}
        templateId={badge.templateId}
        backgroundColor={badge.backgroundColor}
        textColor={badge.textColor}
        className="w-full"
      />
    </div>
  ));

  return (
    <div className={containerClassName}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-thread-pine">ThreadRing Badges</h3>
          <p className="text-sm text-thread-sage">
            {owner.displayName || owner.handle}&apos;s community memberships
          </p>
        </div>
        <div className="flex gap-2">
          {displayBadges.length > 0 && (
            <span className="thread-button-secondary text-sm cursor-default">
              View Collection
            </span>
          )}
        </div>
      </div>

      {/* Badges Grid */}
      <div className={layout === 'list' ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-4'}>
        {badgeElements}
      </div>

      {/* More badges indicator */}
      {badges.length > 6 && (
        <div className="text-center">
          <p className="text-sm text-thread-sage">
            +{badges.length - 6} more badge{badges.length - 6 !== 1 ? 's' : ''} in full collection
          </p>
        </div>
      )}
      
      {/* Link to full collection (non-functional in preview) */}
      {displayBadges.length > 0 && (
        <div className="text-center">
          <span className="text-thread-pine text-sm cursor-default">
            View Full Badge Collection →
          </span>
        </div>
      )}
    </div>
  );
}