import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface GradientBoxProps {
  // Legacy props (kept for backward compatibility)
  gradient?: 'sunset' | 'ocean' | 'forest' | 'neon' | 'rainbow' | 'fire';
  direction?: 'r' | 'l' | 'b' | 't' | 'br' | 'bl' | 'tr' | 'tl';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;

  // New flexible props
  colors?: string; // e.g., 'white', 'blue-purple', 'sunset'
  opacity?: string; // e.g., '10', '90'
  className?: string; // Additional CSS classes
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;

  // Internal prop from visual builder
  _positioningMode?: 'grid' | 'absolute';
}

export default function GradientBox({
  // Legacy props
  gradient = 'sunset',
  direction = 'br',
  padding = 'md',
  rounded = true,

  // New props
  colors,
  opacity,
  className,
  children,
  onClick,

  // Internal props
  _positioningMode
}: GradientBoxProps) {
  const { isInGrid } = useGridCompatibilityContext();

  // Override grid detection if component is in absolute positioning mode
  const shouldUseGridClasses = _positioningMode === 'absolute' ? false : isInGrid;

  let backgroundClass = '';
  let opacityClass = '';

  // Handle colors prop (takes precedence over gradient)
  if (colors) {
    if (colors === 'white') {
      backgroundClass = 'bg-white';
    } else if (colors === 'blue-purple') {
      backgroundClass = 'bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500';
    } else if (colors === 'black') {
      backgroundClass = 'bg-black';
    } else if (colors === 'transparent') {
      backgroundClass = 'bg-transparent';
    } else {
      // Try to use colors as gradient preset
      const gradientPresets: Record<string, string> = {
        'sunset': 'from-orange-400 via-red-500 to-pink-500',
        'ocean': 'from-blue-400 via-blue-500 to-blue-600',
        'forest': 'from-green-400 via-green-500 to-green-600',
        'neon': 'from-purple-400 via-pink-500 to-red-500',
        'rainbow': 'from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500',
        'fire': 'from-yellow-400 via-orange-500 to-red-600'
      };
      
      if (gradientPresets[colors]) {
        const directionClass = {
          'r': 'bg-gradient-to-r',
          'l': 'bg-gradient-to-l',
          'b': 'bg-gradient-to-b',
          't': 'bg-gradient-to-t',
          'br': 'bg-gradient-to-br',
          'bl': 'bg-gradient-to-bl',
          'tr': 'bg-gradient-to-tr',
          'tl': 'bg-gradient-to-tl'
        }[direction];
        
        backgroundClass = `${directionClass} ${gradientPresets[colors]}`;
      } else {
        backgroundClass = `bg-${colors}`;
      }
    }
  } else {
    // Use legacy gradient prop
    const gradientClass = {
      'sunset': 'from-orange-400 via-red-500 to-pink-500',
      'ocean': 'from-blue-400 via-blue-500 to-blue-600',
      'forest': 'from-green-400 via-green-500 to-green-600',
      'neon': 'from-purple-400 via-pink-500 to-red-500',
      'rainbow': 'from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500',
      'fire': 'from-yellow-400 via-orange-500 to-red-600'
    }[gradient];

    const directionClass = {
      'r': 'bg-gradient-to-r',
      'l': 'bg-gradient-to-l',
      'b': 'bg-gradient-to-b',
      't': 'bg-gradient-to-t',
      'br': 'bg-gradient-to-br',
      'bl': 'bg-gradient-to-bl',
      'tr': 'bg-gradient-to-tr',
      'tl': 'bg-gradient-to-tl'
    }[direction];

    backgroundClass = `${directionClass} ${gradientClass}`;
  }
  
  // Handle opacity prop
  if (opacity) {
    opacityClass = `bg-opacity-${opacity}`;
  }

  // Handle legacy padding (only if no custom className) - adaptive padding: smaller in grid, normal otherwise
  const paddingClass = !className ? (shouldUseGridClasses ? {
    'xs': 'p-1',
    'sm': 'p-2',
    'md': 'p-3',
    'lg': 'p-4',
    'xl': 'p-6'
  }[padding] : {
    'xs': 'p-2',
    'sm': 'p-4',
    'md': 'p-6',
    'lg': 'p-8',
    'xl': 'p-12'
  }[padding]) : '';

  // Handle legacy rounded (only if no custom className)
  const roundedClass = !className && rounded ? 'rounded-lg' : '';

  // Combine all classes
  const allClasses = [
    backgroundClass,
    opacityClass,
    paddingClass,
    roundedClass,
    className,
    // Height behavior: fill container when in absolute mode, use grid sizing in grid mode
    shouldUseGridClasses ? 'w-full h-full' : '',
    _positioningMode === 'absolute' ? 'h-full' : '' // Fill full height when resized
  ].filter(Boolean).join(' ');

  return (
    <div className={allClasses} onClick={onClick}>
      {children}
    </div>
  );
}