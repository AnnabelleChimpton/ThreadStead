'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * Template Variable Types
 */
export type VariableType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'array'
  | 'date'
  | 'object'
  | 'computed'
  | 'random'
  | 'urlParam';

/**
 * Template Variable Configuration
 */
export interface TemplateVariable {
  name: string;
  type: VariableType;
  value: any;
  initial: any;
  persist?: boolean;      // Save to localStorage
  computed?: string;      // Expression for computed variables
  options?: any[];        // Options for random variables
  param?: string;         // URL parameter name for urlParam type
  default?: any;          // Default value for urlParam type
}

/**
 * Variable Registration Configuration
 */
export interface VariableConfig {
  name: string;
  type: VariableType;
  initial?: any;
  persist?: boolean;
  computed?: string;
  options?: any[];
  param?: string;
  default?: any;
}

/**
 * Template State Context Type
 */
export interface TemplateStateContextType {
  variables: Record<string, TemplateVariable>;
  getVariable: (name: string) => any;
  setVariable: (name: string, value: any) => void;
  registerVariable: (config: VariableConfig) => void;
  unregisterVariable: (name: string) => void;
  resetVariable: (name: string) => void;
  resetAll: () => void;
}

// localStorage prefix for template variables
const STORAGE_PREFIX = 'threadstead_template_';

// Create the context
const TemplateStateContext = createContext<TemplateStateContextType | null>(null);

/**
 * Template State Provider Component
 *
 * Provides state management for interactive template variables
 */
export interface TemplateStateProviderProps {
  children: React.ReactNode;
  initialVariables?: Record<string, TemplateVariable>;
}

