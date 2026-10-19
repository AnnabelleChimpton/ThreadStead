/**
 * StickyNote and NeonSign props through THE compile pipeline, pinned at the
 * island: what the compile step hands the component at hydration.
 *
 * Their registry props `color`, `fontSize` and `fontWeight` are CSS-named, so
 * the compile step files them under styles (engine R2). The components read
 * their own values back out of `style` (see decorative-islands.test.tsx for
 * the render side). These tests pin that hand-over, and that no default lands
 * in `style` when the author didn't set one.
 */
// The registry imports did-client → @noble/ed25519 (ESM jest can't parse);
// nothing here renders components.
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { TEMPLATE_EXAMPLES } from '@/lib/templates/default-profile-template'

function onlyIsland(source: string) {
  const artifacts = compileTemplateToArtifacts(source)
  expect(artifacts.strippedComponents).toEqual([])
  expect(artifacts.islands).toHaveLength(1)
  const [island] = artifacts.islands
  return { island, hydrated: island._precomputed!, staticHTML: artifacts.staticHTML }
}

describe('StickyNote', () => {
  test('color="pink" reaches the island as style.color', () => {
    const { island, hydrated } = onlyIsland('<StickyNote color="pink" rotation="3"><p>hi</p></StickyNote>')
    expect(island.props.color).toBe('pink')
    expect(hydrated.styles).toEqual({ color: 'pink' })
    expect(hydrated.componentProps).toEqual({ rotation: 3, size: 'md' })
  })

  test('without a colour, nothing is put in style (no yellow text)', () => {
    const { island, hydrated } = onlyIsland('<StickyNote><p>hi</p></StickyNote>')
    expect(island.props).not.toHaveProperty('color')
    expect(hydrated.styles).toEqual({})
  })

  test('an ink colour set with style survives', () => {
    const { hydrated } = onlyIsland('<StickyNote style="color: #333"><p>hi</p></StickyNote>')
    expect(hydrated.styles).toEqual({ color: '#333' })
  })

  test('a colour that is not a note colour is dropped, not turned into yellow', () => {
    const { hydrated } = onlyIsland('<StickyNote color="#333"><p>hi</p></StickyNote>')
    expect(hydrated.styles.color).toBeUndefined()
  })
})

describe('NeonSign', () => {
  test('color, fontSize and fontWeight reach the island as styles', () => {
    const { hydrated } = onlyIsland('<NeonSign text="hi" color="pink" fontSize="large" fontWeight="black" />')
    expect(hydrated.styles).toEqual({ color: 'pink', fontSize: 'large', fontWeight: 'black' })
    expect(hydrated.componentProps).toMatchObject({ text: 'hi', uppercase: true })
  })

  test('without them, nothing is put in style', () => {
    const { hydrated } = onlyIsland('<NeonSign text="hi" />')
    expect(hydrated.styles).toEqual({})
  })

  test('element children stay in the placeholder for hydration', () => {
    const { staticHTML } = onlyIsland('<NeonSign color="green">Hi <b>there</b></NeonSign>')
    expect(staticHTML).toMatch(/data-component="neonsign"[^>]*>Hi <b>there<\/b><\/span>/)
  })
})

test('the Retro Toybox starter hands its pink note and pink sign their colours', () => {
  const { islands } = compileTemplateToArtifacts(TEMPLATE_EXAMPLES.retroToybox.template)
  const note = islands.find((i) => i.component === 'stickynote')!
  const sign = islands.find((i) => i.component === 'neonsign')!
  expect(note._precomputed!.styles).toEqual({ color: 'pink' })
  expect(sign._precomputed!.styles).toEqual({ color: 'pink', fontSize: 'large' })
})
