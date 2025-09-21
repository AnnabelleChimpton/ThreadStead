/**
 * ResizableComponent Wrapper
 * Handles resize logic for individual components while following React hooks rules
 */

import React, { useRef, useLayoutEffect, useState } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import { ResizeHandles, type ResizeDirection } from './ResizeHandle';
import { useResizable } from '@/hooks/useResizable';
import {
  getComponentResizeCapability,
  getComponentResizeConstraints,
  getComponentCurrentSize,
} from '@/lib/templates/visual-builder/resize-utils';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';

export interface MeasuredDimensions {
  // Visual component dimensions (what the user actually sees)
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;

  // Container dimensions (for coordinate conversion)
  containerWidth: number;
  containerHeight: number;

  // Padding/margin differences for coordinate conversion
  paddingLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
}

// Coordinate conversion utilities
export function containerToVisual(
  containerSize: { width: number; height: number },
  measuredDims: MeasuredDimensions
): { width: number; height: number } {
  return {
    width: containerSize.width - measuredDims.paddingLeft - measuredDims.paddingRight,
    height: containerSize.height - measuredDims.paddingTop - measuredDims.paddingBottom,
  };
}

export function visualToContainer(
  visualSize: { width: number; height: number },
  measuredDims: MeasuredDimensions
): { width: number; height: number } {
  return {
    width: visualSize.width + measuredDims.paddingLeft + measuredDims.paddingRight,
    height: visualSize.height + measuredDims.paddingTop + measuredDims.paddingBottom,
  };
}

interface ResizableComponentProps {
  component: ComponentItem;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  canvasWidth: number;
  onResizeStart: (componentId: string, direction: ResizeDirection) => void;
  onResize: (componentId: string, size: { width: number; height: number }, position: { x: number; y: number }) => void;
  onResizeEnd: (componentId: string, size: { width: number; height: number }, position: { x: number; y: number }) => void;
  onMeasuredDimensions?: (dimensions: MeasuredDimensions | null) => void;
  children: React.ReactNode;
}

export default function ResizableComponent({
  component,
  isSelected,
  isDragging,
  isResizing,
  canvasWidth,
  onResizeStart,
  onResize,
  onResizeEnd,
  onMeasuredDimensions,
  children
}: ResizableComponentProps) {
  // Always call hooks at the top level
  const resizeCapability = getComponentResizeCapability(component.type);
  const currentBreakpoint = getCurrentBreakpoint(canvasWidth);
  const currentSize = getComponentCurrentSize(component, currentBreakpoint);
  const constraints = getComponentResizeConstraints(component, currentBreakpoint);


  // Refs and state for dimension measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  const [measuredDimensions, setMeasuredDimensions] = useState<MeasuredDimensions | null>(null);


  // Measure actual component dimensions
  useLayoutEffect(() => {
    if (!componentRef.current || !containerRef.current) {
      if (measuredDimensions !== null) {
        setMeasuredDimensions(null);
        onMeasuredDimensions?.(null);
      }
      return;
    }

    const measureDimensions = () => {
      if (!componentRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const componentRect = componentRef.current.getBoundingClientRect();

      // Calculate padding differences between container and visual component
      const paddingLeft = componentRect.left - containerRect.left;
      const paddingTop = componentRect.top - containerRect.top;
      const paddingRight = containerRect.right - componentRect.right;
      const paddingBottom = containerRect.bottom - componentRect.bottom;

      const newDimensions: MeasuredDimensions = {
        // Visual component dimensions
        width: Math.round(componentRect.width),
        height: Math.round(componentRect.height),
        offsetX: Math.round(paddingLeft),
        offsetY: Math.round(paddingTop),

        // Container dimensions
        containerWidth: Math.round(containerRect.width),
        containerHeight: Math.round(containerRect.height),

        // Padding differences for coordinate conversion
        paddingLeft: Math.round(paddingLeft),
        paddingTop: Math.round(paddingTop),
        paddingRight: Math.round(paddingRight),
        paddingBottom: Math.round(paddingBottom),
      };

      // Only update if dimensions actually changed (prevent infinite loops)
      setMeasuredDimensions(prev => {
        if (!prev ||
            prev.width !== newDimensions.width ||
            prev.height !== newDimensions.height ||
            prev.offsetX !== newDimensions.offsetX ||
            prev.offsetY !== newDimensions.offsetY ||
            prev.containerWidth !== newDimensions.containerWidth ||
            prev.containerHeight !== newDimensions.containerHeight) {
          onMeasuredDimensions?.(newDimensions);
          return newDimensions;
        }
        return prev;
      });
    };

    // Use a timeout to avoid measuring during render
    const timeoutId = setTimeout(measureDimensions, 0);

    // Set up ResizeObserver for dynamic updates (with throttling)
    let throttleTimeout: number | undefined;
    const throttledMeasure = () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      throttleTimeout = window.setTimeout(measureDimensions, 16); // ~60fps
    };

    const resizeObserver = new ResizeObserver(throttledMeasure);
    resizeObserver.observe(componentRef.current);
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timeoutId);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      resizeObserver.disconnect();
    };
  }, [isSelected, isResizing]); // Add isResizing to trigger re-measurement when resize state changes

  // Always use the stored component size as the source of truth
  // Don't mix visual measurements with stored sizes
  const initialSize = currentSize;

  const resizableHook = useResizable({
    initialSize, // Use the stored component size
    initialPosition: component.position, // Component position stays in canvas coordinates
    constraints,
    onResizeStart: (direction) => onResizeStart(component.id, direction),
    onResize: (size, position) => {

      // SIMPLIFIED: Just pass the size directly without any conversions
      // The size from useResizable is what we want to store
      const componentPosition = {
        x: component.position.x, // Keep original canvas position
        y: component.position.y  // Keep original canvas position
      };

      onResize(component.id, size, componentPosition);
    },
    onResizeEnd: (size, position) => {
      // SIMPLIFIED: Just pass the visual size directly without any conversions
      const componentPosition = {
        x: component.position.x, // Keep original canvas position
        y: component.position.y  // Keep original canvas position
      };
      onResizeEnd(component.id, size, componentPosition);
    },
    disabled: !resizeCapability.canResize,
    measuredDimensions // Pass measured dimensions for accurate handle positioning
  });

  // Determine if resize handles should be shown
  const shouldShowResizeHandles = isSelected &&
                                  !isDragging &&
                                  !isResizing &&
                                  resizeCapability.canResize;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div ref={componentRef} className="w-full h-full">
        {children}
      </div>

      {/* Clean, industry-standard resize handles positioned around the component */}
      {shouldShowResizeHandles && (
        <ResizeHandles
          onResizeStart={resizableHook.startResize}
          enableCorners={resizeCapability.canResizeWidth && resizeCapability.canResizeHeight}
          enableEdges={resizeCapability.canResizeWidth || resizeCapability.canResizeHeight}
          className="z-30"
          size={6}
          measuredDimensions={measuredDimensions || undefined}
        />
      )}

      {/* Simple resize capability indicator - only show for non-resizable */}
      {isSelected && !isDragging && !isResizing && !resizeCapability.canResize && (
        <div className="absolute -bottom-6 left-0 bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg z-30 whitespace-nowrap opacity-75">
          {resizeCapability.reason || 'Not resizable'}
        </div>
      )}
    </div>
  );
}