export function TemplateStateProvider({ children, initialVariables = {} }: TemplateStateProviderProps) {
  const [variables, setVariables] = useState<Record<string, TemplateVariable>>(initialVariables);
  const computedDepsRef = useRef<Record<string, Set<string>>>({});

  /**
   * Get variable value by name
   */
  const getVariable = useCallback((name: string): any => {
    return variables[name]?.value;
  }, [variables]);

  /**
   * Set variable value by name
   */
  const setVariable = useCallback((name: string, value: any) => {
    setVariables(prev => {
      const variable = prev[name];
      if (!variable) {
        console.warn(`Attempted to set undefined variable: ${name}`);
        return prev;
      }

      // Type coercion based on variable type
      let coercedValue = value;
      if (variable.type) {
        switch (variable.type) {
          case 'number':
            const num = Number(value);
            coercedValue = isNaN(num) ? 0 : num;
            break;
          case 'boolean':
            coercedValue = value === true || value === 'true' || value === '1';
            break;
          case 'string':
            coercedValue = String(value);
            break;
          case 'array':
            if (!Array.isArray(value)) {
              console.warn(`Attempted to set non-array value to array variable ${name}:`, value);
              coercedValue = Array.isArray(variable.value) ? variable.value : [];
            }
            break;
          // object, computed, random, urlParam, date - no coercion
        }
      }

      // Update the variable
      const updated = {
        ...prev,
        [name]: {
          ...variable,
          value: coercedValue
        }
      };

      // Persist to localStorage if enabled
      if (variable.persist) {
        try {
          const serialized = JSON.stringify(value);
          if (serialized.length <= 100 * 1024) { // 100KB limit per variable
            localStorage.setItem(`${STORAGE_PREFIX}${name}`, serialized);
          } else {
            console.warn(`Variable ${name} too large to persist (${serialized.length} bytes)`);
          }
        } catch (error) {
          console.error(`Failed to persist variable ${name}:`, error);
        }
      }

      return updated;
    });
  }, []);

  /**
   * Register a new variable
   */
  const registerVariable = useCallback((config: VariableConfig) => {
    setVariables(prev => {
      // If variable already exists, don't re-register
      if (prev[config.name]) {
        return prev;
      }

      let initialValue = config.initial;

      // Handle different variable types
      switch (config.type) {
        case 'urlParam':
          // Get value from URL parameter
          if (typeof window !== 'undefined' && config.param) {
            const params = new URLSearchParams(window.location.search);
            const paramValue = params.get(config.param);
            initialValue = paramValue !== null ? paramValue : (config.default ?? initialValue);
          }
          break;

        case 'random':
          // Pick random value from options
          if (config.options && config.options.length > 0) {
            const randomIndex = Math.floor(Math.random() * config.options.length);
            initialValue = config.options[randomIndex];
          }
          break;

        case 'computed':
          // Computed variables start with undefined
          // Will be evaluated by useEffect after all variables are registered
          initialValue = undefined;
          break;

        default:
          // Load from localStorage if persist is enabled
          if (config.persist && typeof window !== 'undefined') {
            try {
              const stored = localStorage.getItem(`${STORAGE_PREFIX}${config.name}`);
              if (stored !== null) {
                initialValue = JSON.parse(stored);
              }
            } catch (error) {
              console.error(`Failed to load persisted variable ${config.name}:`, error);
            }
          }
      }

      const variable: TemplateVariable = {
        name: config.name,
        type: config.type,
        value: initialValue,
        initial: config.initial,
        persist: config.persist,
        computed: config.computed,
        options: config.options,
        param: config.param,
        default: config.default
      };

      return {
        ...prev,
        [config.name]: variable
      };
    });
  }, []);

  /**
   * Unregister a variable
   */
  const unregisterVariable = useCallback((name: string) => {
    setVariables(prev => {
      const { [name]: removed, ...rest } = prev;
      return rest;
    });

    // Clean up computed dependencies
    delete computedDepsRef.current[name];
  }, []);

  /**
   * Reset variable to initial value
   */
  const resetVariable = useCallback((name: string) => {
    setVariables(prev => {
      const variable = prev[name];
      if (!variable) return prev;

      return {
        ...prev,
        [name]: {
          ...variable,
          value: variable.initial
        }
      };
    });

    // Clear from localStorage if persisted
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
      } catch (error) {
        console.error(`Failed to remove persisted variable ${name}:`, error);
      }
    }
  }, []);

  /**
   * Reset all variables to initial values
   */
  const resetAll = useCallback(() => {
    setVariables(prev => {
      const reset: Record<string, TemplateVariable> = {};

      for (const [name, variable] of Object.entries(prev)) {
        reset[name] = {
          ...variable,
          value: variable.initial
        };

        // Clear from localStorage if persisted
        if (variable.persist && typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
          } catch (error) {
            console.error(`Failed to remove persisted variable ${name}:`, error);
          }
        }
      }

      return reset;
    });
  }, []);

  const contextValue: TemplateStateContextType = useMemo(() => ({
    variables,
    getVariable,
    setVariable,
    registerVariable,
    unregisterVariable,
    resetVariable,
    resetAll
  }), [variables, getVariable, setVariable, registerVariable, unregisterVariable, resetVariable, resetAll]);

  // Evaluate computed variables whenever dependencies change
  useEffect(() => {
    const computedVars = Object.entries(variables).filter(([_, v]) => v.type === 'computed' && v.computed);

    if (computedVars.length === 0) {
      return;
    }

    // Import expression evaluator
    import('@/lib/templates/state/expression-evaluator').then(({ evaluateExpression }) => {
      // Re-capture current variables state inside the callback
      setVariables(currentVars => {
        let hasChanges = false;
        const updates: Record<string, TemplateVariable> = {};

        computedVars.forEach(([name, variable]) => {
          try {
            // Build context with all variable values (use currentVars, not stale variables)
            const context = Object.fromEntries(
              Object.entries(currentVars).map(([k, v]) => [k, v.value])
            );

            // Evaluate the expression
            const result = evaluateExpression(variable.computed!, context);

            // Only update if value changed (prevent infinite loops)
            if (result !== variable.value) {
              hasChanges = true;
              updates[name] = {
                ...currentVars[name],
                value: result
              };
            }
          } catch (error) {
            console.error(`Failed to evaluate computed variable "${name}":`, error);
          }
        });

        // Return updated state if there are changes
        if (hasChanges) {
          return {
            ...currentVars,
            ...updates
          };
        }

        // No changes - return current state unchanged
        return currentVars;
      });
    });
  }, [variables]);

  return (
    <TemplateStateContext.Provider value={contextValue}>
      {children}
    </TemplateStateContext.Provider>
  );
}

/**
 * Hook to access template state
 *
 * Works in two modes:
 * 1. If within TemplateStateProvider context (same React tree) - uses Context
 * 2. If outside context (separate React root/island) - uses global manager directly
 *
 * This allows islands hydrated in separate React roots to still access shared state.
 */
