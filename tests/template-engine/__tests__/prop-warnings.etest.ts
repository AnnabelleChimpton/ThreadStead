/**
 * Author mistakes on component props are said to the author (engine audit R3).
 *
 * A value that doesn't fit used to become the default with nothing said, or
 * a console.warn on the server; the enum check only worked for all-lowercase
 * prop names; a misspelt attribute vanished in the sanitizer. Now each one is
 * a validation warning with its line: the editor's list under the code
 * shows it to the page's owner. Visitors get the same page as before, and
 * nothing of the message reaches the compiled page.
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
import { isPageProblem } from '@/lib/templates/compilation/template-parser'

// About each tag's own settings: how the page fits together (variables made,
// where a tag sits) is editor-messages.etest.ts's
const propWarnings = (warnings: string[]) => warnings.filter((w) => !isPageProblem(w))

function warningsFor(source: string): string[] {
  return propWarnings(compileTemplateToArtifacts(source).warnings)
}

function propsOf(source: string, component: string) {
  const island = compileTemplateToArtifacts(source).islands.find((i) => i.component === component.toLowerCase())!
  return island._precomputed!.componentProps
}

describe('values that do not fit', () => {
  test('a choice that is not one of the choices, on a camelCase prop', () => {
    // tvStyle arrives from the HTML parser as tvstyle; the old check looked it up exactly
    expect(warningsFor('<CenteredBox maxWidth="huge"><p>a</p></CenteredBox>')).toEqual([
      'Line 1: <CenteredBox maxWidth="huge"> maxWidth can be sm, md, lg, xl, 2xl or full. Using lg.',
    ])
  })

  test('choices match regardless of case, and say nothing', () => {
    expect(warningsFor('<StickyNote color="Pink">hi</StickyNote>')).toEqual([])
    expect(propsOf('<StickyNote color="Pink">hi</StickyNote>', 'StickyNote').noteColor).toBe('pink')
  })

  test('true or false', () => {
    expect(warningsFor('<ImageCarousel autoplay="yes"></ImageCarousel>')).toEqual([
      'Line 1: <ImageCarousel autoplay="yes"> autoplay is true or false. Using false.',
    ])
    expect(warningsFor('<ImageCarousel autoplay="true" loop></ImageCarousel>')).toEqual([])
    expect(propsOf('<ImageCarousel autoplay="true"></ImageCarousel>', 'ImageCarousel').autoplay).toBe(true)
  })

  test('numbers', () => {
    expect(warningsFor('<BlogPosts limit="lots" />')).toEqual([
      'Line 1: <BlogPosts limit="lots"> limit needs a number. Using 5.',
    ])
    expect(warningsFor('<BlogPosts limit="50" />')).toEqual([
      'Line 1: <BlogPosts limit="50"> limit goes from 1 to 20. Using 20.',
    ])
    expect(propsOf('<BlogPosts limit="50" />', 'BlogPosts').limit).toBe(20)
  })

  test('a required prop left out', () => {
    expect(warningsFor('<RingNav />')).toEqual(['Line 1: <RingNav> needs ring="…" to work.'])
  })
})

describe('a calculation in value=, which is used as written', () => {
  test('says to use expression=, with the line', () => {
    const warnings = warningsFor('<Var name="books" type="array" initial="[]" />\n<Button><OnClick><Push var="books" value="$vars.newBook" /></OnClick>Add</Button>')
    expect(warnings).toContainEqual(expect.stringMatching(/^Line 2: <Push value="\$vars\.newBook"> value is used as written, so this puts in the words "\$vars\.newBook"\. For what the variable holds, write expression="\$vars\.newBook"\.$/))
  })
  test('plain words in value=, and $vars in expression=, say nothing', () => {
    const page = '<Var name="n" type="string" initial="" />\n<Button><OnClick><Set var="n" value="hello" /><Push var="l" expression="$vars.n" /></OnClick>Go</Button>'
    expect(warningsFor(page).filter((w) => /used as written/.test(w))).toEqual([])
  })
})

describe('attributes a component does not have', () => {
  test('a typo is named, with what was probably meant', () => {
    expect(warningsFor('<StickyNote colour="pink">hi</StickyNote>')).toEqual([
      'Line 1: <StickyNote colour="pink"> StickyNote has no colour setting, so it\'s left out. Did you mean color?',
    ])
  })

  test('another component\'s prop', () => {
    expect(warningsFor('<Guestbook limit="3" />')).toEqual([
      'Line 1: <Guestbook limit="3"> Guestbook has no limit setting, so it\'s left out.',
    ])
  })

  test('an event handler is reported as left out (and stays out)', () => {
    const artifacts = compileTemplateToArtifacts('<RetroCard onclick="x()">hi</RetroCard>')
    expect(propWarnings(artifacts.warnings)).toEqual([
      'Line 1: <RetroCard onclick="x()"> RetroCard has no onclick setting, so it\'s left out.',
    ])
    expect(JSON.stringify(artifacts.islands)).not.toContain('x()')
  })

  test('HTML attributes every element has say nothing', () => {
    expect(
      warningsFor('<RetroCard class="a" id="b" style="color: red" title="c" aria-label="d" data-component-id="1">hi</RetroCard>')
    ).toEqual([])
  })

  test('the implementation\'s own name is accepted', () => {
    expect(warningsFor('<StickyNote noteColor="pink">hi</StickyNote>')).toEqual([])
  })
})

describe('values the page would give up on when it runs', () => {
  test('a pattern that is not a pattern', () => {
    expect(warningsFor('<If condition="$vars.x" matches="(oops"><p>a</p></If>')).toEqual([
      expect.stringMatching(/^Line 1: <If matches="\(oops"> matches isn't a pattern this can read \(.+\), so it never matches\.$/),
    ])
    expect(warningsFor('<If condition="$vars.x" matches="^a+$"><p>a</p></If>')).toEqual([])
  })

  test('a list that is not JSON', () => {
    expect(warningsFor(`<Var name="todo" type="array" initial="['a', 'b']" />`)).toEqual([
      `Line 1: <Var initial="['a', 'b']"> initial needs to be a list like ["a", "b"] in JSON, so it starts empty.`,
    ])
    expect(warningsFor('<Var name="todo" type="array" initial=\'["a", "b"]\' />')).toEqual([])
    expect(warningsFor('<Var name="todo" type="array" initial=\'{"a": 1}\' />')).toEqual([
      'Line 1: <Var initial="{"a": 1}"> initial needs to be a list like ["a", "b"], so it starts empty.',
    ])
  })

  test('a Break condition it cannot read', () => {
    expect(warningsFor('<ForEach var="items" item="item"><Break when="item.error === true" /></ForEach>')).toEqual([
      'Line 1: <Break when="item.error === true"> when compares the loop count with a number, like when="i >= 5". To stop on anything else, put <Break /> inside an <If>.',
    ])
    expect(warningsFor('<ForEach var="items" item="item"><Break when="i >= 5" /></ForEach>')).toEqual([])
  })
})

describe('where the messages go', () => {
  test('each message has the line it is on', () => {
    const source = ['<div>', '  <p>hi</p>', '  <StickyNote color="teal">a</StickyNote>', '</div>'].join('\n')
    expect(warningsFor(source)).toEqual([
      'Line 3: <StickyNote color="teal"> color can be yellow, pink, blue, green, orange or purple. Using yellow.',
    ])
  })

  test('lines count from the top of a pasted whole page', () => {
    const page = [
      '<!DOCTYPE html>',
      '<html>',
      '<head><title>me</title></head>',
      '<body>',
      '<BlogPosts limit="lots" />',
      '</body>',
      '</html>',
    ].join('\n')
    expect(warningsFor(page)).toEqual(['Line 5: <BlogPosts limit="lots"> limit needs a number. Using 5.'])
  })

  test('nothing of the message reaches the compiled page', () => {
    const artifacts = compileTemplateToArtifacts('<StickyNote colour="pink" color="teal">hi</StickyNote>')
    expect(propWarnings(artifacts.warnings)).toHaveLength(2)
    const page = artifacts.staticHTML + JSON.stringify(artifacts.islands)
    expect(page).not.toMatch(/left out|can be|Using/)
  })

  test('a page with many of the same mistake gets a short list', () => {
    const source = Array.from({ length: 60 }, () => '<StickyNote color="teal">a</StickyNote>').join('\n')
    const warnings = warningsFor(source)
    expect(warnings).toHaveLength(51)
    expect(warnings[50]).toBe('…and 10 more like these.')
  })

  test('the server console stays quiet when compiling', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    compileTemplateToArtifacts('<StickyNote color="teal" colour="x">hi</StickyNote>')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('loops get true messages (template audit 06 #9)', () => {
  const { compileTemplate } = jest.requireActual('@/lib/templates/compilation/template-parser')
  const warningsFor = (source: string) => (compileTemplate(source).validation?.warnings ?? []).join('\n')
  const songs = `<Var name="songs" type="array" initial='[{"url":"https://youtu.be/jNQXAC9IVRw","tags":["a"]}]' />`

  test('an Embed filled in by a loop is not called empty', () => {
    expect(warningsFor(`${songs}<ForEach var="songs" item="s"><Embed src="{s.url}" /></ForEach>`)).not.toMatch(/Visitors see nothing/)
  })

  test('a list inside an item is said to be one, not a missing Var', () => {
    const w = warningsFor(`${songs}<ForEach var="songs" item="s"><ForEach var="s.tags" item="t">{t}</ForEach></ForEach>`)
    expect(w).toMatch(/can't use s\.tags, a list inside s/)
    expect(w).not.toMatch(/Add <Var name="s\.tags"/)
  })
})
