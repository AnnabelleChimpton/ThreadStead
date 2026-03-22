'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getNestedProperty } from '@/lib/templates/state/object-utils';
import { useExtractContext } from './Extract';

/**
 * Property Component - Child of Extract
 *
 * Defines a property to extract from the parent Extract component's source object.
 * Creates a new variable with the extracted value.
 *
 * Must be used inside an Extract component.
 *
 * @example
 * ```xml
 * <Extract from="$vars.user">
 *   <Property path="name" as="userName" />
 *   <Property path="email" as="userEmail" />
 *   <Property path="settings.theme" as="currentTheme" />
 * </Extract>
 * ```
 */

export interface PropertyProps {
  /** Property path to extract (dot notation supported, e.g., "settings.theme") */
  path: string;

  /** Target variable name to create */
  as: string;

  /** Children (ignored - Property is an action component) */
  children?: React.ReactNode;
}

export default function Property(props: PropertyProps) {
  const {
    path,
    as
  } = props;

  const extractContext = useExtractContext();
  const templateState = useTemplateState();

  // Execute extraction
  if (extractContext && extractContext.sourceObject) {
    try {
      // Extract property value
      const value = getNestedProperty(extractContext.sourceObject, path);

      if (value !== undefined) {
        // Register target variable if it doesn't exist
        if (!templateState.variables[as]) {
          // Determine type
          let type: 'object' | 'array' | 'string' | 'number' | 'boolean' = 'string';
          if (Array.isArray(value)) {
            type = 'array';
          } else if (typeof value === 'object' && value !== null) {
            type = 'object';
          } else if (typeof value === 'string') {
            type = 'string';
          } else if (typeof value === 'number') {
            type = 'number';
          } else if (typeof value === 'boolean') {
            type = 'boolean';
          }

          templateState.registerVariable({
            name: as,
            type,
            initial: value
          });
        }

        // Update target variable
        templateState.setVariable(as, value);
      } else {
        console.warn(`[Property] Property "${path}" not found in source object`);
      }
    } catch (error) {
      console.error(`[Property] Failed to extract property "${path}":`, error);
    }
  }

  // Normal mode - component doesn't render
  return null;
}

/**
 * Execute Property action (used by Extract in event handlers)
 * Called by Extract's executeExtractAction
 */
export function executePropertyAction(
  props: PropertyProps,
  sourceObject: any,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { path, as } = props;

  // Validate required props
  if (!path || !as) {
    console.error('[Property] Missing required props: path and as are required');
    return;
  }

  try {
    // Extract property value
    const value = getNestedProperty(sourceObject, path);

    if (value !== undefined) {
      // Register target variable if it doesn't exist
      if (!templateState.variables[as]) {
        // Determine type
        let type: 'object' | 'array' | 'string' | 'number' | 'boolean' = 'string';
        if (Array.isArray(value)) {
          type = 'array';
        } else if (typeof value === 'object' && value !== null) {
          type = 'object';
        } else if (typeof value === 'string') {
          type = 'string';
        } else if (typeof value === 'number') {
          type = 'number';
        } else if (typeof value === 'boolean') {
          type = 'boolean';
        }

        templateState.registerVariable({
          name: as,
          type,
          initial: value
        });
      }

      // Update target variable
      templateState.setVariable(as, value);
    } else {
      console.warn(`[Property] Property "${path}" not found in source object`);
    }
  } catch (error) {
    console.error(`[Property] Failed to extract property "${path}":`, error);
  }
}
