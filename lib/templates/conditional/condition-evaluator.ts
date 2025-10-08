/**
 * Centralized Condition Evaluation Engine
 * Provides shared logic for all conditional components
 */

import { getGlobalTemplateState } from '../state/TemplateStateProvider';
import { globalTemplateStateManager } from '../state/TemplateStateManager';

/**
 * Safely get nested property values from an object
 * Supports dot notation: "owner.displayName", "posts.length", etc.
 * Also supports template variables: "$vars.variableName"
 *
 * Special handling: .length on undefined/null returns 0 (like empty array)
 *
 * @param obj The object to get values from (typically residentData)
 * @param path The path to the value
 * @param scopeId Optional ForEach scope ID for scoped variable resolution
 */
export function getNestedValue(obj: any, path: string | undefined, scopeId?: string): any {
  // CRITICAL: Defensive null checks
  if (!path || typeof path !== 'string') {
    console.warn('[getNestedValue] Invalid path:', path);
    return undefined;
  }

  // NEW: Check for $vars namespace (template variables)
  if (path.startsWith('$vars.')) {
    const varPath = path.slice(6); // Remove "$vars." prefix

    // Try to get template state from global context
    // This is set by TemplateStateProvider
    const templateState = getGlobalTemplateState();

    if (!templateState) {
      console.warn(`Template state not available for path: ${path}`);
      return undefined;
    }

    // Support nested access: $vars.user.name
    const parts = varPath.split('.');
    const variableName = parts[0];

    // Get variable value - check scoped variables first if scopeId provided
    let value: any;
    if (scopeId) {
      // Use globalTemplateStateManager to access scoped variables
      const scopedValue = globalTemplateStateManager.getVariableInScope(scopeId, variableName);
      value = scopedValue !== undefined ? scopedValue : templateState.getVariable(variableName);
    } else {
      value = templateState.getVariable(variableName);
    }

    // Handle nested properties: $vars.user.name
    for (let i = 1; i < parts.length; i++) {
      if (value === null || value === undefined) {
        // Special case: .length on undefined/null returns 0
        if (parts[i] === 'length') {
          return 0;
        }
        return undefined;
      }
      value = value[parts[i]];
    }

    return value;
  }

  // EXISTING: Handle ResidentData paths
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    // Special case: .length on undefined/null should return 0 (like empty array)
    // This handles cases like posts.length when posts doesn't exist
    if (key === 'length' && (current === null || current === undefined)) {
      return 0;
    }

    // Move to the next level
    if (current === null || current === undefined) {
      // If we hit null/undefined and there are more keys, check if next key is 'length'
      if (i + 1 < keys.length && keys[i + 1] === 'length') {
        return 0; // posts.length when posts is undefined should return 0
      }
      return undefined;
    }

    current = current[key];
  }

  return current;
}

/**
 * Comparison operators for numeric and string values
 */
export type ComparisonOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'matches'; // regex

/**
 * Perform comparison between two values
 */
