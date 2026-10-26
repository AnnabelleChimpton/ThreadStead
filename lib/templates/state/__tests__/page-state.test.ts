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
