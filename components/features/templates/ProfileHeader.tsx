import React from "react";
import Link from "next/link";
import { useResidentData } from './ResidentDataProvider';
import ProfilePhoto from './ProfilePhoto';
import FollowButton from './FollowButton';
import FriendBadge from './FriendBadge';
import MutualFriends from './MutualFriends';

interface ProfileHeaderProps {
  showPhoto?: boolean;
  showBio?: boolean;
  showActions?: boolean;
  photoSize?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ProfileHeader({
  showPhoto = true,
  showBio = true,
  showActions = true,
  photoSize = 'md',
  className: customClassName
}: ProfileHeaderProps) {
  const { owner, viewer, capabilities } = useResidentData();
  
  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName) 
    ? customClassName.join(' ')
    : customClassName;
  
  const wrapperClassName = normalizedCustomClassName 
    ? `ts-profile-header ${normalizedCustomClassName}`
    : "ts-profile-header";

  return (
    <div className={wrapperClassName} data-component="profile-header">
      <div className="ts-profile-header-layout flex flex-col sm:flex-row sm:items-start sm:gap-6">
        {showPhoto && (
          <div className="ts-profile-photo-section">
            <ProfilePhoto size={photoSize} />
          </div>
        )}
        
        <div className="ts-profile-info-section flex-1">
          <div className="ts-profile-identity mb-4">
            <h2 className="ts-profile-display-name thread-headline text-3xl font-bold text-thread-pine mb-1">
              {owner.displayName}
            </h2>
            <span className="ts-profile-status thread-label">
              Online - Resident of ThreadStead
            </span>
          </div>
          
          {showBio && capabilities?.bio && (
            <div className="ts-profile-bio-section mb-4">
              <p className="ts-profile-bio text-thread-charcoal leading-relaxed">
                {capabilities.bio}
              </p>
            </div>
          )}
          
          {showActions && viewer && (
            <div className="ts-profile-actions flex items-center gap-3 flex-wrap">
              <FriendBadge />
              <FollowButton />
              <MutualFriends />
              
              <Link
                href={`/resident/${owner.handle}/contact`}
                className="ts-contact-link thread-button-outline text-sm px-3 py-1"
              >
                Contact
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}