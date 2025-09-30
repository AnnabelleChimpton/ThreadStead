/**
 * Resize Utilities and Constraints System
 * Handles component resizing logic, constraints, and grid integration
 */

import type { ComponentItem } from '@/hooks/useCanvasState';
import type { ResizeConstraints } from '@/hooks/useResizable';
import {
  COMPONENT_SIZE_METADATA,
  getCurrentBreakpoint,
  type GridBreakpoint
} from './grid-utils';
import { componentRegistry } from '../core/template-registry';

export interface ComponentResizeCapability {
  canResize: boolean;
  canResizeWidth: boolean;
  canResizeHeight: boolean;
  reason?: string; // Why component can't be resized
}

export interface ComponentSize {
  width: number;
  height: number;
  unit?: 'px' | '%' | 'rem' | 'em' | 'vw' | 'vh';
}

export interface GridResizeInfo {
  canSpanResize: boolean;
  currentSpan: number;
  minSpan: number;
  maxSpan: number;
  availableSpan: number;
}

/**
 * Check if a component type supports resizing
 */
export function getComponentResizeCapability(componentType: string): ComponentResizeCapability {
  // Images are explicitly excluded from resizing
  if (componentType.toLowerCase().includes('image') ||
      componentType === 'ProfilePhoto' ||
      componentType === 'UserImage') {
    return {
      canResize: false,
      canResizeWidth: false,
      canResizeHeight: false,
      reason: 'Images should maintain their aspect ratio and original dimensions'
    };
  }

  // Check if component is registered
  const registration = componentRegistry.get(componentType);
  if (!registration) {
    return {
      canResize: false,
      canResizeWidth: false,
      canResizeHeight: false,
      reason: 'Component not found in registry'
    };
  }

  // Check component metadata for flexibility
  const metadata = COMPONENT_SIZE_METADATA[componentType];
  if (metadata && !metadata.flexible) {
    return {
      canResize: false,
      canResizeWidth: false,
      canResizeHeight: false,
      reason: 'Component has fixed size requirements'
    };
  }

  // Container components can be resized
  const isContainer = registration.relationship?.type === 'container' &&
                     registration.relationship?.acceptsChildren === true;

  // Text and content components can be resized
  const isTextComponent = componentType.includes('Text') ||
                         componentType === 'DisplayName' ||
                         componentType === 'Bio';

  // Layout components can be resized
  const isLayoutComponent = metadata?.category === 'layout' ||
                           metadata?.category === 'content';

  if (isContainer || isTextComponent || isLayoutComponent) {
    return {
      canResize: true,
      canResizeWidth: true,
      canResizeHeight: true,
    };
  }

  // Interactive components can be resized
  if (metadata?.category === 'interaction') {
    return {
      canResize: true,
      canResizeWidth: true,
      canResizeHeight: false, // Only width for buttons, badges, etc.
    };
  }

  // Default: allow resizing for unknown flexible components
  return {
    canResize: true,
    canResizeWidth: true,
    canResizeHeight: true,
  };
}

/**
 * Get resize constraints for a component
 */
