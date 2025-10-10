'use client';

import React, { useEffect } from 'react';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';

/**
 * ConditionalAttr Component - Conditionally set/remove element attributes
 *
 * Dynamically sets or removes HTML attributes based on conditions.
 * Reacts to variable changes and updates attributes automatically.
 *
 * @example
 * ```xml
 * <!-- Disable button when form is invalid -->
 * <ConditionalAttr
 *   element="#submitBtn"
 *   attribute="disabled"
 *   when="$vars.formValid === false"
 *   value="true"
 * />
 *
 * <!-- Set aria-expanded based on state -->
 * <ConditionalAttr
 *   element="#menu"
 *   attribute="aria-expanded"
 *   when="$vars.menuOpen"
 *   value="true"
 * />
 *
 * <!-- Use target="this" for current element -->
 * <div id="panel">
 *   <ConditionalAttr
 *     element="this"
 *     attribute="aria-hidden"
 *     when="$vars.panelHidden"
 *     value="true"
 *   />
 * </div>
 * ```
 */

export interface ConditionalAttrProps {
  /** CSS selector or "this" for current element */
  element: string;

  /** Attribute name to set/remove */
  attribute: string;

  /** Condition (supports all Show component operators) */
  when?: string;

  /** Attribute value when condition is true (default: "true") */
  value?: string;

  // Condition operators (like Show component)
  condition?: string;
  data?: string;
  equals?: string;
  notEquals?: string;
  greaterThan?: string | number;
  lessThan?: string | number;
  greaterThanOrEqual?: string | number;
  lessThanOrEqual?: string | number;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  matches?: string;
  exists?: string | boolean;
  not?: string;
  and?: string | string[];
  or?: string | string[];

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - ConditionalAttr is a reactive component) */
  children?: React.ReactNode;
}

export default function ConditionalAttr(props: ConditionalAttrProps) {
  const {
    element,
    attribute,
    when,
    value = 'true',
    __visualBuilder,
    _isInVisualBuilder,
    ...conditionProps
  } = props;

  const residentData = useResidentData();
  const forEachContext = useForEachContext();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  useEffect(() => {
    if (isVisualBuilder || !element || !attribute) {
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let retryCount = 0;
    const maxRetries = 10;
    let timeoutId: NodeJS.Timeout | null = null;

    const attemptSetup = () => {
      // Find target element(s)
      const elements: Element[] = [];

      if (element === 'this') {
        return;
      } else {
        // Use querySelector/querySelectorAll with automatic prefix handling
        const found = document.querySelectorAll(element);
        elements.push(...Array.from(found));

        // If no elements found and target is an ID selector, try with user-content- prefix
        // (rehype-sanitize automatically prefixes IDs for security)
        if (elements.length === 0 && element.startsWith('#')) {
          const idWithoutHash = element.substring(1);
          if (!idWithoutHash.startsWith('user-content-')) {
            const prefixedSelector = `#user-content-${idWithoutHash}`;
            const prefixedFound = document.querySelectorAll(prefixedSelector);
            elements.push(...Array.from(prefixedFound));
          }
        }
      }

      if (elements.length === 0) {
        retryCount++;
        if (retryCount < maxRetries) {
          timeoutId = setTimeout(attemptSetup, 100);
          return;
        } else {
          return;
        }
      }

      // Function to update attribute based on condition
      const updateAttribute = () => {
        try {
          let conditionMet: boolean;

          // If 'when' contains operators (===, !==, >, <, etc.), use expression evaluator
          if (when && /[=!<>]/.test(when)) {
            // Build context from global variables
            const freshVariables = globalTemplateStateManager.getAllVariables();
            const context: Record<string, any> = {};
            Object.entries(freshVariables).forEach(([k, v]) => {
              context[k] = v.value;
            });

            // Evaluate as expression
            const result = evaluateExpression(when, context);
            conditionMet = Boolean(result);
          } else {
            // Use Show-style condition evaluation
            const config: ConditionConfig = {
              ...(when ? { when } : {}),
              ...conditionProps
            };
            conditionMet = evaluateFullCondition(config, residentData, forEachContext?.scopeId);
          }

          // Set or remove attribute
          elements.forEach(el => {
            if (conditionMet) {
              el.setAttribute(attribute, value);
            } else {
              el.removeAttribute(attribute);
            }
          });
        } catch (error) {
          console.error('[ConditionalAttr] Error updating attribute:', error);
        }
      };

      // Initial update
      updateAttribute();

      // Subscribe to variable changes via global state manager
      unsubscribe = globalTemplateStateManager.subscribe(updateAttribute);
    };

    // Start with initial delay
    timeoutId = setTimeout(attemptSetup, 50);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [element, attribute, value, when, JSON.stringify(conditionProps), residentData, forEachContext, isVisualBuilder]);

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const conditionDisplay = when || conditionProps.condition || conditionProps.data || '(condition)';
    return (
      <div className="inline-block px-2 py-1 bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700 rounded text-xs text-teal-700 dark:text-teal-300 font-mono">
        🔄 ConditionalAttr: {element}[{attribute}]
        <div className="text-xs text-teal-600 mt-1">when {conditionDisplay}</div>
      </div>
    );
  }

  // Normal mode - component doesn't render
  return null;
}

/**
 * Execute ConditionalAttr action
 * Called by event handlers (OnClick, etc.) for one-time attribute setting
 */
export function executeConditionalAttrAction(
  props: ConditionalAttrProps,
  residentData: any,
  forEachContext: any = null
): void {
  const {
    element,
    attribute,
    when,
    value = 'true',
    ...conditionProps
  } = props;

  // Validate required props
  if (!element || !attribute) {
    return;
  }

  try {
    // Find target element(s)
    const elements: Element[] = [];

    if (element === 'this') {
      return;
    } else {
      // Use querySelector/querySelectorAll with automatic prefix handling
      const found = document.querySelectorAll(element);
      elements.push(...Array.from(found));

      // If no elements found and target is an ID selector, try with user-content- prefix
      // (rehype-sanitize automatically prefixes IDs for security)
      if (elements.length === 0 && element.startsWith('#')) {
        const idWithoutHash = element.substring(1);
        if (!idWithoutHash.startsWith('user-content-')) {
          const prefixedSelector = `#user-content-${idWithoutHash}`;
          const prefixedFound = document.querySelectorAll(prefixedSelector);
          elements.push(...Array.from(prefixedFound));
        }
      }
    }

    if (elements.length === 0) {
      return;
    }

    // Evaluate condition
    let conditionMet: boolean;

    // If 'when' contains operators (===, !==, >, <, etc.), use expression evaluator
    if (when && /[=!<>]/.test(when)) {
      // Build context from global variables
      const freshVariables = globalTemplateStateManager.getAllVariables();
      const context: Record<string, any> = {};
      Object.entries(freshVariables).forEach(([k, v]) => {
        context[k] = v.value;
      });

      // Evaluate as expression
      const result = evaluateExpression(when, context);
      conditionMet = Boolean(result);
    } else {
      // Use Show-style condition evaluation
      const config: ConditionConfig = {
        ...(when ? { when } : {}),
        ...conditionProps
      };
      conditionMet = evaluateFullCondition(config, residentData, forEachContext?.scopeId);
    }

    // Set or remove attribute
    elements.forEach(el => {
      if (conditionMet) {
        el.setAttribute(attribute, value);
      } else {
        el.removeAttribute(attribute);
      }
    });
  } catch (error) {
    console.error('[ConditionalAttr] Failed to execute:', error);
  }
}
