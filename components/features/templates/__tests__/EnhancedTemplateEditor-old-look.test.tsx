/**
 * "The old look stays in History" only when there is one: a first page's CSS
 * is the editor's empty-stylesheet comment, and saving over it said "Saved.
 * Your old look is in History." (template audit 07 #12).
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

const user = { id: 'u-look', primaryHandle: 'pat@local', handles: [], profile: {} }

beforeEach(() => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, compiled: { islands: [] } }),
  })) as unknown as typeof fetch
  window.localStorage.clear()
})

async function changeCSSAndSave(initialCSS: string) {
  const onSave = jest.fn().mockResolvedValue(undefined)
  render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate="<p>hi</p>"
        initialCSS={initialCSS}
        initialTemplateMode="advanced"
        initialEditorMode="template"
        onSave={onSave}
      />
    </ToastProvider>
  )
  fireEvent.change(screen.getByLabelText('css-code'), { target: { value: 'p { color: teal; }' } })
  const banner = !!screen.queryByText(/The old look stays in History/)
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  await waitFor(() => expect(onSave).toHaveBeenCalled())
  await screen.findByText(/^Saved\./)
  return { banner, oldLookNote: !!screen.queryByText('Saved. Your old look is in History.') }
}

test("a first page's CSS isn't an old look", async () => {
  expect(await changeCSSAndSave('/* Add your custom CSS here */\n\n')).toEqual({ banner: false, oldLookNote: false })
})

test('CSS of your own is', async () => {
  expect(await changeCSSAndSave('p { color: plum; }')).toEqual({ banner: true, oldLookNote: true })
})
