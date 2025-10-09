'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { evaluateCaseCondition } from './Case';

/**
 * Switch Component - Pattern matching container
 *
 * Evaluates a value or expression once, then allows Case components
 * to match against it. Similar to switch/case in programming languages.
 *
 * @example
 * ```xml
 * <Switch value="$vars.status">
 *   <Case value="pending">⏳ Pending</Case>
 *   <Case value="approved">✅ Approved</Case>
 *   <Case value="rejected">❌ Rejected</Case>
 *   <Default>❓ Unknown</Default>
 * </Switch>
 * ```
 *
 * @example With expression
 * ```xml
 * <Switch expression="$vars.score / 10">
 *   <Case value="10">Perfect Score!</Case>
 *   <Case value="9">Great!</Case>
 *   <Default>Keep trying!</Default>
 * </Switch>
 * ```
 */

export interface SwitchProps {
  /** Variable reference to use as switch value (e.g., "$vars.status") */
  value?: string;

  /** Expression to evaluate as switch value (e.g., "$vars.score / 10") */
  expression?: string;

  /** Case and Default components to evaluate */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

/**
 * Switch Context Type
 * Shared between Switch container and Case/Default children
 */
export interface SwitchContextType {
  /** The evaluated switch value to match against */
  switchValue: any;

  /** Whether any Case has matched yet */
  hasMatched: boolean;

  /** Mark a Case as matched (prevents subsequent Cases from executing) */
  setMatched: (matched: boolean) => void;
}

// Create context for Switch/Case/Default communication
const SwitchContext = createContext<SwitchContextType | null>(null);

/**
 * Hook to access Switch context from Case/Default components
 */
export function useSwitchContext(): SwitchContextType | null {
  return useContext(SwitchContext);
}

export default function Switch(props: SwitchProps) {
  const {
    value,
    expression,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Evaluate switch value
  const switchValue = useMemo(() => {
    if (expression) {
      // Evaluate expression
      try {
        const context: Record<string, any> = {};

        // Build context from template variables
        Object.keys(templateState.variables).forEach(varName => {
          context[varName] = templateState.variables[varName]?.value;
        });

        return evaluateExpression(expression, context);
      } catch (error) {
        console.error('[Switch] Failed to evaluate expression:', expression, error);
        return undefined;
      }
    } else if (value) {
      // Direct variable reference
      // Support $vars. prefix
      const varName = value.startsWith('$vars.') ? value.slice(6) : value;
      return templateState.variables[varName]?.value;
    }
    return undefined;
  }, [expression, value, templateState.variables]);

  // Track whether any Case has matched
  const [hasMatched, setMatched] = React.useState(false);

  // Reset match state when switch value changes
  React.useEffect(() => {
    setMatched(false);
  }, [switchValue]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<SwitchContextType>(() => ({
    switchValue,
    hasMatched,
    setMatched
  }), [switchValue, hasMatched]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const displayValue = expression || value || 'value';
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        🔀 Switch: {displayValue}
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-purple-400 dark:border-purple-600">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - provide context to Case/Default children
  // Component itself doesn't render
  return (
    <SwitchContext.Provider value={contextValue}>
      {children}
    </SwitchContext.Provider>
  );
}

/**
 * Execute Switch actions
 * Called by event handlers (OnClick, etc.) to handle Switch logic
 *
 * @param children Switch's children (Case/Default components)
 * @param templateState Template state context
 * @param residentData Resident data for condition evaluation
 * @param forEachContext ForEach loop context (if inside ForEach)
 * @param executeActionsCallback Callback to execute child actions
 * @returns Whether any Case matched and was executed
 */
export function executeSwitchActions(
  props: SwitchProps,
  templateState: any,
  residentData: any,
  forEachContext: any,
  executeActionsCallback: (children: React.ReactNode, ...args: any[]) => void
): boolean {
  const { value, expression, children } = props;

  // Evaluate switch value
  let switchValue: any;

  if (expression) {
    // Evaluate expression
    try {
      const context: Record<string, any> = {};

      // Build context from template variables
      Object.keys(templateState.variables).forEach((varName: string) => {
        context[varName] = templateState.variables[varName]?.value;
      });

      switchValue = evaluateExpression(expression, context);
    } catch (error) {
      console.error('[Switch] Failed to evaluate expression:', expression, error);
      switchValue = undefined;
    }
  } else if (value) {
    // Direct variable reference
    const varName = value.startsWith('$vars.') ? value.slice(6) : value;
    switchValue = templateState.variables[varName]?.value;
  }

  // Track whether any Case has matched
  let hasMatched = false;

  // Process children
  const childArray = React.Children.toArray(children);

  for (const child of childArray) {
    if (!React.isValidElement(child)) continue;

    // Unwrap ResidentDataProvider if present (islands architecture)
    let actualChild = child;
    if (typeof child.type === 'function' &&
        (child.type.name === 'ResidentDataProvider' ||
         (child.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((child.props as any).children);
      if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
        actualChild = providerChildren[0];
      }
    }

    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    // Handle Case component
    if (componentName === 'Case' && !hasMatched) {
      const caseProps = actualChild.props as any;

      // Create switch context for evaluateCaseCondition
      const switchContext = {
        switchValue,
        hasMatched
      };

      // Use the proper condition evaluator from Case.tsx
      const matches = evaluateCaseCondition(
        caseProps,
        switchContext,
        residentData,
        forEachContext
      );

      if (matches) {
        hasMatched = true;
        // Execute Case children
        executeActionsCallback(caseProps.children, templateState, residentData, forEachContext);
      }
    }
    // Handle Default component
    else if (componentName === 'Default' && !hasMatched) {
      // Execute Default children
      const defaultProps = actualChild.props as any;
      executeActionsCallback(defaultProps.children, templateState, residentData, forEachContext);
      hasMatched = true; // Mark as matched to prevent further execution
    }
  }

  return hasMatched;
}
