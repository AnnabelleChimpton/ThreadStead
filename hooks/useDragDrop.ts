/**
 * VISUAL_BUILDER_PROGRESS: Drag Drop Hook
 * Phase 1: Visual Builder Foundation - React Hooks
 */

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DragState,
  DraggedItem,
  DropTarget,
  DropZone,
  CanvasComponent,
} from '@/lib/templates/visual-builder/types';
import {
  DragDropManager,
  createDropZonesForComponent,
  calculateInsertionIndex,
} from '@/lib/templates/visual-builder/drag-drop-manager';


export interface UseDragDropResult {
  // Drag operations
  startPaletteDrag: (componentType: string, event: React.MouseEvent) => void;
  startCanvasDrag: (component: CanvasComponent, event: React.MouseEvent) => void;

  // Drop zone management
  registerDropZone: (element: HTMLElement, component: CanvasComponent) => void;
  unregisterDropZone: (componentId: string) => void;

  // State
  dragState: DragState | null;
  isDropZoneActive: (componentId: string) => boolean;
  isValidDropTarget: (componentId: string, draggedType?: string) => boolean;

  // Event handlers
  onMouseMove: (event: MouseEvent) => void;
  onMouseUp: (event: MouseEvent) => void;

  // Drop zone helpers
  getDropZonesForComponent: (componentId: string) => DropZone[];
}

export interface UseDragDropOptions {
  onDragStart?: (draggedItem: DraggedItem) => void;
  onDragEnd?: (success: boolean) => void;
  onDrop?: (draggedItem: DraggedItem, dropTarget: DropTarget) => void;
  onDragStateChange?: (dragState: DragState | null) => void;
}

/**
 * Hook for managing drag and drop functionality in the visual builder
 */
