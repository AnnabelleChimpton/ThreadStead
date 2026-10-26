/**
 * Acting from a resident's own address: the link to the action page, the
 * pop-up only while music plays (and only if the browser opens one), and
 * hearing a pop-up finish.
 */
import { BroadcastChannel as NodeBroadcastChannel } from 'worker_threads'

let status = 'idle'
jest.mock('@/lib/audio/now-playing', () => ({ getSnapshot: () => ({ status }) }))

import { actionUrl, onActionDone, openAction } from '../actions'
import { finishUrl } from '../finish'

const MAIN = 'https://homepageagain.com'

test('the action page, in a pop-up or not', () => {
  expect(actionUrl(MAIN, 'guestbook', 'alice')).toBe('https://homepageagain.com/act/guestbook/alice')
  expect(actionUrl(MAIN, 'follow', 'a b', true)).toBe('https://homepageagain.com/act/follow/a%20b?via=popup')
})

test('no music: the link goes ahead in this tab', () => {
  status = 'paused'
  const open = jest.spyOn(window, 'open')
  const event = { preventDefault: jest.fn() }
  openAction(event, MAIN, 'guestbook', 'alice')
  expect(open).not.toHaveBeenCalled()
  expect(event.preventDefault).not.toHaveBeenCalled()
  open.mockRestore()
})

test('music playing: a pop-up, so the song keeps going; a blocked pop-up falls back to the link', () => {
  status = 'playing'
  const open = jest.spyOn(window, 'open').mockReturnValueOnce({} as Window).mockReturnValueOnce(null)
  const opened = { preventDefault: jest.fn() }
  openAction(opened, MAIN, 'follow', 'alice')
  expect(open).toHaveBeenCalledWith('https://homepageagain.com/act/follow/alice?via=popup', 'ts-act', expect.stringContaining('popup'))
  expect(opened.preventDefault).toHaveBeenCalled()
  const blocked = { preventDefault: jest.fn() }
  openAction(blocked, MAIN, 'follow', 'alice')
  expect(blocked.preventDefault).not.toHaveBeenCalled()
  open.mockRestore()
})

test('a pop-up finishing is heard; anything else on the channel is not', async () => {
  const real = (global as { BroadcastChannel?: unknown }).BroadcastChannel
  ;(global as { BroadcastChannel?: unknown }).BroadcastChannel = NodeBroadcastChannel
  const heard = jest.fn()
  const stop = onActionDone(heard)
  const other = new NodeBroadcastChannel('ts-act')
  other.postMessage({ type: 'act-done', action: 'steal' })
  other.postMessage({ type: 'act-done', action: 'guestbook', entryId: '<img src=x>' })
  other.postMessage({ type: 'act-done', action: 'guestbook', entryId: 'cmabc_12' })
  await new Promise((r) => setTimeout(r, 50))
  expect(heard).toHaveBeenCalledTimes(1)
  expect(heard).toHaveBeenCalledWith({ type: 'act-done', action: 'guestbook', entryId: 'cmabc_12' })
  other.close()
  stop()
  ;(global as { BroadcastChannel?: unknown }).BroadcastChannel = real
})

test('where a finished action goes: back to the note, or act-done.html in a pop-up', () => {
  const back = 'https://alice.homepageagain.com/'
  expect(finishUrl({ backUrl: back, popup: false }, 'guestbook', 'e1')).toBe('https://alice.homepageagain.com/#guestbook-entry-e1')
  expect(finishUrl({ backUrl: back, popup: false }, 'follow')).toBe(back)
  expect(finishUrl({ backUrl: back, popup: true }, 'guestbook', 'e1')).toBe('https://alice.homepageagain.com/assets/act-done.html#guestbook=e1')
  expect(finishUrl({ backUrl: back, popup: true }, 'follow')).toBe('https://alice.homepageagain.com/assets/act-done.html#follow')
})
