/**
 * Template State Utilities
 *
 * Standardized utilities for accessing template state across all action components.
 * Provides consistent patterns for:
 * - Variable value access (with ForEach scope support)
 * - Expression context building (with scoped variables)
 * - Fresh state access (prevents stale data in chained operations)
 */

import { globalTemplateStateManager } from './TemplateStateManager';

/**
 * Get variable value with ForEach scope support
 *
 * Standard pattern for all action components to read variable values.
 * Automatically checks scoped variables first (for ForEach loops),
 * then falls back to global variables.
 *
 * @param varName Variable name to get
 * @param forEachContext ForEach loop context (if inside ForEach)
 * @returns Variable value (always fresh from global manager)
 *
 * @example
 * // Inside ForEach loop - checks scoped "item" variable first
 * const value = getVariableValue('item', forEachContext);
 *
 * @example
 * // Outside ForEach loop - gets global variable
 * const value = getVariableValue('counter', null);
 */
export function getVariableValue(
  varName: string,
  forEachContext?: { scopeId?: string } | null
): any {
  const scopeId = forEachContext?.scopeId;

  // If we have a scope, check scoped variables first
  if (scopeId) {
    const scopedValue = globalTemplateStateManager.getVariableInScope(scopeId, varName);
    if (scopedValue !== undefined) {
      return scopedValue;
    }
  }

  // Fall back to global variable
  return globalTemplateStateManager.getVariable(varName);
}

/**
 * Build expression evaluation context with scoped variables
 *
 * Standard pattern for evaluating $vars expressions in action components.
 * Includes both global and scoped variables in the context object.
 *
 * @param forEachContext ForEach loop context (if inside ForEach)
 * @returns Context object with all variables (global + scoped)
 *
 * @example
 * // Build context and evaluate expression
 * const context = buildExpressionContext(forEachContext);
 * const result = evaluateExpression('$vars.counter + 1', context);
 *
 * @example
 * // Inside ForEach - scoped "item" overrides global "item"
 * const context = buildExpressionContext(forEachContext);
 * const result = evaluateExpression('$vars.item.name', context);
 */
export function buildExpressionContext(
  forEachContext?: { scopeId?: string } | null
): Record<string, any> {
  // Get FRESH variables from global manager
  const freshVariables = globalTemplateStateManager.getAllVariables();
  const context: Record<string, any> = {};

  // Add all global variables to context
  Object.entries(freshVariables).forEach(([k, v]) => {
    context[k] = v.value;
  });

  // Override with scoped variables if we have a scope
  if (forEachContext?.scopeId) {
    const scopeId = forEachContext.scopeId;

    // Check each variable name for scoped override
    // This ensures scoped variables (like "item" in ForEach) take precedence
    Object.keys(context).forEach(key => {
      const scopedValue = globalTemplateStateManager.getVariableInScope(scopeId, key);
      if (scopedValue !== undefined) {
        context[key] = scopedValue;
      }
    });

    // Also add any scoped variables that don't exist globally
    // (This handles the case where "item" is only defined in ForEach scope)
    // Note: This requires additional API on TemplateStateManager to list scoped vars
    // For now, the above logic handles the common case of scoped overrides
  }

  return context;
}

/**
 * Get variable's Variable object (with metadata) from templateState
 *
 * Helper for components that need the full Variable object (type, initial, etc.)
 * from templateState.variables.
 *
 * Note: This reads from templateState.variables which may be slightly stale.
 * Use getVariableValue() for reading current values.
 *
 * @param varName Variable name
 * @param templateState Template state context from useTemplateState()
 * @returns Variable object or undefined
 *
 * @example
 * const variable = getVariableObject('counter', templateState);
 * if (variable?.type === 'number') {
 *   // ...
 * }
 */
export function getVariableObject(
  varName: string,
  templateState: any
): any {
  return templateState.variables[varName];
}

/**
 * Resolve $vars reference to actual value
 *
 * Helper for components that accept $vars.varName in props.
 * Handles both simple references and nested paths.
 *
 * @param value String that might contain $vars reference
 * @param forEachContext ForEach loop context (if inside ForEach)
 * @returns Resolved value or original value if not a $vars reference
 *
 * @example
 * // Simple reference
 * const value = resolveVarsReference('$vars.counter', forEachContext);
 * // Returns: 42
 *
 * @example
 * // Nested reference
 * const value = resolveVarsReference('$vars.user.name', forEachContext);
 * // Returns: "Alice"
 *
 * @example
 * // Not a reference - returns as-is
 * const value = resolveVarsReference('Hello', forEachContext);
 * // Returns: "Hello"
 */
export function resolveVarsReference(
  value: any,
  forEachContext?: { scopeId?: string } | null
): any {
  // Only process strings that start with $vars.
  if (typeof value !== 'string' || !value.startsWith('$vars.')) {
    return value;
  }

  // Remove $vars. prefix
  const varPath = value.slice(6);
  const parts = varPath.split('.');
  const varName = parts[0];

  // Get variable value (handles scope)
  let result = getVariableValue(varName, forEachContext);

  // Handle nested properties: $vars.user.name
  for (let i = 1; i < parts.length; i++) {
    if (result === null || result === undefined) {
      return undefined;
    }
    result = result[parts[i]];
  }

  return result;
}
