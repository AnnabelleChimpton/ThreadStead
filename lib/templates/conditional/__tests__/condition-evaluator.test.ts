import {
  getNestedValue,
  compare,
  evaluateFullCondition,
  isTruthy
} from '../condition-evaluator';

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