export function compare(
  value: any,
  operator: ComparisonOperator,
  compareValue: string | number | undefined
): boolean {
  // CRITICAL: Defensive null checks
  if (value === null || value === undefined) {
    return operator === 'notEquals';
  }

  // Validate compareValue
  if (compareValue === null || compareValue === undefined) {
    console.warn('[compare] Invalid compareValue:', compareValue);
    return false;
  }

  switch (operator) {
    case 'equals':
      return String(value) === String(compareValue);

    case 'notEquals':
      return String(value) !== String(compareValue);

    case 'greaterThan': {
      const numValue = Number(value);
      const numCompare = Number(compareValue);
      if (isNaN(numValue) || isNaN(numCompare)) return false;
      return numValue > numCompare;
    }

    case 'lessThan': {
      const numValue = Number(value);
      const numCompare = Number(compareValue);
      if (isNaN(numValue) || isNaN(numCompare)) return false;
      return numValue < numCompare;
    }

    case 'greaterThanOrEqual': {
      const numValue = Number(value);
      const numCompare = Number(compareValue);
      if (isNaN(numValue) || isNaN(numCompare)) return false;
      return numValue >= numCompare;
    }

    case 'lessThanOrEqual': {
      const numValue = Number(value);
      const numCompare = Number(compareValue);
      if (isNaN(numValue) || isNaN(numCompare)) return false;
      return numValue <= numCompare;
    }

    case 'contains': {
      const strValue = value != null ? String(value) : '';
      const strCompare = compareValue != null ? String(compareValue) : '';
      return strValue.includes(strCompare);
    }

    case 'startsWith': {
      const strValue = value != null ? String(value) : '';
      const strCompare = compareValue != null ? String(compareValue) : '';
      return strValue.startsWith(strCompare);
    }

    case 'endsWith': {
      const strValue = value != null ? String(value) : '';
      const strCompare = compareValue != null ? String(compareValue) : '';
      return strValue.endsWith(strCompare);
    }

    case 'matches': {
      try {
        const regex = new RegExp(String(compareValue));
        return regex.test(String(value));
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Check if a value is "truthy" for conditional rendering
 * - Arrays: length > 0
 * - Objects: not null/undefined
 * - Strings: not empty
 * - Numbers: not 0
 * - Booleans: true
 */
export function isTruthy(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value !== '';
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object') return true; // non-null objects are truthy
  return Boolean(value);
}

/**
 * Check if a value exists (not null/undefined)
 */
export function exists(value: any): boolean {
  return value !== null && value !== undefined;
}

/**
 * Evaluate simple condition expressions
 * Supports:
 * - "true" / "false" - literal booleans
 * - "!condition" - negation
 * - "has:path" - existence check (not empty)
 * - "path" - truthy check
 *
 * @param condition The condition expression
 * @param data The data context (typically residentData)
 * @param scopeId Optional ForEach scope ID for scoped variable resolution
 */
export function evaluateCondition(condition: string | undefined, data: any, scopeId?: string): boolean {
  // CRITICAL: Defensive null checks
  if (!condition || typeof condition !== 'string') {
    console.warn('[evaluateCondition] Invalid condition:', condition);
    return false;
  }

  // Handle literal booleans
  if (condition === 'true') return true;
  if (condition === 'false') return false;

  // Handle negation
  if (condition.startsWith('!')) {
    return !evaluateCondition(condition.slice(1), data, scopeId);
  }

  // Handle existence checks
  if (condition.startsWith('has:')) {
    const path = condition.slice(4);
    const value = getNestedValue(data, path, scopeId);
    return exists(value) && isTruthy(value);
  }

  // Handle data path truthy checks
  const value = getNestedValue(data, condition, scopeId);
  return isTruthy(value);
}

/**
 * Logical operators for combining conditions
 */
export interface LogicalConditions {
  and?: string[]; // All must be true
  or?: string[];  // At least one must be true
  not?: string;   // Must be false
}

/**
 * Evaluate logical conditions (AND/OR/NOT)
 *
 * @param conditions The logical conditions
 * @param data The data context (typically residentData)
 * @param scopeId Optional ForEach scope ID for scoped variable resolution
 */
export function evaluateLogical(
  conditions: LogicalConditions,
  data: any,
  scopeId?: string
): boolean {
  // AND: all conditions must be true
  if (conditions.and && conditions.and.length > 0) {
    return conditions.and.every(cond => {
      const value = getNestedValue(data, cond, scopeId);
      return isTruthy(value);
    });
  }

  // OR: at least one condition must be true
  if (conditions.or && conditions.or.length > 0) {
    return conditions.or.some(cond => {
      const value = getNestedValue(data, cond, scopeId);
      return isTruthy(value);
    });
  }

  // NOT: condition must be false
  if (conditions.not) {
    const value = getNestedValue(data, conditions.not, scopeId);
    return !isTruthy(value);
  }

  return false;
}

/**
 * Full condition evaluation with all operators
 */
export interface ConditionConfig {
  // Data path to evaluate
  data?: string;

  // Simple condition expression
  when?: string;

  // Comparison operators
  equals?: string;
  notEquals?: string;
  greaterThan?: string | number;
  lessThan?: string | number;
  greaterThanOrEqual?: string | number;
  lessThanOrEqual?: string | number;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  matches?: string; // regex pattern

  // Existence check
  exists?: string | boolean;

  // Logical operators
  and?: string | string[]; // comma-separated or array
  or?: string | string[];  // comma-separated or array
  not?: string;
}

/**
 * Main evaluation function - handles all condition types
 *
 * @param config The condition configuration
 * @param data The data context (typically residentData)
 * @param scopeId Optional ForEach scope ID for scoped variable resolution
 */
export function evaluateFullCondition(
  config: ConditionConfig,
  data: any,
  scopeId?: string
): boolean {

  // Priority 1: Logical operators (AND/OR/NOT)
  if (config.and) {
    const conditions = typeof config.and === 'string'
      ? config.and.split(',').map(s => s.trim())
      : config.and;
    const result = evaluateLogical({ and: conditions }, data, scopeId);
    return result;
  }

  if (config.or) {
    const conditions = typeof config.or === 'string'
      ? config.or.split(',').map(s => s.trim())
      : config.or;
    const result = evaluateLogical({ or: conditions }, data, scopeId);
    return result;
  }

  // PHASE 4 FIX: Handle "not" as a boolean modifier for data attribute
  // If not is empty string with data, it's a negation modifier: <Show data="email_valid" not>
  if (config.not !== undefined && config.not === '' && config.data) {
    // Auto-prefix template variables if not already prefixed
    let dataPath = config.data;
    if (!dataPath.includes('.') && !dataPath.startsWith('$vars.')) {
      // Check if this is a template variable
      const templateState = getGlobalTemplateState();
      if (templateState && templateState.variables[dataPath]) {
        dataPath = `$vars.${dataPath}`;
      }
    }
    const value = getNestedValue(data, dataPath, scopeId);
    return !isTruthy(value);
  }

  // Otherwise, not is a logical operator with a path
  if (config.not) {
    const result = evaluateLogical({ not: config.not }, data, scopeId);
    return result;
  }

  // Priority 2: Simple condition expression
  if (config.when) {
    const result = evaluateCondition(config.when, data, scopeId);
    return result;
  }

  // Priority 3: Data-based conditions
  if (config.data) {
    // PHASE 4 FIX: Auto-prefix template variables if not already prefixed
    let dataPath = config.data;

    if (!dataPath.includes('.') && !dataPath.startsWith('$vars.')) {
      // Check if this is a template variable
      const templateState = getGlobalTemplateState();
      if (templateState && templateState.variables[dataPath]) {
        dataPath = `$vars.${dataPath}`;
      }
    }

    const value = getNestedValue(data, dataPath, scopeId);

    // Comparison operators (in order of specificity)
    if (config.notEquals !== undefined) {
      const result = compare(value, 'notEquals', config.notEquals);
      return result;
    }
    if (config.greaterThanOrEqual !== undefined) {
      const result = compare(value, 'greaterThanOrEqual', config.greaterThanOrEqual);
      return result;
    }
    if (config.lessThanOrEqual !== undefined) {
      const result = compare(value, 'lessThanOrEqual', config.lessThanOrEqual);
      return result;
    }
    if (config.greaterThan !== undefined) {
      const result = compare(value, 'greaterThan', config.greaterThan);
      return result;
    }
    if (config.lessThan !== undefined) {
      const result = compare(value, 'lessThan', config.lessThan);
      return result;
    }
    if (config.contains !== undefined) {
      const result = compare(value, 'contains', config.contains);
      return result;
    }
    if (config.startsWith !== undefined) {
      const result = compare(value, 'startsWith', config.startsWith);
      return result;
    }
    if (config.endsWith !== undefined) {
      const result = compare(value, 'endsWith', config.endsWith);
      return result;
    }
    if (config.matches !== undefined) {
      const result = compare(value, 'matches', config.matches);
      return result;
    }
    if (config.equals !== undefined) {
      const result = compare(value, 'equals', config.equals);
      return result;
    }

    // Existence check
    if (config.exists !== undefined) {
      if (typeof config.exists === 'boolean') {
        return exists(value) === config.exists;
      }
      // Legacy: exists as empty string with data prop means check if data value exists
      if (config.exists === '' && config.data) {
        return exists(value);
      }
      // Legacy: exists as string means check that path
      const existsValue = getNestedValue(data, config.exists as string, scopeId);
      return exists(existsValue);
    }

    // Default: truthy check
    return isTruthy(value);
  }

  // Priority 4: Standalone existence check
  if (config.exists && typeof config.exists === 'string') {
    const value = getNestedValue(data, config.exists, scopeId);
    return exists(value);
  }

  return false;
}
