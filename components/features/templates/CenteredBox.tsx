import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface CenteredBoxProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;

  // Internal prop from visual builder
  _positioningMode?: 'grid' | 'absolute';
}

export default function CenteredBox({
  maxWidth = 'lg',
  padding = 'md',
  children,

  // Internal props
  _positioningMode
}: CenteredBoxProps) {
  const { isInGrid } = useGridCompatibilityContext();

  // Override grid detection if component is in absolute positioning mode
  const shouldUseGridClasses = _positioningMode === 'absolute' ? false : isInGrid;

  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    'full': 'max-w-full'
  }[maxWidth as string];

  // Grid-aware padding
  const paddingClass = shouldUseGridClasses ? {
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
  }[padding];

  // Handle custom maxWidth values
  const customStyle: React.CSSProperties = {};
  if (!maxWidthClass && maxWidth) {
    // Support all valid CSS length units
    if (maxWidth.match(/^\d*\.?\d+(px|rem|%|em|vw|vh|vmin|vmax|ch|ex|in|cm|mm|pt|pc)$/)) {
      customStyle.maxWidth = maxWidth;
    } else if (!isNaN(Number(maxWidth))) {
      // Handle numeric values like "900" as pixels
      customStyle.maxWidth = `${maxWidth}px`;
    }
  }

  const containerClasses = [
    'mx-auto',
    maxWidthClass || '',
    paddingClass,
    // Height behavior: fill container when in absolute mode, use grid sizing in grid mode
    shouldUseGridClasses ? 'w-full h-full' : '',
    _positioningMode === 'absolute' ? 'h-full' : '' // Fill full height when resized
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
    >
      {children}
    </div>
  );
}