export function useDragDrop(options: UseDragDropOptions = {}): UseDragDropResult {
  const {
    onDragStart,
    onDragEnd,
    onDrop,
    onDragStateChange,
  } = options;

  const dragDropManagerRef = useRef<DragDropManager | null>(null);
  const registeredElements = useRef<Map<string, HTMLElement>>(new Map());

  // Initialize drag drop manager
  const initializeDragDropManager = useCallback(() => {
    if (!dragDropManagerRef.current) {
      try {

        const manager = new DragDropManager(onDragStateChange, onDrop);

        dragDropManagerRef.current = manager;
      } catch (error) {
        console.error('🔍 Failed to create DragDropManager:', error);
        if (error instanceof Error) {
          console.error('🔍 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
      }
    }
  }, [onDragStateChange, onDrop]);

  // Ensure manager is initialized
  useEffect(() => {
    initializeDragDropManager();
  }, [initializeDragDropManager]);

  // Track drag state changes with a state variable
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Update drag state when manager changes it
  useEffect(() => {
    if (dragDropManagerRef.current) {
      const updateDragState = () => {
        const state = dragDropManagerRef.current?.getDragState() || null;
        setDragState(state);
      };

      // Update immediately
      updateDragState();

      // Set up polling to catch drag state changes
      const interval = setInterval(updateDragState, 50);
      return () => clearInterval(interval);
    }
  }, [dragDropManagerRef.current]);

  // Start dragging from component palette
  const startPaletteDrag = useCallback((componentType: string, event: React.MouseEvent) => {

    if (!dragDropManagerRef.current) {
      initializeDragDropManager();
    }

    const startPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    dragDropManagerRef.current?.startPaletteDrag(componentType, startPosition);
    onDragStart?.({
      source: 'palette',
      componentType,
    });
  }, [initializeDragDropManager, onDragStart]);

  // Start dragging from canvas
  const startCanvasDrag = useCallback((component: CanvasComponent, event: React.MouseEvent) => {
    if (!dragDropManagerRef.current) {
      initializeDragDropManager();
    }

    const startPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    dragDropManagerRef.current?.startCanvasDrag(component, startPosition);
    onDragStart?.({
      source: 'canvas',
      componentId: component.id,
      component,
    });
  }, [initializeDragDropManager, onDragStart]);

  // Register a drop zone
  const registerDropZone = useCallback((element: HTMLElement, component: CanvasComponent) => {
    if (!dragDropManagerRef.current) {
      initializeDragDropManager();
    }

    // Store element reference
    registeredElements.current.set(component.id, element);

    // Create drop zones for this component
    const dropZones = createDropZonesForComponent(
      component,
      element,
      component.constraints
    );

    // Register all drop zones
    dropZones.forEach(dropZone => {
      dragDropManagerRef.current?.registerDropZone(dropZone);
    });
  }, [initializeDragDropManager]);

  // Unregister a drop zone
  const unregisterDropZone = useCallback((componentId: string) => {
    if (!dragDropManagerRef.current) return;

    // Remove element reference
    registeredElements.current.delete(componentId);

    // Get all drop zones for this component and unregister them
    const dropZones = dragDropManagerRef.current.getDropZones();
    dropZones
      .filter(zone => zone.id.startsWith(componentId))
      .forEach(zone => {
        dragDropManagerRef.current?.unregisterDropZone(zone.id);
      });
  }, []);

  // Mouse move handler - FIXED: should work when drag state exists, not just when isDragging
  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!dragDropManagerRef.current || !dragState) return;

    const position = {
      x: event.clientX,
      y: event.clientY,
    };

    // Mouse tracking for drag operations

    dragDropManagerRef.current.updateDragPosition(position);
  }, [dragState]);

  // Mouse up handler
  const onMouseUp = useCallback((event: MouseEvent) => {
    if (!dragDropManagerRef.current) return;

    const dropPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    const success = dragDropManagerRef.current.endDrag(dropPosition);
    onDragEnd?.(success);
  }, [onDragEnd]);

  // Check if drop zone is active
  const isDropZoneActive = useCallback((componentId: string): boolean => {
    if (!dragDropManagerRef.current || !dragState?.isDragging) return false;

    const dropZones = dragDropManagerRef.current.getDropZones();
    return dropZones.some(zone =>
      zone.id.startsWith(componentId) && zone.isActive
    );
  }, [dragState?.isDragging]);

  // Check if component is a valid drop target
  const isValidDropTarget = useCallback((componentId: string, draggedType?: string): boolean => {
    if (!dragDropManagerRef.current || !dragState?.isDragging) return false;

    const dropZones = dragDropManagerRef.current.getDropZones();
    const componentDropZones = dropZones.filter(zone => zone.id.startsWith(componentId));

    if (componentDropZones.length === 0) return false;

    // Get the type of the dragged component
    const draggedComponentType = draggedType ||
      dragState.draggedComponent?.componentType ||
      dragState.draggedComponent?.component?.type;

    if (!draggedComponentType) return false;

    // Check if any drop zone accepts this type
    return componentDropZones.some(zone =>
      zone.accepts.includes(draggedComponentType) || zone.accepts.includes('*')
    );
  }, [dragState]);

  // Get drop zones for a specific component
  const getDropZonesForComponent = useCallback((componentId: string): DropZone[] => {
    if (!dragDropManagerRef.current) return [];

    const dropZones = dragDropManagerRef.current.getDropZones();
    return dropZones.filter(zone => zone.id.startsWith(componentId));
  }, []);


  // Global mouse event listeners for drag operations
  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [dragState, onMouseMove, onMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {

      // Cancel any ongoing drag
      dragDropManagerRef.current?.cancelDrag();

      // Clear all drop zones
      const dropZones = dragDropManagerRef.current?.getDropZones() || [];
      dropZones.forEach(zone => {
        dragDropManagerRef.current?.unregisterDropZone(zone.id);
      });

      // Clear element references
      registeredElements.current.clear();

      // Clear manager reference
      dragDropManagerRef.current = null;
    };
  }, []); // Empty dependency array - only cleanup on unmount

  return {
    // Drag operations
    startPaletteDrag,
    startCanvasDrag,

    // Drop zone management
    registerDropZone,
    unregisterDropZone,

    // State
    dragState,
    isDropZoneActive,
    isValidDropTarget,

    // Event handlers
    onMouseMove,
    onMouseUp,

    // Drop zone helpers
    getDropZonesForComponent,
  };
}

/**
 * Hook for making an element draggable from the component palette
 */
export function usePaletteDraggable(
  componentType: string,
  dragDropResult: UseDragDropResult
) {
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent event bubbling to parent components
    dragDropResult.startPaletteDrag(componentType, event);
  }, [componentType, dragDropResult]);

  return {
    onMouseDown: handleMouseDown,
    draggable: false, // We're using mouse events instead of HTML5 drag API
  };
}

/**
 * Hook for making a canvas component draggable
 */
export function useCanvasDraggable(
  component: CanvasComponent,
  dragDropResult: UseDragDropResult
) {
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Only start drag if not clicking on interactive elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'A') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragDropResult.startCanvasDrag(component, event);
  }, [component, dragDropResult]);

  return {
    onMouseDown: handleMouseDown,
    draggable: false,
  };
}

/**
 * Hook for making an element a drop zone
 */
export function useDropZone(
  component: CanvasComponent,
  dragDropResult: UseDragDropResult
) {
  const elementRef = useRef<HTMLDivElement>(null);

  // Register/unregister drop zone when component or element changes
  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      dragDropResult.registerDropZone(element, component);

      return () => {
        dragDropResult.unregisterDropZone(component.id);
      };
    }
  }, [component, dragDropResult]);

  const isActive = dragDropResult.isDropZoneActive(component.id);
  const isValidTarget = dragDropResult.isValidDropTarget(component.id);

  return {
    ref: elementRef,
    isActive,
    isValidTarget,
    className: `drop-zone ${isActive ? 'drop-zone--active' : ''} ${isValidTarget ? 'drop-zone--valid' : ''}`,
  } as const;
}