'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { mergeObjects } from '@/lib/templates/state/object-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * Merge Component - Action to merge multiple objects
 *
 * Deep merges multiple object variables into a single target variable.
 * Later sources override earlier ones.
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to merge objects. It does not render anything.
 *
 * @example
 * ```xml
 * <!-- Merge settings -->
 * <Button>
 *   <OnClick>
 *     <Merge sources="defaults,userPrefs" target="finalSettings" />
 *   </OnClick>
 *   Apply Settings
 * </Button>
 *
 * <!-- Merge user data -->
 * <Button>
 *   <OnClick>
 *     <Merge sources="baseProfile,updates" target="profile" />
 *   </OnClick>
 *   Update Profile
 * </Button>
 * ```
 */

export interface MergeProps {
  /** Comma-separated list of source variable names */
  sources: string;

  /** Target variable name to store merged result */
  target: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - Merge is an action component) */
  children?: React.ReactNode;
}

export default function Merge(props: MergeProps) {
  const {
    sources,
    target,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        🔗 Merge: [{sources}] → {target}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute Merge action
 * Called by event handlers (OnClick, etc.)
 */
export function executeMergeAction(
  props: MergeProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { sources, target } = props;

  // Validate required props
  if (!sources || !target) {
    console.error('[Merge] Missing required props: sources and target are required');
    return;
  }

  try {
    // Parse comma-separated source list
    const sourceNames = sources.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (sourceNames.length === 0) {
      console.warn('[Merge] No source variables provided');
      return;
    }

    // Collect source objects
    const sourceObjects: any[] = [];

    for (const sourceName of sourceNames) {
      const value = globalTemplateStateManager.getVariable(sourceName);

      // Skip if variable doesn't exist
      if (value === undefined || value === null) {
        console.warn(`[Merge] Source variable "${sourceName}" not found or is null, skipping`);
        continue;
      }

      // Only merge objects (not arrays or primitives)
      if (typeof value === 'object' && !Array.isArray(value)) {
        sourceObjects.push(value);
      } else {
        console.warn(`[Merge] Source variable "${sourceName}" is not an object, skipping`);
      }
    }

    if (sourceObjects.length === 0) {
      console.warn('[Merge] No valid source objects found');
      return;
    }

    // Merge all source objects
    const mergedObject = mergeObjects(sourceObjects);

    // Register target variable if it doesn't exist
    if (!templateState.variables[target]) {
      templateState.registerVariable({
        name: target,
        type: 'object',
        initial: mergedObject
      });
    }

    // Update target variable with merged result
    templateState.setVariable(target, mergedObject);

  } catch (error) {
    console.error('[Merge] Failed to merge objects:', error);
  }
}
