/**
 * StickyNote and NeonSign props through THE compile pipeline, pinned at the
 * island: what the compile step hands the component at hydration.
 *
 * Their props `color`, `fontSize` and `fontWeight` are named like CSS. They
 * used to be compiled into inline style (engine R2); now declared props reach
 * the component, under the names it reads (noteColor, neonColor, textSize,
 * textWeight), and only the author's own `style` is style. Islands saved
 * before that still carry the old shape; the components read those back
 * (decorative-islands.test.tsx). Every component: props-reach-components.etest.ts.
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
import { TEMPLATE_EXAMPLES } from '../fixtures/old-starters/examples'

function onlyIsland(source: string) {
  const artifacts = compileTemplateToArtifacts(source)
  expect(artifacts.strippedComponents).toEqual([])
  expect(artifacts.islands).toHaveLength(1)
  const [island] = artifacts.islands
  return { island, hydrated: island._precomputed!, staticHTML: artifacts.staticHTML }
}

describe('StickyNote', () => {
  test('color="pink" reaches the component as noteColor, not as style', () => {
    const { island, hydrated } = onlyIsland('<StickyNote color="pink" rotation="3"><p>hi</p></StickyNote>')
    expect(island.props.color).toBe('pink')
    expect(hydrated.styles).toEqual({})
    expect(hydrated.componentProps).toEqual({ noteColor: 'pink', rotation: 3, size: 'md' })
  })

  test('without a colour the note is yellow, and nothing is put in style', () => {
    const { hydrated } = onlyIsland('<StickyNote><p>hi</p></StickyNote>')
    expect(hydrated.componentProps.noteColor).toBe('yellow')
    expect(hydrated.styles).toEqual({})
  })

  test('an ink colour set with style is the ink, next to the note colour', () => {
    const { hydrated } = onlyIsland('<StickyNote color="green" style="color: #333"><p>hi</p></StickyNote>')
    expect(hydrated.styles).toEqual({ color: '#333' })
    expect(hydrated.componentProps.noteColor).toBe('green')
  })

  test('a colour that is not a note colour falls back to yellow (and the editor says so)', () => {
    const artifacts = compileTemplateToArtifacts('<StickyNote color="#333"><p>hi</p></StickyNote>')
    expect(artifacts.islands[0]._precomputed!.componentProps.noteColor).toBe('yellow')
    expect(artifacts.islands[0]._precomputed!.styles.color).toBeUndefined()
    expect(artifacts.warnings).toEqual([
      'Line 1: <StickyNote color="#333"> color can be yellow, pink, blue, green, orange or purple. Using yellow.',
    ])
  })
})

describe('NeonSign', () => {
  test('color, fontSize and fontWeight reach the component as its own props', () => {
    const { hydrated } = onlyIsland('<NeonSign text="hi" color="pink" fontSize="large" fontWeight="black" />')
    expect(hydrated.styles).toEqual({})
    expect(hydrated.componentProps).toMatchObject({
      text: 'hi',
      uppercase: true,
      neonColor: 'pink',
      textSize: 'large',
      textWeight: 'black',
    })
  })

  test('without them, the defaults are props and nothing is put in style', () => {
    const { hydrated } = onlyIsland('<NeonSign text="hi" />')
    expect(hydrated.styles).toEqual({})
    expect(hydrated.componentProps).toMatchObject({ neonColor: 'blue', textSize: 'medium', textWeight: 'bold' })
  })

  test('element children stay in the placeholder for hydration, with no CSS from the props', () => {
    const { staticHTML } = onlyIsland('<NeonSign color="green">Hi <b>there</b></NeonSign>')
    expect(staticHTML).toMatch(/data-component="neonsign"[^>]*>Hi <b>there<\/b><\/span>/)
    expect(staticHTML).not.toMatch(/style="color/)
  })
})

test('the Retro Toybox starter hands its pink note and pink sign their colours', () => {
  const { islands } = compileTemplateToArtifacts(TEMPLATE_EXAMPLES.retroToybox.template)
  const note = islands.find((i) => i.component === 'stickynote')!
  const sign = islands.find((i) => i.component === 'neonsign')!
  expect(note._precomputed!.componentProps.noteColor).toBe('pink')
  expect(sign._precomputed!.componentProps).toMatchObject({ neonColor: 'pink', textSize: 'large' })
  expect(note._precomputed!.styles).toEqual({})
  expect(sign._precomputed!.styles).toEqual({})
})
