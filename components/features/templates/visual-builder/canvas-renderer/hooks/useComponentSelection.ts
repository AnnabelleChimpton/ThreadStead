/**
 * Component selection hook
 * Handles single selection, multi-selection, and rubber band selection
 */

import { useState, useCallback } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';

export interface RubberBandState {
  isActive: boolean;
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}

export interface UseComponentSelectionResult {
  handleComponentClick: (componentId: string, event: React.MouseEvent) => void;
  handleCanvasMouseDown: (event: React.MouseEvent) => void;
  handleCanvasMouseMove: (event: React.MouseEvent) => void;
  handleCanvasMouseUp: () => void;
  rubberBand: RubberBandState;
}

/**
 * Hook for managing component selection including rubber band selection
 */
export function useComponentSelection(
  placedComponents: ComponentItem[],
  selectedComponentIds: Set<string>,
  selectComponent: (id: string, multiSelect?: boolean) => void,
  clearSelection: () => void,
  draggedComponent: any,
  isDragging: boolean
): UseComponentSelectionResult {
  const [isRubberBanding, setIsRubberBanding] = useState(false);
  const [rubberBandStart, setRubberBandStart] = useState<{ x: number; y: number } | null>(null);
  const [rubberBandEnd, setRubberBandEnd] = useState<{ x: number; y: number } | null>(null);

  // Enhanced component click handler with multi-select support
  const handleComponentClick = useCallback((componentId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const isCtrlClick = event.ctrlKey || event.metaKey;
    const isShiftClick = event.shiftKey;

    if (isCtrlClick) {
      // Ctrl+click for multi-select toggle - useCanvasState DOES support this!
      selectComponent(componentId, true); // This handles both add/remove automatically
    } else if (isShiftClick && selectedComponentIds.size > 0) {
      // Shift+click for range selection - select from last selected to current
      const componentIds = placedComponents.map(c => c.id);
      const currentIndex = componentIds.indexOf(componentId);
      const lastSelectedId = Array.from(selectedComponentIds).pop();
      const lastIndex = lastSelectedId ? componentIds.indexOf(lastSelectedId) : -1;

      if (currentIndex !== -1 && lastIndex !== -1) {
        const startIndex = Math.min(currentIndex, lastIndex);
        const endIndex = Math.max(currentIndex, lastIndex);
        const rangeIds = componentIds.slice(startIndex, endIndex + 1);

        // Add all components in range to selection
        rangeIds.forEach(id => selectComponent(id, true));
      } else {
        // Fallback to regular selection
        selectComponent(componentId);
      }
    } else {
      // Regular click - single selection (clears others)
      selectComponent(componentId);
    }
  }, [selectedComponentIds, selectComponent, placedComponents]);

  // Canvas mouse down for rubber band selection
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    // Only start rubber band if not clicking on a component and not dragging
    if (event.target === event.currentTarget && !draggedComponent && !isDragging) {
      const rect = event.currentTarget.getBoundingClientRect();
      const startPos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      setIsRubberBanding(true);
      setRubberBandStart(startPos);
      setRubberBandEnd(startPos);
    }
  }, [draggedComponent, isDragging]);

  // Canvas mouse move for rubber band selection
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    if (isRubberBanding && rubberBandStart) {
      const rect = event.currentTarget.getBoundingClientRect();
      const endPos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      setRubberBandEnd(endPos);

      // Calculate selection rectangle
      const selectionRect = {
        left: Math.min(rubberBandStart.x, endPos.x),
        top: Math.min(rubberBandStart.y, endPos.y),
        right: Math.max(rubberBandStart.x, endPos.x),
        bottom: Math.max(rubberBandStart.y, endPos.y),
      };

      // Find components within selection rectangle
      const selectedIds = placedComponents
        .filter(component => {
          if (!component.position) return false;

          const componentRect = {
            left: component.position.x,
            top: component.position.y,
            right: component.position.x + 200, // Approximate component width
            bottom: component.position.y + 150, // Approximate component height
          };

          // Check if component rectangle intersects with selection rectangle
          return !(componentRect.right < selectionRect.left ||
                   componentRect.left > selectionRect.right ||
                   componentRect.bottom < selectionRect.top ||
                   componentRect.top > selectionRect.bottom);
        })
        .map(c => c.id);

      // Multi-select all components in rubber band selection
      if (selectedIds.length > 0) {
        // Clear existing selection and set new multi-selection
        clearSelection();
        // Add each component to selection using multi-select
        selectedIds.forEach(id => selectComponent(id, true));
      }
    }
  }, [isRubberBanding, rubberBandStart, placedComponents, selectComponent, clearSelection]);

  // Canvas mouse up to end rubber band selection
  const handleCanvasMouseUp = useCallback(() => {
    if (isRubberBanding) {
      setIsRubberBanding(false);
      setRubberBandStart(null);
      setRubberBandEnd(null);
    }
  }, [isRubberBanding]);

  return {
    handleComponentClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    rubberBand: {
      isActive: isRubberBanding,
      start: rubberBandStart,
      end: rubberBandEnd
    }
  };
}
