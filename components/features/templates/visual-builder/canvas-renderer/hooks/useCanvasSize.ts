/**
 * Canvas size management hook
 * Handles responsive canvas sizing based on breakpoints and window size
 */

import { useState, useEffect } from 'react';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';

export type ResponsiveBreakpoint = 'desktop' | 'tablet' | 'mobile';

export interface CanvasSize {
  width: number;
  height: number;
  breakpoint: import('@/lib/templates/visual-builder/grid-utils').GridBreakpoint;
  minHeight: number;
}

/**
 * Get canvas width based on active breakpoint
 */
function getBreakpointWidth(bp: ResponsiveBreakpoint): number {
  if (typeof window === 'undefined') {
    return bp === 'mobile' ? 375 : bp === 'tablet' ? 768 : 1200;
  }

  switch (bp) {
    case 'mobile': return 375;
    case 'tablet': return 768;
    case 'desktop':
      // For desktop, use full available width (accounting for typical panel widths + padding)
      // Panels are usually 350px-400px, so subtract a safe estimate
      const availableWidth = window.innerWidth - 400; // Conservative estimate for side panels
      return Math.max(availableWidth, 1200); // Minimum 1200px for desktop
  }
}

/**
 * Hook to manage canvas size with responsive breakpoint support
 */
export function useCanvasSize(activeBreakpoint: ResponsiveBreakpoint = 'desktop'): CanvasSize {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(() => {
    const targetWidth = getBreakpointWidth(activeBreakpoint);

    // Start with a generous height that feels like a real webpage
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 1400;
    const targetHeight = Math.max(availableHeight, 1400); // Larger minimum for professional feel

    return {
      width: targetWidth,
      height: targetHeight,
      breakpoint: getCurrentBreakpoint(),
      minHeight: 1400 // Professional minimum height
    };
  });

  // Update canvas size when active breakpoint changes or window resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      const targetWidth = getBreakpointWidth(activeBreakpoint);

      // Use more of the available height for immersive experience
      const availableHeight = window.innerHeight - 200; // Account for toolbar
      const baseHeight = Math.max(availableHeight, 1400); // Professional minimum

      const newSize: CanvasSize = {
        width: targetWidth,
        height: baseHeight,
        breakpoint: getCurrentBreakpoint(),
        minHeight: 1400 // Consistent professional minimum
      };

      setCanvasSize(prev => {
        if (prev.width !== newSize.width || prev.height !== newSize.height) {
          return newSize;
        }
        return prev;
      });
    };

    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize(); // Initial call

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [activeBreakpoint]); // Re-run when active breakpoint changes

  return canvasSize;
}
