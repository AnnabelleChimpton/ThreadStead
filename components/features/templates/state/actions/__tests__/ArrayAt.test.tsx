/**
 * ArrayAt's item is current for the very next action in the same click.
 * It used to be copied over in an effect, after the click, so a Boombox
 * showing the current track lagged one behind (template audit 06 #13).
 */
import React from 'react'
import { render } from '@testing-library/react'
import ArrayAt from '../ArrayAt'
import { globalTemplateStateManager as manager } from '@/lib/templates/state/TemplateStateManager'

beforeEach(() => {
  for (const name of ['tracks', 'i', 'now']) manager.unregisterVariable(name)
  manager.registerVariable({ name: 'tracks', type: 'array', initial: ['one', 'two', 'three'] })
  manager.registerVariable({ name: 'i', type: 'number', initial: 0 })
})

test('the item follows the index at once, with no render in between', () => {
  render(<ArrayAt var="now" array="tracks" index="i" />)
  expect(manager.getVariable('now')).toBe('one')
  manager.setVariable('i', 1)
  expect(manager.getVariable('now')).toBe('two')
})

test('a written-out index, negative from the end', () => {
  render(<ArrayAt var="now" array="tracks" index="-1" />)
  expect(manager.getVariable('now')).toBe('three')
})
