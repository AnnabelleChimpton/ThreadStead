import React from "react";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface CenteredBoxProps extends UniversalCSSProps {
  containerMaxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  containerPadding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export default function CenteredBox(props: CenteredBoxProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    containerMaxWidth = 'lg',
    containerPadding = 'md',
    children
  } = componentProps;

  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    'full': 'max-w-full'
  }[containerMaxWidth as string];

  const paddingClass = {
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