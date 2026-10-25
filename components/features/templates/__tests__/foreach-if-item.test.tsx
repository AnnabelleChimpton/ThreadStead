/**
 * An If inside a ForEach tests the loop's item: per-item badges, "new!"
 * stickers, filters. ForEach only gave its scope to ShowVar, and turned
 * data="{p.kind}" into the item's value, which If then read as a path that
 * doesn't exist (template audit 06 #3).
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))

// The component runtime loads at once, as in Next's server render
jest.mock('next/dynamic', () => require('../../../../tests/template-engine/sync-dynamic').syncDynamic)

import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { StaticHTMLWithIslands } from '@/components/core/profile/HTMLIslandHydration'
import { GlobalTemplateStateProvider } from '@/lib/templates/state/TemplateStateProvider'
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'

const residentData = {
  owner: { id: 'u_pat', handle: 'pat', displayName: 'Pat', avatarUrl: '/a.png' },
  viewer: { id: null },
  posts: [],
  guestbook: [],
} as unknown as ResidentData

async function itemsShown(source: string): Promise<string[]> {
  const artifacts = compileTemplateToArtifacts(source)
  const { container } = render(
    <GlobalTemplateStateProvider>
      <StaticHTMLWithIslands staticHTML={artifacts.staticHTML} islands={artifacts.islands} residentData={residentData} onIslandRender={() => {}} onIslandError={() => {}} />
    </GlobalTemplateStateProvider>
  )
  await waitFor(() => expect(container.querySelectorAll('li').length).toBe(3))
  return Array.from(container.querySelectorAll('li')).map((li) => (li.textContent || '').trim())
}

const pets = `<Var name="pets" type="array" initial='[{"name":"Mo","kind":"cat"},{"name":"Rex","kind":"dog"},{"name":"Bea","kind":"cat"}]' />`

test.each([
  ['a path', 'data="p.kind"'],
  ['the braces form', 'data="{p.kind}"'],
])('If tests the item, written as %s', async (_form, test) => {
  const page = `${pets}
<ul><ForEach var="pets" item="p"><li>{p.name}<If ${test} equals="cat"> (cat)</If></li></ForEach></ul>`
  expect(await itemsShown(page)).toEqual(['Mo (cat)', 'Rex', 'Bea (cat)'])
})
