/**
 * useComponentResize Hook
 *
 * Handles all component resize operations including:
 * - Resize state management (resizingComponentId, resizePreview)
 * - Resize event handlers (start, during, end)
 * - Real-time size updates during resize
 * - Position indicator integration
 * - Validation of resize operations
 *
 * Extracted from CanvasRenderer.tsx Phase 2 Step 2
 */

import { useState, useCallback } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import type { ResizeDirection } from '../../ResizeHandle';
import type { MeasuredDimensions } from '../../ResizableComponent';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';
import {
  getComponentCurrentSize,
  sizeToProps,
  validateResize
} from '@/lib/templates/visual-builder/resize-utils';
import type { usePositionIndicator } from '../../PositionIndicator';

export interface UseComponentResizeParams {
  // From canvasState
  placedComponents: ComponentItem[];
  updateComponent: UseCanvasStateResult['updateComponent'];

  // From CanvasRenderer
  canvasWidth: number;
  componentDimensions: Map<string, MeasuredDimensions>;

  // Integrated systems
  positionIndicator: ReturnType<typeof usePositionIndicator>;
}

export interface ResizePreview {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface UseComponentResizeResult {
  // State
  resizingComponentId: string | null;
  resizePreview: ResizePreview | null;

  // Handlers
  handleResizeStart: (componentId: string, direction: ResizeDirection) => void;
  handleResize: (componentId: string, newSize: { width: number; height: number }, newPosition: { x: number; y: number }) => void;
  handleResizeEnd: (componentId: string, finalSize: { width: number; height: number }, finalPosition: { x: number; y: number }) => void;
}

/**
 * Hook for managing component resize operations
 */
export function useComponentResize({
  placedComponents,
  updateComponent,
  canvasWidth,
  componentDimensions,
  positionIndicator
}: UseComponentResizeParams): UseComponentResizeResult {

  // Resize state
  const [resizingComponentId, setResizingComponentId] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);

  // Handle resize start - initialize preview
  const handleResizeStart = useCallback((componentId: string, direction: ResizeDirection) => {
    setResizingComponentId(componentId);

    const component = placedComponents.find(comp => comp.id === componentId);
    if (!component) return;

    // All components now use absolute positioning - no conversion needed

    // Use measured dimensions for initial preview
    const measuredDims = componentDimensions.get(componentId);
    let initialPreviewSize;

    if (measuredDims) {
      initialPreviewSize = {
        width: measuredDims.width,
        height: measuredDims.height
      };
    } else {
      const currentBreakpoint = getCurrentBreakpoint(canvasWidth);
      const currentSize = getComponentCurrentSize(component, currentBreakpoint);
      initialPreviewSize = {
        width: currentSize.width,
        height: currentSize.height
      };
    }

    setResizePreview({
      width: initialPreviewSize.width,
      height: initialPreviewSize.height,
      x: component.position.x,
      y: component.position.y
    });
  }, [placedComponents, canvasWidth, componentDimensions]);

  // Handle resize during drag - real-time updates
  const handleResize = useCallback((
    componentId: string,
    newSize: { width: number; height: number },
    newPosition: { x: number; y: number }
  ) => {
    // Update the component size in real-time during resize for immediate visual feedback
    const component = placedComponents.find(comp => comp.id === componentId);
    if (component) {
      const sizeProps = sizeToProps({
        width: newSize.width,
        height: newSize.height,
        unit: 'px'
      });

      updateComponent(componentId, {
        props: { ...component.props, ...sizeProps },
        visualBuilderState: {
          size: {
            width: newSize.width,
            height: newSize.height
          }
        } as any // Type assertion needed due to Partial<VisualBuilderComponentState> inference issue
      });
    }

    // Show position indicator during resize
    positionIndicator.showPosition(
      {
        x: newPosition.x,
        y: newPosition.y,
        width: newSize.width,
        height: newSize.height
      },
      'resize'
    );

    // Set resize preview
    setResizePreview({
      width: newSize.width,
      height: newSize.height,
      x: newPosition.x,
      y: newPosition.y
    });
  }, [placedComponents, updateComponent, positionIndicator]);

  // Handle resize end - finalize changes
  const handleResizeEnd = useCallback((
    componentId: string,
    finalSize: { width: number; height: number },
    finalPosition: { x: number; y: number }
  ) => {
    const component = placedComponents.find(comp => comp.id === componentId);
    if (!component) return;

    const currentBreakpoint = getCurrentBreakpoint(canvasWidth);

    // finalSize is now the VISUAL size (what the user sees)
    // Validate the resize operation with visual dimensions
    const validation = validateResize(component, {
      width: finalSize.width,
      height: finalSize.height,
      unit: 'px'
    });

    if (!validation.valid) {
      console.warn('Resize validation failed:', validation.reason);
      setResizingComponentId(null);
      setResizePreview(null);
      positionIndicator.hidePosition();
      return;
    }

    // SIMPLIFIED: All resized components are now absolute positioned
    // (conversion happens in handleResizeStart)
    const sizeProps = sizeToProps({
      width: finalSize.width,
      height: finalSize.height,
      unit: 'px'
    });

    // Update size in both locations (visualBuilderState and props) and update position
    updateComponent(componentId, {
      props: { ...component.props, ...sizeProps },
      position: finalPosition,
      visualBuilderState: {
        size: {
          width: finalSize.width,
          height: finalSize.height
        }
      } as any // Type assertion needed due to Partial<VisualBuilderComponentState> inference issue
    });

    // Hide position indicator
    positionIndicator.hidePosition();

    setResizingComponentId(null);
    setResizePreview(null);

    // The ResizableComponent will automatically re-measure through its ResizeObserver
    // when the actual component size changes, so no manual trigger needed here
  }, [placedComponents, canvasWidth, updateComponent, positionIndicator]);

  return {
    resizingComponentId,
    resizePreview,
    handleResizeStart,
    handleResize,
    handleResizeEnd
  };
}
