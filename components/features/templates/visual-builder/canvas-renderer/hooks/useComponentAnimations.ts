/**
 * Animation lifecycle tracking for canvas components
 *
 * Tracks component additions and removals to trigger CSS animations:
 * - Fade-in for newly added components (300ms)
 * - Fade-out for removing components (300ms)
 *
 * Usage:
 * ```typescript
 * const { newlyAddedComponents, removingComponents } = useComponentAnimations(placedComponents);
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';

export interface UseComponentAnimationsResult {
  /**
   * Set of component IDs that were just added (triggers fade-in animation)
   * Components are automatically removed from this set after 300ms
   */
  newlyAddedComponents: Set<string>;

  /**
   * Set of component IDs that are being removed (triggers fade-out animation)
   * Components are automatically removed from this set after 300ms
   */
  removingComponents: Set<string>;
}

/**
 * Tracks component lifecycle for animations
 *
 * @param placedComponents - Array of components on the canvas
 * @returns Animation state sets
 */
export function useComponentAnimations(
  placedComponents: ComponentItem[]
): UseComponentAnimationsResult {
  // Animation state for component lifecycle
  const [newlyAddedComponents, setNewlyAddedComponents] = useState<Set<string>>(new Set());
  const [removingComponents, setRemovingComponents] = useState<Set<string>>(new Set());
  const previousComponentIds = useRef<Set<string>>(new Set());

  // Track component additions and removals for animations
  useEffect(() => {
    const currentIds = new Set(placedComponents.map(c => c.id));
    const previousIds = previousComponentIds.current;

    // Find newly added components
    const newIds = new Set([...currentIds].filter(id => !previousIds.has(id)));
    if (newIds.size > 0) {
      setNewlyAddedComponents(prev => new Set([...prev, ...newIds]));

      // Remove from newly added after animation duration
      setTimeout(() => {
        setNewlyAddedComponents(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 300); // Match CSS animation duration
    }

    previousComponentIds.current = currentIds;
  }, [placedComponents]);

  return {
    newlyAddedComponents,
    removingComponents
  };
}
