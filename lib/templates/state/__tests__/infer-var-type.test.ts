import { inferVarType, seedVariables } from '@/lib/templates/state/TemplateStateProvider'

test.each([
  ['0', 'number'],
  ['-2.5', 'number'],
  ['true', 'boolean'],
  ['false', 'boolean'],
  ['["a", "b"]', 'array'],
  ['{"a": 1}', 'object'],
  ['[not json', 'string'],
  ['sleepy', 'string'],
  ['', 'string'],
  [undefined, 'string'],
])('initial=%p is a %s', (initial, type) => {
  expect(inferVarType(initial)).toBe(type)
})

test('a Var without a type starts with its value as that type', () => {
  const seed = seedVariables([
    { name: 'waves', initial: '0' } as never,
    { name: 'open', initial: 'false' } as never,
    { name: 'mood', type: 'string', initial: '0' },
  ])
  expect(seed.waves.value).toBe(0)
  expect(seed.open.value).toBe(false)
  expect(seed.mood.value).toBe('0')
})

test('a date Var can start at "now" (template audit 06: it was Invalid Date)', () => {
  const { coerceVarInitial } = jest.requireActual('../TemplateStateProvider')
  const before = Date.now()
  const now = coerceVarInitial('date', 'now') as Date
  expect(now.getTime()).toBeGreaterThanOrEqual(before)
  expect((coerceVarInitial('date', '2026-12-25T00:00') as Date).getFullYear()).toBe(2026)
})
