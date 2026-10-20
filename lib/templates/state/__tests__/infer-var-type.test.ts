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
