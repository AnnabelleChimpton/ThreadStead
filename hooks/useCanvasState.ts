/**
 * VISUAL_BUILDER_PROGRESS: Canvas State Hook - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Direct State Management
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  getOptimalSpan,
  getCurrentBreakpoint,
  GRID_BREAKPOINTS,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';

// Enhanced component item with grid and absolute positioning support
export interface ComponentItem {
  id: string;
  type: string;
  position: { x: number; y: number }; // Absolute positioning (pixels)
  gridPosition?: {
    column: number;     // Starting column (1-based)
    span: number;       // Number of columns to span
    row: number;        // Row position (1-based)
  };
  positioningMode: 'absolute' | 'grid';
  props?: Record<string, any>;
}

// Enhanced grid configuration for responsive canvas
export interface GridConfig {
  enabled: boolean;
  columns: number;        // Number of columns (responsive based on breakpoint)
  rowHeight: number;      // Height of each row in pixels (consistent across builder and profile)
  gap: number;           // Gap between grid cells in pixels (responsive)
  showGrid: boolean;     // Whether to show grid overlay

  // Enhanced responsive features
  currentBreakpoint: GridBreakpoint;  // Current responsive breakpoint
  autoSpanning: boolean;   // Whether to use automatic component spanning
  responsiveMode: boolean; // Whether to use responsive grid system
}

export interface UseCanvasStateResult {
  // Direct state - no complex CanvasState object
  placedComponents: ComponentItem[];
  selectedComponentIds: Set<string>;
  draggedComponent: ComponentItem | null;
  isDragging: boolean;
  previewPosition: { x: number; y: number } | null;

  // Grid configuration state
  gridConfig: GridConfig;
  setGridConfig: (config: Partial<GridConfig>) => void;
  positioningMode: 'absolute' | 'grid';
  setPositioningMode: (mode: 'absolute' | 'grid') => void;

  // Simple operations following pixel homes pattern
  addComponent: (component: ComponentItem) => void;
  removeComponent: (id: string) => void;
  updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
  updateComponentGridPosition: (id: string, gridPosition: { column: number; span: number; row: number }) => void;

  // Selection (simplified)
  selectComponent: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  removeSelected: () => void;

  // Drag and drop (pixel homes style)
  startDrag: (component: ComponentItem) => void;
  setPreviewPosition: (position: { x: number; y: number } | null) => void;
  endDrag: () => void;

  // Grid utilities
  pixelToGrid: (x: number, y: number) => { column: number; row: number };
  gridToPixel: (column: number, row: number) => { x: number; y: number };
  snapToGrid: (x: number, y: number) => { x: number; y: number };

  // History (simple undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Canvas operations
  resetCanvas: () => void;
}

/**
 * Simplified canvas state hook following pixel homes pattern
 */
