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
 * - Chance and time: random(), pick(list), $time (the visitor's clock)
 * - List checks with an arrow: some, every, filter, map, find, findIndex, reduce
 *
 * SECURITY:
 * - AST parsing (NOT eval or new Function)
 * - Operator and function whitelisting
 * - Node count limits (as written) and a step budget (as run)
 * - Context isolation ($vars namespace only)
 * - No prototype pollution
 */

import { loopNames } from './loop-names';
import jsep from 'jsep';
import jsepObject from '@jsep-plugin/object';

// {name: $vars.n}: an object written in a calculation (evaluateObjectExpression)
jsep.plugins.register(jsepObject);

/**
 * c => c == 'X' and (s, i) => s.y > i: an arrow, for the list methods that
 * take one (LIST_CHECKS). Parsed as a binary => with the lowest precedence,
 * then turned into its own node, the way @jsep-plugin/arrow does.
 */
const ARROW = 'ArrowFunctionExpression';
jsep.plugins.register({
  name: 'arrow',
  init() {
    jsep.addBinaryOp('=>', 0.1, true);
    jsep.hooks.add('after-expression', (env: { node?: jsep.Expression }) => toArrows(env.node));
  },
});

function toArrows(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(toArrows);
    else toArrows(value);
  }
  const binary = node as { type?: string; operator?: string; left?: jsep.Expression; right?: jsep.Expression; params?: jsep.Expression[]; body?: jsep.Expression };
  if (binary.type === 'BinaryExpression' && binary.operator === '=>' && binary.left && binary.right) {
    const { left, right } = binary;
    delete binary.left;
    delete binary.right;
    delete binary.operator;
    binary.type = ARROW;
    binary.params = left.type === 'SequenceExpression' ? (left as jsep.SequenceExpression).expressions : [left];
    binary.body = right;
  }
}

/**
 * List methods that take an arrow written right there, run by our own
 * evaluator for each item: board.some(c => c == ''), stars.filter(s => s.y < 90).
 * Only these, and only with an arrow, so no other function is ever called.
 */
const LIST_CHECKS = new Set(['some', 'every', 'filter', 'map', 'find', 'findIndex', 'reduce']);

/** How many nodes an expression has as written */
function sizeOf(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  let size = (node as { type?: unknown }).type ? 1 : 0;
  for (const value of Object.values(node)) size += Array.isArray(value) ? value.reduce((n: number, item) => n + sizeOf(item), 0) : sizeOf(value);
  return size;
}

// P1.2: Expression caching - AST cache
const astCache = new Map<string, jsep.Expression>();
const AST_CACHE_MAX_SIZE = 1000;

// P1.2: Result cache for pure expressions
const resultCache = new Map<string, any>();
const RESULT_CACHE_MAX_SIZE = 500;

// Track cache hits/misses for debugging
let cacheHits = 0;
let cacheMisses = 0;

// Maximum nodes in an expression as written (prevent DoS)
const MAX_NODES = 1000;
// Most steps one evaluation may take: an arrow runs once for each item of
// a list, so a short expression can do a lot of work
const MAX_STEPS = 100_000;

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
/**
 * The methods an expression may call, by the kind of value: only strings,
 * arrays and numbers, and nothing that takes a function or walks the
 * prototype chain (constructor, __proto__). The list methods that take an
 * arrow are LIST_CHECKS, run by runListCheck. Expressions also run on the
 * server, so anything reachable here runs there too.
 */
const SAFE_METHODS: Record<string, ReadonlySet<string>> = {
  string: new Set(['toUpperCase', 'toLowerCase', 'trim', 'includes', 'startsWith', 'endsWith', 'slice', 'substring', 'split', 'replace', 'padStart', 'padEnd', 'indexOf', 'lastIndexOf', 'charAt', 'repeat', 'at', 'toString']),
  array: new Set(['includes', 'indexOf', 'lastIndexOf', 'join', 'slice', 'concat', 'at']),
  number: new Set(['toFixed', 'toString']),
};

