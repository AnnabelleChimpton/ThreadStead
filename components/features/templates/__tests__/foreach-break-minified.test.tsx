/**
 * <Break> inside <ForEach> stops the loop in a production build too.
 *
 * ForEach finds its Break children by component name. Production builds
 * rename functions (Break becomes `t`), and ForEach read `.name` before
 * `.displayName`, so on the live site every Break was ignored and the whole
 * list showed. Here the functions are renamed the same way; the registry's
 * displayName (and the wrappers' own) must still find it.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

// The component runtime loads at once, as in Next's server render
jest.mock('next/dynamic', () => require('../../../../tests/template-engine/sync-dynamic').syncDynamic)

import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { StaticHTMLWithIslands } from '@/components/core/profile/HTMLIslandHydration'
import { IslandErrorBoundary } from '@/components/core/profile/IslandErrorBoundary'
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider'
import Break from '@/components/features/templates/state/loops/Break'
import { GlobalTemplateStateProvider } from '@/lib/templates/state/TemplateStateProvider'
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'

const residentData = {
  owner: { id: 'u_pat', handle: 'pat', displayName: 'Pat', avatarUrl: '/a.png' },
  viewer: { id: null },
  posts: [],
  guestbook: [],
} as unknown as ResidentData

function minify(component: unknown, short: string) {
  Object.defineProperty(component as object, 'name', { value: short, configurable: true })
}

async function booksShown(source: string): Promise<string[]> {
  const artifacts = compileTemplateToArtifacts(source)
  const { container } = render(
    <GlobalTemplateStateProvider>
      <StaticHTMLWithIslands
        staticHTML={artifacts.staticHTML}
        islands={artifacts.islands}
        residentData={residentData}
        onIslandRender={() => {}}
        onIslandError={() => {}}
      />
    </GlobalTemplateStateProvider>
  )
  await waitFor(() => expect(container.querySelector('[data-island]')).toBeNull())
  await waitFor(() => expect(container.querySelectorAll('li').length).toBeGreaterThan(0))
  return Array.from(container.querySelectorAll('li')).map((li) => li.textContent || '')
}

const PAGE = `<Var name="books" type="array" initial='["Earthsea", "Momo", "Piranesi", "Kindred"]' />
<ul><ForEach var="books" item="book"><Break when="i >= 2" /><li>{book}</li></ForEach></ul>`

test('with function names renamed as a production build does', async () => {
  minify(Break, 't')
  minify(IslandErrorBoundary, 'e')
  minify(ResidentDataProvider, 'n')
  expect(await booksShown(PAGE)).toEqual(['Earthsea', 'Momo'])
})
