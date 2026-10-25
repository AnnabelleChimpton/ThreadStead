/**
 * History rows say what a version is in plain words, not "Saved before you
 * saved · template + CSS · advanced" (template audit 07 #12).
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import TemplateHistoryPanel, { type RevisionSummary } from '../TemplateHistoryPanel'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }))

const rev = (over: Partial<RevisionSummary>): RevisionSummary => ({
  id: 'r1',
  trigger: 'template-save',
  templateMode: 'advanced',
  cssMode: 'disable',
  hideNavigation: false,
  createdAt: new Date().toISOString(),
  templateChars: 120,
  cssChars: 40,
  ...over,
})

test('each row says when, what it holds and which layout', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      revisions: [
        rev({ id: 'a' }),
        rev({ id: 'b', trigger: 'css-save', templateMode: 'default', templateChars: 0 }),
      ],
    }),
  })) as unknown as typeof fetch
  render(<TemplateHistoryPanel username="pat" onLoadRevision={jest.fn()} onClose={jest.fn()} />)
  expect(await screen.findByText('Before a save · HTML and CSS · your own HTML page')).toBeInTheDocument()
  expect(screen.getByText('Before a CSS save · CSS only · the standard layout')).toBeInTheDocument()
})
