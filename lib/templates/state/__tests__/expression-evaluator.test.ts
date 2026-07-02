/**
 * Tests for Safe Expression Evaluator
 */

import { evaluateExpression, isSafeExpression, extractVariableNames } from '../expression-evaluator';

describe('evaluateExpression', () => {
  describe('Basic Arithmetic', () => {
    it('should evaluate addition', () => {
      expect(evaluateExpression('2 + 2', {})).toBe(4);
      expect(evaluateExpression('10 + 5', {})).toBe(15);
    });

    it('should evaluate subtraction', () => {
      expect(evaluateExpression('10 - 5', {})).toBe(5);
      expect(evaluateExpression('5 - 10', {})).toBe(-5);
    });

    it('should evaluate multiplication', () => {
      expect(evaluateExpression('3 * 4', {})).toBe(12);
      expect(evaluateExpression('10 * 0', {})).toBe(0);
    });

    it('should evaluate division', () => {
      expect(evaluateExpression('10 / 2', {})).toBe(5);
      expect(evaluateExpression('7 / 2', {})).toBe(3.5);
    });

    it('should evaluate modulo', () => {
      expect(evaluateExpression('10 % 3', {})).toBe(1);
      expect(evaluateExpression('15 % 4', {})).toBe(3);
    });

    it('should handle operator precedence', () => {
      expect(evaluateExpression('2 + 3 * 4', {})).toBe(14); // Not 20
      expect(evaluateExpression('(2 + 3) * 4', {})).toBe(20);
      expect(evaluateExpression('10 - 2 * 3', {})).toBe(4); // Not 24
    });

    it('should handle negative numbers', () => {
      expect(evaluateExpression('-5', {})).toBe(-5);
      expect(evaluateExpression('-5 + 10', {})).toBe(5);
      expect(evaluateExpression('10 + -5', {})).toBe(5);
    });
  });

  describe('Variables', () => {
    it('should access simple variables', () => {
      expect(evaluateExpression('a', { a: 10 })).toBe(10);
      expect(evaluateExpression('price', { price: 99.99 })).toBe(99.99);
    });

    it('should use variables in expressions', () => {
      expect(evaluateExpression('a + b', { a: 10, b: 5 })).toBe(15);
      expect(evaluateExpression('price * quantity', { price: 10, quantity: 3 })).toBe(30);
    });

    it('should handle missing variables as undefined', () => {
      expect(evaluateExpression('missing', {})).toBe(undefined);
    });

    it('should access nested object properties', () => {
      const context = {
        user: { name: 'Alice', age: 30 },
        config: { maxItems: 100 }
      };

      expect(evaluateExpression('user.name', context)).toBe('Alice');
      expect(evaluateExpression('user.age', context)).toBe(30);
      expect(evaluateExpression('config.maxItems', context)).toBe(100);
    });

    it('should access array elements', () => {
      const context = {
        numbers: [10, 20, 30],
        names: ['Alice', 'Bob', 'Charlie']
      };

      expect(evaluateExpression('numbers[0]', context)).toBe(10);
      expect(evaluateExpression('numbers[2]', context)).toBe(30);
      expect(evaluateExpression('names[1]', context)).toBe('Bob');
    });

    it('should handle array and string length', () => {
      const context = {
        items: [1, 2, 3, 4, 5],
        text: 'Hello'
      };

      expect(evaluateExpression('items.length', context)).toBe(5);
      expect(evaluateExpression('text.length', context)).toBe(5);
    });
  });

  describe('Math Functions', () => {
    it('should call Math.round', () => {
      expect(evaluateExpression('Math.round(4.7)', {})).toBe(5);
      expect(evaluateExpression('Math.round(4.4)', {})).toBe(4);
    });

    it('should call Math.floor', () => {
      expect(evaluateExpression('Math.floor(4.9)', {})).toBe(4);
      expect(evaluateExpression('Math.floor(4.1)', {})).toBe(4);
    });

    it('should call Math.ceil', () => {
      expect(evaluateExpression('Math.ceil(4.1)', {})).toBe(5);
      expect(evaluateExpression('Math.ceil(4.9)', {})).toBe(5);
    });

    it('should call Math.abs', () => {
      expect(evaluateExpression('Math.abs(-5)', {})).toBe(5);
      expect(evaluateExpression('Math.abs(5)', {})).toBe(5);
    });

    it('should call Math.min', () => {
      expect(evaluateExpression('Math.min(5, 10)', {})).toBe(5);
      expect(evaluateExpression('Math.min(10, 5, 8)', {})).toBe(5);
    });

    it('should call Math.max', () => {
      expect(evaluateExpression('Math.max(5, 10)', {})).toBe(10);
      expect(evaluateExpression('Math.max(10, 5, 8)', {})).toBe(10);
    });

    it('should call Math.sqrt', () => {
      expect(evaluateExpression('Math.sqrt(16)', {})).toBe(4);
      expect(evaluateExpression('Math.sqrt(25)', {})).toBe(5);
    });

    it('should call Math.pow', () => {
      expect(evaluateExpression('Math.pow(2, 3)', {})).toBe(8);
      expect(evaluateExpression('Math.pow(5, 2)', {})).toBe(25);
    });

    it('should use Math functions with variables', () => {
      const context = { price: 10.7, quantity: 3 };
      expect(evaluateExpression('Math.round(price * quantity)', context)).toBe(32);
    });
  });

  describe('Type Conversion', () => {
    it('should convert to number', () => {
      expect(evaluateExpression('Number("42")', {})).toBe(42);
      expect(evaluateExpression('Number("3.14")', {})).toBe(3.14);
    });

    it('should convert to string', () => {
      expect(evaluateExpression('String(42)', {})).toBe('42');
      expect(evaluateExpression('String(true)', {})).toBe('true');
    });

    it('should convert to boolean', () => {
      expect(evaluateExpression('Boolean(1)', {})).toBe(true);
      expect(evaluateExpression('Boolean(0)', {})).toBe(false);
      expect(evaluateExpression('Boolean("")', {})).toBe(false);
      expect(evaluateExpression('Boolean("hello")', {})).toBe(true);
    });
  });

  describe('Comparison Operators', () => {
    it('should evaluate greater than', () => {
      expect(evaluateExpression('10 > 5', {})).toBe(true);
      expect(evaluateExpression('5 > 10', {})).toBe(false);
    });

    it('should evaluate less than', () => {
      expect(evaluateExpression('5 < 10', {})).toBe(true);
      expect(evaluateExpression('10 < 5', {})).toBe(false);
    });

    it('should evaluate greater than or equal', () => {
      expect(evaluateExpression('10 >= 10', {})).toBe(true);
      expect(evaluateExpression('10 >= 5', {})).toBe(true);
      expect(evaluateExpression('5 >= 10', {})).toBe(false);
    });

    it('should evaluate less than or equal', () => {
      expect(evaluateExpression('10 <= 10', {})).toBe(true);
      expect(evaluateExpression('5 <= 10', {})).toBe(true);
      expect(evaluateExpression('10 <= 5', {})).toBe(false);
    });

    it('should evaluate equality', () => {
      expect(evaluateExpression('5 === 5', {})).toBe(true);
      expect(evaluateExpression('5 === 10', {})).toBe(false);
    });

    it('should evaluate inequality', () => {
      expect(evaluateExpression('5 !== 10', {})).toBe(true);
      expect(evaluateExpression('5 !== 5', {})).toBe(false);
    });
  });

  describe('Logical Operators', () => {
    it('should evaluate AND', () => {
      expect(evaluateExpression('true && true', {})).toBe(true);
      expect(evaluateExpression('true && false', {})).toBe(false);
      expect(evaluateExpression('false && false', {})).toBe(false);
    });

    it('should evaluate OR', () => {
      expect(evaluateExpression('true || false', {})).toBe(true);
      expect(evaluateExpression('false || true', {})).toBe(true);
      expect(evaluateExpression('false || false', {})).toBe(false);
    });

    it('should evaluate NOT', () => {
      expect(evaluateExpression('!true', {})).toBe(false);
      expect(evaluateExpression('!false', {})).toBe(true);
    });

    it('should combine logical operators', () => {
      expect(evaluateExpression('true && !false', {})).toBe(true);
      expect(evaluateExpression('false || !false', {})).toBe(true);
    });
  });

  describe('Ternary Operator', () => {
    it('should evaluate ternary expressions', () => {
      expect(evaluateExpression('true ? 10 : 20', {})).toBe(10);
      expect(evaluateExpression('false ? 10 : 20', {})).toBe(20);
    });

    it('should use variables in ternary', () => {
      const context = { count: 15 };
      expect(evaluateExpression('count > 10 ? "high" : "low"', context)).toBe('high');

      const context2 = { count: 5 };
      expect(evaluateExpression('count > 10 ? "high" : "low"', context2)).toBe('low');
    });

    it('should nest ternary expressions', () => {
      const context = { score: 85 };
      const expr = 'score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "F"';
      expect(evaluateExpression(expr, context)).toBe('B');
    });
  });

  describe('Complex Expressions', () => {
    it('should evaluate real-world example: total with tax', () => {
      const context = { price: 100, quantity: 3, taxRate: 0.08 };
      const expr = 'Math.round((price * quantity) * (1 + taxRate))';
      expect(evaluateExpression(expr, context)).toBe(324);
    });

    it('should evaluate real-world example: discount calculation', () => {
      const context = { total: 100, memberDiscount: 0.1 };
      const expr = 'total * (1 - memberDiscount)';
      expect(evaluateExpression(expr, context)).toBe(90);
    });

    it('should evaluate real-world example: conditional pricing', () => {
      const context = { quantity: 15, unitPrice: 10 };
      const expr = 'quantity > 10 ? unitPrice * 0.9 : unitPrice';
      expect(evaluateExpression(expr, context)).toBe(9);
    });
  });

  describe('Security', () => {
    // The evaluator is intentionally defensive: unsafe/disallowed expressions
    // log console.error/console.warn and return undefined instead of throwing.
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should reject eval', () => {
      expect(evaluateExpression('eval("alert(1)")', {})).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should reject Function constructor', () => {
      expect(evaluateExpression('Function("return 1")()', {})).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should reject window access', () => {
      expect(evaluateExpression('window.location', {})).toBeUndefined();
    });

    it('should reject document access', () => {
      expect(evaluateExpression('document.cookie', {})).toBeUndefined();
    });

    it('should reject alert', () => {
      expect(evaluateExpression('alert(1)', {})).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should reject process access', () => {
      expect(evaluateExpression('process.exit()', {})).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should reject require', () => {
      expect(evaluateExpression('require("fs")', {})).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should reject non-whitelisted Math functions', () => {
      expect(() => evaluateExpression('Math.random()', {})).toThrow();
      expect(() => evaluateExpression('Math.sin(1)', {})).toThrow();
    });

    it('should handle very long expressions (node limit)', () => {
      // Flat expression with >1000 AST nodes: parses fine but exceeds the
      // evaluator's node limit. (Extremely deep nesting instead fails at
      // parse time with a "Failed to parse expression" error.)
      const expr = Array(600).fill('1').join(' + ');

      expect(() => evaluateExpression(expr, {})).toThrow(/too complex/i);
    });

    it('should prevent prototype pollution attempts', () => {
      // Attempting to access __proto__ or constructor should fail
      expect(evaluateExpression('missing.__proto__', {})).toBe(undefined);
      expect(evaluateExpression('missing.constructor', {})).toBe(undefined);
    });
  });

  describe('Error Handling', () => {
    it('should return undefined on empty expression', () => {
      // Defensive behavior: empty/invalid input logs a warning and
      // returns undefined instead of throwing.
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(evaluateExpression('', {})).toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should throw on invalid syntax', () => {
      expect(() => evaluateExpression('2 +', {})).toThrow();
      expect(() => evaluateExpression('* 5', {})).toThrow();
    });

    it('should throw on disallowed operators', () => {
      // Bitwise operators are not allowed
      expect(() => evaluateExpression('5 & 3', {})).toThrow();
      expect(() => evaluateExpression('5 | 3', {})).toThrow();
      expect(() => evaluateExpression('5 ^ 3', {})).toThrow();
      expect(() => evaluateExpression('5 << 1', {})).toThrow();
    });
  });
});

