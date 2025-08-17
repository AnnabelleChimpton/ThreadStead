import React from "react";

interface GridLayoutProps {
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
  children: React.ReactNode;
}

export default function GridLayout({ 
  columns = 2,
  gap = 'md',
  responsive = true,
  children 
}: GridLayoutProps) {
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
  }[gap];

  return (
    <div className={`grid ${responsiveClass} ${gapClass}`}>
      {children}
    </div>
  );
}