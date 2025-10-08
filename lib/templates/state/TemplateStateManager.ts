/**
 * Global Template State Manager
 *
 * Provides a global state store for template variables that works across
 * islands architecture. Unlike React Context, this state is truly global
 * and shared across all islands/components.
 *
 * This follows the standard islands architecture pattern used by frameworks
 * like Astro and Fresh, where interactive islands share state via a global store.
 */

import type { TemplateVariable, VariableType, VariableConfig } from './TemplateStateProvider';

/**
 * Global Template State Manager Class
 *
 * Singleton instance that manages all template variables globally.
 * Islands subscribe to changes and re-render when variables update.
 */
class TemplateStateManager {
  private variables: Record<string, TemplateVariable> = {};
  private listeners: Set<() => void> = new Set();
  private computedDepsRef: Record<string, Set<string>> = {};

  // Scope-based variable storage for proper ForEach isolation
  private scopes: Map<string, Map<string, TemplateVariable>> = new Map();
  private scopeParents: Map<string, string | null> = new Map(); // Track scope hierarchy

  /**
   * Get variable value by name
   * Handles user-content- prefix fallback for compatibility
   */
  getVariable(name: string): any {
    // Try unprefixed version first
    let variable = this.variables[name];

    // If not found and doesn't already have prefix, try with prefix
    if (!variable && !name.startsWith('user-content-')) {
      variable = this.variables[`user-content-${name}`];
    }

    return variable?.value;
  }

