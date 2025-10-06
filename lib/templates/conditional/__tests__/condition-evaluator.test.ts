import {
  getNestedValue,
  compare,
  evaluateFullCondition,
  isTruthy
} from '../condition-evaluator';
import { _setGlobalTemplateState, TemplateStateContextType } from '../../state/TemplateStateProvider';

describe('getNestedValue', () => {
  test('returns 0 for .length when parent is undefined', () => {
    const data = { posts: undefined };
    const result = getNestedValue(data, 'posts.length');
    expect(result).toBe(0);
  });

  test('returns 0 for .length when parent is null', () => {
    const data = { posts: null };
    const result = getNestedValue(data, 'posts.length');
    expect(result).toBe(0);
  });

  test('returns 0 for empty array length', () => {
    const data = { posts: [] };
    const result = getNestedValue(data, 'posts.length');
    expect(result).toBe(0);
  });

  test('returns correct length for array with items', () => {
    const data = { posts: [{}, {}, {}] };
    const result = getNestedValue(data, 'posts.length');
    expect(result).toBe(3);
  });

  test('returns undefined for non-existent path', () => {
    const data = { owner: { name: 'test' } };
    const result = getNestedValue(data, 'owner.email');
    expect(result).toBe(undefined);
  });
});

describe('compare - numeric operators', () => {
  test('greaterThan: 0 > 5 = false', () => {
    expect(compare(0, 'greaterThan', 5)).toBe(false);
  });

  test('greaterThan: 10 > 5 = true', () => {
    expect(compare(10, 'greaterThan', 5)).toBe(true);
  });

  test('lessThan: 0 < 100 = true', () => {
    expect(compare(0, 'lessThan', 100)).toBe(true);
  });

  test('lessThan: 150 < 100 = false', () => {
    expect(compare(150, 'lessThan', 100)).toBe(false);
  });

  test('greaterThanOrEqual: 0 >= 0 = true', () => {
    expect(compare(0, 'greaterThanOrEqual', 0)).toBe(true);
  });

  test('lessThanOrEqual: 5 <= 5 = true', () => {
    expect(compare(5, 'lessThanOrEqual', 5)).toBe(true);
  });

  test('equals: 0 equals "0" = true (string comparison)', () => {
    expect(compare(0, 'equals', '0')).toBe(true);
  });

  test('notEquals: 0 notEquals "5" = true', () => {
    expect(compare(0, 'notEquals', '5')).toBe(true);
  });
});

describe('compare - undefined/null handling', () => {
  test('greaterThan with undefined returns false', () => {
    expect(compare(undefined, 'greaterThan', 5)).toBe(false);
  });

  test('lessThan with undefined returns false', () => {
    expect(compare(undefined, 'lessThan', 100)).toBe(false);
  });

  test('equals with undefined returns false', () => {
    expect(compare(undefined, 'equals', 0)).toBe(false);
  });

  test('notEquals with undefined returns true', () => {
    expect(compare(undefined, 'notEquals', 0)).toBe(true);
  });
});

describe('evaluateFullCondition - complete flow', () => {
  test('greaterThan with posts.length = 0', () => {
    const config = { data: 'posts.length', greaterThan: 5 };
    const data = { posts: [] };
    const result = evaluateFullCondition(config, data);
    expect(result).toBe(false);
  });

  test('lessThan with posts.length = 0', () => {
    const config = { data: 'posts.length', lessThan: 100 };
    const data = { posts: [] };
    const result = evaluateFullCondition(config, data);
    expect(result).toBe(true);
  });

  test('equals with posts.length = 0', () => {
    const config = { data: 'posts.length', equals: '0' };
    const data = { posts: [] };
    const result = evaluateFullCondition(config, data);
    expect(result).toBe(true);
  });

  test('notEquals with posts.length = 0', () => {
    const config = { data: 'posts.length', notEquals: '0' };
    const data = { posts: [] };
    const result = evaluateFullCondition(config, data);
    expect(result).toBe(false);
  });

  test('greaterThan when posts is undefined (should use .length fix)', () => {
    const config = { data: 'posts.length', greaterThan: 5 };
    const data = { posts: undefined };
    const result = evaluateFullCondition(config, data);
    expect(result).toBe(false);
  });

  test('lessThan when posts is undefined (should use .length fix)', () => {
    const config = { data: 'posts.length', lessThan: 100 };
    const data = { posts: undefined };
    const result = evaluateFullCondition(config, data);
    expect(result).toBe(true);
  });
});

describe('isTruthy', () => {
  test('0 is falsy', () => {
    expect(isTruthy(0)).toBe(false);
  });

  test('empty array is falsy', () => {
    expect(isTruthy([])).toBe(false);
  });

  test('array with items is truthy', () => {
    expect(isTruthy([1, 2, 3])).toBe(true);
  });

  test('undefined is falsy', () => {
    expect(isTruthy(undefined)).toBe(false);
  });

  test('null is falsy', () => {
    expect(isTruthy(null)).toBe(false);
  });
});

