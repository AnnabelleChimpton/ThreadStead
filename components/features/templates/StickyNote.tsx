import React from "react";
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface StickyNoteProps {
  color?: 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  rotation?: number;
  children: React.ReactNode;
}

export default function StickyNote({ 
  color = 'yellow',
  size = 'md',
  rotation = 0,
  children 
}: StickyNoteProps) {
  const colorClasses = {
    'yellow': 'bg-yellow-200 border-yellow-300',
    'pink': 'bg-pink-200 border-pink-300',
    'blue': 'bg-blue-200 border-blue-300',
    'green': 'bg-green-200 border-green-300',
    'orange': 'bg-orange-200 border-orange-300',
    'purple': 'bg-purple-200 border-purple-300'
  }[color];

  const { isInGrid } = useGridCompatibilityContext();

  // Adaptive sizing: use responsive sizing in grid, fixed sizes otherwise
  const sizeClasses = {
    'sm': isInGrid ? 'w-full h-full min-w-32 min-h-32 p-3 text-xs' : 'w-32 h-32 p-3 text-xs',
    'md': isInGrid ? 'w-full h-full min-w-48 min-h-48 p-4 text-sm' : 'w-48 h-48 p-4 text-sm',
    'lg': isInGrid ? 'w-full h-full min-w-64 min-h-64 p-6 text-base' : 'w-64 h-64 p-6 text-base'
  }[size];

  // Grid-adaptive container styling
  const baseContainerClasses = isInGrid
    ? `sticky-note-wrapper ${colorClasses} ${sizeClasses} border border-dashed shadow-md font-handwriting relative overflow-hidden aspect-square`
    : `inline-block ${colorClasses} ${sizeClasses} border border-dashed shadow-md font-handwriting relative overflow-hidden`;

  return (
    <div
      className={baseContainerClasses}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      {/* Tape effect */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-white bg-opacity-70 border border-gray-300 rounded-sm"></div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}