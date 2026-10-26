/**
 * Object Utilities for Template State Management
 *
 * Provides helper functions for advanced object manipulation:
 * - Deep merge (combining objects)
 * - Deep clone (copying objects)
 * - Nested property access/mutation
 *
 * Used by Merge, ObjectSet and ForEach
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
    // Not source.hasOwnProperty: a source can have its own key by that name
    if (Object.prototype.hasOwnProperty.call(source, key)) {
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

