/**
 * Words on the preview, the preview's side: which blocks become editable,
 * what leaving one sends, what goes back, and Alt-click.
 */
import { wordsOnPage, type WordsMessage } from '../words-preview'

function setup(html: string) {
  document.head.innerHTML = ''
  document.body.innerHTML = `<div data-template-root>${html}</div>`
  const sent: WordsMessage[] = []
  const revert = jest.fn()
  const words = wordsOnPage(document, (m) => sent.push(m), revert)
  live = words
  return { sent, revert, words }
}
let live: ReturnType<typeof wordsOnPage> | null = null

const focus = (el: Element) => el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
const leave = (el: Element) => el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
const flush = () => new Promise((r) => setTimeout(r, 0))

const PAGE = `<h1 data-ts-text="4-6" data-ts-at="0">Hi</h1>` +
  `<p data-ts-text="13-19,28-35" data-ts-at="10">Hello <em data-ts-text="23-27">dear</em> friend</p>` +
  `<div data-ts-text="40-44">text <ts-island><span data-ts-text="50-55">comp</span></ts-island></div>` +
  `<a href="/x" data-ts-text="60-64" data-ts-at="57">link</a>`

afterEach(() => { live?.destroy(); live = null; document.body.innerHTML = '' })

test('with Words on, the outermost blocks holding words are editable, components inside them shut', () => {
  const { words } = setup(PAGE)
  words.set(true)
  const hosts = Array.from(document.querySelectorAll('[data-words-host]')).map((h) => h.localName)
  expect(hosts).toEqual(['h1', 'p', 'div', 'a'])
  expect(document.querySelector('p')!.getAttribute('contenteditable')).toBe('plaintext-only')
  expect(document.querySelector('em')!.hasAttribute('data-words-host')).toBe(false)
  expect(document.querySelector('ts-island')!.getAttribute('contenteditable')).toBe('false')
  words.set(false)
  expect(document.querySelectorAll('[contenteditable]')).toHaveLength(0)
})

test('leaving a block sends each changed run with where it was', async () => {
  const { words, sent } = setup(PAGE)
  words.set(true)
  const p = document.querySelector('p')!
  focus(p)
  ;(p.firstChild as Text).data = 'Hello there '
  ;(document.querySelector('em')!.firstChild as Text).data = 'dearest'
  leave(p)
  expect(sent).toEqual([{ type: 'WORDS_EDIT', changes: [
    { range: [13, 19], before: 'Hello ', after: 'Hello there ' },
    { range: [23, 27], before: 'dear', after: 'dearest' },
  ] }])
})

test('a block that is one run is read whole, even when the browser swaps its text node', () => {
  const { words, sent } = setup(PAGE)
  words.set(true)
  const h1 = document.querySelector('h1')!
  focus(h1)
  h1.replaceChildren(document.createTextNode('A new title'))
  leave(h1)
  expect(sent).toEqual([{ type: 'WORDS_EDIT', changes: [{ range: [4, 6], before: 'Hi', after: 'A new title' }] }])
})

test('taking out a tag goes back, and says so; so does Escape (without saying)', async () => {
  const { words, sent, revert } = setup(PAGE)
  words.set(true)
  const p = document.querySelector('p')!
  focus(p)
  p.querySelector('em')!.remove()
  leave(p)
  expect(sent).toEqual([{ type: 'WORDS_REFUSED' }])
  expect(revert).toHaveBeenCalledTimes(1)

  const a = document.querySelector('a')!
  focus(a)
  ;(a.firstChild as Text).data = 'changed'
  a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await flush()
  expect(revert).toHaveBeenCalledTimes(2)
  expect(sent).toHaveLength(1)
})

test('Alt-click sends where the tag is; a plain click on a link goes nowhere only while Words is on', () => {
  const { words, sent } = setup(PAGE)
  const em = document.querySelector('em')!
  em.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }))
  expect(sent).toEqual([{ type: 'GO_TO_SOURCE', at: 10 }])

  const a = document.querySelector('a')!
  const plain = () => { const e = new MouseEvent('click', { bubbles: true, cancelable: true }); a.dispatchEvent(e); return e.defaultPrevented }
  expect(plain()).toBe(false)
  words.set(true)
  expect(plain()).toBe(true)
})

test("an element whose text nodes don't match its marks is left alone", () => {
  const { words } = setup(`<p data-ts-text="3-8">one<b>x</b>two</p>`)
  words.set(true)
  expect(document.querySelectorAll('[data-words-host]')).toHaveLength(0)
})
