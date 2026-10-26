/**
 * StickyNote's props through THE compile pipeline, pinned at the island:
 * what the compile step hands the component at hydration.
 *
 * Its `color` is named like CSS. It used to be compiled into inline style
 * (engine R2); now declared props reach the component, under the name it
 * reads (noteColor), and only the author's own `style` is style. Islands saved
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

test('the Retro Toybox starter hands its pink note its colour', () => {
  const { islands } = compileTemplateToArtifacts(TEMPLATE_EXAMPLES.retroToybox.template)
  const note = islands.find((i) => i.component === 'stickynote')!
  expect(note._precomputed!.componentProps.noteColor).toBe('pink')
  expect(note._precomputed!.styles).toEqual({})
})
