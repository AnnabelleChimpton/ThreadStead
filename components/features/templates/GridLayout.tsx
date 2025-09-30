import React from "react";
import { UniversalCSSProps, applyCSSProps, separateCSSProps } from '@/lib/templates/styling/universal-css-props';

interface GridLayoutProps extends UniversalCSSProps {
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gapSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // Renamed to avoid conflict with UniversalCSSProps.gap
  responsive?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function GridLayout(props: GridLayoutProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    columns = 2,
    gapSize = 'md',
    responsive = true,
    children,
    onClick
  } = componentProps;
  const baseGridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  }[columns];

  const responsiveClass = responsive ? {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  }[columns] : baseGridClass;

  const gapClass = {
    'xs': 'gap-1',
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6',
    'xl': 'gap-8'
  }[gapSize];

  // Apply CSS properties as inline styles
  const appliedStyles = applyCSSProps(cssProps);

  // Handle potential conflict between component gap and CSS gap
  const shouldUseCSSGap = cssProps.gap !== undefined || cssProps.rowGap !== undefined || cssProps.columnGap !== undefined;
  const gapClassToUse = shouldUseCSSGap ? '' : gapClass;

  return (
    <div
      className={`grid ${responsiveClass} ${gapClassToUse}`.trim()}
      style={appliedStyles}
      onClick={onClick}
    >
      {children}
    </div>
  );
}