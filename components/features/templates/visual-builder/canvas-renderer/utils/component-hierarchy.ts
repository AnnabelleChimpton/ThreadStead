/**
 * Component hierarchy and positioning utilities for canvas renderer
 */

import type { ComponentItem } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';
import { getComponentCurrentSize } from '@/lib/templates/visual-builder/resize-utils';
import { isContainerComponent } from './component-type-checkers';

/**
 * Find the parent component containing a specific child
 */
export function findParentOfChild(childId: string, placedComponents: ComponentItem[]): ComponentItem | null {
  for (const component of placedComponents) {
    if (component.children) {
      const childFound = component.children.find(child => child.id === childId);
      if (childFound) {
        return component;
      }
    }
  }
  return null;
}

/**
 * Find container component at position for drop targeting
 */
export function findContainerAtPosition(
  x: number,
  y: number,
  placedComponents: ComponentItem[],
  excludeComponent?: string, // Exclude a specific component ID (for when dragging existing components)
  canvasWidth?: number // Optional canvas width for grid calculations
): ComponentItem | null {
  // Sort by z-index/position to find the topmost container
  const containers = placedComponents.filter(comp =>
    isContainerComponent(comp.type) &&
    (!excludeComponent || comp.id !== excludeComponent)
  );

  for (const container of containers) {
    const containerX = container.position?.x || 0;
    const containerY = container.position?.y || 0;

    let containerWidth = 200; // Default fallback
    let containerHeight = 150; // Default fallback

    try {
      // Calculate actual container size based on positioning mode
      const currentBreakpoint = getCurrentBreakpoint(canvasWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024));
      const currentSize = getComponentCurrentSize(container, currentBreakpoint);

      containerWidth = currentSize.width;
      containerHeight = currentSize.height;

    } catch (error) {
      // Fall back to defaults if size calculation fails
    }

    // Enhanced tolerance zone for easier dropping
    // Larger tolerance for Grid containers to make them easier to target
    const tolerance = container.type === 'Grid' ? 15 : 10;
    const hitTest = x >= containerX - tolerance && x <= containerX + containerWidth + tolerance &&
                   y >= containerY - tolerance && y <= containerY + containerHeight + tolerance;

    if (hitTest) {
      return container;
    }
  }

  return null;
}

/**
 * Find a suitable parent component at the given position
 */
export function findSuitableParentAtPosition(
  x: number,
  y: number,
  requiredParentType: string | string[],
  placedComponents: ComponentItem[]
): ComponentItem | null {
  const acceptableParentTypes = Array.isArray(requiredParentType)
    ? requiredParentType
    : [requiredParentType];

  // Look for parent components that:
  // 1. Are of the correct type
  // 2. Are positioned near the drop location (within 100px)
  // 3. Can accept more children

  for (const component of placedComponents) {
    if (!acceptableParentTypes.includes(component.type)) continue;

    const componentRegistration = componentRegistry.get(component.type);
    if (!componentRegistration?.relationship) continue;

    const relationship = componentRegistration.relationship;

    // Check if this parent can accept more children
    const currentChildCount = component.children?.length || 0;
    if (relationship.maxChildren && currentChildCount >= relationship.maxChildren) {
      continue;
    }

    // Check if the drop position is near this component (within 100px)
    const distance = Math.sqrt(
      Math.pow(x - (component.position?.x || 0), 2) +
      Math.pow(y - (component.position?.y || 0), 2)
    );

    if (distance <= 100) {
      return component;
    }
  }

  return null;
}
