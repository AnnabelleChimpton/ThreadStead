import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface ProfilePhotoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  className?: string;
}

export default function ProfilePhoto({ size = 'md', shape = 'circle', className: customClassName }: ProfilePhotoProps) {
  const { owner } = useResidentData();
  const { isInGrid } = useGridCompatibilityContext();

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Adaptive sizing: use responsive sizing in grid, fixed sizes otherwise
  const sizeClasses = {
    xs: isInGrid ? 'w-full h-full min-w-8 min-h-8' : 'w-8 h-8',
    sm: isInGrid ? 'w-full h-full min-w-16 min-h-16' : 'w-16 h-16',
    md: isInGrid ? 'w-full h-full min-w-32 min-h-32' : 'w-32 h-32',
    lg: isInGrid ? 'w-full h-full min-w-48 min-h-48' : 'w-48 h-48'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none'
  };

  // Grid-adaptive wrapper styling
  const baseWrapperClasses = isInGrid
    ? "profile-photo-wrapper flex items-center justify-center w-full h-full"
    : "profile-photo-wrapper flex flex-col items-center mb-4";

  const wrapperClassName = normalizedCustomClassName
    ? `${baseWrapperClasses} ${normalizedCustomClassName}`
    : baseWrapperClasses;

  return (
    <div className={wrapperClassName}>
      <div className={`profile-photo-frame border-4 border-black shadow-[4px_4px_0_#000] bg-white p-1 ${isInGrid ? 'w-full h-full' : ''}`}>
        {owner?.avatarUrl ? (
          <img
            src={owner.avatarUrl}
            alt={`${owner?.displayName || 'Unknown'}'s profile photo`}
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