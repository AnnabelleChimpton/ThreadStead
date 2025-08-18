import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface ImageProps {
  src?: string;
  data?: string;
  index?: number;
  alt?: string;
  width?: string;
  height?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  fallback?: string;
}

// Helper function to safely get nested property values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

export default function UserImage({ 
  src, 
  data, 
  index = 0,
  alt = '', 
  width, 
  height, 
  size = 'md', 
  rounded = 'sm',
  border = false,
  shadow = 'none',
  fit = 'cover',
  fallback = '/assets/default-image.png'
}: ImageProps) {
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
        imageSrc = selectedImage?.url || selectedImage?.src || selectedImage;
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
  
  // Build classes
  const classes = [
    // Size (can be overridden by width/height)
    !width && !height ? sizeClasses[size] : '',
    // Rounded corners
    roundedClasses[rounded],
    // Border
    border ? 'border-2 border-gray-300' : '',
    // Shadow
    shadowClasses[shadow],
    // Object fit
    fitClasses[fit],
    // Base classes
    'block'
  ].filter(Boolean).join(' ');
  
  // Style object for custom dimensions
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;
  
  return (
    <img
      src={imageSrc || fallback}
      alt={alt}
      className={classes}
      style={Object.keys(style).length > 0 ? style : undefined}
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