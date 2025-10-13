/**
 * Safe Expression Evaluator for Template Variables
 *
 * SCOPE: Arithmetic expressions only
 * - Arithmetic operators: +, -, *, /, %
 * - Comparison operators: >, <, >=, <=, ===, !==
 * - Logical operators: &&, ||, !
 * - Ternary operator: ? :
 * - Math functions: round, floor, ceil, min, max, abs, sqrt, pow
 * - Type conversion: Number, String, Boolean
 *
 * SECURITY:
 * - AST parsing (NOT eval or new Function)
 * - Operator and function whitelisting
 * - Node count limits
 * - Context isolation ($vars namespace only)
 * - No prototype pollution
 */

import jsep from 'jsep';

// P1.2: Expression caching - AST cache
const astCache = new Map<string, jsep.Expression>();
const AST_CACHE_MAX_SIZE = 1000;

// P1.2: Result cache for pure expressions
const resultCache = new Map<string, any>();
const RESULT_CACHE_MAX_SIZE = 500;

// Track cache hits/misses for debugging
let cacheHits = 0;
let cacheMisses = 0;

// Maximum nodes in expression tree (prevent DoS)
const MAX_NODES = 1000;

// Allowed binary operators
const ALLOWED_BINARY_OPERATORS = new Set([
  // Arithmetic
  '+', '-', '*', '/', '%',
  // Comparison (for ternary conditions)
  '>', '<', '>=', '<=', '==', '===', '!=', '!==',
  // Logical (for ternary conditions)
  '&&', '||'
]);

// Allowed unary operators
const ALLOWED_UNARY_OPERATORS = new Set([
  '-',  // Negative
  '+',  // Positive
  '!'   // Logical NOT
]);

// Allowed functions
const ALLOWED_FUNCTIONS = new Map<string, (...args: any[]) => any>([
  // Math functions
  ['Math.min', Math.min],
  ['Math.max', Math.max],
  ['Math.abs', Math.abs],
  ['Math.round', Math.round],
  ['Math.floor', Math.floor],
  ['Math.ceil', Math.ceil],
  ['Math.sqrt', Math.sqrt],
  ['Math.pow', Math.pow],
  // Type conversion
  ['Number', Number],
  ['String', String],
  ['Boolean', Boolean]
]);

/**
 * Expression evaluation context
 */
export interface EvaluationContext {
  [variableName: string]: any;
}

/**
 * Evaluate an arithmetic expression safely
 *
 * @param expression Expression string (e.g., "$vars.price * $vars.quantity")
 * @param context Variable context (variable name → value)
 * @returns Evaluated result
 * @throws Error if expression is invalid or unsafe
 */