describe('getNestedValue - $vars namespace support', () => {
  // Mock template state
  const mockTemplateState: TemplateStateContextType = {
    variables: {
      counter: { name: 'counter', type: 'number', value: 42, initial: 0 },
      message: { name: 'message', type: 'string', value: 'Hello', initial: '' },
      user: { name: 'user', type: 'string', value: { name: 'Alice', age: 30 }, initial: null }
    },
    getVariable: (name: string) => {
      const variable = mockTemplateState.variables[name];
      return variable?.value;
    },
    setVariable: () => {},
    registerVariable: () => {},
    unregisterVariable: () => {},
    resetVariable: () => {},
    resetAll: () => {}
  };

  beforeEach(() => {
    // Set global template state for tests
    _setGlobalTemplateState(mockTemplateState);
  });

  afterEach(() => {
    // Clean up
    _setGlobalTemplateState(null);
  });

  test('should access simple $vars variable', () => {
    const result = getNestedValue({}, '$vars.counter');
    expect(result).toBe(42);
  });

  test('should access string $vars variable', () => {
    const result = getNestedValue({}, '$vars.message');
    expect(result).toBe('Hello');
  });

  test('should access nested $vars property', () => {
    const result = getNestedValue({}, '$vars.user.name');
    expect(result).toBe('Alice');
  });

  test('should access deeply nested $vars property', () => {
    const result = getNestedValue({}, '$vars.user.age');
    expect(result).toBe(30);
  });

  test('should return undefined for non-existent $vars variable', () => {
    const result = getNestedValue({}, '$vars.nonexistent');
    expect(result).toBe(undefined);
  });

  test('should return undefined for non-existent nested $vars property', () => {
    const result = getNestedValue({}, '$vars.user.email');
    expect(result).toBe(undefined);
  });

  test('should return 0 for .length on undefined $vars variable', () => {
    const result = getNestedValue({}, '$vars.nonexistent.length');
    expect(result).toBe(0);
  });

  test('should fall back to ResidentData when not using $vars', () => {
    const data = { owner: { name: 'Bob' } };
    const result = getNestedValue(data, 'owner.name');
    expect(result).toBe('Bob');
  });

  test('should warn when template state not available', () => {
    _setGlobalTemplateState(null);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = getNestedValue({}, '$vars.counter');

    expect(result).toBe(undefined);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Template state not available'));

    consoleSpy.mockRestore();
  });
});

describe('evaluateFullCondition - with $vars support', () => {
  // Mock template state with counter variable
  const mockTemplateState: TemplateStateContextType = {
    variables: {
      counter: { name: 'counter', type: 'number', value: 15, initial: 0 },
      status: { name: 'status', type: 'string', value: 'active', initial: '' },
      items: { name: 'items', type: 'array', value: [1, 2, 3, 4, 5], initial: [] }
    },
    getVariable: (name: string) => {
      const variable = mockTemplateState.variables[name];
      return variable?.value;
    },
    setVariable: () => {},
    registerVariable: () => {},
    unregisterVariable: () => {},
    resetVariable: () => {},
    resetAll: () => {}
  };

  beforeEach(() => {
    _setGlobalTemplateState(mockTemplateState);
  });

  afterEach(() => {
    _setGlobalTemplateState(null);
  });

  test('should evaluate greaterThan with $vars', () => {
    const config = { data: '$vars.counter', greaterThan: 10 };
    const result = evaluateFullCondition(config, {});
    expect(result).toBe(true);
  });

  test('should evaluate lessThan with $vars', () => {
    const config = { data: '$vars.counter', lessThan: 20 };
    const result = evaluateFullCondition(config, {});
    expect(result).toBe(true);
  });

  test('should evaluate equals with $vars', () => {
    const config = { data: '$vars.status', equals: 'active' };
    const result = evaluateFullCondition(config, {});
    expect(result).toBe(true);
  });

  test('should evaluate notEquals with $vars', () => {
    const config = { data: '$vars.status', notEquals: 'inactive' };
    const result = evaluateFullCondition(config, {});
    expect(result).toBe(true);
  });

  test('should evaluate array length with $vars', () => {
    const config = { data: '$vars.items.length', greaterThan: 3 };
    const result = evaluateFullCondition(config, {});
    expect(result).toBe(true);
  });

  test('should handle string operators with $vars', () => {
    const config = { data: '$vars.status', startsWith: 'act' };
    const result = evaluateFullCondition(config, {});
    expect(result).toBe(true);
  });

  test('should mix $vars and ResidentData paths', () => {
    // This tests that both $vars and regular data paths work in same condition
    const residentData = { posts: [1, 2, 3] };

    // Test $vars path
    const config1 = { data: '$vars.counter', greaterThan: 10 };
    expect(evaluateFullCondition(config1, residentData)).toBe(true);

    // Test regular data path
    const config2 = { data: 'posts.length', greaterThan: 2 };
    expect(evaluateFullCondition(config2, residentData)).toBe(true);
  });
});