export function useCanvasState(initialComponents: ComponentItem[] = []): UseCanvasStateResult {
  // Direct state management like pixel homes
  const [placedComponents, setPlacedComponents] = useState<ComponentItem[]>(initialComponents);
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
  const [draggedComponent, setDraggedComponent] = useState<ComponentItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);

  // Enhanced grid configuration state with responsive support
  const [gridConfig, setGridConfigState] = useState<GridConfig>(() => {
    const initialBreakpoint = getCurrentBreakpoint();
    return {
      enabled: true, // Enable grid by default
      columns: initialBreakpoint.columns,
      rowHeight: initialBreakpoint.rowHeight, // Use fixed row height for consistent experience
      gap: initialBreakpoint.gap,
      showGrid: true, // Show grid by default for better UX
      currentBreakpoint: initialBreakpoint,
      autoSpanning: true,
      responsiveMode: true
    };
  });

  // Positioning mode state - default to grid for better UX
  const [positioningMode, setPositioningMode] = useState<'absolute' | 'grid'>('grid');

  // History state (simple)
  const [history, setHistory] = useState<{
    past: ComponentItem[][];
    present: ComponentItem[];
    future: ComponentItem[][];
  }>({ past: [], present: initialComponents, future: [] });

  // Removed updateHistory function to fix state conflicts

  // Track state changes with useEffect

  // Enhanced grid utility functions with responsive support
  const pixelToGrid = useCallback((x: number, y: number) => {
    // Use responsive canvas width instead of fixed 800px
    const canvasWidth = gridConfig.responsiveMode ? window.innerWidth - (gridConfig.currentBreakpoint.containerPadding * 2) : 800;
    const columnWidth = (canvasWidth - (gridConfig.columns + 1) * gridConfig.gap) / gridConfig.columns;
    const column = Math.floor((x + gridConfig.gap) / (columnWidth + gridConfig.gap)) + 1;

    // Use consistent row height from breakpoint configuration
    const row = Math.floor((y + gridConfig.gap) / (gridConfig.rowHeight + gridConfig.gap)) + 1;

    return {
      column: Math.max(1, Math.min(column, gridConfig.columns)),
      row: Math.max(1, row)
    };
  }, [gridConfig]);

  const gridToPixel = useCallback((column: number, row: number) => {
    // Use responsive canvas width - accounting for canvas padding
    const canvasWidth = gridConfig.responsiveMode ? window.innerWidth - (gridConfig.currentBreakpoint.containerPadding * 2) : 800;
    const columnWidth = (canvasWidth - (gridConfig.columns + 1) * gridConfig.gap) / gridConfig.columns;
    // Position within the padded canvas area (no additional padding offset needed)
    const x = (column - 1) * (columnWidth + gridConfig.gap) + gridConfig.gap;

    // Use consistent row height from breakpoint configuration
    const y = (row - 1) * (gridConfig.rowHeight + gridConfig.gap) + gridConfig.gap;

    return { x, y };
  }, [gridConfig]);

  const snapToGrid = useCallback((x: number, y: number) => {
    if (!gridConfig.enabled || positioningMode === 'absolute') {
      return { x, y };
    }

    const { column, row } = pixelToGrid(x, y);
    return gridToPixel(column, row);
  }, [gridConfig, positioningMode, pixelToGrid, gridToPixel]);

  // Enhanced component operations with auto-spanning support
  const addComponent = useCallback((component: ComponentItem) => {

    // Ensure component has an ID and positioning mode
    if (!component.id) {
      component = { ...component, id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    }

    // Set positioning mode if not specified
    if (!component.positioningMode) {
      component = { ...component, positioningMode };
    }

    // Enhanced grid positioning with auto-spanning
    if (component.positioningMode === 'grid') {
      if (!component.gridPosition) {
        const { column, row } = pixelToGrid(component.position.x, component.position.y);

        // Use auto-spanning if enabled
        let span = 1;
        if (gridConfig.autoSpanning) {
          span = getOptimalSpan(component.type, gridConfig.currentBreakpoint.name, gridConfig.columns);
        }

        component = {
          ...component,
          gridPosition: { column, row, span }
        };
      }
    }

    // Update the placed components state
    setPlacedComponents(prevComponents => {
      const updatedComponents = [...prevComponents, component];
      return updatedComponents;
    });

  }, [positioningMode, pixelToGrid, gridConfig]);

  const removeComponent = useCallback((id: string) => {
    // Direct state update without history conflicts
    setPlacedComponents(prevComponents => {
      const updatedComponents = prevComponents.filter(comp => comp.id !== id);
      return updatedComponents;
    });

    // Remove from selection if selected
    setSelectedComponentIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []); // No dependencies to avoid stale closures

  const updateComponentPosition = useCallback((id: string, position: { x: number; y: number }) => {
    // Use functional update to avoid dependency conflicts
    setPlacedComponents(prevComponents => {
      return prevComponents.map(comp =>
        comp.id === id ? { ...comp, position } : comp
      );
    });
  }, []); // No dependencies

  const updateComponentGridPosition = useCallback((id: string, gridPosition: { column: number; span: number; row: number }) => {
    setPlacedComponents(prevComponents => {
      return prevComponents.map(comp =>
        comp.id === id ? { ...comp, gridPosition } : comp
      );
    });
  }, []);

  // Enhanced grid configuration with responsive support
  const setGridConfig = useCallback((config: Partial<GridConfig>) => {
    setGridConfigState(prev => {
      const updated = { ...prev, ...config };

      // Update breakpoint if responsive mode is enabled
      if (updated.responsiveMode && !config.currentBreakpoint) {
        const currentBreakpoint = getCurrentBreakpoint();
        updated.currentBreakpoint = currentBreakpoint;
        updated.columns = currentBreakpoint.columns;
        updated.gap = currentBreakpoint.gap;
        updated.rowHeight = currentBreakpoint.rowHeight;

      }

      return updated;
    });
  }, []);

  // Add window resize listener for responsive grid updates
  React.useEffect(() => {
    if (!gridConfig.responsiveMode) return;

    const handleResize = () => {
      const newBreakpoint = getCurrentBreakpoint();
      if (newBreakpoint.name !== gridConfig.currentBreakpoint.name) {
        setGridConfig({
          currentBreakpoint: newBreakpoint,
          columns: newBreakpoint.columns,
          gap: newBreakpoint.gap,
          rowHeight: newBreakpoint.rowHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridConfig.currentBreakpoint.name, gridConfig.responsiveMode, setGridConfig]);

  // Selection operations
  const selectComponent = useCallback((id: string, multi = false) => {
    if (multi) {
      setSelectedComponentIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      setSelectedComponentIds(new Set([id]));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedComponentIds(new Set());
  }, []);

  const removeSelected = useCallback(() => {
    // Use functional update to avoid conflicts
    setPlacedComponents(prevComponents => {
      const updatedComponents = prevComponents.filter(comp => !selectedComponentIds.has(comp.id));
      return updatedComponents;
    });
    setSelectedComponentIds(new Set());
  }, [selectedComponentIds]); // Only depend on selectedComponentIds

  // Drag and drop (pixel homes style)
  const startDrag = useCallback((component: ComponentItem) => {
    setDraggedComponent(component);
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    setDraggedComponent(null);
    setIsDragging(false);
    setPreviewPosition(null);
    // Temporarily disable history saving to fix conflicts
  }, []);

  // History operations - temporarily disabled to fix state conflicts
  const undo = useCallback(() => {
    // TODO: Re-implement after fixing core state management
  }, []);

  const redo = useCallback(() => {
    // TODO: Re-implement after fixing core state management
  }, []);

  const canUndo = useMemo(() => history.past.length > 0, [history.past.length]);
  const canRedo = useMemo(() => history.future.length > 0, [history.future.length]);

  // Canvas operations
  const resetCanvas = useCallback(() => {
    setPlacedComponents([]);
    setSelectedComponentIds(new Set());
  }, []);

  return {
    // State
    placedComponents,
    selectedComponentIds,
    draggedComponent,
    isDragging,
    previewPosition,

    // Grid configuration
    gridConfig,
    setGridConfig,
    positioningMode,
    setPositioningMode,

    // Operations
    addComponent,
    removeComponent,
    updateComponentPosition,
    updateComponentGridPosition,

    // Selection
    selectComponent,
    clearSelection,
    removeSelected,

    // Drag and drop
    startDrag,
    setPreviewPosition,
    endDrag,

    // Grid utilities
    pixelToGrid,
    gridToPixel,
    snapToGrid,

    // History
    undo,
    redo,
    canUndo,
    canRedo,

    // Canvas
    resetCanvas,
  };
}