/** A value's own property: never one inherited from its prototype. */
function ownValue(object: object, key: unknown): any {
  return (typeof key === 'string' || typeof key === 'number') && Object.prototype.hasOwnProperty.call(object, key)
    ? (object as Record<string | number, unknown>)[key]
    : undefined;
}

/**
 * random(), pick() and $time change from one moment to the next, so they
 * hold still until the page's state has mounted (goLive): the server's
 * render and the browser's first one (hydration) have to agree. Until then
 * random(a, b) is a, pick(list) its first item and $time nothing.
 */
let live = false;

/** The page has mounted in the browser: chance and time from now on */
export function goLive(): void {
  live = true;
}

/** Never on the server, which has no window: its render must be the same every time */
const isLive = () => live && typeof window !== 'undefined';

let clockRead = false;

/** Whether an expression has read $time, so it's worth working out again each minute */
export function clockWasRead(): boolean {
  return clockRead;
}

/** random() is 0 to 1; random(6) a whole number from 1 to 6; random(a, b) from a to b, both included */
function random(a?: unknown, b?: unknown): number {
  if (a === undefined) return isLive() ? Math.random() : 0;
  const [from, to] = b === undefined ? [1, Number(a)] : [Number(a), Number(b)];
  const low = Math.ceil(Math.min(from, to));
  const high = Math.floor(Math.max(from, to));
  if (!isLive() || !(high > low)) return low;
  return low + Math.floor(Math.random() * (high - low + 1));
}

/** One item of a list, at random */
function pick(list: unknown): unknown {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  return list[isLive() ? Math.floor(Math.random() * list.length) : 0];
}

