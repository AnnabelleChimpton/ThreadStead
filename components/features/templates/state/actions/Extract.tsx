'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { executePropertyAction } from './Property';

/**
 * Extract Component - Container for extracting object properties
 *
 * Extracts properties from an object variable and creates new variables.
 * Must contain Property child components that define what to extract.
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

export interface ExtractProps {
  /** Source object (can be variable reference like "$vars.user" or variable name) */
  from: string;

  /** Property child components */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

/**
 * Extract Context - provides source object to Property children
 */
interface ExtractContextType {
  sourceObject: any;
  isVisualBuilder: boolean;
}

const ExtractContext = createContext<ExtractContextType | null>(null);

export function useExtractContext() {
  return useContext(ExtractContext);
}

export default function Extract(props: ExtractProps) {
  const {
    from,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Get source object
  let sourceObject: any = null;

  if (!isVisualBuilder) {
    try {
      // Parse 'from' - can be "$vars.varName" or "$vars.varName.path" or just "varName"
      let expression = from;
      if (from && from.startsWith('$vars.')) {
        expression = from; // Keep the full $vars.varName.path
      } else {
        expression = '$vars.' + from; // Add $vars. prefix
      }

      // Get source object by evaluating the expression
      const freshVariables = globalTemplateStateManager.getAllVariables();
      const context: Record<string, any> = {};
      Object.entries(freshVariables).forEach(([k, v]) => {
        context[k] = v.value;
      });

      sourceObject = evaluateExpression(expression, context);

      if (sourceObject === undefined || sourceObject === null) {
        console.warn(`[Extract] Source object "${from}" not found or is null`);
      } else if (typeof sourceObject !== 'object' || Array.isArray(sourceObject)) {
        console.error(`[Extract] Source "${from}" is not an object`);
        sourceObject = null;
      }
    } catch (error) {
      console.error(`[Extract] Error evaluating "${from}":`, error);
    }
  }

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        📦 Extract from: {from}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-purple-400 dark:border-purple-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Provide context to Property children
  const contextValue: ExtractContextType = {
    sourceObject,
    isVisualBuilder
  };

  return (
    <ExtractContext.Provider value={contextValue}>
      {children}
    </ExtractContext.Provider>
  );
}

/**
 * Execute Extract with its Property children
 * Called by event handlers (OnClick, etc.)
 */
export function executeExtractAction(
  props: ExtractProps,
  templateState: ReturnType<typeof useTemplateState>
): void {
  const { from, children } = props;

  if (!from) {
    console.error('[Extract] Missing required prop: from');
    return;
  }

  try {
    // Parse 'from' - can be "$vars.varName" or "$vars.varName.path" or just "varName"
    let expression = from;
    if (from.startsWith('$vars.')) {
      expression = from; // Keep the full $vars.varName.path
    } else {
      expression = '$vars.' + from; // Add $vars. prefix
    }

    // Get source object by evaluating the expression
    // This handles both "$vars.varName" and "$vars.varName.nested.path"
    const freshVariables = globalTemplateStateManager.getAllVariables();
    const context: Record<string, any> = {};
    Object.entries(freshVariables).forEach(([k, v]) => {
      context[k] = v.value;
    });

    const sourceObject = evaluateExpression(expression, context);

    if (sourceObject === undefined || sourceObject === null) {
      console.warn(`[Extract] Source object "${from}" not found or is null`);
      return;
    }

    if (typeof sourceObject !== 'object' || Array.isArray(sourceObject)) {
      console.error(`[Extract] Source "${from}" is not an object`);
      return;
    }

    // Execute Property children
    const childArray = React.Children.toArray(children);

    for (const child of childArray) {
      if (!React.isValidElement(child)) continue;

      // P3.3 FIX: Unwrap IslandErrorBoundary if present (islands architecture)
      let actualChild = child;
      if (typeof child.type === 'function' &&
          (child.type.name === 'IslandErrorBoundary' ||
           (child.type as any).displayName === 'IslandErrorBoundary')) {
        const boundaryChildren = React.Children.toArray((child.props as any).children);
        if (boundaryChildren.length > 0 && React.isValidElement(boundaryChildren[0])) {
          actualChild = boundaryChildren[0];
        }
      }

      // Unwrap ResidentDataProvider if present (islands architecture)
      if (typeof actualChild.type === 'function' &&
          (actualChild.type.name === 'ResidentDataProvider' ||
           (actualChild.type as any).displayName === 'ResidentDataProvider')) {
        const providerChildren = React.Children.toArray((actualChild.props as any).children);
        if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
          actualChild = providerChildren[0];
        }
      }

      // Get component name
      const componentName = typeof actualChild.type === 'function'
        ? actualChild.type.name || (actualChild.type as any).displayName
        : '';

      if (componentName === 'Property') {
        // Execute Property action synchronously
        executePropertyAction(actualChild.props as any, sourceObject, templateState);
      }
    }

  } catch (error) {
    console.error('[Extract] Failed to extract properties:', error);
  }
}
