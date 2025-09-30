/**
 * Component Equality Helper
 *
 * Provides deep equality checking for ComponentItem objects to prevent
 * unnecessary re-renders and state updates in the visual builder.
 */

import type { ComponentItem } from '@/hooks/useCanvasState';

/**
 * Deep equality check for component properties
 * Focuses on user-meaningful changes and ignores internal/temporary props
 */
export function deepEqualsComponentProps(
  props1: Record<string, any> | undefined,
  props2: Record<string, any> | undefined
): boolean {
  // Handle undefined cases
  if (props1 === props2) return true;
  if (!props1 || !props2) return false;

  // Get all unique keys from both objects
  const keys1 = Object.keys(props1);
  const keys2 = Object.keys(props2);
  const allKeys = new Set([...keys1, ...keys2]);

  // Compare each property
  for (const key of allKeys) {
    const val1 = props1[key];
    const val2 = props2[key];

    // Skip if both are undefined
    if (val1 === undefined && val2 === undefined) continue;

    // If one is undefined and the other isn't, they're different
    if (val1 === undefined || val2 === undefined) return false;

    // Deep compare objects (like _size)
    if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
      if (!deepEqualsObject(val1, val2)) return false;
    } else {
      // Direct comparison for primitives
      if (val1 !== val2) return false;
    }
  }

  return true;
}

/**
 * Deep equality check for any object
 */
function deepEqualsObject(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;

  // Handle arrays
  if (Array.isArray(obj1)) {
    if (!Array.isArray(obj2) || obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqualsObject(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqualsObject(obj1[key], obj2[key])) return false;
    }
    return true;
  }

  // Primitive comparison
  return obj1 === obj2;
}

/**
 * Deep equality check for ComponentItem objects
 * Focuses on meaningful changes that should trigger updates
 */
export function deepEqualsComponent(comp1: ComponentItem, comp2: ComponentItem): boolean {
  // Quick reference check
  if (comp1 === comp2) return true;

  // Check basic properties
  if (comp1.id !== comp2.id) return false;
  if (comp1.type !== comp2.type) return false;
  if (comp1.positioningMode !== comp2.positioningMode) return false;

  // Check position
  if (!deepEqualsObject(comp1.position, comp2.position)) return false;

  // Check grid position
  if (!deepEqualsObject(comp1.gridPosition, comp2.gridPosition)) return false;

  // Check props (legacy structure - most important for our use case)
  if (!deepEqualsComponentProps(comp1.props, comp2.props)) return false;

  // CRITICAL FIX: Check publicProps (new standardized structure)
  // This was missing and prevented CSS property changes from triggering HTML regeneration!
  if (!deepEqualsComponentProps(comp1.publicProps, comp2.publicProps)) return false;

  // Check visualBuilderState for internal changes (like selection, locking)
  if (!deepEqualsObject(comp1.visualBuilderState, comp2.visualBuilderState)) return false;

  // Check children
  if (!deepEqualsComponentArray(comp1.children, comp2.children)) return false;

  return true;
}

/**
 * Deep equality check for arrays of ComponentItem objects
 */
export function deepEqualsComponentArray(
  arr1: ComponentItem[] | undefined,
  arr2: ComponentItem[] | undefined
): boolean {
  // Handle undefined cases
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2) return arr1 === arr2; // Both must be undefined

  // Check lengths
  if (arr1.length !== arr2.length) return false;

  // Check each component
  for (let i = 0; i < arr1.length; i++) {
    if (!deepEqualsComponent(arr1[i], arr2[i])) return false;
  }

  return true;
}

/**
 * Check if an update would actually change a component
 * Returns false if the update would result in the same component
 */
export function wouldComponentChange(
  component: ComponentItem,
  updates: Partial<Omit<ComponentItem, 'visualBuilderState'>> & { visualBuilderState?: Partial<import('@/hooks/useCanvasState').VisualBuilderComponentState> }
): boolean {
  // Create the hypothetical updated component
  const { visualBuilderState: updatedVisualBuilderState, ...otherUpdates } = updates;
  const updatedComponent: ComponentItem = {
    ...component,
    ...otherUpdates
  };

  // Handle props merging specially
  if (updates.props && component.props) {
    updatedComponent.props = { ...component.props, ...updates.props };
  }

  // Handle visualBuilderState merging specially
  if (updatedVisualBuilderState && component.visualBuilderState) {
    updatedComponent.visualBuilderState = {
      ...component.visualBuilderState,
      ...updatedVisualBuilderState,
      lastModified: Date.now()
    };
  }

  // Compare with original
  return !deepEqualsComponent(component, updatedComponent);
}

/**
 * Efficiently check if array update would actually change components
 * Returns the original array if no changes would occur
 */
export function optimizeComponentArrayUpdate<T extends ComponentItem[]>(
  originalArray: T,
  updateFunction: (array: T) => T
): T {
  const newArray = updateFunction(originalArray);

  // If arrays are the same reference, return original
  if (newArray === originalArray) return originalArray;

  // If deep equality check passes, return original array to maintain reference
  if (deepEqualsComponentArray(originalArray, newArray)) {
    return originalArray;
  }

  return newArray;
}