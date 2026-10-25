/**
 * Saves heard across tabs: another editor's save arrives, this editor's own
 * doesn't come back to it, and anything that isn't a save is ignored.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { BroadcastChannel as NodeBroadcastChannel } from 'worker_threads'
import { useSaveChannel, type PageSaved } from '../useSaveChannel'

const realChannel = (global as { BroadcastChannel?: unknown }).BroadcastChannel
beforeAll(() => { (global as { BroadcastChannel?: unknown }).BroadcastChannel = NodeBroadcastChannel })
afterAll(() => { (global as { BroadcastChannel?: unknown }).BroadcastChannel = realChannel })

const SAVED: PageSaved = { css: 'p { color: red; }', cssMode: 'disable', page: { template: '<p>Hi</p>', useStandardLayout: false, hideNavigation: false }, savedAt: '2026-10-25T10:00:00.000Z' }

test("one tab's save reaches the other, not itself", async () => {
  const heardHere = jest.fn()
  const heardThere = jest.fn()
  const here = renderHook(() => useSaveChannel('u1', heardHere))
  const there = renderHook(() => useSaveChannel('u1', heardThere))
  here.result.current(SAVED)
  await waitFor(() => expect(heardThere).toHaveBeenCalledWith(SAVED))
  expect(heardHere).not.toHaveBeenCalled()
  here.unmount()
  there.unmount()
})

test("another account's channel, or a message that isn't a save, is ignored", async () => {
  const heard = jest.fn()
  const mine = renderHook(() => useSaveChannel('u1', heard))
  const theirs = renderHook(() => useSaveChannel('u2', jest.fn()))
  theirs.result.current(SAVED)
  const raw = new NodeBroadcastChannel('threadstead:page-saved:u1')
  raw.postMessage({ css: 1, cssMode: 'disable' })
  raw.postMessage({ ...SAVED, page: { template: '<p>' } })
  raw.postMessage({ css: '', cssMode: 'inherit' })
  await waitFor(() => expect(heard).toHaveBeenCalledWith({ css: '', cssMode: 'inherit' }))
  expect(heard).toHaveBeenCalledTimes(1)
  raw.close()
  mine.unmount()
  theirs.unmount()
})
