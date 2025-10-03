/**
 * Rubber band selection rectangle for canvas
 * Displays a visual selection rectangle during drag selection
 */

import React from 'react';

interface RubberBandSelectionProps {
  isActive: boolean;
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}

export default function RubberBandSelection({
  isActive,
  start,
  end
}: RubberBandSelectionProps) {
  if (!isActive || !start || !end) {
    return null;
  }

  const rect = {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };

  return (
    <div
      className="absolute border-2 border-blue-400 bg-blue-100 bg-opacity-20 pointer-events-none"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 1000,
      }}
    />
  );
}
