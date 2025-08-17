import React from "react";

interface FlexContainerProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export default function FlexContainer({ 
  direction = 'row',
  align = 'start',
  justify = 'start',
  wrap = false,
  gap = 'md',
  children 
}: FlexContainerProps) {
  const directionClass = {
    'row': 'flex-row',
    'column': 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse'
  }[direction];

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
  }[gap];

  const wrapClass = wrap ? 'flex-wrap' : '';

  return (
    <div className={`flex ${directionClass} ${alignClass} ${justifyClass} ${gapClass} ${wrapClass}`}>
      {children}
    </div>
  );
}