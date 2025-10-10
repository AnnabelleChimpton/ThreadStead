'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getVariable } from '@/lib/templates/state/variable-utils';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';

/**
 * ForEach Context
 * Provides loop variables (item, index) to nested components
 * Also provides break/continue control
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
  /** Scope ID for this iteration (for scoped variable resolution) */
  scopeId: string;
  /** Flag: should break out of loop (set by Break component) */
  shouldBreak: boolean;
  /** Flag: should continue to next iteration (set by Continue component) */
  shouldContinue: boolean;
  /** Set break flag to exit loop early */
  setBreak: () => void;
  /** Set continue flag to skip to next iteration */
  setContinue: () => void;
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
 * Evaluate a 'when' condition by directly parsing and replacing index variable
 * Supports simple comparisons like "i >= 5", "index < 10"
 */
function evaluateWhenCondition(condition: string, index: number): boolean {
  // Replace 'i' or 'index' with actual value
  const normalized = condition.replace(/\bi\b/g, String(index))
                              .replace(/\bindex\b/g, String(index));

  // Parse comparison (e.g., "5 >= 5")
  const match = normalized.match(/^\s*(\d+)\s*(>=|<=|>|<|===|!==|==|!=)\s*(\d+)\s*$/);
  if (!match) {
    return false;
  }

  const [, left, operator, right] = match;
  const leftNum = Number(left);
  const rightNum = Number(right);

  switch (operator) {
    case '>=': return leftNum >= rightNum;
    case '<=': return leftNum <= rightNum;
    case '>': return leftNum > rightNum;
    case '<': return leftNum < rightNum;
    case '===':
    case '==': return leftNum === rightNum;
    case '!==':
    case '!=': return leftNum !== rightNum;
    default: return false;
  }
}

/**
 * Calculate break index by pre-processing Break components in children
 * Returns the index where the loop should break, or null if no break
 */
