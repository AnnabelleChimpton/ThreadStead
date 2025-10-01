import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface GradientBoxProps extends UniversalCSSProps {
  // Legacy props (kept for backward compatibility)
  gradient?: 'sunset' | 'ocean' | 'forest' | 'neon' | 'rainbow' | 'fire';
  direction?: 'r' | 'l' | 'b' | 't' | 'br' | 'bl' | 'tr' | 'tl';
  containerPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;

  // New flexible props
  colors?: string; // e.g., 'white', 'blue-purple', 'sunset'
  gradientOpacity?: string; // e.g., '10', '90'
  className?: string; // Additional CSS classes
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;

  // Internal prop from visual builder
  _positioningMode?: 'grid' | 'absolute';
}

export default function GradientBox(props: GradientBoxProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    gradient = 'sunset',
    direction = 'br',
    containerPadding = 'md',
    rounded = true,
    colors,
    gradientOpacity,
    className,
    children,
    onClick,
    _positioningMode
  } = componentProps;

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
  
  // Handle gradientOpacity prop
  if (gradientOpacity) {
    opacityClass = `bg-opacity-${gradientOpacity}`;
  }

  // Handle legacy containerPadding (only if no custom className) - adaptive padding: smaller in grid, normal otherwise
  const paddingClass = !className ? (shouldUseGridClasses ? {
    'xs': 'p-1',
    'sm': 'p-2',
    'md': 'p-3',
    'lg': 'p-4',
    'xl': 'p-6'
  }[containerPadding] : {
    'xs': 'p-2',
    'sm': 'p-4',
    'md': 'p-6',
    'lg': 'p-8',
    'xl': 'p-12'
  }[containerPadding]) : '';

  // Handle legacy rounded (only if no custom className)
  const roundedClass = !className && rounded ? 'rounded-lg' : '';

  // Combine all base classes
  const baseClasses = [
    backgroundClass,
    opacityClass,
    paddingClass,
    roundedClass,
    className,
    // Size behavior: fill container when in absolute mode, use grid sizing in grid mode
    shouldUseGridClasses ? 'w-full h-full' : '',
    _positioningMode === 'absolute' ? 'w-full h-full' : '' // Fill full width and height when positioned
  ].filter(Boolean).join(' ');

  // Remove Tailwind classes that conflict with CSS props - USER STYLING IS QUEEN
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);

  // Apply CSS properties as inline styles
  const appliedStyles = applyCSSProps(cssProps);

  return (
    <div className={filteredClasses} style={appliedStyles} onClick={onClick}>
      {children}
    </div>
  );
}