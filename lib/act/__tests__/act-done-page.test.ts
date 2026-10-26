/**
 * @jest-environment node
 *
 * public/assets/act-done.html, where a pop-up ends up on the resident's own
 * address: it says what was done on the BroadcastChannel (only a guestbook
 * or follow, only a plain entry id), tries to close, and if it can't, shows
 * the page itself at the note. Its own script, run against stand-ins.
 */
import { readFileSync } from 'fs'
import path from 'path'

const html = readFileSync(path.join(process.cwd(), 'public/assets/act-done.html'), 'utf8')
const script = html.match(/<script>([\s\S]*?)<\/script>/)![1]

function run(hash: string) {
  const posted: unknown[] = []
  class FakeChannel { constructor(readonly name: string) {} postMessage(m: unknown) { posted.push([this.name, m]) } close() {} }
  const location = { hash, replace: jest.fn() }
  const win = { close: jest.fn() }
  const timers: Array<() => void> = []
  new Function('location', 'window', 'BroadcastChannel', 'setTimeout', script)(location, win, FakeChannel, (fn: () => void) => timers.push(fn))
  timers.forEach((fn) => fn())
  return { posted, close: win.close, replace: location.replace }
}

test('a signed guestbook: said on the channel, then close, else the page at the note', () => {
  const { posted, close, replace } = run('#guestbook=cmabc_12')
  expect(posted).toEqual([['ts-act', { type: 'act-done', action: 'guestbook', entryId: 'cmabc_12' }]])
  expect(close).toHaveBeenCalled()
  expect(replace).toHaveBeenCalledWith('/#guestbook-entry-cmabc_12')
})

test('a follow: said, and back to the page', () => {
  const { posted, replace } = run('#follow')
  expect(posted).toEqual([['ts-act', { type: 'act-done', action: 'follow', entryId: undefined }]])
  expect(replace).toHaveBeenCalledWith('/')
})

test('anything else is said nowhere and goes to the page', () => {
  for (const hash of ['#steal=1', '#guestbook=<img>', '#']) {
    const { posted, replace } = run(hash)
    expect(posted).toEqual([])
    expect(replace).toHaveBeenCalledWith('/')
  }
})
