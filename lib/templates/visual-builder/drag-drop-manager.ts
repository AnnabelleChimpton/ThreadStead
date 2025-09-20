/**
 * VISUAL_BUILDER_PROGRESS: Drag and Drop Manager
 * Phase 1: Visual Builder Foundation - Drag & Drop System
 */

import type {
  DragState,
  DraggedItem,
  DropTarget,
  DropZone,
  CanvasComponent,
  ComponentPosition,
  LayoutConstraints,
} from './types';
import {
  DRAG_DROP,
  CANVAS_CONSTRAINTS,
} from './constants';

/**
 * Drag and Drop Manager for visual builder
 */
export class DragDropManager {
  private dragState: DragState | null = null;
  private dropZones: Map<string, DropZone> = new Map();
  private dragStartPosition: { x: number; y: number } | null = null;
  private dragThresholdMet = false;

  // Event listeners
  private onDragStateChange?: (dragState: DragState | null) => void;
  private onDrop?: (draggedItem: DraggedItem, dropTarget: DropTarget) => void;

  constructor(
    onDragStateChange?: (dragState: DragState | null) => void,
    onDrop?: (draggedItem: DraggedItem, dropTarget: DropTarget) => void
  ) {
    this.onDragStateChange = onDragStateChange;
    this.onDrop = onDrop;
  }

  /**
   * Start dragging a component from the palette
   */
  startPaletteDrag(componentType: string, startPosition: { x: number; y: number }): void {
    const draggedItem: DraggedItem = {
      source: 'palette',
      componentType,
    };

    this.initializeDrag(draggedItem, startPosition);
  }

  /**
   * Start dragging an existing component from canvas
   */
  startCanvasDrag(
    component: CanvasComponent,
    startPosition: { x: number; y: number }
  ): void {
    const draggedItem: DraggedItem = {
      source: 'canvas',
      componentId: component.id,
      component,
    };

    this.initializeDrag(draggedItem, startPosition);
  }

  /**
   * Update drag position
   */
  updateDragPosition(currentPosition: { x: number; y: number }): void {
    if (!this.dragStartPosition) return;

    // Check if we've met the drag threshold
    if (!this.dragThresholdMet) {
      const distance = Math.sqrt(
        Math.pow(currentPosition.x - this.dragStartPosition.x, 2) +
        Math.pow(currentPosition.y - this.dragStartPosition.y, 2)
      );

      if (distance >= DRAG_DROP.DRAG_THRESHOLD) {
        this.dragThresholdMet = true;
        this.setDragState({
          isDragging: true,
          draggedComponent: this.dragState?.draggedComponent || null,
          dropTarget: null,
          dragOffset: {
            x: currentPosition.x - this.dragStartPosition.x,
            y: currentPosition.y - this.dragStartPosition.y,
          },
          startPosition: this.dragStartPosition,
          currentPosition: currentPosition,
        });
      }
      return;
    }

    if (!this.dragState) return;

    // Update drag offset and current position
    const dragOffset = {
      x: currentPosition.x - this.dragStartPosition.x,
      y: currentPosition.y - this.dragStartPosition.y,
    };

    // Store current mouse position for drag preview
    const currentMousePosition = {
      x: currentPosition.x,
      y: currentPosition.y,
    };

    // Find the best drop target
    const dropTarget = this.findDropTarget(currentPosition);

    this.setDragState({
      ...this.dragState,
      dragOffset,
      dropTarget,
      currentPosition: currentMousePosition,
    });
  }

  /**
   * End the drag operation
   */
  endDrag(dropPosition?: { x: number; y: number }): boolean {
    if (!this.dragState || !this.dragThresholdMet) {
      this.cancelDrag();
      return false;
    }

    const { draggedComponent, dropTarget } = this.dragState;

    // Check if we have a valid drop target
    if (draggedComponent && dropTarget && this.validateDrop(draggedComponent, dropTarget)) {
      this.onDrop?.(draggedComponent, dropTarget);
      this.cleanup();
      return true;
    }

    this.cancelDrag();
    return false;
  }

  /**
   * Cancel the drag operation
   */
  cancelDrag(): void {
    this.cleanup();
  }

  /**
   * Register a drop zone
   */
  registerDropZone(dropZone: DropZone): void {
    this.dropZones.set(dropZone.id, dropZone);
  }

  /**
   * Unregister a drop zone
   */
  unregisterDropZone(id: string): void {
    this.dropZones.delete(id);
  }

  /**
   * Update a drop zone
   */
  updateDropZone(id: string, updates: Partial<DropZone>): void {
    const existing = this.dropZones.get(id);
    if (existing) {
      this.dropZones.set(id, { ...existing, ...updates });
    }
  }

  /**
   * Get current drag state
   */
  getDragState(): DragState | null {
    return this.dragState;
  }

  /**
   * Get all drop zones
   */
  getDropZones(): DropZone[] {
    return Array.from(this.dropZones.values());
  }

  /**
   * Check if a position is over a drop zone
   */
  isOverDropZone(position: { x: number; y: number }): DropZone | null {
    for (const dropZone of this.dropZones.values()) {
      if (this.isPositionInBounds(position, dropZone.bounds)) {
        return dropZone;
      }
    }
    return null;
  }

