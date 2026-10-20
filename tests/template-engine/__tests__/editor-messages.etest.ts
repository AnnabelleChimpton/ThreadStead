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

test('an iframe or embed points at <Embed>', async () => {
  for (const source of ['<iframe src="https://www.youtube.com/embed/abc"></iframe>', '<embed src="song.mid">']) {
    expect((await report(source)).stripped[0]).toContain('use <Embed src="…" />')
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