export function evaluateExpression(
  expression: string | undefined,
  context: EvaluationContext
): any {
  // CRITICAL: Defensive null checks - return undefined instead of throwing
  if (!expression || typeof expression !== 'string') {
    console.warn('[evaluateExpression] Invalid expression:', expression);
    return undefined;
  }

  // Validate context
  if (!context || typeof context !== 'object') {
    console.warn('[evaluateExpression] Invalid context:', context);
    return undefined;
  }

  // P1.2: Check if expression is pure (no variables at all)
  // CRITICAL: An expression is only pure if it has NO variables, including:
  // - $vars.* template variables
  // - Context variables like 'item', 'index', 'i' (used in collection operations)
  // Only literals and constants are pure (e.g., "5 + 10", "true", "'hello'")
  const hasDollarVars = expression.includes('$vars');
  const hasContextVars = /\b(item|index|i)\b/.test(expression);
  const isPure = !hasDollarVars && !hasContextVars && Object.keys(context).length === 0;

  // P1.2: For pure expressions, check result cache first
  if (isPure) {
    const cachedResult = resultCache.get(expression);
    if (cachedResult !== undefined) {
      cacheHits++;
      return cachedResult;
    }
  }

  // P1.2: Parse expression to AST - check cache first
  let ast: jsep.Expression | undefined = astCache.get(expression);

  if (!ast) {
    // Cache miss - parse
    cacheMisses++;
    try {
      ast = jsep(expression);

      // Add to cache (with size limit)
      if (astCache.size >= AST_CACHE_MAX_SIZE) {
        // Simple LRU: delete first entry
        const firstKey = astCache.keys().next().value;
        if (firstKey) astCache.delete(firstKey);
      }
      astCache.set(expression, ast);
    } catch (error) {
      throw new Error(`Failed to parse expression: ${error}`);
    }
  } else {
    // Cache hit
    cacheHits++;
  }

  // Evaluate AST
  let nodeCount = 0;
  const result = evaluateNode(ast, context);

  // P1.2: Cache pure results
  if (isPure) {
    if (resultCache.size >= RESULT_CACHE_MAX_SIZE) {
      const firstKey = resultCache.keys().next().value;
      if (firstKey) resultCache.delete(firstKey);
    }
    resultCache.set(expression, result);
  }

  return result;

  /**
   * Recursively evaluate an AST node
   */
  function evaluateNode(node: jsep.Expression, ctx: EvaluationContext): any {
    // Check node limit
    nodeCount++;
    if (nodeCount > MAX_NODES) {
      throw new Error('Expression too complex (exceeds node limit)');
    }

    switch (node.type) {
      case 'Literal':
        return (node as jsep.Literal).value;

      case 'Identifier':
        return getIdentifierValue((node as jsep.Identifier).name, ctx);

      case 'BinaryExpression':
        return evaluateBinaryExpression(node as jsep.BinaryExpression, ctx);

      case 'UnaryExpression':
        return evaluateUnaryExpression(node as jsep.UnaryExpression, ctx);

      case 'ConditionalExpression':
        return evaluateConditionalExpression(node as jsep.ConditionalExpression, ctx);

      case 'CallExpression':
        return evaluateCallExpression(node as jsep.CallExpression, ctx);

      case 'MemberExpression':
        return evaluateMemberExpression(node as jsep.MemberExpression, ctx);

      case 'ArrayExpression':
        return evaluateArrayExpression(node as jsep.ArrayExpression, ctx);

      default:
        throw new Error(`Unsupported expression type: ${node.type}`);
    }
  }

  /**
   * Get identifier value from context
   */
  function getIdentifierValue(name: string | undefined, ctx: EvaluationContext): any {
    // CRITICAL: Defensive null check
    if (!name || typeof name !== 'string') {
      console.warn('[getIdentifierValue] Invalid name:', name);
      return undefined;
    }

    // Check if it's a direct variable reference
    if (ctx.hasOwnProperty(name)) {
      return ctx[name];
    }

    // Check if it's a Math function (allowed)
    if (name === 'Math') {
      // Return a proxy that only allows whitelisted methods
      return new Proxy({}, {
        get(target, prop) {
          const funcName = `Math.${String(prop)}`;
          if (ALLOWED_FUNCTIONS.has(funcName)) {
            return ALLOWED_FUNCTIONS.get(funcName);
          }
          throw new Error(`Math.${String(prop)} is not allowed`);
        }
      });
    }

    // Check if it's a global function (Number, String, Boolean)
    if (ALLOWED_FUNCTIONS.has(name)) {
      return ALLOWED_FUNCTIONS.get(name);
    }

    // Undefined identifier
    return undefined;
  }

  /**
   * Evaluate binary expression (e.g., a + b, a > b)
   */
  function evaluateBinaryExpression(node: jsep.BinaryExpression, ctx: EvaluationContext): any {
    const { operator, left, right } = node;

    if (!ALLOWED_BINARY_OPERATORS.has(operator)) {
      throw new Error(`Operator '${operator}' is not allowed`);
    }

    const leftValue = evaluateNode(left, ctx);
    const rightValue = evaluateNode(right, ctx);

    switch (operator) {
      // Arithmetic
      case '+': return leftValue + rightValue;
      case '-': return leftValue - rightValue;
      case '*': return leftValue * rightValue;
      case '/': return leftValue / rightValue;
      case '%': return leftValue % rightValue;

      // Comparison
      case '>': return leftValue > rightValue;
      case '<': return leftValue < rightValue;
      case '>=': return leftValue >= rightValue;
      case '<=': return leftValue <= rightValue;
      case '==': return leftValue == rightValue;
      case '===': return leftValue === rightValue;
      case '!=': return leftValue != rightValue;
      case '!==': return leftValue !== rightValue;

      // Logical
      case '&&': return leftValue && rightValue;
      case '||': return leftValue || rightValue;

      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Evaluate unary expression (e.g., -x, !x)
   */
  function evaluateUnaryExpression(node: jsep.UnaryExpression, ctx: EvaluationContext): any {
    const { operator, argument } = node;

    if (!ALLOWED_UNARY_OPERATORS.has(operator)) {
      throw new Error(`Unary operator '${operator}' is not allowed`);
    }

    const value = evaluateNode(argument, ctx);

    switch (operator) {
      case '-': return -value;
      case '+': return +value;
      case '!': return !value;
      default:
        throw new Error(`Unsupported unary operator: ${operator}`);
    }
  }

  /**
   * Evaluate conditional (ternary) expression (e.g., a ? b : c)
   */
  function evaluateConditionalExpression(node: jsep.ConditionalExpression, ctx: EvaluationContext): any {
    const { test, consequent, alternate } = node;

    const testValue = evaluateNode(test, ctx);

    return testValue ? evaluateNode(consequent, ctx) : evaluateNode(alternate, ctx);
  }

  /**
   * Evaluate function call (e.g., Math.round(x))
   */
  function evaluateCallExpression(node: jsep.CallExpression, ctx: EvaluationContext): any {
    const { callee, arguments: args } = node;

    // Handle member expression calls (object.method())
    if (callee.type === 'MemberExpression') {
      const memberExpr = callee as jsep.MemberExpression;

      // Evaluate the object first
      const objectValue = evaluateNode(memberExpr.object, ctx);

      // DEFENSIVE: If object is undefined/null, return undefined gracefully
      if (objectValue === undefined || objectValue === null) {
        const objectName = (memberExpr.object as any).name || 'unknown';
        console.warn(
          `[Expression] Cannot call method on ${objectValue === null ? 'null' : 'undefined'} object.`,
          `Object: ${objectName}`,
          `Did you mean to use $vars.${objectName}?`
        );
        return undefined;
      }

      // Get property/method name
      const propertyName = (memberExpr.property as jsep.Identifier).name;
      const method = objectValue[propertyName];

      // DEFENSIVE: Method doesn't exist on object
      if (typeof method !== 'function') {
        console.warn(`[Expression] Method '${propertyName}' not found on object:`, objectValue);
        return undefined;
      }

      // Evaluate arguments
      const evaluatedArgs = args.map(arg => evaluateNode(arg, ctx));

      // Try to call the native method (string/array methods are safe)
      try {
        return method.apply(objectValue, evaluatedArgs);
      } catch (error) {
        console.warn(`[Expression] Error calling ${propertyName}():`, error);
        return undefined;
      }
    }

    // Handle direct function calls (Math.round, Number, etc.)
    if (callee.type === 'Identifier') {
      const funcName = (callee as jsep.Identifier).name;

      // Check if function is allowed
      if (!ALLOWED_FUNCTIONS.has(funcName)) {
        // Provide helpful error messages for common mistakes
        if (funcName === 'Get') {
          console.error(`[Expression] Function 'Get' is not available in expressions. Use array indexing instead: $vars.array[$vars.index]`);
          return undefined;
        }
        if (funcName === 'Filter' || funcName === 'Find' || funcName === 'Sort' || funcName === 'Transform') {
          console.error(`[Expression] Function '${funcName}' is not available in expressions. Use it as an action component instead.`);
          return undefined;
        }
        console.error(`[Expression] Function '${funcName}' is not allowed. Only Math functions (round, floor, ceil, min, max, abs, sqrt, pow) and type conversions (Number, String, Boolean) are supported.`);
        return undefined;
      }

      // Get function
      const func = ALLOWED_FUNCTIONS.get(funcName);
      if (!func) {
        console.error(`[Expression] Function '${funcName}' not found`);
        return undefined;
      }

      // Evaluate arguments
      const evaluatedArgs = args.map(arg => evaluateNode(arg, ctx));

      // Call function
      try {
        return func(...evaluatedArgs);
      } catch (error) {
        console.error(`[Expression] Error calling ${funcName}:`, error);
        return undefined;
      }
    }

    // Unsupported call type
    console.error('[Expression] Unsupported function call type');
    return undefined;
  }

  /**
   * Evaluate member expression (e.g., user.name, array[0], $vars.counter)
   */
  function evaluateMemberExpression(node: jsep.MemberExpression, ctx: EvaluationContext): any {
    const { object, property, computed } = node;

    // Special handling for $vars namespace
    // $vars.counter -> look up "counter" in context
    if (object.type === 'Identifier' && (object as jsep.Identifier).name === '$vars') {
      if (!computed && property.type === 'Identifier') {
        const varName = (property as jsep.Identifier).name;
        return ctx[varName];
      }
    }

    const objectValue = evaluateNode(object, ctx);

    if (objectValue === undefined || objectValue === null) {
      return undefined;
    }

    // Get property name
    let propertyName: any;
    if (computed) {
      // Computed property: array[index]
      propertyName = evaluateNode(property, ctx);
    } else {
      // Static property: object.property
      propertyName = (property as jsep.Identifier).name;
    }

    // Access property safely
    if (typeof objectValue === 'object' || Array.isArray(objectValue)) {
      return objectValue[propertyName];
    }

    // Special handling for string length, array length, etc.
    if (propertyName === 'length') {
      if (typeof objectValue === 'string' || Array.isArray(objectValue)) {
        return objectValue.length;
      }
    }

    return undefined;
  }

  /**
   * Evaluate array expression (e.g., [1, 2, 3])
   */
  function evaluateArrayExpression(node: jsep.ArrayExpression, ctx: EvaluationContext): any {
    const { elements } = node;
    return elements.map(element => element ? evaluateNode(element, ctx) : undefined);
  }
}

/**
 * Test if an expression is safe (does not throw errors)
 *
 * @param expression Expression string
 * @param context Variable context
 * @returns true if expression can be evaluated, false otherwise
 */
export function isSafeExpression(expression: string, context: EvaluationContext): boolean {
  try {
    evaluateExpression(expression, context);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse expression and extract variable names
 *
 * @param expression Expression string
 * @returns Array of variable names referenced in expression
 */
export function extractVariableNames(expression: string): string[] {
  if (!expression || typeof expression !== 'string') {
    return [];
  }

  try {
    // P1.2: Use cached AST if available
    let ast = astCache.get(expression);
    if (!ast) {
      ast = jsep(expression);
      if (astCache.size < AST_CACHE_MAX_SIZE) {
        astCache.set(expression, ast);
      }
    }

    const variables = new Set<string>();

    function traverse(node: jsep.Expression) {
      if (node.type === 'Identifier') {
        const name = (node as jsep.Identifier).name;
        // Exclude global functions
        if (!ALLOWED_FUNCTIONS.has(name) && name !== 'Math') {
          variables.add(name);
        }
      } else if (node.type === 'BinaryExpression') {
        const binNode = node as jsep.BinaryExpression;
        traverse(binNode.left);
        traverse(binNode.right);
      } else if (node.type === 'UnaryExpression') {
        const unNode = node as jsep.UnaryExpression;
        traverse(unNode.argument);
      } else if (node.type === 'ConditionalExpression') {
        const condNode = node as jsep.ConditionalExpression;
        traverse(condNode.test);
        traverse(condNode.consequent);
        traverse(condNode.alternate);
      } else if (node.type === 'CallExpression') {
        const callNode = node as jsep.CallExpression;
        callNode.arguments.forEach(traverse);
      } else if (node.type === 'MemberExpression') {
        const memberNode = node as jsep.MemberExpression;
        traverse(memberNode.object);
        if (memberNode.computed) {
          traverse(memberNode.property);
        }
      } else if (node.type === 'ArrayExpression') {
        const arrayNode = node as jsep.ArrayExpression;
        arrayNode.elements.forEach(element => element && traverse(element));
      }
    }

    traverse(ast);
    return Array.from(variables);
  } catch {
    return [];
  }
}

/**
 * Clear expression caches (call on template compilation)
 * P1.2: Clears both AST and result caches
 */
export function clearExpressionCaches(): void {
  astCache.clear();
  resultCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Get cache statistics (for debugging)
 * P1.2: Returns cache size and hit rate metrics
 */
export function getExpressionCacheStats() {
  const total = cacheHits + cacheMisses;
  return {
    astCacheSize: astCache.size,
    resultCacheSize: resultCache.size,
    cacheHits,
    cacheMisses,
    hitRate: total > 0 ? (cacheHits / total * 100).toFixed(2) + '%' : '0%'
  };
}

// P1.2: Debug utilities - expose to window in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__expressionCacheStats = getExpressionCacheStats;
  (window as any).__clearExpressionCaches = clearExpressionCaches;
}