  /**
   * Set variable value by name
   * Triggers re-render in all subscribed components
   */
  setVariable(name: string, value: any): void {
    const variable = this.variables[name];

    if (!variable) {
      // WORKAROUND: Check if there's a prefixed version
      const prefixedName = `user-content-${name}`;
      if (this.variables[prefixedName]) {
        console.warn(`[TemplateStateManager] Variable "${name}" not found, using prefixed "${prefixedName}" instead`);
        this.setVariable(prefixedName, value);
        return;
      }

      console.warn(`[TemplateStateManager] Attempted to set undefined variable: ${name}. Available: ${Object.keys(this.variables).join(', ')}`);
      return;
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
            console.warn(`[TemplateStateManager] Attempted to set non-array value to array variable ${name}:`, value);
            coercedValue = Array.isArray(variable.value) ? variable.value : [];
          }
          break;
        // object, computed, random, urlParam, date - no coercion
      }
    }

    // Update the variable
    this.variables[name] = {
      ...variable,
      value: coercedValue
    };

    // Persist to localStorage if enabled
    if (variable.persist && typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(coercedValue);
        if (serialized.length <= 100 * 1024) { // 100KB limit per variable
          localStorage.setItem(`threadstead_template_${name}`, serialized);
        } else {
          console.warn(`[TemplateStateManager] Variable ${name} too large to persist (${serialized.length} bytes)`);
        }
      } catch (error) {
        console.error(`[TemplateStateManager] Failed to persist variable ${name}:`, error);
      }
    }

    // Notify all listeners (trigger re-renders)
    this.notifyListeners();
  }

  /**
   * Register a new variable
   */
  registerVariable(config: VariableConfig): void {
    // If variable already exists, don't re-register
    if (this.variables[config.name]) {
      return;
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
        // Will be evaluated after all variables are registered
        initialValue = undefined;
        break;

      default:
        // Load from localStorage if persist is enabled
        if (config.persist && typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem(`threadstead_template_${config.name}`);
            if (stored !== null) {
              initialValue = JSON.parse(stored);
            }
          } catch (error) {
            console.error(`[TemplateStateManager] Failed to load persisted variable ${config.name}:`, error);
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

    this.variables[config.name] = variable;

    // If this is a computed variable, evaluate it immediately
    if (config.type === 'computed' && config.computed) {
      import('./expression-evaluator').then(({ evaluateExpression }) => {
        try {
          const context = Object.fromEntries(
            Object.entries(this.variables).map(([k, v]) => [k, v.value])
          );

          const result = evaluateExpression(config.computed!, context);

          this.variables[config.name] = {
            ...this.variables[config.name],
            value: result
          };

          // Notify listeners of the computed value
          this.listeners.forEach(fn => fn());
        } catch (error) {
          console.error(`[TemplateStateManager] Failed to evaluate computed variable "${config.name}" on registration:`, error);
        }
      });
    }

    // Notify listeners of new variable
    this.notifyListeners();
  }

  /**
   * Unregister a variable
   */
  unregisterVariable(name: string): void {
    delete this.variables[name];
    delete this.computedDepsRef[name];
    this.notifyListeners();
  }

  /**
   * Reset variable to initial value
   */
  resetVariable(name: string): void {
    const variable = this.variables[name];
    if (!variable) return;

    this.variables[name] = {
      ...variable,
      value: variable.initial
    };

    // Clear from localStorage if persisted
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`threadstead_template_${name}`);
      } catch (error) {
        console.error(`[TemplateStateManager] Failed to remove persisted variable ${name}:`, error);
      }
    }

    this.notifyListeners();
  }

  /**
   * Reset all variables to initial values
   */
  resetAll(): void {
    for (const [name, variable] of Object.entries(this.variables)) {
      this.variables[name] = {
        ...variable,
        value: variable.initial
      };

      // Clear from localStorage if persisted
      if (variable.persist && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`threadstead_template_${name}`);
        } catch (error) {
          console.error(`[TemplateStateManager] Failed to remove persisted variable ${name}:`, error);
        }
      }
    }

    this.notifyListeners();
  }

  /**
   * Get all variables (for debugging/inspection)
   */
  getAllVariables(): Record<string, TemplateVariable> {
    return { ...this.variables };
  }

  /**
   * Register a scope with optional parent scope
   * Used by ForEach to create isolated variable scopes
   */
  registerScope(scopeId: string, parentScopeId?: string | null): void {
    if (!this.scopes.has(scopeId)) {
      this.scopes.set(scopeId, new Map());
    }
    this.scopeParents.set(scopeId, parentScopeId || null);
  }

  /**
   * Unregister a scope and all its variables
   */
  unregisterScope(scopeId: string): void {
    this.scopes.delete(scopeId);
    this.scopeParents.delete(scopeId);
    this.notifyListeners();
  }

  /**
   * Register a variable in a specific scope
   */
  registerScopedVariable(scopeId: string, name: string, config: VariableConfig): void {
    // Ensure scope exists
    if (!this.scopes.has(scopeId)) {
      this.registerScope(scopeId);
    }

    const scope = this.scopes.get(scopeId)!;

    // Create variable
    const variable: TemplateVariable = {
      name,
      type: config.type,
      value: config.initial,
      initial: config.initial,
      persist: config.persist,
      computed: config.computed,
      options: config.options,
      param: config.param,
      default: config.default
    };

    scope.set(name, variable);
    this.notifyListeners();
  }

  /**
   * Set a scoped variable's value
   */
  setScopedVariable(scopeId: string, name: string, value: any): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      console.warn(`[TemplateStateManager] Scope "${scopeId}" not found`);
      return;
    }

    const variable = scope.get(name);
    if (!variable) {
      console.warn(`[TemplateStateManager] Variable "${name}" not found in scope "${scopeId}"`);
      return;
    }

    // Update variable
    scope.set(name, {
      ...variable,
      value
    });

    this.notifyListeners();
  }

  /**
   * Get variable value from scope chain (walks up parent scopes)
   * This is the key method for proper variable resolution
   */
  getVariableInScope(scopeId: string | null | undefined, name: string): any {
    console.log(`[TemplateStateManager] getVariableInScope called:`, { scopeId, name });

    // If no scope, check global variables
    if (!scopeId) {
      console.log(`[TemplateStateManager] No scopeId provided, checking global variables`);
      return this.getVariable(name);
    }

    console.log(`[TemplateStateManager] Walking scope chain starting from "${scopeId}"`);
    console.log(`[TemplateStateManager] Available scopes:`, Array.from(this.scopes.keys()));

    // Walk up scope chain
    let currentScopeId: string | null | undefined = scopeId;
    let depth = 0;
    while (currentScopeId) {
      const scope = this.scopes.get(currentScopeId);
      console.log(`[TemplateStateManager] Checking scope "${currentScopeId}" (depth ${depth}):`, {
        scopeExists: !!scope,
        hasVariable: scope?.has(name),
        scopeVariables: scope ? Array.from(scope.keys()) : []
      });

      if (scope?.has(name)) {
        const value = scope.get(name)?.value;
        console.log(`[TemplateStateManager] ✅ Found "${name}" in scope "${currentScopeId}":`, value);
        return value;
      }

      // Move to parent scope
      currentScopeId = this.scopeParents.get(currentScopeId);
      depth++;
    }

    // Not found in scope chain, check global variables
    console.log(`[TemplateStateManager] Not found in scope chain, checking global variables`);
    const globalValue = this.getVariable(name);
    console.log(`[TemplateStateManager] Global variable "${name}":`, globalValue);
    return globalValue;
  }

  /**
   * Subscribe to variable changes
   * Returns unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(fn => fn());

    // After notifying, evaluate computed variables
    this.evaluateComputedVariables();
  }

  /**
   * Evaluate all computed variables
   */
  private evaluateComputedVariables(): void {
    const computedVars = Object.entries(this.variables).filter(
      ([_, v]) => v.type === 'computed' && v.computed
    );

    if (computedVars.length === 0) {
      return;
    }

    // Import expression evaluator dynamically
    import('./expression-evaluator').then(({ evaluateExpression }) => {
      let hasChanges = false;

      computedVars.forEach(([name, variable]) => {
        try {
          // Build context with all variable values
          const context = Object.fromEntries(
            Object.entries(this.variables).map(([k, v]) => [k, v.value])
          );

          // Evaluate the expression
          const result = evaluateExpression(variable.computed!, context);

          // Only update if value changed (prevent infinite loops)
          if (result !== variable.value) {
            hasChanges = true;
            this.variables[name] = {
              ...variable,
              value: result
            };
          }
        } catch (error) {
          console.error(`[TemplateStateManager] Failed to evaluate computed variable "${name}":`, error);
        }
      });

      // If any computed variables changed, notify listeners again (but don't loop infinitely)
      if (hasChanges) {
        // Notify without triggering another evaluation cycle
        this.listeners.forEach(fn => fn());
      }
    });
  }

  /**
   * Clear all state (useful for cleanup/testing)
   */
  clear(): void {
    this.variables = {};
    this.listeners.clear();
    this.computedDepsRef = {};
  }

  /**
   * Initialize with variables (used by provider)
   */
  initialize(initialVariables: Record<string, TemplateVariable> = {}): void {
    this.variables = { ...initialVariables };
    this.notifyListeners();
  }
}

// Create singleton instance
const globalTemplateStateManager = new TemplateStateManager();

// Export singleton
export { globalTemplateStateManager };

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).__templateState = globalTemplateStateManager;
}
