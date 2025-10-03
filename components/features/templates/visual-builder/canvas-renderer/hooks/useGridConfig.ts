/**
 * Grid configuration synchronization hook
 * Syncs grid config with active breakpoint selection
 */

import { useEffect } from 'react';
import { GRID_BREAKPOINTS } from '@/lib/templates/visual-builder/grid-utils';
import type { ResponsiveBreakpoint } from './useCanvasSize';

/**
 * Hook to synchronize grid configuration with active breakpoint
 */
export function useGridConfig(
  activeBreakpoint: ResponsiveBreakpoint,
  setGridConfig: (config: any) => void
): void {
  useEffect(() => {
    // Map activeBreakpoint to actual grid breakpoint data
    const breakpointMapping = {
      'desktop': GRID_BREAKPOINTS.find(bp => bp.name === 'desktop')!,
      'tablet': GRID_BREAKPOINTS.find(bp => bp.name === 'tablet')!,
      'mobile': GRID_BREAKPOINTS.find(bp => bp.name === 'mobile')!
    };

    const targetBreakpoint = breakpointMapping[activeBreakpoint];

    // Update grid config with the selected breakpoint
    setGridConfig({
      currentBreakpoint: targetBreakpoint,
      columns: targetBreakpoint.columns,
      rowHeight: targetBreakpoint.rowHeight,
      gap: targetBreakpoint.gap
    });
  }, [activeBreakpoint, setGridConfig]);
}
