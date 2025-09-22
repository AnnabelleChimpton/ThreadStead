import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface ProfilePhotoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  className?: string;
  // Add optional grid mode prop for backwards compatibility
  _isInGrid?: boolean;
  // Add positioning mode prop for Visual Builder integration
  _positioningMode?: 'absolute' | 'grid' | 'normal';
  // Add Visual Builder detection prop
  _isInVisualBuilder?: boolean;
  // Add image fit strategy for container shapes
  imageFit?: 'cover' | 'contain' | 'auto';
}

export default function ProfilePhoto({ size = 'md', shape = 'circle', className: customClassName, _isInGrid = false, _positioningMode = 'normal', _isInVisualBuilder = false, imageFit = 'auto' }: ProfilePhotoProps) {
  const { owner } = useResidentData();

  // Debug: Log positioning mode for troubleshooting
  console.log('🖼️ [ProfilePhoto] Rendering with positioningMode:', _positioningMode, 'isInGrid:', _isInGrid, 'isInVisualBuilder:', _isInVisualBuilder);

  // Use prop-based grid detection instead of context hook to prevent infinite loops
  const isInGrid = _isInGrid;

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName)
    ? customClassName.join(' ')
    : customClassName;

  // Determine if we should use container-filling behavior
  // CRITICAL FIX: Don't fill container in Visual Builder to prevent huge rendering
  // CRITICAL FIX: Don't fill container when absolutely positioned to respect natural size
  const shouldFillContainer = !_isInVisualBuilder && isInGrid && _positioningMode !== 'absolute';

  // Adaptive sizing: preserve aspect ratio when filling container, fixed sizes otherwise
  const sizeClasses = {
    xs: shouldFillContainer ? 'max-w-full max-h-full w-auto h-auto min-w-8 min-h-8' : 'w-8 h-8',
    sm: shouldFillContainer ? 'max-w-full max-h-full w-auto h-auto min-w-16 min-h-16' : 'w-16 h-16',
    md: shouldFillContainer ? 'max-w-full max-h-full w-auto h-auto min-w-32 min-h-32' : 'w-32 h-32',
    lg: shouldFillContainer ? 'max-w-full max-h-full w-auto h-auto min-w-48 min-h-48' : 'w-48 h-48'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none'
  };

  // Smart image fit strategy for aspect ratio preservation
  const getImageFitClass = () => {
    if (imageFit === 'cover') return 'object-cover';
    if (imageFit === 'contain') return 'object-contain';

    // Auto mode: smart detection based on context
    if (shouldFillContainer) {
      // For container-filling mode (profile page), preserve aspect ratio
      if (shape === 'circle') {
        // Circles use cover to properly fill the circular mask
        return 'object-cover';
      } else {
        // Square containers: use cover for natural appearance
        // The container is now square, so aspect ratio is preserved
        return 'object-cover';
      }
    } else {
      // For fixed-size mode (Visual Builder), use cover for consistent appearance
      return 'object-cover';
    }
  };

  const imageFitClass = getImageFitClass();

  // Context-aware wrapper styling
  // In Visual Builder with absolute positioning: center the component within its container
  // On profile page: fill container and center within
  // Default: use original flex-col layout
  let baseWrapperClasses;
  if (shouldFillContainer) {
    baseWrapperClasses = "profile-photo-wrapper flex items-center justify-center w-full h-full";
  } else if (_isInVisualBuilder && _positioningMode === 'absolute') {
    baseWrapperClasses = "profile-photo-wrapper flex items-center justify-center w-full h-full";
  } else {
    baseWrapperClasses = "profile-photo-wrapper flex flex-col items-center mb-4";
  }

  const wrapperClassName = normalizedCustomClassName
    ? `${baseWrapperClasses} ${normalizedCustomClassName}`
    : baseWrapperClasses;

  // Debug: Log wrapper classes being applied
  console.log('🖼️ [ProfilePhoto] shouldFillContainer:', shouldFillContainer, 'wrapperClasses:', baseWrapperClasses);
  console.log('🖼️ [ProfilePhoto] imageFitClass:', imageFitClass, 'sizeClasses:', sizeClasses[size]);

  return (
    <div className={wrapperClassName}>
      <div className={`profile-photo-frame border-4 border-black shadow-[4px_4px_0_#000] bg-white p-1 ${shouldFillContainer ? 'w-full h-full' : ''}`}>
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