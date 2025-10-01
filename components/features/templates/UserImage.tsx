import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface ImageProps extends UniversalCSSProps {
  src?: string;
  data?: string;
  index?: number;
  alt?: string;
  // Deprecated: Use CSS width/height instead, but keep for backward compatibility
  imageWidth?: string;
  imageHeight?: string;
  imageSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  showBorder?: boolean;
  imageShadow?: 'none' | 'sm' | 'md' | 'lg';
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  fallback?: string;
}

// Helper function to safely get nested property values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

export default function UserImage(props: ImageProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    src,
    data,
    index = 0,
    alt = '',
    imageWidth,  // Deprecated but keep for backward compatibility
    imageHeight, // Deprecated but keep for backward compatibility
    imageSize = 'md',
    rounded = 'sm',
    showBorder = false,
    imageShadow = 'none',
    fit = 'cover',
    fallback = '/assets/default-image.png'
  } = componentProps;

  const residentData = useResidentData();
  
  // Determine the image source
  let imageSrc = src;
  
  if (data && !src) {
    // Get image from data path
    const dataValue = getNestedValue(residentData, data);
    
    if (typeof dataValue === 'string') {
      imageSrc = dataValue;
    } else if (Array.isArray(dataValue) && dataValue.length > 0) {
      // If it's an array, use the specified index (default 0)
      const selectedImage = dataValue[index];
      if (selectedImage) {
        if (typeof selectedImage === 'string') {
          imageSrc = selectedImage;
        } else if (selectedImage && typeof selectedImage === 'object' && !Array.isArray(selectedImage)) {
          imageSrc = selectedImage?.url || selectedImage?.src || selectedImage?.image;
        }
      }
    } else if (dataValue && typeof dataValue === 'object') {
      // If it's an object, look for common image properties
      imageSrc = dataValue.url || dataValue.src || dataValue.image;
    }
    
    // If no valid image source found from data, don't render
    if (!imageSrc) {
      return null;
    }
  }
  
  // Size mappings
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-16 h-16', 
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
    full: 'w-full h-auto'
  };
  
  // Rounded mappings
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md', 
    lg: 'rounded-lg',
    full: 'rounded-full'
  };
  
  // Shadow mappings
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };
  
  // Object fit mappings
  const fitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    'scale-down': 'object-scale-down'
  };
  
  // Build base classes
  const baseClasses = [
    // Size (can be overridden by imageWidth/imageHeight or CSS props)
    !imageWidth && !imageHeight && !cssProps.width && !cssProps.height ? sizeClasses[imageSize] : '',
    // Rounded corners
    roundedClasses[rounded],
    // Border
    showBorder ? 'border-2 border-gray-300' : '',
    // Shadow
    shadowClasses[imageShadow],
    // Object fit
    fitClasses[fit],
    // Base classes
    'block'
  ].filter(Boolean).join(' ');

  // Remove Tailwind classes that conflict with CSS props - USER STYLING IS QUEEN
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);

  // Merge deprecated imageWidth/imageHeight props with CSS props (CSS props take precedence)
  const mergedCSSProps = {
    ...(imageWidth && { width: imageWidth }),
    ...(imageHeight && { height: imageHeight }),
    ...cssProps  // CSS props override deprecated props
  };

  // Apply CSS properties as inline styles
  const style = applyCSSProps(mergedCSSProps);
  
  return (
    <img
      src={imageSrc || fallback}
      alt={alt}
      className={filteredClasses}
      style={style}
      onError={(e) => {
        // Fallback on error
        if ((e.target as HTMLImageElement).src !== fallback) {
          (e.target as HTMLImageElement).src = fallback;
        }
      }}
      loading="lazy"
    />
  );
}