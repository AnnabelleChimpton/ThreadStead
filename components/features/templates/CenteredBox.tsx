import React from "react";

interface CenteredBoxProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export default function CenteredBox({ 
  maxWidth = 'lg',
  padding = 'md',
  children 
}: CenteredBoxProps) {
  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    'full': 'max-w-full'
  }[maxWidth as string];

  const paddingClass = {
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

  return (
    <div 
      className={`mx-auto ${maxWidthClass || ''} ${paddingClass}`}
      style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
    >
      {children}
    </div>
  );
}