export function getComponentResizeConstraints(
  component: ComponentItem,
  breakpoint: GridBreakpoint
): ResizeConstraints {
  const capability = getComponentResizeCapability(component.type);
  const metadata = COMPONENT_SIZE_METADATA[component.type];

  // Base constraints
  const constraints: ResizeConstraints = {
    minWidth: 50,
    minHeight: 30,
  };

  // Apply component-specific constraints
  if (metadata) {
    // Use grid-based sizing for grid mode components
    if (component.positioningMode === 'grid') {
      const cellWidth = (800 - (breakpoint.columns + 1) * breakpoint.gap) / breakpoint.columns; // Approximate
      constraints.minWidth = cellWidth;
      constraints.minHeight = breakpoint.rowHeight;
      constraints.snapToGrid = true;
      constraints.gridSize = Math.min(cellWidth, breakpoint.rowHeight);

      // Maximum spans based on breakpoint
      constraints.maxWidth = cellWidth * breakpoint.columns;
      constraints.maxHeight = breakpoint.rowHeight * 12; // Allow up to 12 rows
    } else {
      // Absolute positioning constraints
      constraints.minWidth = 80;
      constraints.minHeight = 50;
      constraints.maxWidth = 1200;
      constraints.maxHeight = 800;
    }

    // Apply aspect ratio for specific component types
    if (metadata.aspectRatio === 'square') {
      constraints.aspectRatio = 1;
    } else if (metadata.aspectRatio === 'wide') {
      constraints.aspectRatio = 2; // 2:1 ratio
    } else if (metadata.aspectRatio === 'tall') {
      constraints.aspectRatio = 0.5; // 1:2 ratio
    }
  }

  // Disable constraints for non-resizable dimensions
  if (!capability.canResizeWidth) {
    delete constraints.minWidth;
    delete constraints.maxWidth;
  }
  if (!capability.canResizeHeight) {
    delete constraints.minHeight;
    delete constraints.maxHeight;
    delete constraints.aspectRatio;
  }

  return constraints;
}

/**
 * Get current component size from props or calculate from grid position
 */
