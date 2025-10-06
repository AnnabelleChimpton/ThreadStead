/**
 * Utility functions for working with template variables
 * Handles the user-content- prefix workaround
 */

import type { useTemplateState } from './TemplateStateProvider';

/**
 * Get a variable from template state, trying both unprefixed and prefixed versions
 * This handles the user-content- prefix issue where variables might be registered with or without the prefix
 *
 * @param templateState Template state context
 * @param varName Variable name to look up
 * @returns The variable object or undefined if not found
 */
export function getVariable(
  templateState: ReturnType<typeof useTemplateState>,
  varName: string
) {
  // Try unprefixed version first
  let variable = templateState.variables[varName];

  // If not found and doesn't already have prefix, try with prefix
  if (!variable && !varName.startsWith('user-content-')) {
    variable = templateState.variables[`user-content-${varName}`];
  }

  return variable;
}

/**
 * Get a variable's value with a fallback
 *
 * @param templateState Template state context
 * @param varName Variable name to look up
 * @param fallback Fallback value if variable doesn't exist
 * @returns The variable's value or the fallback
 */
export function getVariableValue<T = any>(
  templateState: ReturnType<typeof useTemplateState>,
  varName: string,
  fallback: T
): T {
  const variable = getVariable(templateState, varName);
  return variable?.value !== undefined ? variable.value : fallback;
}
