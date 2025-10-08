'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Validate Component - Input validation that creates derivative variables
 *
 * Creates two derivative variables:
 * - ${varName}_valid: boolean - Whether the value passes validation
 * - ${varName}_error: string - Error message if validation fails
 *
 * @example
 * ```xml
 * <TInput var="email">
 *   <Validate pattern="email" message="Invalid email address" />
 *   <Validate required="true" message="Email is required" />
 * </TInput>
 *
 * <TInput var="age" type="number">
 *   <Validate min="18" max="120" message="Age must be 18-120" />
 * </TInput>
 *
 * <TInput var="username">
 *   <Validate pattern="^[a-zA-Z0-9]+$" message="Alphanumeric only" />
 *   <Validate minLength="3" maxLength="20" message="3-20 characters" />
 * </TInput>
 * ```
 *
 * Usage in templates:
 * ```xml
 * <Show data="$vars.email_valid" not>
 *   <div class="error"><ShowVar name="email_error" /></div>
 * </Show>
 * ```
 */

export interface ValidateProps {
  /** Variable name to validate (inherited from parent input, or specified directly) */
  var?: string;

  /** Validation pattern: 'email', 'url', 'phone', or a custom regex string */
  pattern?: 'email' | 'url' | 'phone' | string;

  /** Whether the field is required */
  required?: boolean | string;

  /** Minimum value (for numbers) */
  min?: number | string;

  /** Maximum value (for numbers) */
  max?: number | string;

  /** Minimum length (for strings) */
  minLength?: number | string;

  /** Maximum length (for strings) */
  maxLength?: number | string;

  /** Error message to display when validation fails */
  message: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored) */
  children?: React.ReactNode;
}

// Built-in validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+\..+/,
  phone: /^[\d\s\-\+\(\)]+$/
};

export default function Validate(props: ValidateProps) {
  const {
    var: varName,
    pattern,
    required,
    min,
    max,
    minLength,
    maxLength,
    message,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Generate unique validator ID for this instance (persists across re-renders)
  const validatorId = useRef(`validator-${Math.random().toString(36).substr(2, 9)}`).current;

  // Determine the actual variable name (strip user-content- prefix if present)
  // This is needed because HTML parsing may add the prefix
  const actualVarName = useMemo(() => {
    if (varName) {
      // Strip user-content- prefix if it exists
      return varName.startsWith('user-content-')
        ? varName.substring(13) // Remove "user-content-"
        : varName;
    }
    return undefined;
  }, [varName]);

  // In normal mode, this component renders nothing
  // It only creates side effects (derivative variables)
  // The actual validation happens in the useEffect below
  useEffect(() => {
    // Skip validation in visual builder mode
    if (isVisualBuilder) {
      return;
    }


    // CRITICAL: Validate that we have a var name
    if (!actualVarName) {
      console.error('[Validate] Missing required "var" prop');
      return; // Gracefully skip validation instead of crashing
    }

    // Check if the variable exists in template state
    // If not, skip validation - the Var component hasn't registered it yet
    const variableExists = templateState.variables[actualVarName] !== undefined ||
                          templateState.variables[`user-content-${actualVarName}`] !== undefined;

    if (!variableExists) {
      // Variable not registered yet - skip validation
      // This will re-run once the variable is registered
      return;
    }

    // Get the current value from template state
    // Use getVariable() which has user-content- prefix fallback
    const value = templateState.getVariable(actualVarName);

    // Perform validation
    const rules = {
      pattern,
      required: required === true || required === 'true',
      min: typeof min === 'string' ? parseFloat(min) : min,
      max: typeof max === 'string' ? parseFloat(max) : max,
      minLength: typeof minLength === 'string' ? parseInt(minLength) : minLength,
      maxLength: typeof maxLength === 'string' ? parseInt(maxLength) : maxLength
    };

    const validationResult = validateValue(value, rules);

    // Determine derivative variable names
    // These can be accessed via $vars.varName_valid in expressions
    const validVarName = `${actualVarName}_valid`;
    const errorVarName = `${actualVarName}_error`;
    const errorsVarName = `${actualVarName}_errors`;
    const trackingVarName = `_${actualVarName}_validations`;

    // Register derivative variables if they don't exist
    if (!templateState.variables[validVarName]) {
      templateState.registerVariable({
        name: validVarName,
        type: 'boolean',
        initial: true
      });
    }

    if (!templateState.variables[errorVarName]) {
      templateState.registerVariable({
        name: errorVarName,
        type: 'string',
        initial: ''
      });
    }

    if (!templateState.variables[errorsVarName]) {
      templateState.registerVariable({
        name: errorsVarName,
        type: 'array',
        initial: []
      });
    }

    // Register internal tracking variable (hidden from users)
    if (!templateState.variables[trackingVarName]) {
      templateState.registerVariable({
        name: trackingVarName,
        type: 'object',
        initial: {}
      });
    }

    // PHASE 4: Multi-validator support
    // Update internal tracking with this validator's result
    const currentTracking = { ...(templateState.getVariable(trackingVarName) || {}) };

    currentTracking[validatorId] = {
      valid: validationResult.valid,
      message: validationResult.valid ? '' : message
    };

    templateState.setVariable(trackingVarName, currentTracking);

    // Aggregate all validator results
    const allResults = Object.values(currentTracking) as Array<{ valid: boolean; message: string }>;
    const allValid = allResults.every(r => r.valid);
    const allErrors = allResults.filter(r => !r.valid).map(r => r.message);

    // Update public derivative variables
    templateState.setVariable(validVarName, allValid);
    templateState.setVariable(errorVarName, allErrors[0] || '');  // First error (backward compatible)
    templateState.setVariable(errorsVarName, allErrors);  // All errors (new)

  }, [
    isVisualBuilder,
    actualVarName,
    pattern,
    required,
    min,
    max,
    minLength,
    maxLength,
    message,
    validatorId,
    // CRITICAL: Only depend on the specific variable value, not all variables
    // templateState.variables is a new object on every render, causing infinite loops
    // Check both unprefixed and prefixed versions (user-content- workaround)
    actualVarName ? templateState.variables[actualVarName]?.value : undefined,
    actualVarName ? templateState.variables[`user-content-${actualVarName}`]?.value : undefined,
    templateState.getVariable,
    templateState.setVariable,
    templateState.registerVariable
  ]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded">
        ✓ Validate: {message}
      </div>
    );
  }

  // Normal mode - render nothing
  return null;
}

