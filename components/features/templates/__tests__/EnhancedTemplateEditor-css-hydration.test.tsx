/**
 * The CSS pane's "your browser doesn't know this property" warning can only
 * be worked out in a browser. The server render can't ask, so the warning
 * waits until the editor has mounted; worked out during render, it made the
 * server and client HTML disagree (a hydration error) for any saved CSS
 * with an unknown property. (bug bash 2026-10-26, editor #4)
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from '@testing-library/react'
import EnhancedTemplateEditor from '../EnhancedTemplateEditor'
import { ToastProvider } from '@/contexts/ToastContext'

jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: { value: string; onChange?: (value: string) => void }) =>
    typeof props.onChange === 'function' ? <textarea value={props.value} onChange={(e) => props.onChange?.(e.target.value)} /> : null
  return FakeDynamic
})

const user = { id: 'u-css', primaryHandle: 'pat@local', handles: [], profile: {} }
const page = () => (
  <ToastProvider>
    <EnhancedTemplateEditor
      user={user}
      initialTemplate="<main>hi</main>"
      initialCSS="main { text-color: plum; }"
      initialTemplateMode="advanced"
      initialEditorMode="template"
      onSave={jest.fn()}
    />
  </ToastProvider>
)

const realCSS = (globalThis as { CSS?: unknown }).CSS

afterEach(() => {
  ;(globalThis as { CSS?: unknown }).CSS = realCSS
})

test('saved CSS with an unknown property hydrates cleanly, then warns', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof fetch

  // The server: no CSS.supports to ask
  ;(globalThis as { CSS?: unknown }).CSS = undefined
  const html = renderToString(page())
  expect(html).not.toContain('doesn\'t know')

  // The browser knows everything but text-color
  ;(globalThis as { CSS?: unknown }).CSS = { supports: (property: string) => property !== 'text-color', escape: (s: string) => s }
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)

  const recoverable: unknown[] = []
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {})
  await act(async () => {
    hydrateRoot(container, page(), { onRecoverableError: (e) => recoverable.push(e) })
  })
  const hydrationErrors = errors.mock.calls.filter((call) => /hydrat|did not match/i.test(String(call[0])))
  errors.mockRestore()

  expect(recoverable).toEqual([])
  expect(hydrationErrors).toEqual([])
  await act(async () => {})
  expect(container.textContent).toContain('your browser doesn\'t know "text-color"')
})
