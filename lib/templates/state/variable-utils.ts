/**
 * Utility functions for working with template variables
 * Handles the user-content- prefix normalization
 */

import type { useTemplateState } from './TemplateStateProvider';

/**
 * Normalize variable names by stripping the user-content- prefix
 *
 * rehype-sanitize adds this prefix to 'name' and 'id' attributes for DOM clobbering security.
 * We strip it at the island detection layer so components work with clean names.
 *
 * @param name Variable name (may or may not have prefix)
 * @returns Normalized name without prefix
 */
export function normalizeVariableName(name: string): string {
  return name.startsWith('user-content-')
    ? name.slice('user-content-'.length)
    : name;
}

/**
 * Get a variable from template state
 *
 * @param templateState Template state context
 * @param varName Variable name to look up
 * @returns The variable object or undefined if not found
 */
export function getVariable(
  templateState: ReturnType<typeof useTemplateState>,
  varName: string | undefined
) {
  // Handle undefined varName
  if (!varName) {
    return undefined;
  }

  return templateState.variables[varName];
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
