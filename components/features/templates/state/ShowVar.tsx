'use client';

import React, { useMemo } from 'react';
import { useTemplateStateWithDeps } from '@/lib/templates/state/TemplateStateProvider';
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
 *
 * <!-- Date formatting -->
 * <Var name="timestamp" type="date" initial="2025-10-08" />
 * <ShowVar name="timestamp" dateFormat="short" />
 * <ShowVar name="timestamp" dateFormat="long" />
 * <ShowVar name="timestamp" dateFormat="relative" />
 * <ShowVar name="timestamp" dateFormat="YYYY-MM-DD HH:mm" />
 * ```
 */

export interface ShowVarProps {
  /** Variable name to display */
  name: string;

  /** Format string with {value} placeholder */
  format?: string;

  /** Text to show if variable is undefined or null */
  fallback?: string;

  /** Date format (for Date type variables): 'short' | 'long' | 'time' | 'datetime' | 'relative' | 'iso' | custom pattern */
  dateFormat?: string;

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
    dateFormat,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  // Visual builder mode - show placeholder
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // IMPORTANT: Always call hooks before any conditional returns
  // PHASE 1.1: Use selective subscription - only re-render when this specific variable changes
  const dependencies = useMemo(() => name ? [name] : [], [name]);
  const templateState = useTemplateStateWithDeps(dependencies);
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
    // PHASE 1.1 FIX: Use getVariable() to always get current value, not stale snapshot
    // This ensures components see updates immediately when using selective subscriptions
    value = templateState.getVariable(name);
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

  // Check if value is a Date and dateFormat is provided
  if (dateFormat && value instanceof Date) {
    displayValue = formatDate(value, dateFormat);
  } else if (format) {
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
    if (value instanceof Date) {
      // Dates default to ISO string if no dateFormat specified
      displayValue = value.toISOString();
    } else if (typeof value === 'object') {
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

/**
 * Format a Date object according to the specified format
 */
function formatDate(date: Date, format: string): string {
  // Built-in formats
  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time':
      return date.toLocaleTimeString();
    case 'datetime':
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    case 'relative':
      return formatRelativeTime(date);
    case 'iso':
      return date.toISOString();
    default:
      // For custom patterns, try to parse basic patterns
      // Support: YYYY, MM, DD, HH, mm, ss
      let formatted = format;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      formatted = formatted.replace('YYYY', String(year));
      formatted = formatted.replace('MM', month);
      formatted = formatted.replace('DD', day);
      formatted = formatted.replace('HH', hours);
      formatted = formatted.replace('mm', minutes);
      formatted = formatted.replace('ss', seconds);

      return formatted;
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
}
