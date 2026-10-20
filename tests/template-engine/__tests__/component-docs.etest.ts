/**
 * The registry is the one list of components (engine audit R5): the public
 * component reference (/build/templates/components), the editor palette and
 * the autocomplete are all made from it by lib/templates-docs/component-docs.ts.
 *
 * Pinned here: every component has a description and a snippet, every
 * snippet compiles with nothing stripped and nothing to warn about (a
 * reference that teaches a broken prop is how componentData.ts went wrong),
 * the connected components come first, and the browser-side copy of the
 * names matches the registry.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))

import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { componentRegistry } from '@/lib/templates/core/template-registry'
import { ComponentRegistry } from '@/lib/templates/core/template-registry-class'
import { buildComponentDocs, componentExample, COMPONENT_GROUPS } from '@/lib/templates-docs/component-docs'
import { COMPONENT_NAMES } from '@/lib/templates-docs/component-names'

const docs = buildComponentDocs(componentRegistry.getAllRegistrations())

test('every registered component is in the reference', () => {
  expect(docs.map((d) => d.name).sort()).toEqual([...componentRegistry.getAllRegistrations().keys()].sort())
})

test('the browser-side list of names matches the registry', () => {
  const names = [...componentRegistry.getAllRegistrations().keys()].sort()
  // When this fails, replace COMPONENT_NAMES in lib/templates-docs/component-names.ts with:
  if (JSON.stringify([...COMPONENT_NAMES]) !== JSON.stringify(names)) {
    console.log(names.map((n) => `'${n}'`).join(', '))
  }
  expect([...COMPONENT_NAMES]).toEqual(names)
})

describe.each(docs.map((d) => [d.name, d] as const))('<%s>', (_name, doc) => {
  test('has a group, a description and a description for each setting', () => {
    expect(COMPONENT_GROUPS.map((g) => g.id)).toContain(doc.group)
    expect(doc.description?.trim()).toBeTruthy()
    const undescribed = doc.props.filter((p) => !p.description?.trim()).map((p) => p.name)
    expect(undescribed).toEqual([])
  })

  test('its snippet compiles with nothing stripped and nothing to warn about', () => {
    const artifacts = compileTemplateToArtifacts(doc.example)
    expect(artifacts.strippedComponents).toEqual([])
    expect(artifacts.warnings).toEqual([])
    expect(artifacts.islands.some((i) => i.component === doc.id)).toBe(true)
  })

  test('the copy says things plainly', () => {
    const text = [doc.description, ...doc.props.map((p) => p.description)].join(' ')
    // `!` only as punctuation: `!item.read` is a real test
    expect(text).not.toMatch(/successfully|seamless|effortless|powerful|easily|!(\s|$)|\u2014/i)
  })
})

test('components that wrap content say so, even without relationship metadata', () => {
  const byName = new Map(docs.map((d) => [d.name, d]))
  expect(byName.get('IfOwner')!.acceptsChildren).toBe(true)
  expect(byName.get('Guestbook')!.acceptsChildren).toBe(false)
})

describe('order', () => {
  test('connected components come first, starting with the guestbook', () => {
    expect(docs[0].name).toBe('Guestbook')
    expect(docs.slice(0, 4).map((d) => d.name)).toEqual(['Guestbook', 'FollowButton', 'BlogPosts', 'FriendDisplay'])
    const firstOther = docs.findIndex((d) => d.group !== 'connected')
    expect(docs.slice(firstOther).some((d) => d.group === 'connected')).toBe(false)
  })

  test('"connected" is the components that show your own data from here, not page logic', () => {
    expect(docs.filter((d) => d.group === 'connected').map((d) => d.name)).toEqual([
      'Guestbook', 'FollowButton', 'BlogPosts', 'FriendDisplay', 'ProfileMusic', 'MediaGrid',
      'MyRings', 'RingNav', 'MyHouse', 'HouseBadge',
      'MutualFriends', 'FriendBadge', 'WebsiteDisplay', 'ProfileBadges',
    ])
    // Whether the viewer is you isn't your data: these are logic
    expect(docs.find((d) => d.name === 'IfOwner')!.group).toBe('logic')
    expect(docs.find((d) => d.name === 'IfVisitor')!.group).toBe('logic')
  })

  test("the first few come from the registrations' featured numbers, not a list kept here", () => {
    const registry = new ComponentRegistry()
    const Leaf = () => null
    registry.register({ name: 'Plain', component: Leaf, group: 'connected', example: '<Plain />', props: {} })
    registry.register({ name: 'Second', component: Leaf, group: 'connected', featured: 2, example: '<Second />', props: {} })
    registry.register({ name: 'Layouty', component: Leaf, group: 'layout', featured: 1, example: '<Layouty />', props: {} })
    registry.register({ name: 'First', component: Leaf, group: 'connected', featured: 1, example: '<First />', props: {} })
    expect(buildComponentDocs(registry.getAllRegistrations()).map((d) => d.name)).toEqual([
      'First', 'Second', 'Plain', 'Layouty',
    ])
  })

  test('groups follow COMPONENT_GROUPS', () => {
    const order = COMPONENT_GROUPS.map((g) => g.id)
    const seen = docs.map((d) => order.indexOf(d.group))
    expect(seen).toEqual([...seen].sort((a, b) => a - b))
  })
})

describe('a component with no example of its own', () => {
  const registry = new ComponentRegistry()
  const Leaf = () => null
  registry.register({
    name: 'Leafy',
    component: Leaf,
    props: { name: { type: 'string', required: true, example: 'mood' }, size: { type: 'enum', values: ['sm', 'lg'] } },
  })
  registry.register({
    name: 'Boxy',
    component: Leaf,
    props: { tone: { type: 'enum', values: ['warm', 'cool'], required: true } },
    relationship: { type: 'container', acceptsChildren: true },
  })

  test('gets one from its required props', () => {
    expect(componentExample(registry.get('Leafy')!)).toBe('<Leafy name="mood" />')
    expect(componentExample(registry.get('Boxy')!)).toBe('<Boxy tone="warm">\n  \n</Boxy>')
  })
})
