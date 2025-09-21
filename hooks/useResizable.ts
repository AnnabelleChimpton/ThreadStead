/**
 * useResizable Hook
 * Manages resize state and interactions for components in the visual builder
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ResizeDirection } from '@/components/features/templates/visual-builder/ResizeHandle';
import type { MeasuredDimensions } from '@/components/features/templates/visual-builder/ResizableComponent';

export interface ResizeConstraints {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number; // width/height ratio to maintain
  snapToGrid?: boolean;
  gridSize?: number;
}

export interface ResizeState {
  isResizing: boolean;
  direction: ResizeDirection | null;
  startMousePos: { x: number; y: number } | null;
  startSize: { width: number; height: number } | null;
  startPosition: { x: number; y: number } | null;
  currentSize: { width: number; height: number } | null;
  currentPosition: { x: number; y: number } | null;
}

export interface UseResizableOptions {
  initialSize: { width: number; height: number };
  initialPosition: { x: number; y: number };
  constraints?: ResizeConstraints;
  onResize?: (size: { width: number; height: number }, position: { x: number; y: number }) => void;
  onResizeStart?: (direction: ResizeDirection) => void;
  onResizeEnd?: (size: { width: number; height: number }, position: { x: number; y: number }) => void;
  disabled?: boolean;
  measuredDimensions?: MeasuredDimensions | null;
}

export interface UseResizableResult {
  resizeState: ResizeState;
  startResize: (direction: ResizeDirection, event: React.MouseEvent) => void;
  isResizing: boolean;
  currentSize: { width: number; height: number };
  currentPosition: { x: number; y: number };
}

export function useResizable({
  initialSize,
  initialPosition,
  constraints = {},
  onResize,
  onResizeStart,
  onResizeEnd,
  disabled = false,
  measuredDimensions
}: UseResizableOptions): UseResizableResult {

  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    direction: null,
    startMousePos: null,
    startSize: null,
    startPosition: null,
    currentSize: null,
    currentPosition: null,
  });

  const frameRef = useRef<number | undefined>(undefined);

  // Apply constraints to size and position
  const applyConstraints = useCallback((
    newSize: { width: number; height: number },
    newPosition: { x: number; y: number },
    direction: ResizeDirection
  ): { size: { width: number; height: number }; position: { x: number; y: number } } => {

    let { width, height } = newSize;
    let { x, y } = newPosition;


    // Apply minimum/maximum constraints
    if (constraints.minWidth !== undefined) {
      width = Math.max(width, constraints.minWidth);
    }
    if (constraints.minHeight !== undefined) {
      height = Math.max(height, constraints.minHeight);
    }
    if (constraints.maxWidth !== undefined) {
      width = Math.min(width, constraints.maxWidth);
    }
    if (constraints.maxHeight !== undefined) {
      height = Math.min(height, constraints.maxHeight);
    }

    // Maintain aspect ratio if specified
    if (constraints.aspectRatio !== undefined && constraints.aspectRatio > 0) {
      const targetRatio = constraints.aspectRatio;
      const currentRatio = width / height;

      if (direction.includes('e') || direction.includes('w')) {
        // Horizontal resize - adjust height to maintain ratio
        height = width / targetRatio;
      } else if (direction.includes('n') || direction.includes('s')) {
        // Vertical resize - adjust width to maintain ratio
        width = height * targetRatio;
      } else {
        // Corner resize - choose dimension that requires less change
        const heightFromWidth = width / targetRatio;
        const widthFromHeight = height * targetRatio;

        if (Math.abs(height - heightFromWidth) < Math.abs(width - widthFromHeight)) {
          height = heightFromWidth;
        } else {
          width = widthFromHeight;
        }
      }
    }

    // Snap to grid if enabled
    if (constraints.snapToGrid && constraints.gridSize) {
      const gridSize = constraints.gridSize;
      width = Math.round(width / gridSize) * gridSize;
      height = Math.round(height / gridSize) * gridSize;
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    // Ensure position doesn't go negative (keep component visible)
    x = Math.max(0, x);
    y = Math.max(0, y);

    return {
      size: { width, height },
      position: { x, y }
    };
  }, [constraints]);

  // Calculate new size and position based on mouse movement
  const calculateResize = useCallback((
    direction: ResizeDirection,
    mouseDelta: { x: number; y: number },
    startSize: { width: number; height: number },
    startPosition: { x: number; y: number }
  ) => {
    // Work in visual coordinate space (same as selection indicator and handles)
    // Mouse delta is already in screen pixels, which maps 1:1 to visual coordinates
    // This uses the exact same coordinate system as the working selection indicator

    let newWidth = startSize.width;
    let newHeight = startSize.height;
    let newX = startPosition.x;
    let newY = startPosition.y;

    // Apply resize based on direction using visual space deltas (same as selection indicator math)
    switch (direction) {
      case 'e': // East (right edge)
        newWidth = startSize.width + mouseDelta.x;
        break;
      case 'w': // West (left edge)
        newWidth = startSize.width - mouseDelta.x;
        newX = startPosition.x + mouseDelta.x;
        break;
      case 's': // South (bottom edge)
        newHeight = startSize.height + mouseDelta.y;
        break;
      case 'n': // North (top edge)
        newHeight = startSize.height - mouseDelta.y;
        newY = startPosition.y + mouseDelta.y;
        break;
      case 'se': // Southeast (bottom-right corner)
        newWidth = startSize.width + mouseDelta.x;
        newHeight = startSize.height + mouseDelta.y;
        break;
      case 'sw': // Southwest (bottom-left corner)
        newWidth = startSize.width - mouseDelta.x;
        newHeight = startSize.height + mouseDelta.y;
        newX = startPosition.x + mouseDelta.x;
        break;
      case 'ne': // Northeast (top-right corner)
        newWidth = startSize.width + mouseDelta.x;
        newHeight = startSize.height - mouseDelta.y;
        newY = startPosition.y + mouseDelta.y;
        break;
      case 'nw': // Northwest (top-left corner)
        newWidth = startSize.width - mouseDelta.x;
        newHeight = startSize.height - mouseDelta.y;
        newX = startPosition.x + mouseDelta.x;
        newY = startPosition.y + mouseDelta.y;
        break;
    }

    return applyConstraints(
      { width: newWidth, height: newHeight },
      { x: newX, y: newY },
      direction
    );
  }, [applyConstraints]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!resizeState.isResizing || !resizeState.direction || !resizeState.startMousePos || !resizeState.startSize || !resizeState.startPosition) {
      return;
    }

    // Calculate mouse delta in screen pixels
    const mouseDelta = {
      x: event.clientX - resizeState.startMousePos.x,
      y: event.clientY - resizeState.startMousePos.y
    };

    const { size, position } = calculateResize(
      resizeState.direction,
      mouseDelta,
      resizeState.startSize,
      resizeState.startPosition
    );

    console.log('useResizable handleMouseMove:', {
      mouseDelta,
      direction: resizeState.direction,
      startSize: resizeState.startSize,
      calculatedSize: size,
      calculatedPosition: position
    });

    // Update state with debounced animation frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      setResizeState(prev => ({
        ...prev,
        currentSize: size,
        currentPosition: position
      }));

      // Call resize callback
      if (onResize) {
        onResize(size, position);
      }
    });
  }, [resizeState, calculateResize, onResize]);

  // Handle mouse up to end resize
  const handleMouseUp = useCallback(() => {
    if (!resizeState.isResizing) return;

    const finalSize = resizeState.currentSize || initialSize;
    const finalPosition = resizeState.currentPosition || initialPosition;

    setResizeState({
      isResizing: false,
      direction: null,
      startMousePos: null,
      startSize: null,
      startPosition: null,
      currentSize: null,
      currentPosition: null,
    });

    // Call resize end callback
    if (onResizeEnd) {
      onResizeEnd(finalSize, finalPosition);
    }
  }, [resizeState, initialSize, initialPosition, onResizeEnd]);

  // Start resize operation
  const startResize = useCallback((direction: ResizeDirection, event: React.MouseEvent) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();

    const startMousePos = { x: event.clientX, y: event.clientY };

    // Use the current resize state size if available, otherwise use initial size
    // This ensures continuity during multiple resize operations and prevents amplification
    const startSize = resizeState.currentSize || initialSize;
    const startPosition = resizeState.currentPosition || initialPosition;

    console.log('useResizable startResize:', {
      direction,
      startSize,
      initialSize,
      resizeStateCurrentSize: resizeState.currentSize,
      startPosition,
      startMousePos
    });

    setResizeState({
      isResizing: true,
      direction,
      startMousePos,
      startSize,
      startPosition,
      currentSize: startSize,
      currentPosition: startPosition,
    });

    // Call resize start callback
    if (onResizeStart) {
      onResizeStart(direction);
    }
  }, [disabled, resizeState.currentSize, resizeState.currentPosition, initialSize, initialPosition, onResizeStart]);

  // Set up mouse event listeners
  useEffect(() => {
    if (!resizeState.isResizing) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [resizeState.isResizing, handleMouseMove, handleMouseUp]);

  return {
    resizeState,
    startResize,
    isResizing: resizeState.isResizing,
    currentSize: resizeState.currentSize || initialSize,
    currentPosition: resizeState.currentPosition || initialPosition,
  };
}