import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface ProfilePhotoProps extends UniversalCSSProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  className?: string;
  // Add image fit strategy for container shapes
  imageFit?: 'cover' | 'contain' | 'auto';
}

export default function ProfilePhoto(props: ProfilePhotoProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    size = 'md',
    shape = 'circle',
    className: customClassName,
    imageFit = 'auto'
  } = componentProps;

  const { owner } = useResidentData();

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none'
  };

  // Smart image fit strategy for aspect ratio preservation
  const getImageFitClass = () => {
    if (imageFit === 'cover') return 'object-cover';
    if (imageFit === 'contain') return 'object-contain';
    return 'object-cover';
  };

  const imageFitClass = getImageFitClass();

  const baseWrapperClasses = "profile-photo-wrapper flex flex-col items-center mb-4";

  // Remove Tailwind classes that conflict with CSS props - USER STYLING IS QUEEN
  const filteredWrapperClasses = removeTailwindConflicts(baseWrapperClasses, cssProps);

  const wrapperClassName = normalizedCustomClassName
    ? `${filteredWrapperClasses} ${normalizedCustomClassName}`
    : filteredWrapperClasses;

  // Apply CSS properties as inline styles to wrapper
  const wrapperStyle = applyCSSProps(cssProps);

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      <div className={`profile-photo-frame border-4 border-black shadow-[4px_4px_0_#000] bg-white p-1 `}>
        {owner?.avatarUrl ? (
          <img
            src={owner.avatarUrl}
            alt={`${owner?.displayName || 'Unknown'}'s profile photo`}
            className={`profile-photo-image ${imageFitClass} ${sizeClasses[size]} ${shapeClasses[shape]}`}
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