function calculateBreakIndex(
  children: React.ReactNode,
  arrayValue: any[],
  varName: string,
  templateState: ReturnType<typeof useTemplateState>
): number | null {
  // Find all Break components in children (including those wrapped in ResidentDataProvider)
  const breakComponents: Array<{ condition?: string; when?: string }> = [];

  const findBreakComponents = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (React.isValidElement(child)) {
        const childType = child.type;
        const typeName = typeof childType === 'function' ? (childType as any).name || (childType as any).displayName : String(childType);

        if (typeName === 'Break') {
          const props = child.props as any;
          breakComponents.push({
            condition: props.condition,
            when: props.when
          });
        }

        // Only recurse into structural wrappers, not functional components
        // This prevents searching into If, Show, etc. which manage their own rendering
        // P3.3 FIX: Include IslandErrorBoundary as a structural element
        const isStructuralElement =
          typeName === 'IslandErrorBoundary' ||
          typeName === 'ResidentDataProvider' ||
          typeName === 'Fragment' ||
          typeof childType === 'string'; // HTML elements like div, span

        if (isStructuralElement && (child.props as any).children) {
          findBreakComponents((child.props as any).children);
        }
      }
    });
  };

  findBreakComponents(children);

  if (breakComponents.length === 0) {
    return null;
  }

  // Iterate through array and check if any Break would trigger at each index
  for (let idx = 0; idx < arrayValue.length; idx++) {
    // Check each Break component
    for (const breakComp of breakComponents) {
      // Warn about unconditional Break (no conditions specified)
      if (!breakComp.condition && !breakComp.when) {
        return 0; // Break immediately at index 0
      }

      let shouldBreak = true;

      // Evaluate outer 'condition' (global variables like $vars.breakAtFive)
      if (breakComp.condition) {
        // Simple evaluation: extract variable name and check its value
        const varMatch = breakComp.condition.match(/\$vars\.(\w+)/);
        if (varMatch) {
          const varName = varMatch[1];
          const variable = templateState?.variables?.[varName];
          const varValue = variable?.value; // Access the .value property

          if (!varValue) {
            shouldBreak = false;
            continue; // Skip this Break component
          }
        } else {
          shouldBreak = false;
          continue;
        }
      }

      // Evaluate inner 'when' condition (scoped variables like i >= 5)
      if (breakComp.when) {
        try {
          // Directly evaluate the condition by replacing 'i' with the current index
          // This avoids registering scopes during render
          const whenResult = evaluateWhenCondition(breakComp.when, idx);

          if (!whenResult) {
            shouldBreak = false;
            continue; // Skip this Break component
          }
        } catch (error) {
          shouldBreak = false;
          continue;
        }
      }

      // Both conditions passed - break at this index
      if (shouldBreak) {
        return idx;
      }
    }
  }

  return null;
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
  // IMPORTANT: This must be before any conditional returns to avoid breaking React Hooks rules
  const variable = getVariable(templateState, varName || '');
  const arrayValue = Array.isArray(variable?.value) ? variable.value : [];

  // Pre-process children to find Break components and calculate break index
  // Serialize variables for stable dependency comparison
  // IMPORTANT: These hooks must be called before any conditional returns
  const variablesHash = React.useMemo(() => {
    return JSON.stringify(templateState?.variables);
  }, [templateState?.variables]);

  const breakAtIndex = React.useMemo(() => {
    // Only calculate if we have valid props
    if (!varName || !itemName) return null;
    return calculateBreakIndex(children, arrayValue, varName, templateState);
  }, [children, arrayValue.length, varName, itemName, variablesHash, templateState]);

  // CRITICAL: Validate required props
  if (!varName) {
    return (
      <div style={{
        padding: '12px',
        margin: '8px 0',
        backgroundColor: '#fef2f2',
        border: '2px solid #dc2626',
        borderRadius: '6px',
        color: '#dc2626',
        fontSize: '13px'
      }}>
        ⚠️ <strong>ForEach Error:</strong> Missing required <code>var</code> prop.
        Example: <code>&lt;ForEach var=&quot;myArray&quot; item=&quot;item&quot;&gt;...&lt;/ForEach&gt;</code>
      </div>
    );
  }

  if (!itemName) {
    return (
      <div style={{
        padding: '12px',
        margin: '8px 0',
        backgroundColor: '#fef2f2',
        border: '2px solid #dc2626',
        borderRadius: '6px',
        color: '#dc2626',
        fontSize: '13px'
      }}>
        ⚠️ <strong>ForEach Error:</strong> Missing required <code>item</code> prop.
        Example: <code>&lt;ForEach var=&quot;myArray&quot; item=&quot;item&quot;&gt;...&lt;/ForEach&gt;</code>
      </div>
    );
  }

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

  // Determine maximum index to render
  const maxIndex = breakAtIndex !== null ? breakAtIndex : arrayValue.length;

  return (
    <>
      {arrayValue.slice(0, maxIndex).map((itemValue, idx) => {
        const scopeId = `forEach-${varName}-${idx}`;

        return (
          <ForEachIteration
            key={idx}
            scopeId={scopeId}
            itemValue={itemValue}
            idx={idx}
            itemName={itemName}
            indexName={indexName}
            varName={varName}
            onBreak={() => {
              // Legacy: Break is now pre-processed, not reactive
            }}
            onContinue={() => {
              // Legacy: Continue not supported in direct template rendering
            }}
            shouldSkip={false}
          >
            {children}
          </ForEachIteration>
        );
      })}
    </>
  );
}

/**
 * ForEachIteration - Wrapper component for each iteration
 * Handles scoped variable registration
 */
interface ForEachIterationProps {
  scopeId: string;
  itemValue: any;
  idx: number;
  itemName: string;
  indexName?: string;
  varName: string;
  onBreak: () => void;
  onContinue: () => void;
  shouldSkip: boolean;
  children: React.ReactNode;
}

