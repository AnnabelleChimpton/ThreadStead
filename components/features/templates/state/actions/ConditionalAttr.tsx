'use client';

import React, { useEffect } from 'react';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';
import { evaluateExpression } from '@/lib/templates/state/expression-evaluator';
import { globalTemplateStateManager } from '@/lib/templates/state/TemplateStateManager';
import { useResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useForEachContext } from '../loops/ForEach';
import { isSafePageAttribute, pageElements } from './page-targets';

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
 * <!-- In an event, element="this" is what was clicked -->
 * <div class="card">
 *   <OnClick>
 *     <ConditionalAttr element="this" attribute="data-seen" when="$vars.open" />
 *   </OnClick>
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

  /**
   * Its value while the test fails. Left out, the attribute is removed;
   * aria-expanded and aria-pressed need "false" instead, since without the
   * attribute a toggle isn't one (template audit 14 #4).
   */
  otherwise?: string;

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

  /** Children (ignored - ConditionalAttr is a reactive component) */
  children?: React.ReactNode;
}

export default function ConditionalAttr(props: ConditionalAttrProps) {
  const {
    element,
    attribute,
    when,
    value = 'true',
    otherwise,
    ...conditionProps
  } = props;

  const residentData = useResidentData();
  const forEachContext = useForEachContext();

  useEffect(() => {
    if (!element || !attribute || !isSafePageAttribute(attribute)) {
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
        // Only the page's own elements, never the site around it
        elements.push(...pageElements(element));
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

          // when is a calculation: $vars.open, a bare name (when="on" was
          // read as a path and never true; bug bash 2026-10-26), or a comparison
          if (when) {
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
            } else if (otherwise !== undefined) {
              el.setAttribute(attribute, otherwise);
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
  }, [element, attribute, value, otherwise, when, JSON.stringify(conditionProps), residentData, forEachContext]);

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
  forEachContext: any = null,
  currentElement?: HTMLElement
): void {
  const {
    element,
    attribute,
    when,
    value = 'true',
    otherwise,
    ...conditionProps
  } = props;

  // Validate required props: only state and accessibility attributes
  if (!element || !attribute || !isSafePageAttribute(attribute)) {
    return;
  }

  try {
    // Find target element(s)
    const elements: Element[] = [];

    if (element === 'this') {
      // In an event: the element it happened on (element-events.tsx)
      if (!currentElement) return;
      elements.push(currentElement);
    } else {
      // Only the page's own elements, never the site around it
      elements.push(...pageElements(element));
    }

    if (elements.length === 0) {
      return;
    }

    // Evaluate condition
    let conditionMet: boolean;

    // when is a calculation: $vars.open, a bare name, or a comparison
    if (when) {
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
      } else if (otherwise !== undefined) {
        el.setAttribute(attribute, otherwise);
      } else {
        el.removeAttribute(attribute);
      }
    });
  } catch (error) {
    console.error('[ConditionalAttr] Failed to execute:', error);
  }
}