describe('isSafeExpression', () => {
  it('should return true for safe expressions', () => {
    expect(isSafeExpression('2 + 2', {})).toBe(true);
    expect(isSafeExpression('a * b', { a: 5, b: 10 })).toBe(true);
    expect(isSafeExpression('Math.round(price)', { price: 10.5 })).toBe(true);
  });

  it('should reflect the defensive evaluator semantics', () => {
    // isSafeExpression means "evaluates without throwing". Disallowed
    // functions like eval/alert no longer throw (they log and return
    // undefined), so they are "safe" in this sense. Only expressions
    // that still throw (parse errors, disallowed operators, node limit)
    // return false.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(isSafeExpression('eval("test")', {})).toBe(true);
    expect(isSafeExpression('alert(1)', {})).toBe(true);
    expect(isSafeExpression('2 +', {})).toBe(false); // Invalid syntax still throws
    expect(isSafeExpression('5 & 3', {})).toBe(false); // Disallowed operator still throws
    errorSpy.mockRestore();
  });
});

describe('extractVariableNames', () => {
  it('should extract simple variable names', () => {
    expect(extractVariableNames('a + b')).toEqual(expect.arrayContaining(['a', 'b']));
    expect(extractVariableNames('price * quantity')).toEqual(expect.arrayContaining(['price', 'quantity']));
  });

  it('should extract nested variable names', () => {
    const vars = extractVariableNames('user.age + config.maxItems');
    expect(vars).toContain('user');
    expect(vars).toContain('config');
  });

  it('should not include global functions', () => {
    const vars = extractVariableNames('Math.round(price) + Number(quantity)');
    expect(vars).toContain('price');
    expect(vars).toContain('quantity');
    expect(vars).not.toContain('Math');
    expect(vars).not.toContain('Number');
  });

  it('should extract from ternary expressions', () => {
    const vars = extractVariableNames('count > threshold ? max : min');
    expect(vars).toEqual(expect.arrayContaining(['count', 'threshold', 'max', 'min']));
  });

  it('should handle empty or invalid expressions', () => {
    expect(extractVariableNames('')).toEqual([]);
    expect(extractVariableNames('2 + 2')).toEqual([]);
    expect(extractVariableNames('invalid syntax +')).toEqual([]);
  });
});