  // Private methods

  /**
   * Initialize drag operation
   */
  private initializeDrag(draggedItem: DraggedItem, startPosition: { x: number; y: number }): void {
    this.dragStartPosition = startPosition;
    this.dragThresholdMet = false;

    this.setDragState({
      isDragging: false, // Will become true once threshold is met
      draggedComponent: draggedItem,
      dropTarget: null,
      dragOffset: { x: 0, y: 0 },
      startPosition,
    });
  }

  /**
   * Set drag state and notify listeners
   */
  private setDragState(newState: DragState): void {
    this.dragState = newState;
    this.onDragStateChange?.(newState);
  }

  /**
   * Find the best drop target for current position
   */
  private findDropTarget(position: { x: number; y: number }): DropTarget | null {
    const dropZone = this.isOverDropZone(position);
    if (!dropZone) return null;

    // Convert drop zone to drop target
    return {
      id: dropZone.id,
      type: dropZone.parentId ? 'component' : 'canvas',
      accepts: dropZone.accepts,
      position: {
        x: position.x - dropZone.bounds.left,
        y: position.y - dropZone.bounds.top,
      },
      size: {
        width: dropZone.bounds.width,
        height: dropZone.bounds.height,
      },
    };
  }

  /**
   * Validate if a drop is allowed
   */
  private validateDrop(draggedItem: DraggedItem, dropTarget: DropTarget): boolean {
    // Get the component type being dragged
    const componentType = draggedItem.componentType || draggedItem.component?.type;
    if (!componentType) return false;

    // Check if the drop target accepts this component type
    if (!dropTarget.accepts.includes(componentType) && !dropTarget.accepts.includes('*')) {
      return false;
    }

    // Additional validation can be added here
    // - Check nesting depth
    // - Check component constraints
    // - Check circular references for canvas moves

    return true;
  }

  /**
   * Check if position is within bounds
   */
  private isPositionInBounds(position: { x: number; y: number }, bounds: DOMRect): boolean {
    return (
      position.x >= bounds.left &&
      position.x <= bounds.right &&
      position.y >= bounds.top &&
      position.y <= bounds.bottom
    );
  }

  /**
   * Clean up drag state
   */
  private cleanup(): void {
    this.dragState = null;
    this.dragStartPosition = null;
    this.dragThresholdMet = false;
    this.onDragStateChange?.(null);
  }
}

/**
 * Create drop zones for a component
 */
export function createDropZonesForComponent(
  component: CanvasComponent,
  element: HTMLElement,
  constraints: LayoutConstraints = {}
): DropZone[] {
  const dropZones: DropZone[] = [];
  const bounds = element.getBoundingClientRect();

  // Main component drop zone
  // Special case: root canvas should not have a parentId to be treated as canvas type
  const isRootCanvas = component.id === 'canvas-root';
  const mainDropZone: DropZone = {
    id: `${component.id}-main`,
    parentId: isRootCanvas ? null : component.id,
    accepts: constraints.allowedChildren || ['*'],
    constraints,
    bounds,
    isActive: true,
    isValid: true,
  };

  dropZones.push(mainDropZone);

  // Create additional drop zones for layout components
  if (isLayoutComponent(component.type)) {
    const layoutDropZones = createLayoutDropZones(component, element, constraints);
    dropZones.push(...layoutDropZones);
  }

  return dropZones;
}

/**
 * Create drop zones for layout components
 */
function createLayoutDropZones(
  component: CanvasComponent,
  element: HTMLElement,
  constraints: LayoutConstraints
): DropZone[] {
  const dropZones: DropZone[] = [];
  const bounds = element.getBoundingClientRect();

  switch (component.type) {
    case 'FlexContainer':
      dropZones.push(...createFlexDropZones(component, bounds, constraints));
      break;
    case 'GridLayout':
      dropZones.push(...createGridDropZones(component, bounds, constraints));
      break;
    case 'SplitLayout':
      dropZones.push(...createSplitDropZones(component, bounds, constraints));
      break;
  }

  return dropZones;
}

/**
 * Create drop zones for flex containers
 */
function createFlexDropZones(
  component: CanvasComponent,
  bounds: DOMRect,
  constraints: LayoutConstraints
): DropZone[] {
  const direction = component.props.direction as string || 'row';
  const dropZones: DropZone[] = [];

  if (direction === 'row' || direction === 'row-reverse') {
    // Create horizontal drop zones
    const children = component.children || [];
    const sectionWidth = bounds.width / (children.length + 1);

    for (let i = 0; i <= children.length; i++) {
      dropZones.push({
        id: `${component.id}-flex-${i}`,
        parentId: component.id,
        accepts: constraints.allowedChildren || ['*'],
        constraints,
        bounds: new DOMRect(
          bounds.left + i * sectionWidth,
          bounds.top,
          sectionWidth,
          bounds.height
        ),
        isActive: true,
        isValid: true,
      });
    }
  } else {
    // Create vertical drop zones
    const children = component.children || [];
    const sectionHeight = bounds.height / (children.length + 1);

    for (let i = 0; i <= children.length; i++) {
      dropZones.push({
        id: `${component.id}-flex-${i}`,
        parentId: component.id,
        accepts: constraints.allowedChildren || ['*'],
        constraints,
        bounds: new DOMRect(
          bounds.left,
          bounds.top + i * sectionHeight,
          bounds.width,
          sectionHeight
        ),
        isActive: true,
        isValid: true,
      });
    }
  }

  return dropZones;
}

