/**
 * What screen readers get from the interactive components
 * (template audit 14 #4 #5).
 */
import React from 'react'
import Button from '../Button'
import { executeConditionalAttrAction } from '../state/actions/ConditionalAttr'
import { renderWithTemplateContext } from './test-utils'

jest.mock('@/lib/templates/state/TemplateStateProvider', () => ({
  ...jest.requireActual('@/lib/templates/state/TemplateStateProvider'),
  useTemplateState: () => ({ variables: {} }),
}))

test('Button passes aria-* through to its <button>', () => {
  const { container } = renderWithTemplateContext(<Button {...({ 'aria-pressed': 'true', 'aria-controls': 'user-content-drawer' } as object)}>Lamp</Button>)
  const button = container.querySelector('button')!
  expect(button.getAttribute('aria-pressed')).toBe('true')
  expect(button.getAttribute('aria-controls')).toBe('user-content-drawer')
})

test('ConditionalAttr otherwise= sets a value when the test fails, instead of taking it off', () => {
  document.body.innerHTML = '<div data-template-root><button id="user-content-lamp" aria-pressed="true"></button></div>'
  const lamp = document.querySelector('button')!
  executeConditionalAttrAction({ element: '#lamp', attribute: 'aria-pressed', when: '1 === 2', value: 'true', otherwise: 'false' }, {})
  expect(lamp.getAttribute('aria-pressed')).toBe('false')
  executeConditionalAttrAction({ element: '#lamp', attribute: 'aria-pressed', when: '1 === 2', value: 'true' }, {})
  expect(lamp.hasAttribute('aria-pressed')).toBe(false)
})
