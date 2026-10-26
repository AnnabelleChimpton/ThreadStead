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
    warnings: result.warnings,
    stripped: result.strippedComponents.map((s) => s.reason ?? ''),
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
    expect.stringMatching(/^Line 1: onclick="…" on <button> was taken out \(and 1 more like it\)\..*put an <OnClick> inside the <button>\.$/),
    expect.stringMatching(/^Line 1: A javascript: link on <a> was taken out\./),
  ])
  // A picture can't hold an OnClick: it gets an id and a target
  expect((await report('<img src="https://example.com/a.png" alt="a" onclick="go()">')).warnings).toEqual([
    expect.stringMatching(/give the <img> an id and put <OnClick target="#…"> on the page\.$/),
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

  test('Else on the page is reported', async () => {
    const { warnings } = await report('<Var name="n" initial="0" />\n<If condition="n"><p>a</p></If>\n<Else><p>b</p></Else>')
    expect(warnings).toEqual([expect.stringMatching(/^Line 3: <Else> only works inside an event like <OnClick>/)])
  })

  // OnClick and the mouse events work inside any element, or on target="…"
  // (element-events.tsx); what's said is when they'd have nothing to attach to
  test('an OnClick inside any element, or with a target that is on the page, is fine', async () => {
    for (const source of [
      '<div class="card"><OnClick><Increment var="n" /></OnClick>Card</div>',
      '<a href="/x"><img src="https://example.com/a.png" alt="a"><OnClick><Increment var="n" /></OnClick></a>',
      '<Var name="xs" type="array" initial="[1]" /><ul><ForEach var="xs" item="x"><li><If condition="n"><OnClick><Increment var="n" /></OnClick></If></li></ForEach></ul>',
      '<RetroCard><OnMouseEnter><Increment var="n" /></OnMouseEnter>x</RetroCard>',
      '<Button><OnClick><Increment var="n" /></OnClick>Go</Button>',
      '<img id="cat" src="https://example.com/a.png" alt="cat">\n<OnClick target="#cat"><Increment var="n" /></OnClick>',
      '<p class="note">x</p><OnMouseEnter target=".note"><Increment var="n" /></OnMouseEnter>',
      '<OnClick target="#late"><Increment var="n" /></OnClick><If condition="n"><img id="late" src="https://example.com/a.png" alt=""></If>',
      '<OnClick target="img"><Increment var="n" /></OnClick><img src="https://example.com/a.png" alt="">',
      '<OnClick target=".card p"><Increment var="n" /></OnClick>',
    ]) {
      expect({ source, warnings: (await report('<Var name="n" type="number" initial="0" />\n' + source)).warnings }).toEqual({ source, warnings: [] })
    }
  })

  test('an OnClick at the top of the page, or only inside logic, has nothing to attach to', async () => {
    const { warnings } = await report('<Var name="n" type="number" initial="0" />\n<OnClick><Increment var="n" /></OnClick>\n<If condition="n">\n  <OnMouseLeave><Increment var="n" /></OnMouseLeave>\n</If>')
    expect(warnings).toEqual([
      'Line 2: <OnClick> sits at the top of the page, not inside anything, so there\'s nothing for it to attach to. Put it inside the thing people click, or point it at something with target="…".',
      'Line 4: <OnMouseLeave> sits at the top of the page, not inside anything, so there\'s nothing for it to attach to. Put it inside the thing people point at, or point it at something with target="…".',
    ])
  })

  test('an OnClick inside a component that doesn\'t show what\'s inside it says so', async () => {
    const { warnings } = await report('<Var name="n" type="boolean" initial="false" />\n<Checkbox var="n" label="x"><OnClick><Toggle var="n" /></OnClick></Checkbox>')
    expect(warnings).toEqual([expect.stringMatching(/^Line 2: <OnClick> is inside <Checkbox>, which doesn't show what's put inside it.*element around the <Checkbox>/)])
  })

  test('a target that matches nothing on the page is reported', async () => {
    const { warnings } = await report(
      '<Var name="n" type="number" initial="0" />\n<img id="cat" src="https://example.com/a.png" alt="cat">\n<OnClick target="#dog"><Increment var="n" /></OnClick>\n' +
      '<OnMouseEnter target=".nope"><Increment var="n" /></OnMouseEnter>\n<OnClick target="cat"><Increment var="n" /></OnClick>'
    )
    expect(warnings).toEqual([
      'Line 3: <OnClick target="#dog">: nothing on your page has id="dog", so nothing happens.',
      'Line 4: <OnMouseEnter target=".nope">: nothing on your page has class="nope", so nothing happens.',
      'Line 5: <OnClick target="cat">: nothing on your page is a <cat>. For an id, write target="#cat".',
    ])
  })

  test('an OnChange inside a Checkbox is fine', async () => {
    expect((await report('<Var name="n" type="boolean" initial="false" />\n<Var name="c" type="number" initial="0" />\n<Checkbox var="n" label="x"><OnChange><Increment var="c" /></OnChange></Checkbox>')).warnings).toEqual([])
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

// Components retired on 2026-10-25: the editor says there's no such
// component, on its line, and keeps what was inside
test('a retired component is named as not a component, with its line', async () => {
  const result = await report('<Var name="n" type="number" initial="1" />\n<Switch value="n"><p>one</p></Switch>\n<Boombox />')
  expect(result.stripped).toEqual([
    expect.stringMatching(/no component called <Switch>/),
    expect.stringMatching(/no component called <Boombox>/),
  ])
})
