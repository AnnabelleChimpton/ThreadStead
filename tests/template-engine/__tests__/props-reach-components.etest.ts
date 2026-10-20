/**
 * GOLDEN: props reach the component.
 *
 * Every attribute a template sets on a registered component must arrive at
 * that component as the prop its implementation reads. Before 2026-10 the
 * compiler turned every attribute named like a CSS property (color, gap,
 * display, padding, size…) into inline style first, so 31 props on 22
 * components could not be set at all, and shipped starters hit it (engine
 * audit R2). The golden suite only checked that nothing was stripped.
 *
 * Three layers, so the next rename or collision fails here:
 *  1. registry-wide: each declared prop, set to a value other than its
 *     default, lands in `_precomputed.componentProps` under its
 *     componentProp name and not in `styles`;
 *  2. every shipped starter: each prop as written reaches its islands;
 *  3. the registry names what the implementation reads: each prop's
 *     component-side name appears in the component's source.
 * The render side (a hydrated component looks different): props-reach-render.test.tsx.
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

import fs from 'fs'
import path from 'path'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { tokenizeSource, looksLikeComponentName } from '@/lib/templates/compilation/source-scan'
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { coercePropValue, findPropSchema, type PropSchema } from '@/lib/templates/core/template-registry-types'
import type { Island } from '@/lib/templates/compilation/compiler/types'
import { HTML_TEMPLATES } from '../fixtures/old-starters/html-templates'
import {
  generateDefaultProfileTemplate,
  getMinimalProfileTemplate,
} from '@/lib/templates/default-profile-template'
import { TEMPLATE_EXAMPLES } from '../fixtures/old-starters/examples'

const ROOT = path.resolve(__dirname, '../../..')

/** A valid value for the prop that isn't its default, as an attribute string. */
function sampleValue(schema: PropSchema): string {
  switch (schema.type) {
    case 'enum': {
      const values = schema.values || []
      return values.find((v) => v !== schema.default) ?? values[0]
    }
    case 'boolean':
      return schema.default === true ? 'false' : 'true'
    case 'number': {
      const low = schema.min ?? 0
      const high = schema.max ?? low + 10
      const candidate = Math.min(high, low + 2)
      return String(candidate === schema.default ? Math.min(high, candidate + 1) : candidate)
    }
    default:
      return schema.example ?? 'sample-value'
  }
}

function flatten(islands: Island[]): Island[] {
  const seen = new Map<string, Island>()
  const walk = (list: Island[]) => {
    for (const island of list) {
      if (!seen.has(island.id)) seen.set(island.id, island)
      walk(island.children || [])
    }
  }
  walk(islands)
  return [...seen.values()]
}

// Props that don't reach the component as written, on purpose
const NOT_HANDED_OVER = new Set([
  // A plain-string prop the parser treats as JSON source text; covered by its own tests
  'Var.initial',
])

describe('every declared prop reaches its component', () => {
  const cases: Array<[string, string, PropSchema]> = []
  for (const [name, registration] of componentRegistry.getAllRegistrations()) {
    for (const [prop, schema] of Object.entries(registration.props)) {
      if (schema.css || NOT_HANDED_OVER.has(`${name}.${prop}`)) continue
      cases.push([name, prop, schema])
    }
  }

  test('there are props to check', () => {
    expect(cases.length).toBeGreaterThan(300)
  })

  test.each(cases)('<%s %s>', (name, prop, schema) => {
    const value = sampleValue(schema)
    // Required props are filled in, so the only thing said is about `prop`
    const required = Object.entries(componentRegistry.get(name)!.props)
      .filter(([other, s]) => s.required && other !== prop)
      .map(([other, s]) => ` ${other}="${sampleValue(s)}"`)
      .join('')
    const source = `<${name} ${prop}="${value}"${required}></${name}>`
    const artifacts = compileTemplateToArtifacts(source)
    expect(artifacts.strippedComponents).toEqual([])
    // A fine value says nothing to the author
    expect(artifacts.warnings).toEqual([])

    const island = flatten(artifacts.islands).find((i) => i.component === name.toLowerCase())!
    const receivedAs = schema.componentProp ?? prop
    const coerced = coercePropValue(value, schema, prop).value
    // Ids keep the sanitizer's prefix, like every id on the page
    const expected = prop === 'id' ? `user-content-${coerced}` : coerced
    const { componentProps, styles } = island._precomputed!
    expect(componentProps[receivedAs]).toEqual(expected)
    // …and not as CSS
    expect(styles).not.toHaveProperty(prop)
  })
})

describe('props marked css are still CSS', () => {
  test('<Heading textColor> styles the heading', () => {
    const { islands } = compileTemplateToArtifacts('<Heading textColor="#123456">Hi</Heading>')
    expect(islands[0]._precomputed!.styles).toEqual({ color: '#123456' })
  })

  test('<Grid gridTemplateColumns> is the grid template', () => {
    const { islands } = compileTemplateToArtifacts('<Grid gridTemplateColumns="200px 1fr"></Grid>')
    expect(islands[0]._precomputed!.styles.gridTemplateColumns).toBe('200px 1fr')
  })

  test('an undeclared CSS-named attribute is still inline style', () => {
    const { islands, warnings } = compileTemplateToArtifacts('<RetroCard backgroundColor="#fff">Hi</RetroCard>')
    expect(warnings).toEqual([])
    expect(islands[0]._precomputed!.styles).toEqual({ backgroundColor: '#fff' })
  })
})

