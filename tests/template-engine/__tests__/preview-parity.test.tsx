/**
 * The editor's preview shows the page exactly as the live page does
 * (design/template-audit/perf/FINAL.md, "The preview never drifts").
 *
 * For every starter and pasted page, as owner and as visitor, with the site
 * nav and without: the live path (the stored artifact, read back as the
 * loader reads it, rendered through ResidentHtmlBody) and the real preview
 * page fed what the editor sends (the compile route's artifact) render the
 * same page root, under the same ancestors, with the same CSS.
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))
jest.mock('@/components/ui/PixelIcon', () => {
  const React = jest.requireActual('react')
  const PixelIcon = ({ size = 24 }: { size?: number }) => React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } })
  return { PixelIcon, default: PixelIcon }
})
jest.mock('next/router', () => ({ useRouter: () => ({ query: { embed: '1' }, pathname: '/template-preview', asPath: '/template-preview', events: { on() {}, off() {} } }) }))
jest.mock('@/components/features/templates/NavigationPreview', () => ({ __esModule: true, default: () => null }))

import React from 'react'
import { render, act, cleanup } from '@testing-library/react'
import ResidentHtmlBody from '@/components/core/profile/ResidentHtmlBody'
import TemplatePreview from '@/pages/template-preview'
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'
import { parseArtifact, serializeArtifact } from '@/lib/templates/rendering/page-artifact'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { advancedPageCss } from '@/lib/templates/rendering/page-css'
import { escapeCssForStyleTag } from '@/lib/utils/sanitization/css'
import { corpus, residentData, serializeDom, installBrowserStubs, AppProviders, OWNER_ID } from '../ssr-golden-support'

const CSS = 'h1 { color: rebeccapurple } .card { border: 1px solid }'

beforeAll(() => {
  installBrowserStubs()
  // jsdom has no media playback (ProfileMusic, Boombox)
  window.HTMLMediaElement.prototype.pause = () => {}
  window.HTMLMediaElement.prototype.load = () => {}
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => [] })) as unknown as typeof fetch
})
afterEach(cleanup)

/** The page root and the elements above it, by tag and class */
function ancestry(root: Element | null): string[] {
  const chain: string[] = []
  for (let el = root?.parentElement; el && el.tagName !== 'BODY'; el = el.parentElement) chain.push(`${el.tagName.toLowerCase()}.${el.className}`)
  return chain
}

const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })

describe.each(corpus())('%s', (_id, source) => {
  test.each([
    ['owner', false],
    ['visitor', false],
    ['owner', true],
    ['visitor', true],
  ] as const)('as %s, nav hidden: %s', async (as, hideNavigation) => {
    const result = await compileForEditor(source)
    if (!result.ok) throw new Error(result.body.errors[0])
    const data = residentData(as === 'owner' ? OWNER_ID : null)

    // The live page: the artifact a save stored, read back, for this viewer
    const livePage = pageForRender(parseArtifact(serializeArtifact(result.artifact)), { isOwner: as === 'owner' })!
    const live = render(
      <AppProviders>
        <ResidentHtmlBody
          user={{ id: OWNER_ID, handle: 'pat', profile: { templateMode: 'advanced', cssMode: 'disable', compiledTemplate: livePage } }}
          residentData={data}
          hideNavigation={hideNavigation}
          siteStyles={false}
        />
      </AppProviders>
    )
    await settle()
    const liveRoot = live.container.querySelector('[data-template-root]')
    const liveDom = serializeDom(liveRoot!)
    const liveAncestry = ancestry(liveRoot)
    cleanup()

    // The preview: the real page, sent what the editor sends
    const preview = render(
      <AppProviders>
        <TemplatePreview initialSiteCSS="" />
      </AppProviders>
    )
    const payload = {
      ownerId: OWNER_ID, handle: 'pat', page: result.artifact, as, residentData: data,
      customCSS: CSS, adminDefaultCss: '', cssMode: 'disable', hideNavigation, template: source,
    }
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'PREVIEW_DATA', payload }, origin: window.location.origin }))
    })
    await settle()
    const previewRoot = preview.container.querySelector('[data-template-root]')

    expect(serializeDom(previewRoot!)).toBe(liveDom)
    expect(ancestry(previewRoot)).toEqual(liveAncestry)
    expect(preview.container.querySelector('#advanced-template-css')?.textContent).toBe(escapeCssForStyleTag(advancedPageCss(CSS, livePage)))
  })
})
