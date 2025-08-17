import React from "react";

interface SplitLayoutProps {
  ratio?: '1:1' | '1:2' | '2:1' | '1:3' | '3:1';
  vertical?: boolean;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export default function SplitLayout({ 
  ratio = '1:1',
  vertical = false,
  gap = 'md',
  children 
}: SplitLayoutProps) {
  const childrenArray = React.Children.toArray(children);
  const leftChild = childrenArray[0];
  const rightChild = childrenArray[1];

  const ratioClasses = {
    '1:1': vertical ? 'grid-rows-2' : 'grid-cols-2',
    '1:2': vertical ? 'grid-rows-[1fr_2fr]' : 'grid-cols-[1fr_2fr]',
    '2:1': vertical ? 'grid-rows-[2fr_1fr]' : 'grid-cols-[2fr_1fr]',
    '1:3': vertical ? 'grid-rows-[1fr_3fr]' : 'grid-cols-[1fr_3fr]',
    '3:1': vertical ? 'grid-rows-[3fr_1fr]' : 'grid-cols-[3fr_1fr]'
  }[ratio];

  const gapClass = {
    'xs': 'gap-1',
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6',
    'xl': 'gap-8'
  }[gap];

  return (
    <div className={`grid ${ratioClasses} ${gapClass}`}>
      <div>{leftChild}</div>
      <div>{rightChild}</div>
    </div>
  );
}