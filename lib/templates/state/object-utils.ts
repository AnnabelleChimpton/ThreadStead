/**
 * Object Utilities for Template State Management
 *
 * Provides helper functions for advanced object manipulation:
 * - Deep merge (combining objects)
 * - Deep clone (copying objects)
 * - Nested property access/mutation
 *
 * Used by Phase 6 components: Extract, Property, Merge, Clone, ObjectSet
 */

/**
 * Deep merge multiple objects
 * Later objects override earlier ones
 *
 * @param sources Array of objects to merge
 * @returns Merged object
 *
 * @example
 * mergeObjects([
 *   { a: 1, b: { c: 2 } },
 *   { b: { d: 3 }, e: 4 }
 * ])
 * // => { a: 1, b: { c: 2, d: 3 }, e: 4 }
 */
export function mergeObjects(sources: any[]): any {
  if (!Array.isArray(sources) || sources.length === 0) {
    return {};
  }

  // Filter out non-objects
  const validSources = sources.filter(s => s !== null && typeof s === 'object' && !Array.isArray(s));

  if (validSources.length === 0) {
    return {};
  }

  // Start with empty object
  let result: any = {};

  for (const source of validSources) {
    result = deepMergeTwo(result, source);
  }

  return result;
}

/**
 * Deep merge two objects
 * Helper for mergeObjects
 */
function deepMergeTwo(target: any, source: any): any {
  const output = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = output[key];

      // If both are objects, merge recursively
      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMergeTwo(targetValue, sourceValue);
      } else {
        // Otherwise, override with source value
        output[key] = sourceValue;
      }
    }
  }

  return output;
}

/**
 * Deep clone an object or array
 *
 * @param obj Object or array to clone
 * @returns Deep cloned copy
 *
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const copy = cloneObject(original);
 * copy.b.c = 3;
 * console.log(original.b.c); // => 2 (unchanged)
 */
export function cloneObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // For primitives, return as-is
  if (typeof obj !== 'object') {
    return obj;
  }

  // Use structured clone if available (modern browsers)
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(obj);
    } catch (error) {
      console.warn('[cloneObject] structuredClone failed, falling back to JSON clone:', error);
    }
  }

  // Fallback to JSON clone (works for most cases)
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('[cloneObject] Failed to clone object:', error);
    return obj;
  }
}

/**
 * Get nested property value using dot notation
 *
 * @param obj Source object
 * @param path Dot notation path (e.g., "user.profile.name")
 * @returns Property value or undefined
 *
 * @example
 * getNestedProperty({ user: { name: 'Alice' } }, 'user.name')
 * // => 'Alice'
 */
export function getNestedProperty(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  if (!path || typeof path !== 'string') {
    return undefined;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set nested property value using dot notation (immutable)
 * Returns a new object with the property set
 *
 * @param obj Source object
 * @param path Dot notation path (e.g., "user.profile.name")
 * @param value Value to set
 * @returns New object with property set
 *
 * @example
 * setNestedProperty({ user: { name: 'Alice' } }, 'user.age', 25)
 * // => { user: { name: 'Alice', age: 25 } }
 */
export function setNestedProperty(obj: any, path: string, value: any): any {
  if (!obj || typeof obj !== 'object') {
    console.warn('[setNestedProperty] Object is not valid:', obj);
    return obj;
  }

  if (!path || typeof path !== 'string') {
    console.warn('[setNestedProperty] Path is not valid:', path);
    return obj;
  }

  const keys = path.split('.');

  // Clone the object to avoid mutation
  const result = Array.isArray(obj) ? [...obj] : { ...obj };

  // Navigate to the parent of the target property
  let current: any = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // If property doesn't exist or isn't an object, create it
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    } else {
      // Clone nested objects to avoid mutation
      current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
    }

    current = current[key];
  }

  // Set the final property
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result;
}

/**
 * Extract properties from object into a new object
 *
 * @param obj Source object
 * @param paths Array of property paths to extract
 * @returns New object with extracted properties
 *
 * @example
 * extractProperties(
 *   { name: 'Alice', age: 25, city: 'NYC' },
 *   ['name', 'age']
 * )
 * // => { name: 'Alice', age: 25 }
 */
export function extractProperties(obj: any, paths: string[]): Record<string, any> {
  if (!obj || typeof obj !== 'object') {
    console.warn('[extractProperties] Object is not valid:', obj);
    return {};
  }

  if (!Array.isArray(paths)) {
    console.warn('[extractProperties] Paths is not an array:', paths);
    return {};
  }

  const result: Record<string, any> = {};

  for (const path of paths) {
    if (typeof path === 'string') {
      const value = getNestedProperty(obj, path);
      if (value !== undefined) {
        // Use the last segment of the path as the key
        const key = path.split('.').pop() || path;
        result[key] = value;
      }
    }
  }

  return result;
}
