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
import { evaluateExpression, extractVariableNames } from './expression-evaluator';

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

  // PHASE 1.1: Per-variable listeners for selective subscriptions
  private variableListeners: Map<string, Set<() => void>> = new Map();

  // Scope-based variable storage for proper ForEach isolation
  private scopes: Map<string, Map<string, TemplateVariable>> = new Map();
  private scopeParents: Map<string, string | null> = new Map(); // Track scope hierarchy

  // QUICK WIN #4: Update cycle detection and circuit breaker
  private updateDepth: Map<string, number> = new Map();
  private readonly MAX_UPDATE_DEPTH = 10; // Warning threshold
  private readonly CIRCUIT_BREAKER_DEPTH = 20; // Hard limit to prevent runaway updates

  // P3.1: Stack trace tracking for enhanced cycle debugging (dev mode only)
  private updateCallStacks: Map<string, string[]> = new Map();
  private readonly MAX_STACK_HISTORY = 20; // Keep last 20 stacks per variable

  // P3.1: Dependency graph for computed variables
  // dependencyGraph: varName → Set of variables it depends on
  private dependencyGraph: Map<string, Set<string>> = new Map();
  // reverseDependencyGraph: varName → Set of variables that depend on it
  private reverseDependencyGraph: Map<string, Set<string>> = new Map();

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
        this.setVariable(prefixedName, value);
        return;
      }

      return;
    }

    // QUICK WIN #4: Track update depth for cycle detection
    const currentDepth = this.updateDepth.get(name) || 0;

    // P3.1: Capture stack trace in dev mode for debugging
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      const stack = new Error().stack || '';
      if (!this.updateCallStacks.has(name)) {
        this.updateCallStacks.set(name, []);
      }
      const stacks = this.updateCallStacks.get(name)!;
      stacks.push(stack);

      // Keep only last N stacks to prevent memory bloat
      if (stacks.length > this.MAX_STACK_HISTORY) {
        stacks.shift();
      }
    }

    // Circuit breaker: prevent runaway updates
    if (currentDepth >= this.CIRCUIT_BREAKER_DEPTH) {
      console.error(
        `[TemplateStateManager] CIRCUIT BREAKER: Variable "${name}" exceeded max update depth (${this.CIRCUIT_BREAKER_DEPTH}). Possible infinite loop detected.`,
        '\nThis usually indicates a computed variable or action cycle.',
        '\nPlease review your variable dependencies.'
      );

      // P3.1: Show stack trace history when circuit breaker triggers (dev mode)
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        const stacks = this.updateCallStacks.get(name);
        if (stacks && stacks.length > 0) {
          console.error('\n📋 Update call chain (last 5 updates):');
          stacks.slice(-5).forEach((stack, i) => {
            console.error(`\n--- Update ${stacks.length - 4 + i} ---`);
            // Clean up stack trace (remove first 2 lines - Error and TemplateStateManager)
            const lines = stack.split('\n').slice(2);
            console.error(lines.slice(0, 8).join('\n')); // Show first 8 frames
          });
        }
        // Clear stacks after logging
        this.updateCallStacks.delete(name);
      }

      // Reset depth to prevent permanent lockout
      this.updateDepth.set(name, 0);
      return;
    }

    // Warning threshold
    if (currentDepth >= this.MAX_UPDATE_DEPTH) {
      console.warn(
        `[TemplateStateManager] Variable "${name}" update depth: ${currentDepth}. Possible update cycle.`
      );
    }

    // Increment depth
    this.updateDepth.set(name, currentDepth + 1);

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
            coercedValue = Array.isArray(variable.value) ? variable.value : [];
          }
          break;
        // object, computed, random, urlParam, date - no coercion
      }
    }

    // Check if value actually changed (prevent infinite loops)
    if (variable.value === coercedValue) {
      // Reset depth on no-op
      this.updateDepth.set(name, 0);
      return; // No change, don't notify listeners
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
        }
      } catch (error) {
        console.error(`[TemplateStateManager] Failed to persist variable ${name}:`, error);
      }
    }

    // PHASE 1.1: Notify both global listeners and variable-specific listeners
    // Global listeners are kept for backward compatibility
    this.notifyListeners();
    this.notifyVariableListeners(name);

    // QUICK WIN #4: Reset depth after successful update
    // Use setTimeout to reset after current event loop completes
    // This allows dependent updates to increment the counter before reset
    setTimeout(() => {
      this.updateDepth.set(name, 0);
    }, 0);
  }

  /**
   * Register a new variable
   * @param config Variable configuration
   * @param silent If true, don't notify listeners (for internal variables)
   */
  registerVariable(config: VariableConfig, silent: boolean = false): void {
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

          if (paramValue !== null) {
            // Apply coercion if specified
            if (config.coerce === 'number') {
              initialValue = Number(paramValue);
            } else if (config.coerce === 'boolean') {
              initialValue = paramValue === 'true';
            } else if (config.coerce === 'array') {
              const separator = config.separator || ',';
              initialValue = paramValue.split(separator).map(s => s.trim());
            } else {
              initialValue = paramValue;
            }
          } else {
            initialValue = config.default ?? initialValue;
          }
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
      default: config.default,
      coerce: config.coerce,
      separator: config.separator
    };

    this.variables[config.name] = variable;

    // If this is a computed variable, evaluate it immediately AND build dependency graph
    // P3.1 FIX: Use synchronous evaluation instead of async import
    if (config.type === 'computed' && config.computed) {
      try {
        // P3.1: Build dependency graph
        const deps = extractVariableNames(config.computed);

        // Store dependencies (what this variable depends on)
        this.dependencyGraph.set(config.name, new Set(deps));

        // Update reverse graph (what depends on this variable)
        deps.forEach(dep => {
          if (!this.reverseDependencyGraph.has(dep)) {
            this.reverseDependencyGraph.set(dep, new Set());
          }
          this.reverseDependencyGraph.get(dep)!.add(config.name);
        });

        // P3.1: Check for circular dependencies at compile time
        const cycle = this.detectCircularDependency(config.name);
        if (cycle) {
          console.error(
            `[TemplateStateManager] ⚠️  CIRCULAR DEPENDENCY DETECTED at compile time:\n` +
            `  ${cycle.join(' → ')}\n` +
            `  This will cause infinite update loops!`
          );
        }

        // Evaluate the computed expression
        const context = Object.fromEntries(
          Object.entries(this.variables).map(([k, v]) => [k, v.value])
        );

        const result = evaluateExpression(config.computed, context);

        this.variables[config.name] = {
          ...this.variables[config.name],
          value: result
        };

        // Notify listeners of the computed value
        this.notifyListeners();
      } catch (error) {
        console.error(`[TemplateStateManager] Failed to evaluate computed variable "${config.name}" on registration:`, error);
      }
    }

    // Notify listeners of new variable (unless silent mode for internal variables)
    if (!silent) {
      this.notifyListeners();
    }
  }

  /**
   * Unregister a variable
   */
  unregisterVariable(name: string): void {
    delete this.variables[name];
    delete this.computedDepsRef[name];

    // P3.1: Clean up dependency graphs
    const deps = this.dependencyGraph.get(name);
    if (deps) {
      // Remove this variable from reverse dependencies
      deps.forEach(dep => {
        this.reverseDependencyGraph.get(dep)?.delete(name);
      });
    }
    this.dependencyGraph.delete(name);

    // Remove from reverse graph
    const dependents = this.reverseDependencyGraph.get(name);
    if (dependents) {
      // Remove from dependency graph of variables that depended on this
      dependents.forEach(dependent => {
        this.dependencyGraph.get(dependent)?.delete(name);
      });
    }
    this.reverseDependencyGraph.delete(name);

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
   * P3.2: Delete a scope and all its child scopes recursively
   * Prevents memory leaks from nested ForEach loops
   *
   * @param parentScopeId The scope ID to delete along with all children
   */
  deleteScopeTree(parentScopeId: string): void {
    // Find all child scopes
    const childScopes: string[] = [];
    for (const [scopeId, parent] of this.scopeParents.entries()) {
      if (parent === parentScopeId) {
        childScopes.push(scopeId);
      }
    }

    // Recursively delete children first
    childScopes.forEach(childId => this.deleteScopeTree(childId));

    // Delete parent scope
    this.unregisterScope(parentScopeId);
  }

  /**
   * Register a variable in a specific scope
   * @param silent If true, don't notify listeners (use during initial render to avoid React warnings)
   */
  registerScopedVariable(scopeId: string, name: string, config: VariableConfig, silent: boolean = false): void {
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
    if (!silent) {
      this.notifyListeners();
    }
  }

  /**
   * Set a scoped variable's value
   * @param silent If true, don't notify listeners (use during initial render to avoid React warnings)
   */
  setScopedVariable(scopeId: string, name: string, value: any, silent: boolean = false): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      return;
    }

    const variable = scope.get(name);
    if (!variable) {
      return;
    }

    // Only notify if value actually changed and not silent
    const valueChanged = variable.value !== value;

    // Update variable
    scope.set(name, {
      ...variable,
      value
    });

    if (!silent && valueChanged) {
      // PHASE 1.1: Notify both global and variable-specific listeners
      this.notifyListeners();
      this.notifyVariableListeners(name);
    }
  }

  /**
   * Get variable value from scope chain (walks up parent scopes)
   * This is the key method for proper variable resolution
   */
  getVariableInScope(scopeId: string | null | undefined, name: string): any {
    // If no scope, check global variables
    if (!scopeId) {
      return this.getVariable(name);
    }

    // Walk up scope chain
    let currentScopeId: string | null | undefined = scopeId;
    while (currentScopeId) {
      const scope = this.scopes.get(currentScopeId);

      if (scope?.has(name)) {
        return scope.get(name)?.value;
      }

      // Move to parent scope
      currentScopeId = this.scopeParents.get(currentScopeId);
    }

    // Not found in scope chain, check global variables
    return this.getVariable(name);
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
   * PHASE 1.1: Subscribe to specific variables only
   * Only triggers re-render when one of the specified variables changes
   *
   * @param callback Function to call when any of the specified variables change
   * @param variables Array of variable names to watch
   * @returns Unsubscribe function
   */
  subscribeToVariables(callback: () => void, variables: string[]): () => void {
    // Subscribe callback to each variable
    variables.forEach(varName => {
      if (!this.variableListeners.has(varName)) {
        this.variableListeners.set(varName, new Set());
      }
      this.variableListeners.get(varName)!.add(callback);
    });

    // Return unsubscribe function
    return () => {
      variables.forEach(varName => {
        const listeners = this.variableListeners.get(varName);
        if (listeners) {
          listeners.delete(callback);
          // Clean up empty sets
          if (listeners.size === 0) {
            this.variableListeners.delete(varName);
          }
        }
      });
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
   * PHASE 1.1: Notify only listeners subscribed to a specific variable
   * This is the key optimization that prevents unnecessary re-renders
   *
   * @param varName Variable name that changed
   */
  private notifyVariableListeners(varName: string): void {
    const listeners = this.variableListeners.get(varName);
    if (listeners && listeners.size > 0) {
      listeners.forEach(fn => fn());
    }
  }

  /**
   * Evaluate all computed variables
   * P3.1 FIX: Use synchronous evaluation instead of async import
   */
  private evaluateComputedVariables(): void {
    const computedVars = Object.entries(this.variables).filter(
      ([_, v]) => v.type === 'computed' && v.computed
    );

    if (computedVars.length === 0) {
      return;
    }

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

  /**
   * P3.1: Detect circular dependency in computed variables using DFS
   * Returns cycle path if found, null otherwise
   *
   * @param startVar Variable name to check
   * @returns Array representing the cycle path, or null if no cycle
   */
  private detectCircularDependency(startVar: string): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (varName: string): boolean => {
      // Cycle detected - varName appears in current path
      const cycleIndex = path.indexOf(varName);
      if (cycleIndex !== -1) {
        // Return the cycle portion of the path
        path.push(varName); // Close the cycle
        return true;
      }

      // Already fully explored this variable
      if (visited.has(varName)) {
        return false;
      }

      visited.add(varName);
      path.push(varName);

      // Check all dependencies
      const deps = this.dependencyGraph.get(varName);
      if (deps) {
        for (const dep of deps) {
          if (dfs(dep)) {
            return true;
          }
        }
      }

      // No cycle found through this path, backtrack
      path.pop();
      return false;
    };

    return dfs(startVar) ? path : null;
  }

  /**
   * QUICK WIN #4: Cycle detection utilities for debugging
   */

  /**
   * Detect variables that may be stuck in update cycles
   * Returns list of variables with high update depth
   */
  detectCycles(): string[] {
    const cyclingVariables: string[] = [];

    for (const [name, depth] of this.updateDepth.entries()) {
      if (depth > this.MAX_UPDATE_DEPTH) {
        cyclingVariables.push(`${name} (depth: ${depth})`);
      }
    }

    return cyclingVariables;
  }

  /**
   * Get current update depth for a variable
   * Useful for debugging update chains
   */
  getUpdateDepth(name: string): number {
    return this.updateDepth.get(name) || 0;
  }

  /**
   * Get all variables with their current update depths
   * Returns map of variable name to current depth
   */
  getAllUpdateDepths(): Map<string, number> {
    return new Map(this.updateDepth);
  }

  /**
   * Reset cycle detection for all variables
   * Useful after resolving an update cycle issue
   */
  resetCycleDetection(): void {
    this.updateDepth.clear();
  }

  /**
   * Reset cycle detection for a specific variable
   */
  resetVariableCycleDetection(name: string): void {
    this.updateDepth.delete(name);
  }

  /**
   * P3.1: Get update history (call stacks) for a variable
   * Returns array of stack traces for last N updates
   * Only available in development mode
   *
   * @param name Variable name
   * @returns Array of stack trace strings
   */
  getUpdateHistory(name: string): string[] {
    return this.updateCallStacks.get(name) || [];
  }

  /**
   * P3.1: Get all variables that depend on the given variable
   * Useful for understanding update propagation
   *
   * @param varName Variable name
   * @returns Set of variable names that depend on this variable
   */
  getDependents(varName: string): Set<string> {
    return this.reverseDependencyGraph.get(varName) || new Set();
  }

  /**
   * P3.1: Get full dependency graph for all computed variables
   * Returns map of variable name to array of variables it depends on
   * Useful for visualization and debugging
   *
   * @returns Dependency graph as plain object
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const [name, deps] of this.dependencyGraph.entries()) {
      graph[name] = Array.from(deps);
    }
    return graph;
  }
}

// Create singleton instance
const globalTemplateStateManager = new TemplateStateManager();

// Export singleton
export { globalTemplateStateManager };

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).__templateState = globalTemplateStateManager;

  // P3.1: Enhanced debug API - ALWAYS AVAILABLE for template creators
  // Lightweight tools are available in production for users creating templates
  (window as any).__templateDebug = {
    // ===== Dependency Graph (Always Available) =====
    /**
     * Get full dependency graph
     * ALWAYS AVAILABLE - helps template creators spot circular dependencies
     */
    getDependencyGraph: () => {
      const graph = globalTemplateStateManager.getDependencyGraph();
      if (Object.keys(graph).length === 0) {
        console.log('No computed variables with dependencies');
        return graph;
      }
      console.log('📊 Dependency Graph:');
      console.table(graph);
      return graph;
    },

    /**
     * Get variables that depend on the given variable
     * ALWAYS AVAILABLE
     */
    getDependents: (name: string) => {
      const deps = globalTemplateStateManager.getDependents(name);
      const arr = Array.from(deps);
      if (arr.length === 0) {
        console.log(`No variables depend on "${name}"`);
      } else {
        console.log(`Variables that depend on "${name}":`, arr);
      }
      return deps;
    },

    /**
     * Visualize dependency chain (tree view)
     * ALWAYS AVAILABLE
     */
    visualizeDependencyChain: (varName: string) => {
      const graph = globalTemplateStateManager.getDependencyGraph();

      const buildTree = (name: string, indent = 0, visited = new Set<string>()): string => {
        // Prevent infinite loops in circular dependencies
        if (visited.has(name)) {
          return '  '.repeat(indent) + '└─ ' + name + ' ⚠️  (circular)\n';
        }

        visited.add(name);
        const prefix = '  '.repeat(indent) + (indent > 0 ? '└─ ' : '');
        let result = prefix + name + '\n';

        const deps = graph[name] || [];
        deps.forEach((dep, i) => {
          result += buildTree(dep, indent + 1, new Set(visited));
        });

        return result;
      };

      const tree = buildTree(varName);
      console.log(`🌳 Dependency chain for "${varName}":\n${tree}`);
      return tree;
    },

    /**
     * Find ALL circular dependencies in template
     * ALWAYS AVAILABLE - critical for template creators
     */
    findAllCycles: () => {
      const graph = globalTemplateStateManager.getDependencyGraph();
      const allVars = Object.keys(graph);
      const cycles: string[][] = [];
      const seenCycles = new Set<string>();

      allVars.forEach(varName => {
        // Try detecting cycle starting from this variable
        const visited = new Set<string>();
        const path: string[] = [];

        const dfs = (name: string): boolean => {
          const cycleIndex = path.indexOf(name);
          if (cycleIndex !== -1) {
            // Found a cycle - extract it
            const cycle = [...path.slice(cycleIndex), name];
            const cycleKey = cycle.sort().join('→');

            // Only add if we haven't seen this cycle before
            if (!seenCycles.has(cycleKey)) {
              seenCycles.add(cycleKey);
              cycles.push(cycle);
            }
            return true;
          }

          if (visited.has(name)) return false;

          visited.add(name);
          path.push(name);

          const deps = graph[name] || [];
          for (const dep of deps) {
            dfs(dep);
          }

          path.pop();
          return false;
        };

        dfs(varName);
      });

      if (cycles.length === 0) {
        console.log('✓ No circular dependencies detected');
      } else {
        console.error(`⚠️  Found ${cycles.length} circular dependencies:`);
        cycles.forEach((cycle, i) => {
          console.error(`  ${i + 1}. ${cycle.join(' → ')}`);
        });
      }

      return cycles;
    },

    // ===== Runtime Cycle Detection (Always Available) =====
    /**
     * Detect variables currently in update cycles
     * ALWAYS AVAILABLE
     */
    detectCycles: () => {
      const cycles = globalTemplateStateManager.detectCycles();
      if (cycles.length === 0) {
        console.log('✓ No active update cycles detected');
      } else {
        console.warn(`⚠️  Found ${cycles.length} variable(s) in update cycles:`);
        cycles.forEach(c => console.warn(`  - ${c}`));
      }
      return cycles;
    },

    /**
     * Get update depth for a specific variable
     * ALWAYS AVAILABLE
     */
    getUpdateDepth: (name: string) => {
      const depth = globalTemplateStateManager.getUpdateDepth(name);
      console.log(`Update depth for "${name}": ${depth}`);
      return depth;
    },

    /**
     * Get all variables and their current update depths
     * ALWAYS AVAILABLE
     */
    getAllUpdateDepths: () => {
      const depths = globalTemplateStateManager.getAllUpdateDepths();
      const obj = Object.fromEntries(depths);
      console.table(obj);
      return obj;
    },

    /**
     * Reset cycle detection for all variables
     * ALWAYS AVAILABLE
     */
    resetCycleDetection: () => {
      globalTemplateStateManager.resetCycleDetection();
      console.log('✓ Cycle detection reset for all variables');
    },

    // ===== Helper =====
    /**
     * Show help message
     * ALWAYS AVAILABLE
     */
    help: () => {
      const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
      console.log(`
%c🔧 Threadstead Template Debug Tools%c

%cDependency Graph:%c
  getDependencyGraph()         - View full dependency graph
  getDependents(name)          - See what depends on a variable
  visualizeDependencyChain(name) - Tree view of dependencies
  findAllCycles()              - Find ALL circular dependencies

%cCycle Detection:%c
  detectCycles()               - Find variables in active update cycles
  getUpdateDepth(name)         - Get update depth for a variable
  getAllUpdateDepths()         - View all update depths
  resetCycleDetection()        - Reset cycle counters
${isDev ? `
%cStack Traces (Dev Mode Only):%c
  getUpdateHistory(name)       - View update call stacks for variable
` : ''}
%cQuick Start:%c
  window.__templateDebug.findAllCycles()
  window.__templateDebug.getDependencyGraph()
  window.__templateDebug.detectCycles()
      `,
        'color: #4CAF50; font-weight: bold; font-size: 14px',
        '',
        'color: #2196F3; font-weight: bold',
        '',
        'color: #2196F3; font-weight: bold',
        '',
        isDev ? 'color: #2196F3; font-weight: bold' : '',
        isDev ? '' : '',
        'color: #FF9800; font-weight: bold',
        ''
      );
    }
  };

  // P3.1: Stack traces - DEV MODE ONLY (performance overhead)
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    /**
     * Show update history (stack traces) for a variable
     * DEV MODE ONLY - has performance overhead
     */
    (window as any).__templateDebug.getUpdateHistory = (name: string) => {
      const stacks = globalTemplateStateManager.getUpdateHistory(name);
      if (stacks.length === 0) {
        console.log(`No update history for "${name}"`);
        return [];
      }
      console.log(`📋 Update history for "${name}" (${stacks.length} updates):`);
      stacks.forEach((stack, i) => {
        console.log(`\n--- Update ${i + 1} of ${stacks.length} ---`);
        // Clean up stack (remove first 2 lines)
        const lines = stack.split('\n').slice(2);
        console.log(lines.slice(0, 8).join('\n'));
      });
      return stacks;
    };

    // Friendly console banner (dev mode)
    console.log(
      '%c[Threadstead Debug]',
      'color: #4CAF50; font-weight: bold',
      'Template state debugging available. Type window.__templateDebug.help() for commands'
    );
  } else {
    // Production banner - still helpful for template creators
    console.log(
      '%c[Threadstead]',
      'color: #4CAF50; font-weight: bold',
      'Template debugging tools available. Type window.__templateDebug.help() for commands'
    );
  }
}
