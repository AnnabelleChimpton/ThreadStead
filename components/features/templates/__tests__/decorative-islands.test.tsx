/**
 * StickyNote and NeonSign as a profile page shows them: compiled by the real
 * pipeline (or stored by an earlier compile), then hydrated by the islands
 * renderer. Their `color`/`fontSize`/`fontWeight` arrive as styles (engine
 * R2); the components read their own values back out of them.
 * (Compile side: tests/template-engine/__tests__/decorative-props.etest.ts)
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { StaticHTMLWithIslands } from '@/components/core/profile/HTMLIslandHydration'
import type { Island } from '@/lib/templates/compilation/compiler'
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'

const residentData = {
  owner: { id: 'u_pat', handle: 'pat', displayName: 'Pat', avatarUrl: '/a.png' },
  viewer: { id: null },
  posts: [],
  guestbook: [],
} as unknown as ResidentData

const INK = 'rgb(59, 47, 30)' // #3b2f1e
const PINK_NEON = 'rgb(255, 20, 147)' // #ff1493

async function hydrate(staticHTML: string, islands: Island[]) {
  const { container } = render(
    <StaticHTMLWithIslands
      staticHTML={staticHTML}
      islands={islands}
      residentData={residentData}
      onIslandRender={() => {}}
      onIslandError={() => {}}
    />
  )
  await waitFor(() => expect(container.querySelector('[data-island]')).toBeNull())
  return container
}

async function hydrateSource(source: string) {
  const artifacts = compileTemplateToArtifacts(source)
  return hydrate(artifacts.staticHTML, artifacts.islands)
}

function note(container: HTMLElement) {
  return container.querySelector('.font-handwriting') as HTMLElement
}

/** The sign's main text: the first div inside the container (no background). */
function neonText(container: HTMLElement) {
  return container.querySelector('.neon-sign-container > div') as HTMLElement
}

describe('StickyNote', () => {
  test('color="pink" makes a pink note with dark ink', async () => {
    const c = await hydrateSource('<StickyNote color="pink" rotation="3"><p>Sign the guestbook</p></StickyNote>')
    expect(note(c)).toHaveClass('bg-pink-200')
    expect(note(c)).not.toHaveClass('bg-yellow-200')
    expect(note(c).style.color).toBe(INK)
    expect(note(c)).toHaveTextContent('Sign the guestbook')
  })

  test('no colour makes a yellow note with dark ink, not yellow text', async () => {
    const c = await hydrateSource('<StickyNote><p>hi</p></StickyNote>')
    expect(note(c)).toHaveClass('bg-yellow-200')
    expect(note(c).style.color).toBe(INK)
  })

  test('an ink colour set with style is kept', async () => {
    const inked = await hydrateSource('<StickyNote style="color: #123456"><p>hi</p></StickyNote>')
    expect(note(inked)).toHaveClass('bg-yellow-200')
    expect(note(inked).style.color).toBe('rgb(18, 52, 86)')
  })

  test('the widget slot workaround (background style, inner ink) still renders as before', async () => {
    const c = await hydrateSource(
      '<StickyNote rotation="3" style="background-color: #fbcfe8; border-color: #f9a8d4">' +
        '<div style="color: #3b2f1e"><p>hi</p></div></StickyNote>'
    )
    expect(note(c).style.backgroundColor).toBe('rgb(251, 207, 232)')
    expect(note(c)).not.toHaveClass('bg-yellow-200')
  })

  describe('islands saved before the fix (they recompile only on the next save)', () => {
    // What the old registry default (color: 'yellow') compiled to
    const stored = (color: string, precomputed = true): Island => ({
      id: 'island-stickynote-old',
      component: 'stickynote',
      props: { color, size: 'md', rotation: 0 },
      children: [],
      placeholder: '',
      ...(precomputed && { _precomputed: { styles: { color }, componentProps: { size: 'md', rotation: 0 } } }),
    })
    const html = '<span data-island="island-stickynote-old" data-component="stickynote"><p>hi</p></span>'

    test.each([
      ['default yellow', 'yellow', 'bg-yellow-200'],
      ['color="pink"', 'pink', 'bg-pink-200'],
    ])('%s: the note takes the colour, the text is readable', async (_, color, bg) => {
      const c = await hydrate(html, [stored(color)])
      expect(note(c)).toHaveClass(bg)
      expect(note(c).style.color).toBe(INK)
    })

    test('older islands without precomputed props too', async () => {
      const c = await hydrate(html, [stored('green', false)])
      expect(note(c)).toHaveClass('bg-green-200')
      expect(note(c).style.color).toBe(INK)
    })
  })
})

describe('NeonSign', () => {
  test('color and fontSize set the sign, not the container', async () => {
    const c = await hydrateSource('<NeonSign text="welcome" color="pink" fontSize="large" />')
    expect(neonText(c).style.color).toBe(PINK_NEON)
    expect(neonText(c).style.fontSize).toBe('48px')
    const container = c.querySelector('.neon-sign-container') as HTMLElement
    expect(container.style.color).toBe('')
    expect(container.style.fontSize).toBe('')
  })

  test('element children render as themselves, in capitals by CSS', async () => {
    const c = await hydrateSource('<NeonSign color="green">Hi <b>there</b></NeonSign>')
    expect(c).not.toHaveTextContent('[object Object]')
    expect(neonText(c).querySelector('b')).toHaveTextContent('there')
    expect(neonText(c)).toHaveTextContent(/^Hi there/)
    expect((c.querySelector('.neon-sign-container') as HTMLElement).style.textTransform).toBe('uppercase')
  })

  test('the text prop shows when there are no children', async () => {
    const c = await hydrateSource('<NeonSign text="open late" uppercase="false" />')
    expect(neonText(c)).toHaveTextContent(/^open late/)
    expect((c.querySelector('.neon-sign-container') as HTMLElement).style.textTransform).toBe('')
  })

  test('an island saved before the fix gets its colour, size and weight', async () => {
    // What the old registry defaults compiled `color="pink" fontSize="large"` to
    const island: Island = {
      id: 'island-neonsign-old',
      component: 'neonsign',
      props: { text: 'welcome', color: 'pink', fontSize: 'large', fontWeight: 'black' },
      children: [],
      placeholder: '',
      _precomputed: {
        styles: { color: 'pink', fontSize: 'large', fontWeight: 'black' },
        componentProps: { text: 'welcome', intensity: 'bright', animation: 'pulse', uppercase: true, outline: true, background: false },
      },
    }
    const c = await hydrate('<span data-island="island-neonsign-old" data-component="neonsign"></span>', [island])
    expect(neonText(c).style.color).toBe(PINK_NEON)
    expect(neonText(c).style.fontSize).toBe('48px')
    expect(neonText(c).style.fontWeight).toBe('900')
  })
})