/**
 * Validate a value against validation rules
 */
function validateValue(
  value: any,
  rules: {
    pattern?: string;
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  }
): { valid: boolean; error?: string } {
  const {
    pattern,
    required,
    min,
    max,
    minLength,
    maxLength
  } = rules;

  // Check required
  if (required) {
    if (value === undefined || value === null || value === '') {
      return { valid: false, error: 'Required field' };
    }
  }

  // If value is empty and not required, it's valid
  if (value === undefined || value === null || value === '') {
    return { valid: true };
  }

  const stringValue = String(value);
  const numericValue = typeof value === 'number' ? value : parseFloat(stringValue);

  // Check pattern (regex or built-in)
  if (pattern) {
    let regex: RegExp;

    // Check if it's a built-in pattern
    if (pattern === 'email' || pattern === 'url' || pattern === 'phone') {
      regex = PATTERNS[pattern];
    } else {
      // Custom regex pattern
      try {
        regex = new RegExp(pattern);
      } catch (e) {
        return { valid: false, error: 'Invalid pattern' };
      }
    }

    const testResult = regex.test(stringValue);

    if (!testResult) {
      return { valid: false, error: 'Pattern mismatch' };
    }
  }

  // Check min (for numbers)
  if (min !== undefined && !isNaN(numericValue)) {
    if (numericValue < min) {
      return { valid: false, error: `Must be at least ${min}` };
    }
  }

  // Check max (for numbers)
  if (max !== undefined && !isNaN(numericValue)) {
    if (numericValue > max) {
      return { valid: false, error: `Must be at most ${max}` };
    }
  }

  // Check minLength (for strings)
  if (minLength !== undefined) {
    if (stringValue.length < minLength) {
      return { valid: false, error: `Must be at least ${minLength} characters` };
    }
  }

  // Check maxLength (for strings)
  if (maxLength !== undefined) {
    if (stringValue.length > maxLength) {
      return { valid: false, error: `Must be at most ${maxLength} characters` };
    }
  }

  return { valid: true };
}

/**
 * Helper function to execute validation (for use in other components)
 */
export function executeValidation(
  varName: string,
  value: any,
  rules: {
    pattern?: string;
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  },
  message: string,
  templateState: any
): boolean {
  const result = validateValue(value, rules);

  // Determine derivative variable names
  // IMPORTANT: Use the ORIGINAL varName (unprefixed) for derivative variables
  // This ensures they can be accessed via $vars.varName_valid in expressions
  const validVarName = `${varName}_valid`;
  const errorVarName = `${varName}_error`;

  // Update derivative variables
  templateState.setVariable(validVarName, result.valid);
  templateState.setVariable(errorVarName, result.valid ? '' : message);

  return result.valid;
}
