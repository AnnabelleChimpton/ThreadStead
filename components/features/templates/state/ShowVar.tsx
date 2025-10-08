'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { useForEachContext } from './loops/ForEach';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

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

  /** Scope ID for scoped variable resolution (provided by ForEach) */
  scopeId?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function ShowVar(props: ShowVarProps) {
  const {
    name,
    scopeId: propScopeId,
    format,
    fallback,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  // Visual builder mode - show placeholder
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // IMPORTANT: Always call hooks before any conditional returns
  const templateState = useTemplateState();
  const forEachContext = useForEachContext();

  // CRITICAL: Validate required props (after hooks)
  if (!name) {
    return (
      <span style={{
        padding: '4px 8px',
        backgroundColor: '#fef2f2',
        border: '1px solid #dc2626',
        borderRadius: '4px',
        color: '#dc2626',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        ⚠️ ShowVar: missing &quot;name&quot;
      </span>
    );
  }

  // Determine which scope to use: prop (from ForEach processing) or context (from non-island component)
  const scopeId = propScopeId || forEachContext?.scopeId;

  // Resolve variable value using scoped resolution
  let value: any;

  if (scopeId) {
    // Use scoped variable resolution (works across islands)
    value = globalTemplateStateManager.getVariableInScope(scopeId, name);
  } else {
    // No scope - use global template variables
    const variable = templateState.variables[name];
    value = variable?.value;
  }

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
