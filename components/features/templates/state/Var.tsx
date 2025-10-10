'use client';

import React, { useEffect, useRef } from 'react';
import { useTemplateState, VariableType, VariableConfig } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Var Component - Declare a template variable
 *
 * This component registers a variable in the template state system.
 * It does not render anything visually.
 *
 * @example
 * ```xml
 * <Var name="counter" type="number" initial="0" />
 * <Var name="message" type="string" initial="Hello" persist="true" />
 * <Var name="total" type="computed" expression="$vars.price * $vars.quantity" />
 * <Var name="page" type="urlParam" param="p" default="1" />
 * ```
 */

export interface VarProps {
  /** Variable name (must be unique within template) */
  name: string;

  /** Variable type */
  type: VariableType;

  /** Initial value (will be coerced to the specified type) */
  initial?: string | number | boolean | any;

  /** Persist variable to localStorage */
  persist?: boolean | string; // string for HTML attribute compatibility

  /** Expression for computed variables */
  expression?: string;

  /** URL parameter name for urlParam type */
  param?: string;

  /** Default value for urlParam type */
  default?: string | number | boolean | any;

  /** Type coercion for urlParam variables */
  coerce?: 'number' | 'boolean' | 'array' | string;

  /** Separator for array coercion (default: ",") */
  separator?: string;

  /** Children elements (for random type with Option children) */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

export default function Var(props: VarProps) {
  const {
    name,
    type,
    initial,
    persist,
    expression,
    param,
    default: defaultValue,
    coerce,
    separator,
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  // Visual builder mode - show placeholder
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  const templateState = useTemplateState();
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (!templateState) {
      console.error('[Var] No template state available!');
      return;
    }

    // Only register once
    if (hasRegisteredRef.current) {
      return;
    }

    const { registerVariable, unregisterVariable } = templateState;

    // Parse options from children for random type
    let options: any[] | undefined;
    if (type === 'random' && children) {
      options = React.Children.toArray(children)
        .filter(child => React.isValidElement(child) && (child.type as any).name === 'Option')
        .map(child => {
          const optionChild = child as React.ReactElement<any>;
          return optionChild.props.value ?? optionChild.props.children;
        });
    }

    // Coerce initial value to correct type
    let coercedInitial = initial;
    if (initial !== undefined) {
      switch (type) {
        case 'number':
          const parsed = parseFloat(String(initial));
          coercedInitial = typeof initial === 'number' ? initial : (isNaN(parsed) ? 0 : parsed);
          break;
        case 'boolean':
          coercedInitial = initial === true || initial === 'true' || initial === '1';
          break;
        case 'string':
          coercedInitial = String(initial);
          break;
        case 'array':
          if (Array.isArray(initial)) {
            coercedInitial = initial;
          } else if (typeof initial === 'string') {
            // Try to parse JSON string
            try {
              const parsed = JSON.parse(initial);
              coercedInitial = Array.isArray(parsed) ? parsed : [];
            } catch {
              // If parsing fails, treat as empty array
              coercedInitial = [];
            }
          } else {
            coercedInitial = [];
          }
          break;
        case 'object':
          if (typeof initial === 'string') {
            // Try to parse JSON string
            try {
              const parsed = JSON.parse(initial);
              // Ensure result is an object (not array or null)
              coercedInitial = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
            } catch (error) {
              coercedInitial = {};
            }
          } else if (typeof initial === 'object' && initial !== null && !Array.isArray(initial)) {
            // Already an object
            coercedInitial = initial;
          } else {
            // Invalid type, use empty object
            coercedInitial = {};
          }
          break;
        case 'date':
          coercedInitial = initial instanceof Date ? initial : new Date(String(initial));
          break;
      }
    }

    // Coerce persist to boolean
    const shouldPersist = persist === true || persist === 'true' || persist === '1';

    // Register variable
    const config: VariableConfig = {
      name,
      type,
      initial: coercedInitial,
      persist: shouldPersist,
      computed: expression,
      options,
      param,
      default: defaultValue,
      coerce,
      separator
    };

    registerVariable(config);
    hasRegisteredRef.current = true;

    // Cleanup: unregister on unmount
    return () => {
      unregisterVariable(name);
      hasRegisteredRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, type, initial, persist, expression, param, defaultValue, coerce, separator, children]);

  // Visual builder mode - show variable indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded text-xs text-purple-700 dark:text-purple-300 font-mono">
        📊 Var: {name} ({type})
      </div>
    );
  }

  // Component renders nothing in normal mode
  return null;
}

/**
 * Option Component - Used with random type variables
 *
 * @example
 * ```xml
 * <Var name="theme" type="random">
 *   <Option value="light">Light</Option>
 *   <Option value="dark">Dark</Option>
 *   <Option value="auto">Auto</Option>
 * </Var>
 * ```
 */
export interface OptionProps {
  value?: any;
  children?: React.ReactNode;
}

export function Option({ value, children }: OptionProps) {
  // This component is only used as a child of Var with type="random"
  // It doesn't render anything itself
  return null;
}
