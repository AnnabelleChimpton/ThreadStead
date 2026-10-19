/**
 * The widget slot's catalog through THE compile pipeline: every widget, with
 * its gallery sample and with filled-in values, compiles with nothing
 * stripped and no warnings, and resident text stays text.
 * (lib/domain/profile/widget-slot)
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
import {
  WIDGET_TYPES,
  MAX_WIDGETS,
  checkWidgets,
  sampleWidget,
  widgetsToSource,
  type WidgetInstance,
  type WidgetType,
} from '@/lib/domain/profile/widget-slot/catalog'
import { compileWidgetSlot, slotInputFromBody } from '@/lib/domain/profile/widget-slot/compile'

const filled: Record<WidgetType, WidgetInstance['values']> = {
  sticky: { text: 'Hi & welcome <3\n\nsecond line', colour: 'pink', tilt: '3' },
  polaroid: { image: 'https://example.com/me.png', caption: 'me "at" the sea', tilt: '-3' },
  buttons: {
    buttons: [
      { image: 'https://example.com/a.gif', link: 'https://example.com' },
      { image: 'https://example.com/b.gif', link: '' },
    ],
  },
  rings: {},
  music: {},
  guestbook: { line: 'Say hi?', label: 'Sign it' },
  now: { listening: 'chiptunes', reading: '', doing: 'gardening' },
  marquee: { text: 'hello there', direction: 'right', speed: 'fast' },
  secret: { button: 'Click', text: 'boo' },
  textbox: { heading: 'About', text: 'Some words.\nMore words.' },
}

// Components each widget is made of (lowercase, as islands name them)
const ISLANDS: Record<WidgetType, string[]> = {
  sticky: ['stickynote'],
  polaroid: ['polaroidframe'],
  buttons: [],
  rings: ['profilebadges'],
  music: ['profilemusic'],
  guestbook: [],
  now: [],
  marquee: [],
  secret: ['revealbox'],
  textbox: [],
}

function checkedSource(type: WidgetType, values: WidgetInstance['values']) {
  const result = checkWidgets([{ type, values }])
  if (!result.ok) throw new Error(`${type}: ${result.error}`)
  return widgetsToSource(result.widgets)
}

describe.each(WIDGET_TYPES.map((t) => [t]))('%s', (type) => {
  test('the gallery sample compiles with nothing stripped', () => {
    const artifacts = compileTemplateToArtifacts(widgetsToSource([sampleWidget(type)]))
    expect(artifacts.strippedComponents).toEqual([])
    expect(artifacts.warnings).toEqual([])
    expect(artifacts.islands.map((i) => i.component)).toEqual(ISLANDS[type])
  })

  test('filled-in values compile with nothing stripped', () => {
    const artifacts = compileTemplateToArtifacts(checkedSource(type, filled[type]))
    expect(artifacts.strippedComponents).toEqual([])
    expect(artifacts.warnings).toEqual([])
    expect(artifacts.islands.map((i) => i.component)).toEqual(ISLANDS[type])
    expect(artifacts.staticHTML).toContain(`ts-widget--${type}`)
  })
})

test('all the widgets together fit in one slot', () => {
  const widgets = WIDGET_TYPES.slice(0, MAX_WIDGETS).map((type) => ({ type, values: filled[type] }))
  const input = slotInputFromBody({ widgets })
  if (!input.ok) throw new Error(input.error)
  const result = compileWidgetSlot(input.source)
  expect(result.ok && result.strippedComponents).toEqual([])
})

test("a resident's text stays text, in content and in attributes", () => {
  const html = compileTemplateToArtifacts(
    checkedSource('textbox', { heading: '<img src=x onerror=alert(1)>', text: '<script>x</script> & <b>b</b>' })
  ).staticHTML
  expect(html).not.toMatch(/<img|<script|<b>/)
  expect(html).toContain('&lt;script&gt;')

  const polaroid = compileTemplateToArtifacts(
    checkedSource('polaroid', { image: 'https://example.com/a.png', caption: '" onload="x', tilt: '0' })
  )
  // Still inside the escaped alt text, never an attribute of its own
  expect(polaroid.staticHTML).toContain('alt="&quot; onload=&quot;x"')
  expect(polaroid.staticHTML).not.toMatch(/\sonload="/i)
  expect(polaroid.islands[0].props.caption).toBe('" onload="x')
})

test('the sticky note keeps its colour and readable ink', () => {
  const artifacts = compileTemplateToArtifacts(checkedSource('sticky', filled.sticky))
  expect(artifacts.islands[0].props.rotation).toBe(3)
  expect(String(artifacts.islands[0].props.style)).toContain('background-color: #fbcfe8')
  expect(artifacts.staticHTML).toContain('color: #3b2f1e')
})

describe('checkWidgets', () => {
  test('only web links for pictures and buttons', () => {
    expect(checkWidgets([{ type: 'polaroid', values: { image: 'javascript:alert(1)' } }])).toMatchObject({ ok: false })
    expect(checkWidgets([{ type: 'buttons', values: { buttons: [{ image: 'data:image/png;base64,AA', link: '' }] } }])).toMatchObject({
      ok: false,
    })
    expect(
      checkWidgets([{ type: 'buttons', values: { buttons: [{ image: 'https://e.com/a.gif', link: 'javascript:x' }] } }])
    ).toMatchObject({ ok: false })
  })

  test('caps, unknown widgets and empty required fields are refused', () => {
    expect(checkWidgets(Array.from({ length: MAX_WIDGETS + 1 }, () => ({ type: 'rings' })))).toMatchObject({ ok: false })
    expect(checkWidgets([{ type: 'Guestbook' }])).toMatchObject({ ok: false })
    expect(checkWidgets([{ type: 'sticky', values: { text: 'x'.repeat(161) } }])).toMatchObject({ ok: false })
    expect(checkWidgets([{ type: 'sticky', values: { text: '  ' } }])).toMatchObject({ ok: false })
    expect(checkWidgets([{ type: 'now', values: {} }])).toMatchObject({ ok: false })
  })

  test('unknown fields are dropped and choices fall back to the first option', () => {
    const result = checkWidgets([{ type: 'marquee', values: { text: 'hi', speed: 'warp', onclick: 'x' } }])
    expect(result).toEqual({ ok: true, widgets: [{ type: 'marquee', values: { text: 'hi', direction: 'left', speed: 'slow' } }] })
  })
})

describe('compileWidgetSlot', () => {
  test('a hand-edited fragment over the cap is refused', () => {
    expect(compileWidgetSlot('<p>x</p>'.repeat(2000))).toMatchObject({ ok: false, status: 413 })
  })

  test('components that need posts or pictures are refused, not shown empty', () => {
    expect(compileWidgetSlot('<BlogPosts />')).toMatchObject({ ok: false, status: 400 })
    expect(compileWidgetSlot('<div><MediaGrid /></div>')).toMatchObject({ ok: false, status: 400 })
  })

  test('unsafe markup is stripped by the same sanitizer as a page', () => {
    const result = compileWidgetSlot('<p onclick="x">hi</p><script>bad()</script><iframe src="https://e.com"></iframe>')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.staticHTML).not.toMatch(/onclick|<script|<iframe/i)
  })
})
