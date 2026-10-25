/**
 * A save that can't go says why in the list under the code, the same list
 * the live compile fills, and goes to the HTML tab; a save the server
 * refuses says so there too. The Validation Results panel kept these apart
 * and went stale once the page was fixed.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EnhancedTemplateEditor from '../EnhancedTemplateEditor'
import { ToastProvider } from '@/contexts/ToastContext'

jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: { value: string; placeholder?: string; onChange?: (value: string) => void }) =>
    typeof props.onChange === 'function' ? (
      <textarea
        aria-label={props.placeholder?.startsWith('Write your page') ? 'template-code' : 'css-code'}
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    ) : null
  return FakeDynamic
})

const user = { id: 'test-user-123', primaryHandle: 'testuser@local', handles: [], profile: {} }

function editor(compile: { ok: boolean; body: unknown }, onSave = jest.fn().mockResolvedValue(undefined)) {
  global.fetch = jest.fn(async (url: string) => {
    if (String(url).includes('/api/templates/compile')) return { ok: compile.ok, status: compile.ok ? 200 : 400, json: async () => compile.body }
    return { ok: true, status: 200, json: async () => ({}) }
  }) as unknown as typeof fetch
  render(
    <ToastProvider>
      <EnhancedTemplateEditor user={user} initialTemplate={'<main>\n  <p>hi</p>\n</main>'} initialTemplateMode="advanced" initialEditorMode="template" onSave={onSave} />
    </ToastProvider>
  )
  return onSave
}

test('a save blocked by problems lists them under the code and goes to the HTML tab', async () => {
  const onSave = editor({ ok: false, body: { success: false, errors: ['Line 2: <p> is never closed.'], warnings: [] } })
  fireEvent.click(screen.getByRole('tab', { name: 'CSS' }))
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(await screen.findByText("Can't save yet: one thing needs fixing")).toBeInTheDocument()
  expect(screen.getByText('<p> is never closed.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Line 2' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'HTML' })).toHaveAttribute('aria-selected', 'true')
  expect(onSave).not.toHaveBeenCalled()
  expect(screen.queryByText(/Validation Results/)).toBeNull()
})

test('a save the server refuses says what went wrong in the same list', async () => {
  const onSave = jest.fn().mockRejectedValue(new Error('This page was saved from another tab.'))
  editor({ ok: true, body: { success: true, artifact: { v: 1, tree: [], islands: [] }, errors: [], warnings: [], strippedComponents: [] } }, onSave)
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  expect(await screen.findByText('This page was saved from another tab.')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText("That didn't save. What went wrong is under the code.")).toBeInTheDocument())
})
