/**
 * @jest-environment node
 *
 * Page state worked out the way a page reads it (bug bash 2026-10-26).
 */
import { seedVariables } from '../TemplateStateProvider'
import { computedOrder, toBoolean } from '../TemplateStateManager'

describe("a urlParam's default follows its coerce, like the param itself", () => {
  test.each([
    ['number', '3', 3],
    ['boolean', 'false', false],
    ['boolean', 'true', true],
    ['array', 'a, b', ['a', 'b']],
  ])('coerce="%s" default="%s"', (coerce, initial, expected) => {
    const seed = seedVariables([
      { name: 'p', type: 'urlParam', param: 'p', coerce, default: initial },
      { name: 'next', type: 'computed', computed: coerce === 'number' ? 'p + 1' : 'p' },
    ])
    expect(seed.p.value).toEqual(expected)
    if (coerce === 'number') expect(seed.next.value).toBe(4)
  })
})

describe('a boolean Var', () => {
  test('text as written: "false", "0" and "" are false, any other text true', () => {
    expect(['false', 'FALSE', '0', '', ' '].map(toBoolean)).toEqual([false, false, false, false, false])
    expect(['true', '1', 'yes', 'Pat'].map(toBoolean)).toEqual([true, true, true, true])
  })

  test('anything else as a condition reads it: list.length, a count', () => {
    expect([2, 0, [], null, undefined, {}].map(toBoolean)).toEqual([true, false, true, false, false, true])
  })
})

describe('computed Vars are worked out after what they read', () => {
  test('declared before what they use, the server still gets it right', () => {
    const seed = seedVariables([
      { name: 'b', type: 'computed', computed: 'a * 10' },
      { name: 'a', type: 'computed', computed: 'n + 1' },
      { name: 'n', type: 'number', initial: '2' },
    ])
    expect(seed.a.value).toBe(3)
    expect(seed.b.value).toBe(30)
  })

  test("ones that read themselves, directly or round a loop, stay empty and don't creep up", () => {
    const { order, cyclic } = computedOrder([
      { name: 'self', computed: '(self || 0) + 1' },
      { name: 'x', computed: 'y + 1' },
      { name: 'y', computed: 'x + 1' },
      { name: 'fine', computed: 'n * 2' },
    ])
    expect(cyclic.sort()).toEqual(['self', 'x', 'y'])
    expect(order).toEqual(['fine'])
    const seed = seedVariables([{ name: 'self', type: 'computed', computed: '(self || 0) + 1' }])
    expect(seed.self.value).toBeUndefined()
  })

  test('a long chain is ordered without running out of stack', () => {
    const vars = Array.from({ length: 20_000 }, (_, i) => ({ name: `v${i}`, computed: i < 19_999 ? `v${i + 1} + 1` : '1' }))
    const { order, cyclic } = computedOrder(vars)
    expect(cyclic).toEqual([])
    expect(order[0]).toBe('v19999')
  })
})

describe('smaller page-state fixes', () => {
  test('"02134" and long digit strings stay text; ordinary numbers are numbers', () => {
    const { inferVarType } = jest.requireActual('../TemplateStateProvider') as typeof import('../TemplateStateProvider')
    expect(inferVarType('02134')).toBe('string')
    expect(inferVarType('12345678901234567890')).toBe('string')
    expect(['0', '0.5', '-3', '42'].map(inferVarType)).toEqual(['number', 'number', 'number', 'number'])
  })

  test('Vars named like what every object has register like any other', () => {
    const seed = seedVariables([
      { name: 'constructor', type: 'number', initial: '5' },
      { name: 'toString', type: 'string', initial: 'hi' },
      { name: '__proto__', type: 'number', initial: '1' },
      { name: 'value', type: 'number', initial: '7' },
    ])
    const own = seed as Record<string, { value: unknown }>
    expect(own['constructor'].value).toBe(5)
    expect(own['toString'].value).toBe('hi')
    expect(Object.getOwnPropertyDescriptor(seed, '__proto__')?.value.value).toBe(1)
    expect(seed.value.value).toBe(7)
  })

  test('$vars.price style calculations are ordered by what they read too', () => {
    const { extractVariableNames } = jest.requireActual('../expression-evaluator') as typeof import('../expression-evaluator')
    expect(extractVariableNames('$vars.price * $vars.qty').sort()).toEqual(['price', 'qty'])
    const seed = seedVariables([
      { name: 'total', type: 'computed', computed: '$vars.each * 2' },
      { name: 'each', type: 'computed', computed: '$vars.n + 1' },
      { name: 'n', type: 'number', initial: '4' },
    ])
    expect(seed.total.value).toBe(10)
  })

  test("an arrow with no names, and arrow names that stay out of $vars", () => {
    const { evaluateExpression } = jest.requireActual('../expression-evaluator') as typeof import('../expression-evaluator')
    expect(evaluateExpression("board.map(() => '')", { board: ['X', 'O'] })).toEqual(['', ''])
    expect(evaluateExpression('list.map(x => $vars.x)', { list: [1, 2], x: 'page' })).toEqual(['page', 'page'])
  })

  test('Sort puts numbers and number text in order by size; Merge takes a hasOwnProperty key', () => {
    const { sortArray } = jest.requireActual('../collection-utils') as typeof import('../collection-utils')
    const { mergeObjects } = jest.requireActual('../object-utils') as typeof import('../object-utils')
    expect(sortArray([2, '100', 10, '9'], 'item', 'asc', {})).toEqual([2, '9', 10, '100'])
    expect(sortArray(['item 10', 'item 2'], 'item', 'asc', {})).toEqual(['item 2', 'item 10'])
    expect(mergeObjects([{ a: 1 }, { hasOwnProperty: 2 }])).toEqual({ a: 1, hasOwnProperty: 2 })
  })
})
