'use client';

import React, { createContext, useContext } from 'react';
import { importantStyleRef } from '@/lib/utils/css/parse-style-string';
import { isWebAddress } from '@/lib/templates/core/template-registry-types';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
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
 * Calculate break index by pre-processing Break components in children
 * Returns the index where the loop should break, or null if no break
 */
function calculateBreakIndex(
  children: React.ReactNode,
  arrayValue: any[],
  itemName: string,
  indexName: string | undefined,
  templateState: ReturnType<typeof useTemplateState>
): number | null {
  // Find all Break components in children (including those wrapped in ResidentDataProvider)
  const breakComponents: Array<{ condition?: string; when?: string }> = [];

  const findBreakComponents = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (React.isValidElement(child)) {
        const childType = child.type;
        const typeName = typeof childType === 'function' ? (childType as any).displayName || (childType as any).name : String(childType);

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

  // condition: a calculation on the page's Vars ($vars.limit > 100);
  // when: one on this item and its place too (i >= 5, n.done). Only the
  // first $vars name's truth, and only i or index, counted before (bug bash 2026-10-26)
  const vars: Record<string, unknown> = {};
  for (const [name, variable] of Object.entries(templateState?.variables ?? {})) vars[name] = variable?.value;
  const holds = (expression: string, context: Record<string, unknown>) => {
    try {
      return Boolean(evaluateExpression(expression, context));
    } catch {
      return false;
    }
  };

  // Iterate through array and check if any Break would trigger at each index
  for (let idx = 0; idx < arrayValue.length; idx++) {
    for (const breakComp of breakComponents) {
      // No conditions: break straight away
      if (!breakComp.condition && !breakComp.when) return 0;
      if (breakComp.condition && !holds(breakComp.condition, vars)) continue;
      if (breakComp.when) {
        const loop: Record<string, unknown> = { ...vars, i: idx, index: idx, [itemName]: arrayValue[idx] };
        if (indexName) loop[indexName] = idx;
        if (!holds(breakComp.when, loop)) continue;
      }
      return idx;
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

  /** Children to render for each item */
  children?: React.ReactNode;
}

export default function ForEach(props: ForEachProps) {
  const {
    var: varName,
    item: itemName,
    index: indexName,
    className: customClassName,
    children
  } = props;

  const templateState = useTemplateState();
  // A loop inside another sees the outer one's item and index too, and its
  // scopes are its own for each outer item (two inner loops over the same
  // list shared one scope before)
  const outer = useForEachContext();
  // This loop's own, the same in the server's render and the browser's: two
  // loops over one list shared ids, so one going away took the other's names
  // with it ("NaN" on its clicks; bug bash 2026-10-26)
  const loopId = React.useId();

  // Get array from template state with prefix fallback
  // IMPORTANT: This must be before any conditional returns to avoid breaking React Hooks rules
  const variable = getVariable(templateState, varName || '');
  const arrayValue = Array.isArray(variable?.value) ? variable.value : [];

  // Pre-process children to find Break components and calculate break index
  // IMPORTANT: These hooks must be called before any conditional returns.
  // (No JSON.stringify of every Var for the deps: it cost a copy of the
  // page's state each render, and a Var holding Math made it throw.)
  const breakAtIndex = React.useMemo(() => {
    // Only calculate if we have valid props
    if (!varName || !itemName) return null;
    return calculateBreakIndex(children, arrayValue, itemName, indexName, templateState);
  }, [children, arrayValue, varName, itemName, indexName, templateState]);

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

  // Normal mode - render children for each array item
  if (arrayValue.length === 0) {
    return null; // Empty array renders nothing
  }

  // Determine maximum index to render
  const maxIndex = breakAtIndex !== null ? breakAtIndex : arrayValue.length;

  return (
    <>
      {arrayValue.slice(0, maxIndex).map((itemValue, idx) => {
        const scopeId = `${outer ? `${outer.scopeId}/` : ''}forEach-${varName}-${loopId}-${idx}`;

        return (
          <ForEachIteration
            key={idx}
            scopeId={scopeId}
            parentScopeId={outer?.scopeId}
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
  parentScopeId?: string;
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
    parentScopeId,
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
    // Ensure scope exists, inside an outer loop's
    globalTemplateStateManager.registerScope(scopeId, parentScopeId);

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
  }, [scopeId, parentScopeId, itemName, itemValue, idx, indexName]);

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
        ? ((child.type as any).displayName || child.type.name)
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
            ? ((actualChild.type as any).displayName || actualChild.type.name)
            : String(actualChild.type);
        }
      }

      // Process the actual component's children. An inner loop that names
      // its item or index the same as this one gets those placeholders for
      // itself: filled here first, {item} showed the outer item (bug bash 2026-10-26)
      const inner = actualChild.type === ForEach ? (actualChild.props as ForEachProps) : null;
      const processedChildren = processForEachChildren(
        (actualChild.props as any).children,
        itemValue,
        inner && (inner.item === itemName || inner.index === itemName) ? '' : itemName,
        currentIndex,
        inner && indexName && (inner.item === indexName || inner.index === indexName) ? undefined : indexName,
        scopeId
      );

      // Process the actual component's props that might contain template placeholders
      const processedProps: any = {};
      const componentName = typeof actualChild.type === 'function' ? ((actualChild.type as any).displayName || actualChild.type.name) : actualChild.type;

      Object.keys(actualChild.props as any).forEach((key) => {
        const propValue = (actualChild.props as any)[key];

        // Skip children
        if (key === 'children') {
          return;
        }

        // Process string props
        if (typeof propValue === 'string') {
          // Special handling for index prop in RemoveAt and similar components
          if (key === 'index' && propValue === `{${indexName}}`) {
            processedProps[key] = currentIndex;
          } else if (CONDITION_PROPS.has(key) && /^\{\s*[\w$.]+\s*\}$/.test(propValue)) {
            // A condition names what to test: {p.kind} stays the path p.kind,
            // read from this loop's scope. As its value ("cat") it was read as
            // a path that doesn't exist, so <If data="{p.kind}"> never showed.
            processedProps[key] = propValue.slice(1, -1).trim();
          } else {
            const filled = replaceTemplatePlaceholders(
              propValue,
              itemValue,
              itemName,
              currentIndex,
              indexName
            );
            // An address filled in from the list (which a ?var= link can
            // supply) is checked like one written in the page: the page's
            // own href="javascript:…" is refused when it compiles, but
            // href="{u}" reached window.open (bug bash 2026-10-26)
            const address = URL_PROPS.has(key) && filled !== propValue && !isWebAddress(filled.trim()) && !(IMAGE_PROPS.has(key) && DATA_IMAGE.test(filled.trim()));
            processedProps[key] = address ? undefined : filled;
          }
        } else if (key === 'style' && propValue && typeof propValue === 'object') {
          // The page's style="left: calc({i} * 2em)" arrives as an object
          // (IslandPage.tsx), so it was never filled in
          const style = loopStyle(propValue, itemValue, itemName, currentIndex, indexName);
          processedProps.style = style;
          if (style !== propValue) {
            const important = importantStyleRef(style as Record<string, string>);
            if (important) processedProps.ref = important;
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
 * A style object with the loop's {item} and {i} filled in, or the same
 * object when there was nothing to fill. A value a list item brought in
 * can't load anything (url(), image-set()): that declaration is left out,
 * since a list can come from the page address (a urlParam Var).
 */
function loopStyle(
  style: Record<string, unknown>,
  itemValue: any,
  itemName: string,
  currentIndex: number,
  indexName?: string
): Record<string, unknown> {
  if (!Object.values(style).some((value) => typeof value === 'string' && value.includes('{'))) return style;
  const filled: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(style)) {
    if (typeof value !== 'string' || !value.includes('{')) {
      filled[name] = value;
      continue;
    }
    const replaced = replaceTemplatePlaceholders(value, itemValue, itemName, currentIndex, indexName);
    const loads = /url\(|image-set\(|image\(|expression\(|\\/i;
    if (loads.test(replaced) && !loads.test(value)) continue;
    filled[name] = replaced;
  }
  return filled;
}

/** Props that name what a condition tests (If, ConditionalAttr, Break) */
const CONDITION_PROPS = new Set(['data', 'condition', 'when']);

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
  // Names as written, never a pattern of their own (item="a+"); and the
  // values go in by function, so a "$" in them stays as typed ("pay $$5")
  const item = escapeRegExp(itemName);
  const index = indexName ? escapeRegExp(indexName) : '';

  // Replace {index} or {i} with actual index
  if (indexName) {
    // Replace index expressions like {i + 1}
    result = result.replace(
      new RegExp(`\\{${index}\\s*\\+\\s*(\\d+)\\}`, 'g'),
      (_, offset) => String(currentIndex + parseInt(offset, 10))
    );

    // Replace simple {index}
    result = result.replace(
      new RegExp(`\\{${index}\\}`, 'g'),
      () => String(currentIndex)
    );
  }

  // No item name: an inner loop has taken it (processForEachChildren)
  if (!itemName) return result;

  // {word.length} for text items
  if (typeof itemValue === 'string') {
    result = result.replace(new RegExp(`\\{${item}\\.length\\}`, 'g'), () => String(itemValue.length));
  }

  // Replace {item.property} for object items
  if (typeof itemValue === 'object' && itemValue !== null) {
    // Match {item.property} or {item.nested.property}
    result = result.replace(
      new RegExp(`\\{${item}\\.([\\w.]+)\\}`, 'g'),
      (_, propertyPath) => {
        const value = getNestedProperty(itemValue, propertyPath);
        return value !== undefined ? String(value) : '';
      }
    );
  }

  // Replace {item} for primitive items
  result = result.replace(
    new RegExp(`\\{${item}\\}`, 'g'),
    () => (typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue))
  );

  return result;
}

/**
 * Get nested property from object using dot notation
 * Example: getNestedProperty({user: {name: 'John'}}, 'user.name') => 'John'
 */
/** Props that are addresses: links, and images (which may also be data: pictures) */
const URL_PROPS = new Set(['href', 'src', 'link', 'action', 'formAction', 'poster', 'background', 'cite']);
const IMAGE_PROPS = new Set(['src', 'poster', 'background']);
const DATA_IMAGE = /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp);/i;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function getNestedProperty(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // The item's own fields only, never what every object has (constructor)
    if (typeof current === 'string' && part === 'length') return current.length;
    if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
