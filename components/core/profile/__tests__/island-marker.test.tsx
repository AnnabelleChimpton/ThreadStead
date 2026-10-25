/**
 * Where the site's reset applies inside a page of someone's own HTML
 * (styles/preflight.css): each component draws inside a <ts-island>, and
 * the page's own HTML handed to a component is marked data-ts-page, so it
 * gets the browser's defaults like the rest of the page (template audit B13).
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
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'

const residentData = {
  owner: { id: 'u_pat', handle: 'pat', displayName: 'Pat', avatarUrl: '/a.png' },
  viewer: { id: null },
  posts: [],
  guestbook: [],
  images: [],
} as unknown as ResidentData

test("a component sits in a <ts-island>; the page's HTML in it is the page's again", async () => {
  const artifacts = compileTemplateToArtifacts(
    '<p id="outside">mine</p><RetroCard title="Card"><p id="inside">also mine <b>here</b></p></RetroCard>'
  )
  const { container } = render(
    <StaticHTMLWithIslands staticHTML={artifacts.staticHTML} islands={artifacts.islands} residentData={residentData} />
  )
  await waitFor(() => expect(container.querySelector('[data-island]')).toBeNull())

  const outside = container.querySelector('#user-content-outside')!
  const inside = container.querySelector('#user-content-inside')!
  expect(outside.closest('ts-island')).toBeNull()
  expect(outside.hasAttribute('data-ts-page')).toBe(false)
  // The card's own markup is in the island, and its children start the page again
  expect(inside.closest('ts-island')).not.toBeNull()
  expect(inside.getAttribute('data-ts-page')).toBe('')
  expect(inside.querySelector('b')!.hasAttribute('data-ts-page')).toBe(false)
  expect(container.querySelectorAll('ts-island')).toHaveLength(1)
})
