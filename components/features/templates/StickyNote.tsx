import React from "react";

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

  const sizeClasses = {
    'sm': 'w-32 h-32 p-3 text-xs',
    'md': 'w-48 h-48 p-4 text-sm',
    'lg': 'w-64 h-64 p-6 text-base'
  }[size];

  return (
    <div 
      className={`inline-block ${colorClasses} ${sizeClasses} border border-dashed shadow-md font-handwriting relative overflow-hidden`}
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