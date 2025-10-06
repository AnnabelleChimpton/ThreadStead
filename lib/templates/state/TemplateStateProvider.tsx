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
    const variable = variables[name];
    return variable?.value;
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

      // Update the variable
      const updated = {
        ...prev,
        [name]: {
          ...variable,
          value
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
          // Computed variables start as initial value
          // Will be evaluated after registration
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

  return (
    <TemplateStateContext.Provider value={contextValue}>
      {children}
    </TemplateStateContext.Provider>
  );
}

/**
 * Hook to access template state
 *
 * @throws Error if used outside TemplateStateProvider
 */
export function useTemplateState(): TemplateStateContextType {
  const context = useContext(TemplateStateContext);

  if (!context) {
    throw new Error('useTemplateState must be used within a TemplateStateProvider');
  }

  return context;
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
 * This is set by the TemplateStateProvider during render
 */
let globalTemplateState: TemplateStateContextType | null = null;

/**
 * Set global template state (called by provider)
 * @internal
 */
export function _setGlobalTemplateState(state: TemplateStateContextType | null) {
  globalTemplateState = state;
}

/**
 * Get global template state for use in non-React contexts
 *
 * @returns Template state context or null if not available
 */
export function getGlobalTemplateState(): TemplateStateContextType | null {
  return globalTemplateState;
}

/**
 * Enhanced TemplateStateProvider that sets global state
 */
export function GlobalTemplateStateProvider({ children, initialVariables }: TemplateStateProviderProps) {
  const [variables, setVariables] = useState<Record<string, TemplateVariable>>(initialVariables || {});
  const computedDepsRef = useRef<Record<string, Set<string>>>({});
  const warnedVariablesRef = useRef<Set<string>>(new Set());

  const getVariable = useCallback((name: string): any => {
    const variable = variables[name];
    return variable?.value;
  }, [variables]);

  const setVariable = useCallback((name: string, value: any) => {
    setVariables(prev => {
      const variable = prev[name];
      if (!variable) {
        // WORKAROUND: Check if there's a prefixed version (due to HTML parser transforming <var> elements)
        const prefixedName = `user-content-${name}`;
        if (prev[prefixedName]) {
          // Only warn once per variable to avoid console spam
          if (process.env.NODE_ENV === 'development' && !warnedVariablesRef.current.has(name)) {
            console.warn(`Variable "${name}" not found, using prefixed "${prefixedName}" instead (HTML parser transformation)`);
            warnedVariablesRef.current.add(name);
          }
          return {
            ...prev,
            [prefixedName]: {
              ...prev[prefixedName],
              value
            }
          };
        }

        // Only warn once per variable to avoid console spam
        if (process.env.NODE_ENV === 'development' && !warnedVariablesRef.current.has(name)) {
          console.warn(`Attempted to set undefined variable: ${name}. Available: ${Object.keys(prev).join(', ')}`);
          warnedVariablesRef.current.add(name);
        }
        return prev;
      }

      const updated = {
        ...prev,
        [name]: {
          ...variable,
          value
        }
      };

      if (variable.persist) {
        try {
          const serialized = JSON.stringify(value);
          if (serialized.length <= 100 * 1024) {
            localStorage.setItem(`${STORAGE_PREFIX}${name}`, serialized);
          } else {
            console.warn(`Variable ${name} too large to persist`);
          }
        } catch (error) {
          console.error(`Failed to persist variable ${name}:`, error);
        }
      }

      return updated;
    });
  }, []);

  const registerVariable = useCallback((config: VariableConfig) => {
    setVariables(prev => {
      if (prev[config.name]) {
        return prev;
      }

      let initialValue = config.initial;

      switch (config.type) {
        case 'urlParam':
          if (typeof window !== 'undefined' && config.param) {
            const params = new URLSearchParams(window.location.search);
            const paramValue = params.get(config.param);
            initialValue = paramValue !== null ? paramValue : (config.default ?? initialValue);
          }
          break;

        case 'random':
          if (config.options && config.options.length > 0) {
            const randomIndex = Math.floor(Math.random() * config.options.length);
            initialValue = config.options[randomIndex];
          }
          break;

        default:
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

  const unregisterVariable = useCallback((name: string) => {
    setVariables(prev => {
      const { [name]: removed, ...rest } = prev;
      return rest;
    });
    delete computedDepsRef.current[name];
  }, []);

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

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
      } catch (error) {
        console.error(`Failed to remove persisted variable ${name}:`, error);
      }
    }
  }, []);

  const resetAll = useCallback(() => {
    setVariables(prev => {
      const reset: Record<string, TemplateVariable> = {};

      for (const [name, variable] of Object.entries(prev)) {
        reset[name] = {
          ...variable,
          value: variable.initial
        };

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

  const contextValue: TemplateStateContextType = {
    variables,
    getVariable,
    setVariable,
    registerVariable,
    unregisterVariable,
    resetVariable,
    resetAll
  };

  // Set global state for non-React contexts
  useEffect(() => {
    _setGlobalTemplateState(contextValue);
    return () => _setGlobalTemplateState(null);
  }, [contextValue]);

  return (
    <TemplateStateContext.Provider value={contextValue}>
      {children}
    </TemplateStateContext.Provider>
  );
}