export function getComponentCurrentSize(component: ComponentItem, breakpoint: GridBreakpoint): ComponentSize {
  if (component.positioningMode === 'grid' && component.gridPosition) {
    // Calculate size from grid position
    const canvasWidth = 800; // Default canvas width - TODO: make this dynamic
    const columnWidth = (canvasWidth - (breakpoint.columns + 1) * breakpoint.gap) / breakpoint.columns;
    const componentWidth = (component.gridPosition.span * columnWidth) + ((component.gridPosition.span - 1) * breakpoint.gap);

    return {
      width: componentWidth,
      height: breakpoint.rowHeight,
      unit: 'px'
    };
  } else {
    // Get size from props or use defaults
    const sizeProps = component.props?._size;

    // Parse size values which may be strings like '100px' or numbers
    const parseSize = (value: any, defaultValue: number): number => {
      if (typeof value === 'string') {
        // Remove 'px' suffix and parse as number
        const parsed = parseInt(value.replace('px', ''), 10);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return value || defaultValue;
    };

    // Use larger defaults for container components to match their visual rendering
    let defaultWidth = 200;
    let defaultHeight = 150;

    // Check if this is a container component that needs larger defaults
    const componentRegistration = componentRegistry.get(component.type);
    const isContainer = componentRegistration?.relationship?.type === 'container' &&
                       (componentRegistration?.relationship?.acceptsChildren === true ||
                        Array.isArray(componentRegistration?.relationship?.acceptsChildren));

    if (component.type === 'Grid') {
      // Grid containers need extra space for grid layout
      defaultWidth = 400;
      defaultHeight = 300;
    } else if (isContainer) {
      // Other containers also need reasonable space for children
      defaultWidth = 300;
      defaultHeight = 200;
    }

    return {
      width: parseSize(sizeProps?.width, defaultWidth),
      height: parseSize(sizeProps?.height, defaultHeight),
      unit: 'px'
    };
  }
}

/**
 * Convert size to props format for saving
 */
export function sizeToProps(size: ComponentSize): Record<string, any> {
  const unit = size.unit || 'px';
  return {
    _size: {
      // ALWAYS include units to prevent CSS interpretation issues
      // This fixes the 4x amplification bug where unitless numbers were misinterpreted
      width: `${size.width}${unit}`,
      height: `${size.height}${unit}`,
    }
  };
}

/**
 * Get grid resize information for a component
 */
export function getGridResizeInfo(
  component: ComponentItem,
  breakpoint: GridBreakpoint,
  occupiedPositions: ComponentItem[] = []
): GridResizeInfo {
  if (component.positioningMode !== 'grid' || !component.gridPosition) {
    return {
      canSpanResize: false,
      currentSpan: 1,
      minSpan: 1,
      maxSpan: 1,
      availableSpan: 1
    };
  }

  const { column, span } = component.gridPosition;
  const metadata = COMPONENT_SIZE_METADATA[component.type];

  // Calculate constraints based on metadata and grid
  let defaultSpan = 1;
  if (metadata) {
    // Get appropriate span based on breakpoint columns
    if (breakpoint.columns >= 24) {
      defaultSpan = metadata.desktop;
    } else if (breakpoint.columns >= 12) {
      defaultSpan = metadata.tablet;
    } else {
      defaultSpan = metadata.mobile;
    }
  }
  const minSpan = metadata?.flexible ? 1 : defaultSpan;
  const maxSpan = breakpoint.columns;

  // Calculate available span (how far we can expand without hitting other components)
  let availableSpan = breakpoint.columns - column + 1; // Space to right edge

  // Check for collisions with other components in the same row
  const sameRowComponents = occupiedPositions.filter(comp =>
    comp.id !== component.id &&
    comp.positioningMode === 'grid' &&
    comp.gridPosition &&
    comp.gridPosition.row === component.gridPosition!.row
  );

  for (const comp of sameRowComponents) {
    if (comp.gridPosition!.column > column) {
      // Component to the right
      const spaceToComponent = comp.gridPosition!.column - column;
      availableSpan = Math.min(availableSpan, spaceToComponent);
    }
  }

  return {
    canSpanResize: metadata?.flexible !== false,
    currentSpan: span,
    minSpan,
    maxSpan: Math.min(maxSpan, availableSpan),
    availableSpan
  };
}

/**
 * Convert pixel size change to grid span change
 */
export function pixelToSpanChange(
  pixelDelta: number,
  breakpoint: GridBreakpoint,
  canvasWidth: number = 800
): number {
  const columnWidth = (canvasWidth - (breakpoint.columns + 1) * breakpoint.gap) / breakpoint.columns;
  const totalColumnWidth = columnWidth + breakpoint.gap;

  return Math.round(pixelDelta / totalColumnWidth);
}

/**
 * Convert grid span change to pixel size change
 */
export function spanToPixelChange(
  spanDelta: number,
  breakpoint: GridBreakpoint,
  canvasWidth: number = 800
): number {
  const columnWidth = (canvasWidth - (breakpoint.columns + 1) * breakpoint.gap) / breakpoint.columns;
  const totalColumnWidth = columnWidth + breakpoint.gap;

  return spanDelta * totalColumnWidth;
}

/**
 * Validate if a resize operation is allowed
 */
export function validateResize(
  component: ComponentItem,
  newSize: ComponentSize,
  newGridSpan?: number
): { valid: boolean; reason?: string } {
  const capability = getComponentResizeCapability(component.type);

  if (!capability.canResize) {
    return { valid: false, reason: capability.reason };
  }

  const breakpoint = getCurrentBreakpoint();
  const constraints = getComponentResizeConstraints(component, breakpoint);

  // Check minimum/maximum constraints
  if (constraints.minWidth && newSize.width < constraints.minWidth) {
    return { valid: false, reason: `Width cannot be less than ${constraints.minWidth}px` };
  }

  if (constraints.maxWidth && newSize.width > constraints.maxWidth) {
    return { valid: false, reason: `Width cannot be more than ${constraints.maxWidth}px` };
  }

  if (constraints.minHeight && newSize.height < constraints.minHeight) {
    return { valid: false, reason: `Height cannot be less than ${constraints.minHeight}px` };
  }

  if (constraints.maxHeight && newSize.height > constraints.maxHeight) {
    return { valid: false, reason: `Height cannot be more than ${constraints.maxHeight}px` };
  }

  // Check grid span constraints
  if (component.positioningMode === 'grid' && newGridSpan !== undefined) {
    const gridInfo = getGridResizeInfo(component, breakpoint);

    if (newGridSpan < gridInfo.minSpan) {
      return { valid: false, reason: `Cannot span less than ${gridInfo.minSpan} columns` };
    }

    if (newGridSpan > gridInfo.maxSpan) {
      return { valid: false, reason: `Cannot span more than ${gridInfo.maxSpan} columns` };
    }
  }

  return { valid: true };
}