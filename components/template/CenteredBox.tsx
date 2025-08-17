import React from "react";

interface CenteredBoxProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
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
  }[maxWidth];

  const paddingClass = {
    'xs': 'p-2',
    'sm': 'p-4',
    'md': 'p-6',
    'lg': 'p-8',
    'xl': 'p-12'
  }[padding];

  return (
    <div className={`mx-auto ${maxWidthClass} ${paddingClass}`}>
      {children}
    </div>
  );
}