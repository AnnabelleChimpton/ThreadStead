import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface FloatingBadgeProps {
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  animation?: 'bounce' | 'pulse' | 'float' | 'none';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  children: React.ReactNode;
}

export default function FloatingBadge({ 
  color = 'blue',
  size = 'md',
  animation = 'float',
  position = 'top-right',
  children 
}: FloatingBadgeProps) {
  const colorClasses = {
    'blue': 'bg-blue-500 text-white',
    'green': 'bg-green-500 text-white',
    'red': 'bg-red-500 text-white',
    'yellow': 'bg-yellow-500 text-black',
    'purple': 'bg-purple-500 text-white',
    'pink': 'bg-pink-500 text-white'
  }[color];

  const sizeClasses = {
    'sm': 'text-xs px-2 py-1',
    'md': 'text-sm px-3 py-1',
    'lg': 'text-base px-4 py-2'
  }[size];

  const { isInGrid } = useGridCompatibilityContext();

  // In grid: use absolute positioning within the grid cell
  // Outside grid: use fixed positioning
  const positionClasses = isInGrid ? {
    'top-left': 'top-1 left-1',
    'top-right': 'top-1 right-1',
    'bottom-left': 'bottom-1 left-1',
    'bottom-right': 'bottom-1 right-1'
  }[position] : {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  }[position];

  const animationClasses = {
    'bounce': 'animate-bounce',
    'pulse': 'animate-pulse',
    'float': 'animate-[float_3s_ease-in-out_infinite]',
    'none': ''
  }[animation];

  return (
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      <div className={`${isInGrid ? 'absolute' : 'fixed'} ${positionClasses} ${isInGrid ? 'z-10' : 'z-50'}`}>
        <div className={`${colorClasses} ${sizeClasses} ${animationClasses} rounded-full font-semibold shadow-lg border-2 border-white`}>
          {children}
        </div>
      </div>
    </>
  );
}