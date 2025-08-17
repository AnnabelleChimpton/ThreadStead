import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface ProfilePhotoProps {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
}

export default function ProfilePhoto({ size = 'md', shape = 'circle' }: ProfilePhotoProps) {
  const { owner } = useResidentData();
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32', 
    lg: 'w-48 h-48'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none'
  };

  return (
    <div className="profile-photo-wrapper flex flex-col items-center mb-4">
      <div className="profile-photo-frame border-4 border-black shadow-[4px_4px_0_#000] bg-white p-1">
        {owner.avatarUrl ? (
          <img
            src={owner.avatarUrl}
            alt={`${owner.displayName}'s profile photo`}
            className={`profile-photo-image object-cover ${sizeClasses[size]} ${shapeClasses[shape]}`}
          />
        ) : (
          <div className={`profile-photo-placeholder flex items-center justify-center bg-yellow-200 text-black text-sm ${sizeClasses[size]} ${shapeClasses[shape]}`}>
            No Photo
          </div>
        )}
      </div>
    </div>
  );
}