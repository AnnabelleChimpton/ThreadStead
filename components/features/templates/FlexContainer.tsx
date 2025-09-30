import React from "react";
import { UniversalCSSProps, applyCSSProps, separateCSSProps } from '@/lib/templates/styling/universal-css-props';

interface FlexContainerProps extends UniversalCSSProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gapSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // Renamed to avoid conflict with UniversalCSSProps.gap
  responsive?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function FlexContainer(props: FlexContainerProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    direction = 'row',
    align = 'start',
    justify = 'start',
    wrap = false,
    gapSize = 'md',
    responsive = true,
    children,
    onClick
  } = componentProps;
  const baseDirectionClass = {
    'row': 'flex-row',
    'column': 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse'
  }[direction];

  // Responsive-first: stack on mobile, apply direction on larger screens
  const directionClass = responsive && (direction === 'row' || direction === 'row-reverse')
    ? `flex-col md:${baseDirectionClass}`
    : baseDirectionClass;

  const alignClass = {
    'start': 'items-start',
    'center': 'items-center',
    'end': 'items-end',
    'stretch': 'items-stretch'
  }[align];

  const justifyClass = {
    'start': 'justify-start',
    'center': 'justify-center',
    'end': 'justify-end',
    'between': 'justify-between',
    'around': 'justify-around',
    'evenly': 'justify-evenly'
  }[justify];

  const gapClass = {
    'xs': 'gap-1',
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6',
    'xl': 'gap-8'
  }[gapSize];

  const wrapClass = wrap ? 'flex-wrap' : '';

  // Apply CSS properties as inline styles
  const appliedStyles = applyCSSProps(cssProps);


  // Handle potential conflict between component gap and CSS gap
  const finalStyles = { ...appliedStyles };

  // If CSS gap is provided, it overrides the Tailwind gap class
  const shouldUseCSSGap = cssProps.gap !== undefined;
  const gapClassToUse = shouldUseCSSGap ? '' : gapClass;

  return (
    <div
      className={`flex ${directionClass} ${alignClass} ${justifyClass} ${gapClassToUse} ${wrapClass}`.trim()}
      style={finalStyles}
      onClick={onClick}
    >
      {children}
    </div>
  );
}