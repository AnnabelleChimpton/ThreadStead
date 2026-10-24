/**
 * RadioGroup named its radios with Math.random, so the server's name and the
 * browser's differed and hydration failed (template audit 06).
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from 'react'

jest.mock('@/lib/templates/state/TemplateStateProvider', () => ({
  useTemplateStateWithDeps: () => ({ getVariable: () => 'red', setVariable: jest.fn() }),
}))
jest.mock('../../events/OnChange', () => ({
  useOnChangeHandler: () => undefined,
  filterOnChangeChildren: (children: React.ReactNode) => children,
}))

import RadioGroup, { Radio } from '../RadioGroup'

test('hydrates without a mismatch, or the warning React gives for one', async () => {
  const page = (
    <RadioGroup var="colour">
      <Radio value="red" label="Red" />
      <Radio value="blue" label="Blue" />
    </RadioGroup>
  )
  const container = document.createElement('div')
  container.innerHTML = renderToString(page)
  const mismatches: unknown[] = []
  const warn = jest.spyOn(console, 'error').mockImplementation(() => {})
  await act(async () => {
    hydrateRoot(container, page, { onRecoverableError: (error) => mismatches.push(error) })
  })
  expect(mismatches).toEqual([])
  expect(warn.mock.calls.flat().join(' ')).not.toMatch(/didn't match|did not match|hydrat/i)
  warn.mockRestore()
  expect(container.querySelector('input')!.name).toMatch(/^radio-group-colour-/)
})
