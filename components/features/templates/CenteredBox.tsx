import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface CenteredBoxProps extends UniversalCSSProps {
  containerMaxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  containerPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;

  // Internal prop from visual builder
  _positioningMode?: 'grid' | 'absolute';
}

export default function CenteredBox(props: CenteredBoxProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    containerMaxWidth = 'lg',
    containerPadding = 'md',
    children,
    _positioningMode
  } = componentProps;

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
  }[containerMaxWidth as string];

  // Grid-aware padding
  const paddingClass = shouldUseGridClasses ? {
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
  }[containerPadding];

  // Handle custom maxWidth values (merge with CSS props)
  const customStyle: React.CSSProperties = {};
  if (!maxWidthClass && containerMaxWidth && !cssProps.maxWidth) {
    // Support all valid CSS length units
    if (containerMaxWidth.match(/^\d*\.?\d+(px|rem|%|em|vw|vh|vmin|vmax|ch|ex|in|cm|mm|pt|pc)$/)) {
      customStyle.maxWidth = containerMaxWidth;
    } else if (!isNaN(Number(containerMaxWidth))) {
      // Handle numeric values like "900" as pixels
      customStyle.maxWidth = `${containerMaxWidth}px`;
    }
  }

  const baseContainerClasses = [
    'mx-auto',
    maxWidthClass || '',
    paddingClass,
    // Height behavior: fill height in grid/absolute mode, but DON'T force full width (breaks centering)
    shouldUseGridClasses ? 'h-full' : '',
    _positioningMode === 'absolute' ? 'h-full' : '' // Fill full height when resized
  ].filter(Boolean).join(' ');

  // Remove Tailwind classes that conflict with CSS props - USER STYLING IS QUEEN
  const filteredContainerClasses = removeTailwindConflicts(baseContainerClasses, cssProps);

  // Merge custom maxWidth with CSS props (CSS props take precedence)
  const mergedStyles = {
    ...customStyle,
    ...applyCSSProps(cssProps)
  };

  return (
    <div
      className={filteredContainerClasses}
      style={Object.keys(mergedStyles).length > 0 ? mergedStyles : undefined}
    >
      {children}
    </div>
  );
}