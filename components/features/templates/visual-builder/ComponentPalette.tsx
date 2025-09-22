/**
 * Component Palette - Modern search-first component selector
 * Uses the new ComponentSearcher for better UX
 */

import React from 'react';
import type { UseCanvasStateResult } from '@/hooks/useCanvasState';
import ComponentSearcher from './ComponentSearcher';

interface ComponentPaletteProps {
  canvasState: UseCanvasStateResult;
  className?: string;
}

/**
 * Modern Component Palette using the new ComponentSearcher
 */
export default function ComponentPalette({
  canvasState,
  className = '',
}: ComponentPaletteProps) {
  return (
    <ComponentSearcher
      canvasState={canvasState}
      className={className}
    />
  );
}