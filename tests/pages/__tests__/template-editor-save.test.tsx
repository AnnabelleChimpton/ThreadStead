/**
 * The HTML editor's save sends the source; the server compiles it. It used to
 * send the compiled copy too, unread: 3-5 times the source, so pages over
 * ~170 KB went past the request size limit, and the plain-text refusal was
 * read as JSON ("Unexpected token 'B'…") (template audit 12 #1).
 */
import React from 'react'
import { render } from '@testing-library/react'

let mockOnSave: ((...args: any[]) => Promise<void>) | undefined
jest.mock('@/components/features/templates/EnhancedTemplateEditor', () => (props: any) => {
  mockOnSave = props.onSave
  return null
})
jest.mock('@/components/ui/layout/Layout', () => ({ children }: any) => <>{children}</>)
jest.mock('@/components/ui/layout/PageMeta', () => () => null)
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), query: {} }) }))
jest.mock('@/lib/api/client/capability', () => ({ requestCapability: jest.fn(async () => 'cap') }))
const mockFetch = jest.fn()
const mockConfirm = jest.fn()
jest.mock('@/contexts/ConfirmContext', () => ({ useConfirm: () => mockConfirm }))
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: (...args: unknown[]) => mockFetch(...args) }))

import TemplateEditorPage from '@/pages/resident/[username]/template-editor'

function openEditor() {
  render(<TemplateEditorPage username="pat" isOwner existingTemplate="<p>hi</p>" templateSavedAt="2026-10-24T09:00:00.000Z" />)
  return mockOnSave!
}

const sent = (call: number) => JSON.parse(mockFetch.mock.calls[call][1].body)

beforeEach(() => {
  mockFetch.mockReset()
  mockConfirm.mockReset()
})

test('saves the source without the compiled copy', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
  const save = openEditor()
  await save('<p>hi</p>', 'p { color: red }', { staticHTML: '<p>hi</p>', islands: [], ast: { type: 'root' } }, 'inherit')
  const body = JSON.parse(mockFetch.mock.calls[0][1].body)
  expect(body).toEqual({ template: '<p>hi</p>', customCSS: 'p { color: red }', cssMode: 'inherit', basedOn: '2026-10-24T09:00:00.000Z' })
})

test('a refusal that is not JSON comes back as a plain message', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 413, json: async () => { throw new SyntaxError("Unexpected token 'B'") } })
  const save = openEditor()
  await expect(save('<p>hi</p>', '')).rejects.toThrow('Your page is too big to save in one go.')
})

describe('saved in another tab since this editor opened', () => {
  const conflict = { ok: false, status: 409, json: async () => ({ error: 'changed_elsewhere' }) }
  const ok = (savedAt: string) => ({ ok: true, status: 200, json: async () => ({ success: true, savedAt }) })

  test('asks first, and saves over it only when told to', async () => {
    mockFetch.mockResolvedValueOnce(conflict).mockResolvedValueOnce(ok('2026-10-24T11:00:00.000Z')).mockResolvedValue(ok(''))
    mockConfirm.mockResolvedValue(true)
    const save = openEditor()
    await save('<p>mine</p>', '')
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: 'Save this version' }))
    expect(sent(1)).toMatchObject({ template: '<p>mine</p>', overwrite: true })
  })

  test("doesn't save when the owner says not now", async () => {
    mockFetch.mockResolvedValueOnce(conflict)
    mockConfirm.mockResolvedValue(false)
    const save = openEditor()
    await expect(save('<p>mine</p>', '')).rejects.toThrow('Not saved. Your edits are still here.')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  test('the next save is based on the one that just happened', async () => {
    mockFetch.mockImplementation(async (url: string) => (String(url).endsWith('/template') ? ok('2026-10-24T12:00:00.000Z') : ok('')))
    const save = openEditor()
    await save('<p>one</p>', '')
    await save('<p>two</p>', '')
    const templateSaves = mockFetch.mock.calls.filter(([url]) => String(url).endsWith('/template'))
    expect(JSON.parse(templateSaves[1][1].body).basedOn).toBe('2026-10-24T12:00:00.000Z')
  })
})