/**
 * Create drop zones for grid layouts
 */
function createGridDropZones(
  component: CanvasComponent,
  bounds: DOMRect,
  constraints: LayoutConstraints
): DropZone[] {
  const columns = parseInt(component.props.columns as string) || 2;
  const dropZones: DropZone[] = [];

  const cellWidth = bounds.width / columns;
  const children = component.children || [];
  const rows = Math.ceil((children.length + 1) / columns);
  const cellHeight = bounds.height / rows;

  // Create drop zones for each grid cell
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index <= children.length) {
        dropZones.push({
          id: `${component.id}-grid-${row}-${col}`,
          parentId: component.id,
          accepts: constraints.allowedChildren || ['*'],
          constraints,
          bounds: new DOMRect(
            bounds.left + col * cellWidth,
            bounds.top + row * cellHeight,
            cellWidth,
            cellHeight
          ),
          isActive: true,
          isValid: true,
        });
      }
    }
  }

  return dropZones;
}

/**
 * Create drop zones for split layouts
 */
function createSplitDropZones(
  component: CanvasComponent,
  bounds: DOMRect,
  constraints: LayoutConstraints
): DropZone[] {
  const ratio = component.props.ratio as string || '1:1';
  const [left, right] = ratio.split(':').map(Number);
  const total = left + right;
  const leftPercent = left / total;

  const vertical = component.props.vertical as boolean || false;

  if (vertical) {
    return [
      {
        id: `${component.id}-split-top`,
        parentId: component.id,
        accepts: constraints.allowedChildren || ['*'],
        constraints,
        bounds: new DOMRect(
          bounds.left,
          bounds.top,
          bounds.width,
          bounds.height * leftPercent
        ),
        isActive: true,
        isValid: true,
      },
      {
        id: `${component.id}-split-bottom`,
        parentId: component.id,
        accepts: constraints.allowedChildren || ['*'],
        constraints,
        bounds: new DOMRect(
          bounds.left,
          bounds.top + bounds.height * leftPercent,
          bounds.width,
          bounds.height * (1 - leftPercent)
        ),
        isActive: true,
        isValid: true,
      },
    ];
  } else {
    return [
      {
        id: `${component.id}-split-left`,
        parentId: component.id,
        accepts: constraints.allowedChildren || ['*'],
        constraints,
        bounds: new DOMRect(
          bounds.left,
          bounds.top,
          bounds.width * leftPercent,
          bounds.height
        ),
        isActive: true,
        isValid: true,
      },
      {
        id: `${component.id}-split-right`,
        parentId: component.id,
        accepts: constraints.allowedChildren || ['*'],
        constraints,
        bounds: new DOMRect(
          bounds.left + bounds.width * leftPercent,
          bounds.top,
          bounds.width * (1 - leftPercent),
          bounds.height
        ),
        isActive: true,
        isValid: true,
      },
    ];
  }
}

/**
 * Check if a component is a layout component
 */
function isLayoutComponent(componentType: string): boolean {
  const layoutComponents = [
    'FlexContainer',
    'GridLayout',
    'SplitLayout',
    'CenteredBox',
    'Tabs',
  ];
  return layoutComponents.includes(componentType);
}

/**
 * Calculate insertion index for ordered containers
 */
export function calculateInsertionIndex(
  dropZone: DropZone,
  dropPosition: { x: number; y: number },
  containerType: string,
  children: CanvasComponent[]
): number {
  switch (containerType) {
    case 'FlexContainer':
      return calculateFlexInsertionIndex(dropZone, dropPosition, children);
    case 'GridLayout':
      return calculateGridInsertionIndex(dropZone, dropPosition, children);
    default:
      return children.length; // Append by default
  }
}

/**
 * Calculate insertion index for flex containers
 */
function calculateFlexInsertionIndex(
  dropZone: DropZone,
  dropPosition: { x: number; y: number },
  children: CanvasComponent[]
): number {
  // Extract index from dropZone id (format: componentId-flex-index)
  const match = dropZone.id.match(/-flex-(\d+)$/);
  return match ? parseInt(match[1]) : children.length;
}

/**
 * Calculate insertion index for grid layouts
 */
function calculateGridInsertionIndex(
  dropZone: DropZone,
  dropPosition: { x: number; y: number },
  children: CanvasComponent[]
): number {
  // Extract row and column from dropZone id (format: componentId-grid-row-col)
  const match = dropZone.id.match(/-grid-(\d+)-(\d+)$/);
  if (match) {
    const row = parseInt(match[1]);
    const col = parseInt(match[2]);
    // Assuming 2 columns by default, this should be dynamic based on component props
    return row * 2 + col;
  }
  return children.length;
}