/** $time: the visitor's own clock */
function timeNow() {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    weekday: now.getDay(), // 0 is Sunday
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    ms: now.getTime(),
  };
}

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
  ['Boolean', Boolean],
  // Chance
  ['random', random],
  ['pick', pick]
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

  // Inside a loop, its names (cell, i) as well, under what the caller gave
  const loop = loopNames();
  if (loop) context = { ...loop, ...context };

  // P1.2: Check if expression is pure (no variables at all)
  // CRITICAL: An expression is only pure if it has NO variables, including:
  // - $vars.* template variables
  // - Context variables like 'item', 'index', 'i' (used in collection operations)
  // Only literals and constants are pure (e.g., "5 + 10", "true", "'hello'")
  const hasDollarVars = expression.includes('$vars');
  const hasContextVars = /\b(item|index|i)\b/.test(expression);
  // Chance and time give a new answer each time
  const changesByItself = /\b(?:random|pick)\s*\(|\$time\b/.test(expression);
  const isPure = !hasDollarVars && !hasContextVars && !changesByItself && Object.keys(context).length === 0;

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
      if (sizeOf(ast) > MAX_NODES) throw new Error('Expression too complex (exceeds node limit)');
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
    if (nodeCount > MAX_STEPS) {
      throw new Error('Expression does too much work (over 100,000 steps): a list check on a very long list?');
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

      case 'ObjectExpression':
        return evaluateObjectExpression(node, ctx);

      case ARROW:
        throw new Error('An arrow (item => …) only works inside some, every, filter, map, find, findIndex or reduce');

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
    if (Object.prototype.hasOwnProperty.call(ctx, name)) {
      return ctx[name];
    }

    if (name === '$time') {
      clockRead = true;
      return isLive() ? timeNow() : undefined;
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

      // Get property/method name: Math's allowed functions, or the safe
      // methods of strings, arrays and numbers
      const propertyName = (memberExpr.property as jsep.Identifier).name;
      const isMath = memberExpr.object.type === 'Identifier' && (memberExpr.object as jsep.Identifier).name === 'Math'
        && !Object.prototype.hasOwnProperty.call(ctx, 'Math');
      const kind = Array.isArray(objectValue) ? 'array' : typeof objectValue;
      if (kind === 'array' && LIST_CHECKS.has(propertyName)) return runListCheck(objectValue, propertyName, args, ctx);
      const method = isMath
        ? objectValue[propertyName] // the Math proxy: allowed functions, or it throws
        : SAFE_METHODS[kind]?.has(propertyName) ? objectValue[propertyName] : undefined;

      if (typeof method !== 'function') {
        console.warn(`[Expression] Method '${propertyName}' isn't available here.`);
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
        console.error(`[Expression] Function '${funcName}' is not allowed. Only Math functions (round, floor, ceil, min, max, abs, sqrt, pow), type conversions (Number, String, Boolean), random and pick are supported.`);
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
   * list.some(c => c == 'X'): the arrow runs here, once for each item, with
   * its names (item, and index if it names a second) on top of what the
   * expression already sees. It counts toward MAX_STEPS like the rest.
   */
  function runListCheck(list: unknown[], name: string, args: jsep.Expression[], ctx: EvaluationContext): any {
    const arrow = args[0] as { type?: string; params?: jsep.Expression[]; body?: jsep.Expression } | undefined;
    if (arrow?.type !== ARROW || !arrow.body) throw new Error(`${name}() needs an arrow, like ${name}(item => item > 1)`);
    const names = (arrow.params ?? []).map((param) => {
      const paramName = param.type === 'Identifier' ? (param as jsep.Identifier).name : '';
      if (!paramName || paramName === '__proto__' || paramName === 'constructor' || paramName === 'prototype') {
        throw new Error("An arrow's names have to be plain names, like (item, i) => …");
      }
      return paramName;
    });
    const body = arrow.body;
    const run = (...values: unknown[]) => {
      const inner: EvaluationContext = { ...ctx };
      names.forEach((paramName, k) => {
        inner[paramName] = values[k];
      });
      return evaluateNode(body, inner);
    };
    if (name === 'reduce') return args.length > 1 ? list.reduce(run, evaluateNode(args[1], ctx)) : list.reduce(run);
    return (list as unknown as Record<string, (fn: typeof run) => unknown>)[name](run);
  }

  /**
   * An object written out, {name: $vars.n, 'score': 2}: names as written,
   * never worked out, and none that would reach the prototype
   */
  function evaluateObjectExpression(node: jsep.Expression, ctx: EvaluationContext): Record<string, unknown> {
    const object: Record<string, unknown> = {};
    for (const property of node.properties as jsep.Expression[]) {
      const { key, value, computed } = property as { key?: jsep.Expression; value?: jsep.Expression; computed?: boolean };
      const name = key?.type === 'Identifier' ? (key as jsep.Identifier).name : key?.type === 'Literal' ? String((key as jsep.Literal).value) : undefined;
      if (property.type !== 'Property' || computed || !value || name === undefined) {
        throw new Error('An object can only hold name: value pairs');
      }
      if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
        throw new Error(`"${name}" can't be a name in an object`);
      }
      object[name] = evaluateNode(value, ctx);
    }
    return object;
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
        // Own variables only: never constructor, __proto__ and the like
        return ownValue(ctx, (property as jsep.Identifier).name);
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

    // Only the value's own properties (an array's items and length too)
    if (typeof objectValue === 'object') {
      return ownValue(objectValue, propertyName);
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

    // `bound`: an arrow's own names (c in board.some(c => …)), not variables
    function traverse(node: jsep.Expression, bound: ReadonlySet<string> = new Set()) {
      const walk = (child: jsep.Expression | null | undefined) => child && traverse(child, bound);
      if (node.type === 'Identifier') {
        const name = (node as jsep.Identifier).name;
        // Exclude global functions
        if (!ALLOWED_FUNCTIONS.has(name) && name !== 'Math' && !bound.has(name)) {
          variables.add(name);
        }
      } else if (node.type === 'BinaryExpression') {
        const binNode = node as jsep.BinaryExpression;
        walk(binNode.left);
        walk(binNode.right);
      } else if (node.type === 'UnaryExpression') {
        const unNode = node as jsep.UnaryExpression;
        walk(unNode.argument);
      } else if (node.type === 'ConditionalExpression') {
        const condNode = node as jsep.ConditionalExpression;
        walk(condNode.test);
        walk(condNode.consequent);
        walk(condNode.alternate);
      } else if (node.type === 'CallExpression') {
        const callNode = node as jsep.CallExpression;
        // board in board.indexOf('') or board.some(…) is read too
        if (callNode.callee.type === 'MemberExpression') walk(callNode.callee);
        callNode.arguments.forEach(walk);
      } else if (node.type === 'MemberExpression') {
        const memberNode = node as jsep.MemberExpression;
        walk(memberNode.object);
        if (memberNode.computed) {
          walk(memberNode.property);
        }
      } else if (node.type === 'ArrayExpression') {
        const arrayNode = node as jsep.ArrayExpression;
        arrayNode.elements.forEach(walk);
      } else if (node.type === 'ObjectExpression') {
        for (const property of (node.properties as { value?: jsep.Expression }[]) ?? []) walk(property.value);
      } else if (node.type === ARROW) {
        const arrow = node as unknown as { params?: jsep.Expression[]; body: jsep.Expression };
        const names = new Set(bound);
        for (const param of arrow.params ?? []) if (param.type === 'Identifier') names.add((param as jsep.Identifier).name);
        traverse(arrow.body, names);
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

/**
 * What's wrong with an expression a page writes, said plainly, or undefined
 * when it's fine. The editor shows it with its line: these only reached the
 * console, so a dice roll on Math.random was "always 0" with no word why
 * (template audit 06 #10). Same parser and allowed functions as above.
 */
export function expressionProblem(expression: string): string | undefined {
  let ast: jsep.Expression;
  try {
    ast = jsep(expression);
  } catch {
    return "can't be read as a calculation";
  }
  let problem: string | undefined;
  // Arrows where they work: the first thing given to a list check
  const placed = new Set<unknown>();
  const visit = (node: unknown): void => {
    if (problem || !node || typeof node !== 'object') return;
    const n = node as { type?: string; arguments?: { type: string }[]; callee?: { type: string; name?: string; object?: { type: string; name?: string }; property?: { name?: string } } };
    if (n.type === ARROW && !placed.has(node)) {
      problem = 'has an arrow (item => …) on its own: it only works inside .some(), .every(), .filter(), .map(), .find(), .findIndex() or .reduce()';
      return;
    }
    if (n.type === 'CallExpression' && n.callee?.type === 'MemberExpression' && LIST_CHECKS.has(n.callee.property?.name ?? '')) {
      const name = n.callee.property!.name;
      if (n.arguments?.[0]?.type !== ARROW) {
        problem = `uses .${name}() without an arrow: write it like .${name}(item => item > 1)`;
        return;
      }
      placed.add(n.arguments[0]);
    } else if (n.type === 'CallExpression' && n.callee) {
      const { callee } = n;
      if (callee.type === 'Identifier' && !ALLOWED_FUNCTIONS.has(callee.name ?? '')) {
        problem = `uses ${callee.name}(), which pages can't use`;
      } else if (callee.type === 'MemberExpression' && callee.object?.type === 'Identifier' && callee.object.name === 'Math' &&
        !ALLOWED_FUNCTIONS.has(`Math.${callee.property?.name}`)) {
        problem = callee.property?.name === 'random'
          ? "uses Math.random, which pages can't use: random(1, 6) rolls a number from 1 to 6"
          : `uses Math.${callee.property?.name}, which pages can't use (these work: Math.round, floor, ceil, min, max, abs, sqrt and pow)`;
      } else if (callee.type === 'MemberExpression' && callee.object?.name !== 'Math' && callee.property?.name &&
        !Object.values(SAFE_METHODS).some((methods) => methods.has(callee.property!.name!))) {
        problem = `uses .${callee.property.name}(), which pages can't use`;
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else visit(value);
    }
  };
  visit(ast);
  return problem;
}
