import React from "react";

interface GradientBoxProps {
  gradient?: 'sunset' | 'ocean' | 'forest' | 'neon' | 'rainbow' | 'fire';
  direction?: 'r' | 'l' | 'b' | 't' | 'br' | 'bl' | 'tr' | 'tl';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  children: React.ReactNode;
}

export default function GradientBox({ 
  gradient = 'sunset',
  direction = 'br',
  padding = 'md',
  rounded = true,
  children 
}: GradientBoxProps) {
  const gradientClass = {
    'sunset': 'from-orange-400 via-red-500 to-pink-500',
    'ocean': 'from-blue-400 via-blue-500 to-blue-600',
    'forest': 'from-green-400 via-green-500 to-green-600',
    'neon': 'from-purple-400 via-pink-500 to-red-500',
    'rainbow': 'from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500',
    'fire': 'from-yellow-400 via-orange-500 to-red-600'
  }[gradient];

  const directionClass = {
    'r': 'bg-gradient-to-r',
    'l': 'bg-gradient-to-l',
    'b': 'bg-gradient-to-b',
    't': 'bg-gradient-to-t',
    'br': 'bg-gradient-to-br',
    'bl': 'bg-gradient-to-bl',
    'tr': 'bg-gradient-to-tr',
    'tl': 'bg-gradient-to-tl'
  }[direction];

  const paddingClass = {
    'xs': 'p-2',
    'sm': 'p-4',
    'md': 'p-6',
    'lg': 'p-8',
    'xl': 'p-12'
  }[padding];

  const roundedClass = rounded ? 'rounded-lg' : '';

  return (
    <div className={`${directionClass} ${gradientClass} ${paddingClass} ${roundedClass}`}>
      {children}
    </div>
  );
}