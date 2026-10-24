/**
 * What the editor says about the mistakes people make most, especially when
 * pasting an old page. Each message should say what to do instead.
 */
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor'

async function report(source: string) {
  const result = await compileForEditor(source)
  if (!result.ok) return { errors: result.body.errors, details: result.body.details, warnings: [] as string[], stripped: [] as string[] }
  return {
    errors: [] as string[],
    details: undefined,
    warnings: result.compiled.warnings,
    stripped: result.compiled.strippedComponents.map((s) => s.reason ?? ''),
  }
}

test('an iframe or embed points at <Embed>; a MIDI embed or <bgsound> at <ProfileMusic>', async () => {
  for (const source of ['<iframe src="https://www.youtube.com/embed/abc"></iframe>', '<embed src="https://www.youtube.com/v/abc">']) {
    expect((await report(source)).stripped[0]).toContain('use <Embed src="…" />')
  }
  for (const source of ['<embed src="song.mid">', '<bgsound src="song.mid">']) {
    expect((await report(source)).stripped[0]).toContain('<ProfileMusic />')
  }
})

test.each([
  ['<Gestbook />', 'Guestbook'],
  ['<Top8 />', 'FriendDisplay'],
  ['<TopFriends />', 'FriendDisplay'],
  ['<Song />', 'ProfileMusic'],
  ['<Webring />', 'RingNav'],
  ['<YouTube />', 'Embed'],
])('%s suggests <%s>', async (source, meant) => {
  expect((await report(source)).stripped).toEqual([`There’s no component called ${source.slice(0, -3)}>. Did you mean <${meant}>?`])
})

test('an unknown component with no near name says where the list is', async () => {
  const { stripped } = await report('<Zorblax />')
  expect(stripped[0]).toBe('There’s no component called <Zorblax>. The components page lists every one.')
  expect(stripped[0]).not.toMatch(/registered|case-sensitive/)
})

test('an unclosed quote says the line once, with a tip about quotes', async () => {
  const { errors, details } = await report('<img src="me.png alt="me">')
  expect(errors[0]).toMatch(/^Line 1: Unclosed quote in <img>/)
  expect(details).not.toMatch(/Line 1: Line 1/)
  expect(details).not.toMatch(/Common attributes/)
  expect(errors[0]).toContain(`initial='["a", "b"]'`)
})

test('onclick and javascript: links are reported once each, not dropped quietly', async () => {
  const { warnings } = await report('<button onclick="go()">Go</button><p onclick="x()">x</p><a href="javascript:alert(1)">a</a>')
  expect(warnings).toEqual([
    expect.stringMatching(/^Line 1: onclick="…" on <button> was taken out \(and 1 more like it\)\..*<OnClick> inside a <Button>/),
    expect.stringMatching(/^Line 1: A javascript: link on <a> was taken out\./),
  ])
})

test('a Var without a type is fine', async () => {
  expect((await report('<Var name="waves" initial="0" />')).warnings).toEqual([])
})

describe('mistakes that compile and then do nothing', () => {
  test('a misspelt variable says which one was meant', async () => {
    const { warnings } = await report('<Var name="count" initial="0" />\n<Button><OnClick><Increment var="cuont" /></OnClick>Go</Button>')
    expect(warnings).toEqual([expect.stringMatching(/^Line 2: <Increment> uses a variable called cuont, but nothing makes one, so it does nothing\. Did you mean count\?$/)])
  })

  test('a variable nothing makes says how to make it', async () => {
    const { warnings } = await report('<p><ShowVar name="waves" /></p>')
    expect(warnings[0]).toContain('Add <Var name="waves" initial="…" /> near the top.')
  })

  test('variables made by actions and loops count as made', async () => {
    const source = [
      '<Var name="books" type="array" initial=\'["a"]\' />',
      '<Button><OnClick><Count data="$vars.books" target="howMany" /></OnClick>Count</Button>',
      '<p><ShowVar name="howMany" /></p>',
      '<ForEach data="$vars.books" item="book"><p>{book}</p></ForEach>',
    ].join('\n')
    expect((await report(source)).warnings.filter((w) => /variable called/.test(w))).toEqual([])
  })

  test('JavaScript in an If is never true, and says how to write it', async () => {
    const { warnings } = await report('<Var name="mood" initial="happy" />\n<If condition="mood == \'happy\'"><p>yay</p></If>')
    expect(warnings).toEqual([expect.stringContaining('<If condition="mood == \'happy\'"> reads condition as a name, not a sum')])
    expect(warnings[0]).toContain('<If condition="mood" equals="happy">')
  })

  test('Else on the page, and OnClick outside a Button, are reported', async () => {
    const { warnings } = await report('<Var name="n" initial="0" />\n<If condition="n"><p>a</p></If>\n<Else><p>b</p></Else>\n<div><OnClick><Increment var="n" /></OnClick></div>')
    expect(warnings).toEqual(expect.arrayContaining([
      expect.stringMatching(/^Line 3: <Else> only works inside an event like <OnClick>/),
      expect.stringMatching(/^Line 4: <OnClick> only works straight inside a <Button>/),
    ]))
  })

  test('a Tab outside Tabs is reported', async () => {
    const { warnings } = await report('<Tab title="One"><p>x</p></Tab>')
    expect(warnings).toEqual([expect.stringMatching(/<Tab> only works inside a <Tabs>/)])
  })

  test('ShowVar takes var= like the tags that change a variable', async () => {
    expect((await report('<Var name="waves" initial="0" />\n<ShowVar var="waves" />')).warnings).toEqual([])
  })

  test('the starter pages and the counter people write first have nothing to warn about', async () => {
    const source = '<Var name="waves" type="number" initial="0" />\n<p><ShowVar name="waves" /></p>\n<Button><OnClick><Increment var="waves" /></OnClick>Wave</Button>'
    expect((await report(source)).warnings).toEqual([])
  })
})

test('name= where a tag wants var= says so, once', async () => {
  const { warnings } = await report('<Var name="n" initial="0" />\n<Button><OnClick><Increment name="n" /></OnClick>Go</Button>')
  expect(warnings).toEqual(['Line 2: <Increment name="n"> Increment says which variable with var="…", not name=. Write var="n".'])
})

// Retired components still work on the pages that use them; the ones that
// misbehave say so (cross-check A8, component-docs.ts HIDDEN_COMPONENTS)
test('retired logic that misbehaves says what to use instead', async () => {
  const { warnings } = await report(`<Var name="n" type="number" initial="1" />
<ForEach var="xs" item="x"><Continue /></ForEach>
<Switch value="n"><Case value="1"><p>one</p></Case><Default><p>other</p></Default></Switch>
<Choose><When data="$vars.n" equals="1"><p>one</p></When></Choose>`)
  expect(warnings).toEqual(expect.arrayContaining([
    expect.stringMatching(/^Line 2: <Continue> doesn't do anything yet.*<If>/),
    expect.stringMatching(/^Line 3: <Switch> only works inside an event like <OnClick>/),
    expect.stringMatching(/^Line 4: <When> doesn't change when a page variable does.*<If> follows variables/),
  ]))
  // inside an event, Switch is fine
  const inEvent = await report('<Var name="n" type="number" initial="1" /><Button><OnClick><Switch value="n"><Case value="1"><Set var="n" value="2" /></Case></Switch></OnClick>Go</Button>')
  expect(inEvent.warnings.join()).not.toMatch(/<Switch>/)
})
