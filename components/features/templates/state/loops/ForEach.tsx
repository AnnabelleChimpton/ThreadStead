'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getVariable } from '@/lib/templates/state/variable-utils';

/**
 * ForEach Context
 * Provides loop variables (item, index) to nested components
 */
interface ForEachContextValue {
  /** Current item value */
  item: any;
  /** Current loop index (0-based) */
  index: number;
  /** Variable name for the item */
  itemName: string;
  /** Variable name for the index */
  indexName?: string;
}

const ForEachContext = createContext<ForEachContextValue | null>(null);

/**
 * Hook to access ForEach loop variables from nested components
 * @returns ForEach context value or null if not inside a ForEach
 */
export function useForEachContext(): ForEachContextValue | null {
  return useContext(ForEachContext);
}

/**
 * ForEach Component - Loop over array variables
 *
 * Provides iteration over array variables with item and optional index binding.
 * Supports both simple arrays and arrays of objects.
 *
 * @example
 * ```xml
 * <!-- Simple array -->
 * <ForEach var="todoList" item="todo" index="i">
 *   <div>{i}. {todo}</div>
 * </ForEach>
 *
 * <!-- Array of objects -->
 * <ForEach var="users" item="user">
 *   <div>{user.name} - {user.email}</div>
 * </ForEach>
 *
 * <!-- With actions -->
 * <ForEach var="items" item="item" index="i">
 *   <button>
 *     <OnClick>
 *       <RemoveAt var="items" index="{i}" />
 *     </OnClick>
 *     Delete {item}
 *   </button>
 * </ForEach>
 * ```
 */

export interface ForEachProps {
  /** Array variable name */
  var: string;

  /** Name for current item in loop */
  item: string;

  /** Optional name for current index */
  index?: string;

  /** Additional CSS classes */
  className?: string;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children to render for each item */
  children?: React.ReactNode;
}

