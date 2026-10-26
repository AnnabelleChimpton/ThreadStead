/**
 * @jest-environment node
 *
 * A resident's calculations run in the server's render of their page, on
 * every visit. None may make something huge or take long there: one
 * computed Var of 'ab'.repeat(1e8).split('') took the whole server down,
 * and 10,000 computed Vars took 11 s a visit. (bug bash 2026-10-26, P0 #1)
 */
import { evaluateExpression, extractVariableNames, valueSize, MAX_VALUE_SIZE } from '../expression-evaluator'
import { seedVariables } from '../TemplateStateProvider'

const tooBig = /too big/
const run = (expression: string, context = {}) => () => evaluateExpression(expression, context)

describe('nothing a calculation makes is huge', () => {
  test.each([
    ["'ab'.repeat(1e8).split('')"],
    ["'x'.repeat(2e7)"],
    ["'x'.padStart(1e9)"],
    ["'x'.padEnd(5e6, 'ab')"],
    // "$&" puts back what matched, as often as written
    ["'x'.repeat(1e5).replace('x', '$&'.repeat(5e4))"],
    // A thousand copies of one long text in a list is a lot of text written out
    ["'x'.repeat(9e5).split('').map(c => 'x'.repeat(9e5))"],
    ["[1, 2, 3].map(n => 'x'.repeat(9e5))"],
    ["'x'.repeat(4e5).split('x').join('x'.repeat(10))"],
  ])('%s is refused before it is made', (expression) => {
    expect(run(expression)).toThrow(tooBig)
  })

  test('the long text a calculation is given is refused when it would grow too big', () => {
    const long = 'x'.repeat(600_000)
    expect(run('$vars.long + $vars.long', { long })).toThrow(tooBig)
    const list = Array.from({ length: 600_000 }, () => 1)
    expect(run('$vars.list.concat($vars.list)', { list })).toThrow(tooBig)
    expect(evaluateExpression('$vars.long.length', { long })).toBe(600_000)
  })

  test('a list written out as text (+, comparisons, String) is measured first', () => {
    const wide = Array.from({ length: 1000 }, () => 'x'.repeat(2000))
    expect(run("$vars.wide + ''", { wide })).toThrow(tooBig)
    expect(run('$vars.wide < 1', { wide })).toThrow(tooBig)
    expect(run('String($vars.wide)', { wide })).toThrow(tooBig)
    expect(run("'a'.includes($vars.wide)", { wide })).toThrow(tooBig)
    // Not written out: fine
    expect(evaluateExpression('$vars.wide.length', { wide })).toBe(1000)
  })

  test('reading long texts over and over counts as work', () => {
    const long = 'x'.repeat(500_000)
    const list = Array.from({ length: 5000 }, (_, i) => i)
    expect(run("$vars.list.filter(n => $vars.long.includes('y'))", { long, list })).toThrow(/too much work/)
  })

  test('ordinary text and lists are as they were', () => {
    expect(evaluateExpression("'★'.repeat(3)", {})).toBe('★★★')
    expect(evaluateExpression("'7'.padStart(3, '0')", {})).toBe('007')
    expect(evaluateExpression("'hello world'.replace('o', '$&!')", {})).toBe('hello! world')
    expect(evaluateExpression("[1, 2, 3].map(n => n * 2).join(', ')", {})).toBe('2, 4, 6')
    expect(evaluateExpression("'a,b,c'.split(',').concat(['d'])", {})).toEqual(['a', 'b', 'c', 'd'])
    expect(evaluateExpression("$vars.name + '!'", { name: 'Pat' })).toBe('Pat!')
    const posts = Array.from({ length: 200 }, (_, i) => ({ title: `Post ${i}`, body: 'words '.repeat(500) }))
    expect(evaluateExpression("$vars.posts.filter(p => p.title.includes('1')).length", { posts })).toBe(119)
  })
})

describe('valueSize', () => {
  test('counts text, and one for each item and field', () => {
    expect(valueSize('abc')).toBe(3)
    expect(valueSize(['ab', 'c'])).toBe(6)
    expect(valueSize({ a: 'xy', b: 1 })).toBe(5)
  })

  test('stops at its limit, however big or looped the value', () => {
    const looped: unknown[] = []
    looped.push(looped, looped)
    expect(valueSize(looped, 1000)).toBe(Infinity)
    expect(valueSize(Array(1e7).fill(1), 1000)).toBe(Infinity)
    expect(valueSize('x'.repeat(MAX_VALUE_SIZE + 1))).toBe(Infinity)
  })
})

describe("the server's starting values (seedVariables)", () => {
  test('10,000 computed Vars are worked out quickly, each seeing the ones before', () => {
    const declared = Array.from({ length: 10_000 }, (_, i) => ({
      name: `a${i}`, type: 'computed' as const, computed: i ? `$vars.a${i - 1} + 1` : '1',
    }))
    const started = Date.now()
    const seed = seedVariables(declared)
    expect(Date.now() - started).toBeLessThan(1000)
    expect(seed.a9999.value).toBe(10_000)
  })

  test('computed Vars together hold at most five million letters', () => {
    const declared = Array.from({ length: 20 }, (_, i) => ({ name: `b${i}`, type: 'computed' as const, computed: "'x'.repeat(900000)" }))
    const seed = seedVariables(declared)
    const kept = Object.values(seed).filter((v) => v.value !== undefined)
    expect(kept).toHaveLength(5)
    expect(seed.b19.value).toBeUndefined()
  })

  test('a computed Var that makes something huge is left empty, and the rest still work', () => {
    const seed = seedVariables([
      { name: 'boom', type: 'computed', computed: "'ab'.repeat(1e8).split('')" },
      { name: 'n', type: 'number', initial: '2' },
      { name: 'twice', type: 'computed', computed: '$vars.n * 2' },
    ])
    expect(seed.boom.value).toBeUndefined()
    expect(seed.twice.value).toBe(4)
  })
})

test("the node limit holds after extractVariableNames has seen the expression (it shares the parse cache)", () => {
  const huge = Array.from({ length: 3000 }, () => '1').join(' + ')
  expect(extractVariableNames(huge)).toEqual([])
  expect(() => evaluateExpression(huge, {})).toThrow(/node limit/)
})
