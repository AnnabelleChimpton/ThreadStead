/**
 * Collection Utilities for Template Array Operations
 *
 * Provides helper functions for Filter, Sort, Transform, Find, Count, Sum components.
 * All functions support expression evaluation with 'item' and 'index' context variables.
 */

import { evaluateExpression } from './expression-evaluator';

/**
 * Evaluation context for collection operations
 */
export interface CollectionContext {
  /** Template variables ($vars) */
  variables: Record<string, any>;
  /** Current item being processed */
  item?: any;
  /** Current index (0-based) */
  index?: number;
  /** Shorthand for index */
  i?: number;
}

/**
 * Evaluate expression in collection context (with item and index)
 *
 * @param expression Expression string (can reference 'item', 'index', or '$vars.varName')
 * @param itemValue Current item value
 * @param itemIndex Current item index (0-based)
 * @param varsContext Template variables context
 * @returns Evaluated result
 */
export function evaluateCollectionExpression(
  expression: string | undefined,
  itemValue: any,
  itemIndex: number,
  varsContext: Record<string, any>
): any {
  if (!expression || typeof expression !== 'string') {
    console.warn('[evaluateCollectionExpression] Invalid expression:', expression);
    return undefined;
  }

  // Build context with item, index, and all template variables
  const context = {
    ...varsContext,
    item: itemValue,
    index: itemIndex,
    i: itemIndex  // Shorthand alias
  };

  try {
    const result = evaluateExpression(expression, context);
    return result;
  } catch (error) {
    console.error('[Collection] Expression evaluation failed:', expression, error);
    console.error('[Collection] Item was:', itemValue);
    console.error('[Collection] Context keys:', Object.keys(context));
    console.error('[Collection] Full error:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    throw error;
  }
}

/**
 * Filter array by condition expression
 *
 * @param array Source array
 * @param whereExpression Condition expression (e.g., "item.status === 'active'")
 * @param varsContext Template variables for expression evaluation
 * @returns Filtered array
 *
 * @example
 * filterArray(
 *   [{status: 'active'}, {status: 'inactive'}],
 *   "item.status === 'active'",
 *   {}
 * )
 * // => [{status: 'active'}]
 */
export function filterArray(
  array: any[],
  whereExpression: string,
  varsContext: Record<string, any>
): any[] {
  if (!Array.isArray(array)) {
    console.warn('[filterArray] Input is not an array:', array);
    return [];
  }

  if (!whereExpression || typeof whereExpression !== 'string') {
    console.warn('[filterArray] Invalid where expression:', whereExpression);
    return array;
  }

  try {
    return array.filter((item, index) => {
      const result = evaluateCollectionExpression(whereExpression, item, index, varsContext);
      return Boolean(result);
    });
  } catch (error) {
    console.error('[filterArray] Failed to filter array:', error);
    return [];
  }
}

/**
 * Sort array by property or expression
 *
 * @param array Source array
 * @param byExpression Property path or expression (e.g., "item.price" or "item.name.length")
 * @param order Sort order ('asc' or 'desc')
 * @param varsContext Template variables for expression evaluation
 * @returns Sorted array (new array, original unchanged)
 *
 * @example
 * sortArray(
 *   [{price: 10}, {price: 5}, {price: 20}],
 *   "item.price",
 *   "desc",
 *   {}
 * )
 * // => [{price: 20}, {price: 10}, {price: 5}]
 */
export function sortArray(
  array: any[],
  byExpression: string,
  order: 'asc' | 'desc' = 'asc',
  varsContext: Record<string, any>
): any[] {
  if (!Array.isArray(array)) {
    console.warn('[sortArray] Input is not an array:', array);
    return [];
  }

  if (!byExpression || typeof byExpression !== 'string') {
    console.warn('[sortArray] Invalid by expression:', byExpression);
    return [...array];
  }

  try {
    // Create a copy to avoid mutating original
    const sortedArray = [...array];

    sortedArray.sort((a, b) => {
      // Evaluate sort key for both items
      const aValue = evaluateCollectionExpression(byExpression, a, 0, varsContext);
      const bValue = evaluateCollectionExpression(byExpression, b, 0, varsContext);

      // Handle null/undefined
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue);
      const bStr = String(bValue);

      if (order === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    return sortedArray;
  } catch (error) {
    console.error('[sortArray] Failed to sort array:', error);
    return [...array];
  }
}

/**
 * Transform array by applying expression to each item
 *
 * @param array Source array
 * @param expression Transformation expression (e.g., "item * 1.08" or "item.price * $vars.quantity")
 * @param varsContext Template variables for expression evaluation
 * @returns Transformed array
 *
 * @example
 * transformArray([10, 20, 30], "item * 2", {})
 * // => [20, 40, 60]
 */
export function transformArray(
  array: any[],
  expression: string,
  varsContext: Record<string, any>
): any[] {
  if (!Array.isArray(array)) {
    console.warn('[transformArray] Input is not an array:', array);
    return [];
  }

  if (!expression || typeof expression !== 'string') {
    console.warn('[transformArray] Invalid expression:', expression);
    return array;
  }

  try {
    const results = array.map((item, index) => {
      const result = evaluateCollectionExpression(expression, item, index, varsContext);
      return result;
    });

    return results;
  } catch (error) {
    console.error('[transformArray] Failed to transform array:', error);
    console.error('[transformArray] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return [];
  }
}

/**
 * Find first item matching condition
 *
 * @param array Source array
 * @param whereExpression Condition expression
 * @param varsContext Template variables for expression evaluation
 * @returns First matching item or undefined
 *
 * @example
 * findInArray(
 *   [{role: 'user'}, {role: 'admin'}, {role: 'user'}],
 *   "item.role === 'admin'",
 *   {}
 * )
 * // => {role: 'admin'}
 */
export function findInArray(
  array: any[],
  whereExpression: string,
  varsContext: Record<string, any>
): any | undefined {
  if (!Array.isArray(array)) {
    console.warn('[findInArray] Input is not an array:', array);
    return undefined;
  }

  if (!whereExpression || typeof whereExpression !== 'string') {
    console.warn('[findInArray] Invalid where expression:', whereExpression);
    return undefined;
  }

  try {
    return array.find((item, index) => {
      const result = evaluateCollectionExpression(whereExpression, item, index, varsContext);
      return Boolean(result);
    });
  } catch (error) {
    console.error('[findInArray] Failed to find in array:', error);
    return undefined;
  }
}

/**
 * Count items in array (with optional filter)
 *
 * @param array Source array
 * @param whereExpression Optional condition expression (if omitted, counts all items)
 * @param varsContext Template variables for expression evaluation
 * @returns Count of items (or matching items)
 *
 * @example
 * countArray([1, 2, 3, 4, 5], "item > 3", {})
 * // => 2
 *
 * countArray([1, 2, 3], undefined, {})
 * // => 3
 */
export function countArray(
  array: any[],
  whereExpression: string | undefined,
  varsContext: Record<string, any>
): number {
  if (!Array.isArray(array)) {
    console.warn('[countArray] Input is not an array:', array);
    return 0;
  }

  // If no where expression, return total count
  if (!whereExpression || typeof whereExpression !== 'string') {
    return array.length;
  }

  // Count matching items
  try {
    const filtered = filterArray(array, whereExpression, varsContext);
    return filtered.length;
  } catch (error) {
    console.error('[countArray] Failed to count array:', error);
    return 0;
  }
}

/**
 * Sum numeric values in array
 *
 * @param array Source array
 * @param property Optional property path (for arrays of objects, e.g., "price" or "user.age")
 * @param varsContext Template variables for expression evaluation
 * @returns Sum of values
 *
 * @example
 * // Sum array of numbers
 * sumArray([10, 20, 30], undefined, {})
 * // => 60
 *
 * // Sum object property
 * sumArray(
 *   [{price: 10}, {price: 20}, {price: 30}],
 *   "price",
 *   {}
 * )
 * // => 60
 */
export function sumArray(
  array: any[],
  property: string | undefined,
  varsContext: Record<string, any>
): number {
  if (!Array.isArray(array)) {
    console.warn('[sumArray] Input is not an array:', array);
    return 0;
  }

  try {
    return array.reduce((sum, item, index) => {
      let value: any;

      if (property && typeof property === 'string') {
        // Extract property value (supports nested properties like "user.age")
        value = evaluateCollectionExpression(`item.${property}`, item, index, varsContext);
      } else {
        // Direct value
        value = item;
      }

      // Convert to number
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));

      // Add to sum if valid number
      if (!isNaN(numValue)) {
        return sum + numValue;
      }

      return sum;
    }, 0);
  } catch (error) {
    console.error('[sumArray] Failed to sum array:', error);
    return 0;
  }
}

/**
 * Get property value dynamically
 *
 * @param source Object or array to access
 * @param accessor Property name, index, or expression
 * @param varsContext Template variables for expression evaluation
 * @returns Property value or undefined
 *
 * @example
 * // Object property access
 * getDynamicProperty({name: 'Alice', age: 25}, 'name', {})
 * // => 'Alice'
 *
 * // Array index access
 * getDynamicProperty(['a', 'b', 'c'], 1, {})
 * // => 'b'
 *
 * // Dynamic index from variable
 * getDynamicProperty(['a', 'b', 'c'], '$vars.currentIndex', {currentIndex: 2})
 * // => 'c'
 */
export function getDynamicProperty(
  source: any,
  accessor: string | number,
  varsContext: Record<string, any>
): any {
  if (source === undefined || source === null) {
    console.warn('[getDynamicProperty] Source is null or undefined');
    return undefined;
  }

  try {
    // If accessor is a number, use it directly as array index
    if (typeof accessor === 'number') {
      if (Array.isArray(source)) {
        return source[accessor];
      }
      return undefined;
    }

    // If accessor is a string
    if (typeof accessor === 'string') {
      // Check if it's a $vars reference
      if (accessor.startsWith('$vars.')) {
        const varName = accessor.slice(6);
        const resolvedAccessor = varsContext[varName];

        // Recursively call with resolved value
        return getDynamicProperty(source, resolvedAccessor, varsContext);
      }

      // Try as direct property/index
      if (typeof source === 'object' || Array.isArray(source)) {
        // Try parsing as number for array access
        const numIndex = parseInt(accessor, 10);
        if (!isNaN(numIndex) && Array.isArray(source)) {
          return source[numIndex];
        }

        // Direct property access
        return source[accessor];
      }
    }

    return undefined;
  } catch (error) {
    console.error('[getDynamicProperty] Failed to get property:', error);
    return undefined;
  }
}