export default function ForEach(props: ForEachProps) {
  const {
    var: varName,
    item: itemName,
    index: indexName,
    className: customClassName,
    __visualBuilder,
    _isInVisualBuilder,
    children
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Get array from template state with prefix fallback
  const variable = getVariable(templateState, varName);
  const arrayValue = Array.isArray(variable?.value) ? variable.value : [];

  // Visual builder mode - show indicator with sample iteration
  if (isVisualBuilder) {
    return (
      <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg p-4 bg-indigo-50/50 dark:bg-indigo-900/10">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-200 dark:border-indigo-800">
          <span className="px-2 py-1 bg-indigo-500 text-white text-xs rounded font-mono">
            🔁 ForEach
          </span>
          <span className="text-xs text-indigo-700 dark:text-indigo-300 font-mono">
            {itemName}{indexName ? `, ${indexName}` : ''} in {varName}
          </span>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="p-2 bg-white dark:bg-gray-800 rounded border border-indigo-200 dark:border-indigo-800">
            <div className="font-mono text-indigo-600 dark:text-indigo-400 mb-1">
              [Iteration Preview]
            </div>
            {children}
          </div>
          <div className="text-xs text-center text-gray-500">
            {arrayValue.length} item{arrayValue.length !== 1 ? 's' : ''} in array
          </div>
        </div>
      </div>
    );
  }

  // Normal mode - render children for each array item
  if (arrayValue.length === 0) {
    return null; // Empty array renders nothing
  }

  return (
    <>
      {arrayValue.map((itemValue, idx) => {
        // Process children to replace template placeholders
        const processedChildren = processForEachChildren(
          children,
          itemValue,
          itemName,
          idx,
          indexName
        );

        // Wrap in context provider so nested components can access loop variables
        return (
          <ForEachContext.Provider
            key={idx}
            value={{
              item: itemValue,
              index: idx,
              itemName,
              indexName
            }}
          >
            {processedChildren}
          </ForEachContext.Provider>
        );
      })}
    </>
  );
}

/**
 * Process children to replace ForEach template placeholders
 * Replaces {item}, {item.property}, {index} with actual values
 */
function processForEachChildren(
  children: React.ReactNode,
  itemValue: any,
  itemName: string,
  currentIndex: number,
  indexName?: string
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!child) return child;

    // Handle text nodes with template syntax
    if (typeof child === 'string') {
      return replaceTemplatePlaceholders(child, itemValue, itemName, currentIndex, indexName);
    }

    // Handle React elements
    if (React.isValidElement(child)) {
      // Check if this is a ResidentDataProvider wrapper (island architecture)
      let actualChild = child;
      let isWrappedInProvider = false;
      let providerProps: any = null;

      const childTypeName = typeof child.type === 'function'
        ? (child.type.name || (child.type as any).displayName)
        : String(child.type);

      console.log('[ForEach] Processing child:', {
        childType: childTypeName,
        props: child.props,
        hasChildren: !!(child.props as any).children
      });

      if (typeof child.type === 'function' &&
          (child.type.name === 'ResidentDataProvider' ||
           (child.type as any).displayName === 'ResidentDataProvider')) {
        isWrappedInProvider = true;
        providerProps = child.props;

        // Extract the actual component from inside the provider
        const providerChildren = React.Children.toArray((child.props as any).children);
        console.log('[ForEach] Unwrapping provider, found children:', providerChildren.length);

        if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
          actualChild = providerChildren[0];
          const actualTypeName = typeof actualChild.type === 'function'
            ? (actualChild.type.name || (actualChild.type as any).displayName)
            : String(actualChild.type);
          console.log('[ForEach] Unwrapped to:', {
            actualType: actualTypeName,
            actualProps: actualChild.props
          });
        }
      }

      // Process the actual component's children
      const processedChildren = processForEachChildren(
        (actualChild.props as any).children,
        itemValue,
        itemName,
        currentIndex,
        indexName
      );

      // Process the actual component's props that might contain template placeholders
      const processedProps: any = {};
      Object.keys(actualChild.props as any).forEach((key) => {
        const propValue = (actualChild.props as any)[key];

        // Skip children and special props
        if (key === 'children' || key === '__visualBuilder' || key === '_isInVisualBuilder') {
          return;
        }

        // Process string props
        if (typeof propValue === 'string') {
          // Special handling for index prop in RemoveAt and similar components
          if (key === 'index' && propValue === `{${indexName}}`) {
            processedProps[key] = currentIndex;
            console.log(`[ForEach] Replaced index placeholder {${indexName}} with ${currentIndex} for component`,
              typeof actualChild.type === 'function' ? actualChild.type.name : actualChild.type);
          } else {
            processedProps[key] = replaceTemplatePlaceholders(
              propValue,
              itemValue,
              itemName,
              currentIndex,
              indexName
            );
          }
        } else {
          processedProps[key] = propValue;
        }
      });

      // Clone the actual component with processed props
      const processedChild = React.cloneElement(actualChild, processedProps, processedChildren);

      // If it was wrapped in a provider, re-wrap it
      if (isWrappedInProvider) {
        return React.cloneElement(child, providerProps, processedChild);
      }

      return processedChild;
    }

    return child;
  });
}

/**
 * Replace template placeholders in a string
 * Supports: {item}, {item.property}, {index}, {i + 1}
 */
function replaceTemplatePlaceholders(
  text: string,
  itemValue: any,
  itemName: string,
  currentIndex: number,
  indexName?: string
): string {
  let result = text;

  // Replace {index} or {i} with actual index
  if (indexName) {
    // Replace index expressions like {i + 1}
    result = result.replace(
      new RegExp(`\\{${indexName}\\s*\\+\\s*(\\d+)\\}`, 'g'),
      (_, offset) => String(currentIndex + parseInt(offset, 10))
    );

    // Replace simple {index}
    result = result.replace(
      new RegExp(`\\{${indexName}\\}`, 'g'),
      String(currentIndex)
    );
  }

  // Replace {item.property} for object items
  if (typeof itemValue === 'object' && itemValue !== null) {
    // Match {item.property} or {item.nested.property}
    result = result.replace(
      new RegExp(`\\{${itemName}\\.([\\w.]+)\\}`, 'g'),
      (_, propertyPath) => {
        const value = getNestedProperty(itemValue, propertyPath);
        return value !== undefined ? String(value) : '';
      }
    );
  }

  // Replace {item} for primitive items
  result = result.replace(
    new RegExp(`\\{${itemName}\\}`, 'g'),
    typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue)
  );

  return result;
}

/**
 * Get nested property from object using dot notation
 * Example: getNestedProperty({user: {name: 'John'}}, 'user.name') => 'John'
 */
function getNestedProperty(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
