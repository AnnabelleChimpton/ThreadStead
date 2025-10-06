'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * ShowVar Component - Display a template variable value
 *
 * Shows the current value of a declared variable.
 *
 * @example
 * ```xml
 * <Var name="counter" type="number" initial="0" />
 * <ShowVar name="counter" />
 * <ShowVar name="counter" format="Count: {value}" />
 * <ShowVar name="message" fallback="No message" />
 * ```
 */

export interface ShowVarProps {
  /** Variable name to display */
  name: string;

  /** Format string with {value} placeholder */
  format?: string;

  /** Text to show if variable is undefined or null */
  fallback?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function ShowVar(props: ShowVarProps) {
  const {
    name,
    format,
    fallback,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  // Visual builder mode - show placeholder
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  const templateState = useTemplateState();
  // Access variables directly from state to ensure reactivity
  // This causes ShowVar to re-render when variables are registered or updated
  // Try both unprefixed and prefixed versions (user-content- workaround)
  let variable = templateState.variables[name];
  if (!variable && !name.startsWith('user-content-')) {
    variable = templateState.variables[`user-content-${name}`];
  }
  const value = variable?.value;

  // Handle undefined/null values
  if (value === undefined || value === null) {
    if (isVisualBuilder) {
      return (
        <span className="inline-block px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-700 dark:text-yellow-300 font-mono">
          📊 ShowVar: {name} (undefined)
        </span>
      );
    }

    // Normal mode - show fallback or nothing
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // Format the value
  let displayValue: string;

  if (format) {
    // Replace {value} and {value.property} placeholders
    displayValue = format.replace(/\{value(\.[a-zA-Z0-9_.]+)?\}/g, (match, propertyPath) => {
      if (!propertyPath) {
        // Just {value}
        return String(value);
      }

      // {value.property} - access nested property
      const keys = propertyPath.slice(1).split('.'); // Remove leading dot
      let current = value;

      for (const key of keys) {
        if (current === null || current === undefined) {
          return '';
        }
        current = current[key];
      }

      return String(current ?? '');
    });
  } else {
    // Convert value to string for display
    if (typeof value === 'object') {
      // For objects and arrays, use JSON representation
      try {
        displayValue = JSON.stringify(value);
      } catch {
        displayValue = String(value);
      }
    } else if (typeof value === 'boolean') {
      // Booleans as lowercase strings
      displayValue = value ? 'true' : 'false';
    } else {
      displayValue = String(value);
    }
  }

  // Visual builder mode - show with indicator
  if (isVisualBuilder) {
    return (
      <span className="inline-block">
        <span className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono mr-1">
          📊
        </span>
        <span>{displayValue}</span>
      </span>
    );
  }

  // Normal mode - just show the value
  return <>{displayValue}</>;
}