describe('the implementation name works as an attribute too', () => {
  test.each([
    ['NeonBorder', 'neonColor', 'pink', 'neonColor'],
    ['FlexContainer', 'gapSize', 'lg', 'gapSize'],
    ['SkillChart', 'displayMode', 'radial', 'displayMode'],
  ])('<%s %s>', (name, attr, value, receivedAs) => {
    const artifacts = compileTemplateToArtifacts(`<${name} ${attr}="${value}"></${name}>`)
    expect(artifacts.warnings).toEqual([])
    expect(artifacts.islands[0]._precomputed!.componentProps[receivedAs]).toBe(value)
  })
})

// ---------------------------------------------------------------------------
// Every shipped starter
// ---------------------------------------------------------------------------

const STARTERS: Array<[string, string]> = [
  ...HTML_TEMPLATES.map((t) => [t.id, t.template.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')] as [string, string]),
  ...Object.entries(TEMPLATE_EXAMPLES).map(([key, t]) => [key, t.template] as [string, string]),
  ['generated default', generateDefaultProfileTemplate().template],
  ['generated minimal', getMinimalProfileTemplate().template],
]

describe('every starter hands each prop it writes to its component', () => {
  test.each(STARTERS)('%s', (_id, source) => {
    const artifacts = compileTemplateToArtifacts(source)
    expect(artifacts.strippedComponents).toEqual([])
    expect(artifacts.warnings).toEqual([])
    const islands = flatten(artifacts.islands)

    // What the source asks for, per component and prop: the values written
    const wanted = new Map<string, unknown[]>()
    for (const token of tokenizeSource(source)) {
      if (token.type !== 'open' || !looksLikeComponentName(token.name)) continue
      const registration = componentRegistry.get(token.name)
      if (!registration) continue
      for (const attr of token.attributes) {
        const declared = findPropSchema(registration.props, attr.name)
        if (!declared || declared[1].css) continue
        const [prop, schema] = declared
        const key = `${registration.name.toLowerCase()} ${schema.componentProp ?? prop}`
        const list = wanted.get(key) || []
        list.push(coercePropValue(attr.value ?? '', schema, prop).value)
        wanted.set(key, list)
      }
    }

    // What the islands carry, for the same components and props
    for (const [key, values] of wanted) {
      const [component, receivedAs] = key.split(' ')
      const carried = islands
        .filter((island) => island.component === component)
        .map((island) => island._precomputed!.componentProps[receivedAs])
      for (const value of values) {
        expect({ key, carried }).toEqual({ key, carried: expect.arrayContaining([value]) })
      }
    }
  })

  test('the starters set props named like CSS, so this is not vacuous', () => {
    const toybox = compileTemplateToArtifacts(TEMPLATE_EXAMPLES.retroToybox.template)
    const sign = toybox.islands.find((i) => i.component === 'neonsign')!
    expect(sign._precomputed!.componentProps).toMatchObject({ neonColor: 'pink', textSize: 'large' })
  })
})

// ---------------------------------------------------------------------------
// The registry names what the implementation reads
// ---------------------------------------------------------------------------

/** Component name → its source file, from the dynamic registry's import paths. */
function componentSources(): Map<string, string> {
  const text = fs.readFileSync(path.join(ROOT, 'lib/templates/core/dynamic-registry.ts'), 'utf8')
  const sources = new Map<string, string>()
  for (const match of text.matchAll(/^\s*(\w+): \(\) => import\('@\/([^']+)'\)/gm)) {
    const base = path.join(ROOT, match[2])
    const file = ['.tsx', '.ts', '/index.tsx', '/index.ts'].map((ext) => base + ext).find((f) => fs.existsSync(f))
    if (file) sources.set(match[1], file)
  }
  return sources
}

// Declared props the implementation doesn't read under any name yet (engine
// audit §4). Each is a real gap: delete the entry when it's fixed.
const KNOWN_UNREAD = new Set<string>([])

describe('each declared prop is a name its component reads', () => {
  const sources = componentSources()
  const cases: Array<[string, string, string]> = []
  for (const [name, registration] of componentRegistry.getAllRegistrations()) {
    const file = sources.get(name)
    if (!file) continue
    for (const [prop, schema] of Object.entries(registration.props)) {
      if (schema.css) continue
      cases.push([name, schema.componentProp ?? prop, file])
    }
  }

  test('every registered component has a source file', () => {
    const missing = [...componentRegistry.getAllRegistrations().keys()].filter((name) => !sources.has(name))
    expect(missing).toEqual([])
  })

  /** The file, plus files it imports relatively (ElseIf takes If's props from './If'). */
  function sourceWithLocalImports(file: string): string {
    const text = fs.readFileSync(file, 'utf8')
    const local = [...text.matchAll(/from '(\.{1,2}\/[^']+)'/g)]
      .map((m) => ['.tsx', '.ts'].map((ext) => path.resolve(path.dirname(file), m[1]) + ext).find((f) => fs.existsSync(f)))
      .filter((f): f is string => !!f)
    return [text, ...local.map((f) => fs.readFileSync(f, 'utf8'))].join('\n')
  }

  test.each(cases)('%s reads %s', (name, prop, file) => {
    if (KNOWN_UNREAD.has(`${name}.${prop}`)) return
    expect(new RegExp(`\\b${prop}\\b`).test(sourceWithLocalImports(file))).toBe(true)
  })
})