export function useTemplateState(): TemplateStateContextType {
  const context = useContext(TemplateStateContext);

  // Force re-render when global state changes (for islands outside context)
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Subscribe to global state if we're outside the context
    if (!context) {
      const unsubscribe = globalTemplateStateManager.subscribe(() => {
        forceUpdate({}); // Trigger re-render
      });
      return unsubscribe;
    }
  }, [context]);

  // If we have context (same React tree), use it
  if (context) {
    return context;
  }

  // Otherwise, use global manager directly (separate React root)
  return {
    variables: globalTemplateStateManager.getAllVariables(),
    getVariable: (name: string) => globalTemplateStateManager.getVariable(name),
    setVariable: (name: string, value: any) => globalTemplateStateManager.setVariable(name, value),
    registerVariable: (config: VariableConfig) => globalTemplateStateManager.registerVariable(config),
    unregisterVariable: (name: string) => globalTemplateStateManager.unregisterVariable(name),
    resetVariable: (name: string) => globalTemplateStateManager.resetVariable(name),
    resetAll: () => globalTemplateStateManager.resetAll()
  };
}

/**
 * Hook to access a specific variable
 *
 * @param name Variable name
 * @returns Variable value
 */
export function useTemplateVariable(name: string): any {
  const { getVariable } = useTemplateState();
  return getVariable(name);
}

/**
 * Global template state instance for use in non-React contexts
 * (e.g., condition-evaluator.ts)
 *
 * Uses the global TemplateStateManager for true cross-island state sharing
 */
import { globalTemplateStateManager } from './TemplateStateManager';

/**
 * Get global template state for use in non-React contexts
 *
 * @returns Template state context (always available via global manager)
 */
export function getGlobalTemplateState(): TemplateStateContextType {
  return {
    variables: globalTemplateStateManager.getAllVariables(),
    getVariable: (name: string) => globalTemplateStateManager.getVariable(name),
    setVariable: (name: string, value: any) => globalTemplateStateManager.setVariable(name, value),
    registerVariable: (config: VariableConfig) => globalTemplateStateManager.registerVariable(config),
    unregisterVariable: (name: string) => globalTemplateStateManager.unregisterVariable(name),
    resetVariable: (name: string) => globalTemplateStateManager.resetVariable(name),
    resetAll: () => globalTemplateStateManager.resetAll()
  };
}

/**
 * Enhanced TemplateStateProvider that uses global state manager
 *
 * This provider:
 * 1. Initializes the global state manager with initial variables
 * 2. Subscribes to global state changes and triggers React re-renders
 * 3. Provides context for React hooks to access global state
 *
 * The global manager ensures all islands share the same state.
 */
export function GlobalTemplateStateProvider({ children, initialVariables }: TemplateStateProviderProps) {
  // Force re-render when global state changes
  const [, forceUpdate] = useState({});
  const computedDepsRef = useRef<Record<string, Set<string>>>({});

  // Initialize global state on mount
  useEffect(() => {
    if (initialVariables) {
      globalTemplateStateManager.initialize(initialVariables);
    }
  }, []); // Only run once on mount

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = globalTemplateStateManager.subscribe(() => {
      forceUpdate({}); // Trigger re-render when state changes
    });
    return unsubscribe;
  }, []);

  // Get current variables from global manager
  const variables = globalTemplateStateManager.getAllVariables();

  const getVariable = useCallback((name: string): any => {
    return globalTemplateStateManager.getVariable(name);
  }, []);

  const setVariable = useCallback((name: string, value: any) => {
    globalTemplateStateManager.setVariable(name, value);
  }, []);

  const registerVariable = useCallback((config: VariableConfig) => {
    globalTemplateStateManager.registerVariable(config);
  }, []);

  const unregisterVariable = useCallback((name: string) => {
    globalTemplateStateManager.unregisterVariable(name);
    delete computedDepsRef.current[name];
  }, []);

  const resetVariable = useCallback((name: string) => {
    globalTemplateStateManager.resetVariable(name);
  }, []);

  const resetAll = useCallback(() => {
    globalTemplateStateManager.resetAll();
  }, []);

  return (
    <TemplateStateContext.Provider value={{
      variables,
      getVariable,
      setVariable,
      registerVariable,
      unregisterVariable,
      resetVariable,
      resetAll
    }}>
      {children}
    </TemplateStateContext.Provider>
  );
}
