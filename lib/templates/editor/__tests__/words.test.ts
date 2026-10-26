/**
 * Words on the preview, the editor's side: a changed run becomes the
 * smallest edit, keeping what wasn't touched exactly as written.
 */
import { decodeWithSpans, tagAgain, wordsSourceEdit } from '../words'

const apply = (source: string, edit: { from: number; to: number; insert: string } | null) =>
  edit ? source.slice(0, edit.from) + edit.insert + source.slice(edit.to) : null

test('entities read as the browser reads them, each character knowing where it came from', () => {
  const { text, spans } = decodeWithSpans('Tom &amp; J&#39;s&nbsp;x &bogus; \r\ny')
  expect(text).toBe("Tom & J's x &bogus; \ny")
  expect(spans[4]).toEqual([4, 9])
})

test('only the changed part is written, escaped; entities around it stay as written', () => {
  const source = '<h1>Tom &amp; Jerry&#39;s page</h1>'
  const range: [number, number] = [4, 30]
  const edit = wordsSourceEdit(source, source, { range, before: "Tom & Jerry's page", after: "Tom & Jerry's <3 page" })
  expect(edit).toEqual({ from: 26, to: 26, insert: '&lt;3 ' })
  expect(apply(source, edit)).toBe('<h1>Tom &amp; Jerry&#39;s &lt;3 page</h1>')
})

test('a space typed at the end comes as a no-break space and goes back as a space', () => {
  const source = '<p>hi</p>'
  expect(apply(source, wordsSourceEdit(source, source, { range: [3, 5], before: 'hi', after: 'hi there ' }))).toBe('<p>hi there </p>')
  const spaced = '<p>a&nbsp;b</p>'
  expect(apply(spaced, wordsSourceEdit(spaced, spaced, { range: [3, 11], before: 'a b', after: 'a bc' }))).toBe('<p>a&nbsp;bc</p>')
})

test('deleting all of a run, and a run that reads the same, are edits too (the second an empty one)', () => {
  const source = '<p>gone</p>'
  expect(apply(source, wordsSourceEdit(source, source, { range: [3, 7], before: 'gone', after: '' }))).toBe('<p></p>')
  expect(wordsSourceEdit(source, source, { range: [3, 7], before: 'gone', after: 'gone' })).toEqual({ from: 3, to: 3, insert: '' })
})

test('found again where the code has moved on since the preview was drawn', () => {
  const compiled = '<h1>Hi</h1><p>second</p>'
  const now = '<h1>Hi there friend</h1><p>second</p>'
  expect(apply(now, wordsSourceEdit(now, compiled, { range: [14, 20], before: 'second', after: 'third' }))).toBe('<h1>Hi there friend</h1><p>third</p>')
})

test("nothing when the code there doesn't read as the preview had it", () => {
  const compiled = '<p>old words</p>'
  expect(wordsSourceEdit('<p>new words</p>', compiled, { range: [3, 12], before: 'old words', after: 'x' })).toBeNull()
  expect(wordsSourceEdit(compiled, compiled, { range: [3, 12], before: 'something else', after: 'x' })).toBeNull()
})

test('a tag the preview pointed at is found again after the code moved', () => {
  const compiled = '<p>a</p><a href="/x">b</a>'
  const now = '<p>aaaa</p><a href="/x">b</a>'
  expect(tagAgain(now, compiled, 8)).toBe(11)
})