function ForEachIteration(props: ForEachIterationProps) {
  const {
    scopeId,
    itemValue,
    idx,
    itemName,
    indexName,
    varName,
    onBreak,
    onContinue,
    shouldSkip,
    children
  } = props;

  // Register scope and variables in useLayoutEffect (runs before paint, on every render)
  // This ensures scopes are always available when Show components evaluate
  React.useLayoutEffect(() => {
    // Ensure scope exists
    globalTemplateStateManager.registerScope(scopeId);

    // Register/update item variable in this scope
    globalTemplateStateManager.registerScopedVariable(scopeId, itemName, {
      name: itemName,
      type: typeof itemValue === 'number' ? 'number' : 'object',
      initial: itemValue
    }, true); // silent=true

    // Update current value
    globalTemplateStateManager.setScopedVariable(scopeId, itemName, itemValue, true);

    // Register/update index variable if specified
    if (indexName) {
      globalTemplateStateManager.registerScopedVariable(scopeId, indexName, {
        name: indexName,
        type: 'number',
        initial: idx
      }, true); // silent=true

      globalTemplateStateManager.setScopedVariable(scopeId, indexName, idx, true);
    }
  }, [scopeId, itemName, itemValue, idx, indexName]);

  // P3.2: Cleanup - recursively delete scope and all child scopes when unmounting
  // This prevents memory leaks from nested ForEach loops
  React.useEffect(() => {
    return () => {
      globalTemplateStateManager.deleteScopeTree(scopeId);
    };
  }, [scopeId]);

  // Process children to:
  // 1. Replace {item} placeholders with actual values
  // 2. Add scopeId prop to components that need scoped resolution (ShowVar, etc.)
  const processedChildren = processForEachChildren(
    children,
    itemValue,
    itemName,
    idx,
    indexName,
    scopeId
  );

  // Skip this iteration if Continue was called
  if (shouldSkip) {
    return null;
  }

  // Wrap in context provider for non-island components
  const contextValue = {
    item: itemValue,
    index: idx,
    itemName,
    indexName,
    scopeId,
    shouldBreak: false, // Legacy, not used anymore
    shouldContinue: false, // Legacy, not used anymore
    setBreak: onBreak,
    setContinue: onContinue
  };

  return (
    <ForEachContext.Provider value={contextValue}>
      {processedChildren}
    </ForEachContext.Provider>
  );
}

/**
 * Process children to replace ForEach template placeholders
 * Replaces {item}, {item.property}, {index} with actual values
 * Adds scopeId prop to components for scoped variable resolution
 */
function processForEachChildren(
  children: React.ReactNode,
  itemValue: any,
  itemName: string,
  currentIndex: number,
  indexName?: string,
  scopeId?: string
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!child) return child;

    // Handle text nodes with template syntax
    if (typeof child === 'string') {
      return replaceTemplatePlaceholders(child, itemValue, itemName, currentIndex, indexName);
    }

    // Handle React elements
    if (React.isValidElement(child)) {
      // P3.3 FIX: Check if this is wrapped in IslandErrorBoundary and/or ResidentDataProvider
      let actualChild = child;
      let boundaryElement: React.ReactElement | null = null;
      let providerElement: React.ReactElement | null = null;

      const childTypeName = typeof child.type === 'function'
        ? (child.type.name || (child.type as any).displayName)
        : String(child.type);

      // First, unwrap IslandErrorBoundary if present
      if (typeof child.type === 'function' &&
          (child.type.name === 'IslandErrorBoundary' ||
           (child.type as any).displayName === 'IslandErrorBoundary')) {
        boundaryElement = child;

        // Extract the actual component from inside the boundary
        const boundaryChildren = React.Children.toArray((child.props as any).children);

        if (boundaryChildren.length > 0 && React.isValidElement(boundaryChildren[0])) {
          actualChild = boundaryChildren[0];
        }
      }

      // Then, unwrap ResidentDataProvider if present
      if (typeof actualChild.type === 'function' &&
          (actualChild.type.name === 'ResidentDataProvider' ||
           (actualChild.type as any).displayName === 'ResidentDataProvider')) {
        providerElement = actualChild;

        // Extract the actual component from inside the provider
        const providerChildren = React.Children.toArray((actualChild.props as any).children);

        if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
          actualChild = providerChildren[0];
          const actualTypeName = typeof actualChild.type === 'function'
            ? (actualChild.type.name || (actualChild.type as any).displayName)
            : String(actualChild.type);
        }
      }

      // Process the actual component's children
      const processedChildren = processForEachChildren(
        (actualChild.props as any).children,
        itemValue,
        itemName,
        currentIndex,
        indexName,
        scopeId
      );

      // Process the actual component's props that might contain template placeholders
      const processedProps: any = {};
      const componentName = typeof actualChild.type === 'function' ? actualChild.type.name : actualChild.type;

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

      // Add scopeId prop to components that need scoped variable resolution
      if (scopeId && (componentName === 'ShowVar' || componentName === 'Show' || componentName === 'Break')) {
        processedProps.scopeId = scopeId;
      }

      // Clone the actual component with processed props
      let processedChild = React.cloneElement(actualChild, processedProps, processedChildren);

      // Re-wrap in reverse order: provider first, then boundary
      if (providerElement) {
        processedChild = React.cloneElement(providerElement, providerElement.props as any, processedChild);
      }

      if (boundaryElement) {
        processedChild = React.cloneElement(boundaryElement, boundaryElement.props as any, processedChild);
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
