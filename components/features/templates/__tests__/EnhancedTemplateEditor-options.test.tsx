/**
 * A page's colour and font options (<meta name="color:…">) as pickers above
 * the code: a change rewrites that option's content="" and nothing else.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
const PAGE = `<meta name="color:Paper" content="#f7f4ee">
<meta name="font:Text" content="Georgia, serif">
<div class="page">Hi</div>`

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof fetch
})

test("the page's options show above the code, and a change rewrites only its content", () => {
  render(
    <ToastProvider>
      <EnhancedTemplateEditor user={user} initialTemplate={PAGE} initialTemplateMode="advanced" initialEditorMode="template" onSave={jest.fn()} />
    </ToastProvider>
  )
  fireEvent.click(screen.getByText("Your page's colours and fonts"))
  fireEvent.change(screen.getByLabelText(/^Paper/), { target: { value: '#112233' } })
  const code = screen.getByLabelText('template-code') as HTMLTextAreaElement
  expect(code.value).toBe(PAGE.replace('#f7f4ee', '#112233'))
  const fontList = screen.getByLabelText('Text') as HTMLSelectElement
  const another = fontList.querySelectorAll('option')[1].getAttribute('value')!
  fireEvent.change(fontList, { target: { value: another } })
  expect(code.value).toContain(`<meta name="font:Text" content="${another.replace(/"/g, '&quot;')}">`)
  expect(code.value).toContain('<div class="page">Hi</div>')
})

test('a page with no options has no strip', () => {
  render(
    <ToastProvider>
      <EnhancedTemplateEditor user={user} initialTemplate="<p>plain</p>" initialTemplateMode="advanced" initialEditorMode="template" onSave={jest.fn()} />
    </ToastProvider>
  )
  expect(screen.queryByText("Your page's colours and fonts")).toBeNull()
})
