/**
 * Props reach the component, seen where visitors see it: compiled by the real
 * pipeline, then hydrated by the islands renderer. Each prop below is named
 * like CSS (or was renamed in its component to dodge that), and used to be
 * turned into inline style before the component saw it, so setting it
 * changed nothing (engine audit R2). Each must now change what's drawn.
 * Compile side, every prop: tests/template-engine/__tests__/props-reach-components.etest.ts
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
import { render, waitFor, cleanup } from '@testing-library/react'
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

async function renderSource(source: string): Promise<string> {
  const artifacts = compileTemplateToArtifacts(source)
  const { container } = render(
    <StaticHTMLWithIslands
      staticHTML={artifacts.staticHTML}
      islands={artifacts.islands}
      residentData={residentData}
      onIslandRender={() => {}}
      onIslandError={() => {}}
    />
  )
  await waitFor(() => expect(container.querySelector('[data-island]')).toBeNull())
  const html = container.innerHTML
  cleanup()
  return html
}

// [component, attribute as authors write it, a value other than the default, children]
const CASES: Array<[string, string, string, string?]> = [
  ['FlexContainer', 'gap', 'xl', '<p>a</p><p>b</p>'],
  ['GridLayout', 'gap', 'xl', '<p>a</p><p>b</p>'],
  ['SplitLayout', 'gap', 'xl', '<p>a</p><p>b</p>'],
  ['CenteredBox', 'maxWidth', 'sm', '<p>a</p>'],
  ['CenteredBox', 'padding', 'xl', '<p>a</p>'],
  ['GradientBox', 'padding', 'xl', '<p>a</p>'],
  ['NeonBorder', 'color', 'pink', '<p>a</p>'],
  ['NeonBorder', 'padding', 'xl', '<p>a</p>'],
  ['RetroTerminal', 'padding', 'xl', '<p>a</p>'],
  ['StickyNote', 'color', 'pink', '<p>a</p>'],
  ['FloatingBadge', 'color', 'pink', 'new'],
  ['FloatingBadge', 'position', 'bottom-left', 'new'],
  ['WaveText', 'color', 'hotpink'],
  ['GlitchText', 'color', 'hotpink'],
  ['ProgressTracker', 'display', 'stars', '<ProgressItem label="Knitting" value="3" max="5" />'],
  ['SkillChart', 'display', 'tags', '<Skill name="Knitting" level="80" />'],
  ['CRTMonitor', 'fontSize', 'large'],
  ['CRTMonitor', 'fontFamily', 'terminal'],
  ['NeonSign', 'color', 'pink'],
  ['NeonSign', 'fontSize', 'xl'],
  ['NeonSign', 'fontWeight', 'normal'],
  ['ArcadeButton', 'color', 'blue'],
  ['PixelArtFrame', 'backgroundColor', '#ffeecc', '<p>a</p>'],
  ['RetroGrid', 'opacity', 'intense'],
  ['RetroGrid', 'size', 'xlarge'],
  ['Boombox', 'color', 'red'],
  ['UserImage', 'size', 'xl'],
  ['UserImage', 'border', 'true'],
  ['UserImage', 'shadow', 'lg'],
]

// The component applies these exactly as the CSS would, so the old way happened to look right
const SAME_AS_CSS = new Set(['WaveText.color', 'PixelArtFrame.backgroundColor'])

const WITH_SRC: Record<string, string> = { UserImage: ' src="/a.png"', WaveText: ' text="hi"', GlitchText: ' text="hi"', NeonSign: ' text="hi"' }

describe('a prop named like CSS changes what the component draws', () => {
  test.each(CASES)('<%s %s="%s">', async (name, attr, value, children = '') => {
    const base = WITH_SRC[name] || ''
    const without = await renderSource(`<${name}${base}>${children}</${name}>`)
    const withProp = await renderSource(`<${name}${base} ${attr}="${value}">${children}</${name}>`)
    // What the old compiler made of it: the same value as inline CSS
    const cssName = attr.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
    const asCss = await renderSource(`<${name}${base} style="${cssName}: ${value}">${children}</${name}>`)
    expect(withProp).not.toEqual(without)
    if (!SAME_AS_CSS.has(`${name}.${attr}`)) expect(withProp).not.toEqual(asCss)
  })
})

test('ProgressItem color colours the bar (a child component)', async () => {
  const bar = (color?: string) =>
    renderSource(
      `<ProgressTracker><ProgressItem label="Knitting" value="3" max="5"${color ? ` color="${color}"` : ''} /></ProgressTracker>`
    )
  expect(await bar('pink')).not.toEqual(await bar())
})
