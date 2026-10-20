/**
 * The components to start with (palette, reference, lessons) and the
 * nicknames the editor and compiler suggest: every name is a real component.
 */
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { BEGINNER_COMPONENTS, BEGINNER_SECTIONS } from '@/lib/templates-docs/beginner-set'
import { COMPONENT_NICKNAMES } from '@/lib/templates/editor/component-nicknames'

test.each([...BEGINNER_COMPONENTS])('%s is a component', (name) => {
  expect(componentRegistry.get(name)?.name).toBe(name)
})

test('no component is in two sections', () => {
  const all = BEGINNER_SECTIONS.flatMap((s) => s.components)
  expect(new Set(all).size).toBe(all.length)
})

test.each(Object.entries(COMPONENT_NICKNAMES))('the nickname %s points at a component (%s)', (_nickname, name) => {
  expect(componentRegistry.get(name)?.name).toBe(name)
})
