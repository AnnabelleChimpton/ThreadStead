/**
 * Security tests for the MIDI serve proxy: a file named x.mid can hold HTML,
 * and serving it inline from our origin with a stored content-type is stored
 * XSS. The proxy must verify MThd magic bytes and force audio/midi.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

jest.mock('@/lib/config/database/connection', () => ({
  db: { media: { findUnique: jest.fn() } },
}))

import handler from '@/pages/api/media/serve/[id]'
import { db } from '@/lib/config/database/connection'

const mockMedia = (db as any).media as { findUnique: jest.Mock }

const REAL_MIDI = Buffer.concat([Buffer.from('MThd'), Buffer.alloc(10)])
const FAKE_HTML = Buffer.from('<script>alert(document.cookie)</script>')

function makeRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined,
    status(c: number) { this.statusCode = c; return this },
    json(p: any) { this.body = p; return this },
    send(p: any) { this.body = p; return this },
    setHeader(k: string, v: any) { this.headers[k.toLowerCase()] = v },
  }
  return res as NextApiResponse & { statusCode: number; headers: Record<string, string>; body: any }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(global as any).fetch = jest.fn()
})

function req(): NextApiRequest {
  return { method: 'GET', query: { id: 'm1' } } as unknown as NextApiRequest
}

test('rejects a .mid whose bytes are actually HTML (415, no body served)', async () => {
  mockMedia.findUnique.mockResolvedValue({
    id: 'm1', mediaType: 'midi', visibility: 'public', userId: 'u1', fullUrl: 'https://cdn/evil.mid',
    mimeType: 'text/html', originalName: 'evil.mid',
  })
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true, arrayBuffer: async () => FAKE_HTML,
  })
  const res = makeRes()
  await handler(req(), res)
  expect(res.statusCode).toBe(415)
  expect(res.headers['content-type']).not.toBe('text/html')
})

test('serves a real MIDI with forced audio/midi + nosniff + sanitized name', async () => {
  mockMedia.findUnique.mockResolvedValue({
    id: 'm1', mediaType: 'midi', visibility: 'public', userId: 'u1', fullUrl: 'https://cdn/song.mid',
    mimeType: 'application/x-midi', originalName: 'my "cool"\r\nsong.mid',
  })
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true, arrayBuffer: async () => REAL_MIDI,
  })
  const res = makeRes()
  await handler(req(), res)
  expect(res.statusCode).toBe(200)
  expect(res.headers['content-type']).toBe('audio/midi')
  expect(res.headers['x-content-type-options']).toBe('nosniff')
  // The sanitized filename has no CR/LF or inner quotes
  const fname = res.headers['content-disposition'].match(/filename="(.*)"/)?.[1] ?? ''
  expect(fname).toBe('my__cool___song.mid')
  expect(fname).not.toMatch(/[\r\n"]/)
})

// ---- the song's sound bank (?bank=1), MIDI plan Phase 3 ----

const REAL_BANK = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('sfbk'), Buffer.alloc(20)])

function bankReq(): NextApiRequest {
  return { method: 'GET', query: { id: 'm1', bank: '1' } } as unknown as NextApiRequest
}

test('serves a song\'s sound bank as a download, never as a page', async () => {
  mockMedia.findUnique.mockResolvedValue({
    id: 'm1', mediaType: 'midi', visibility: 'public', userId: 'u1', fullUrl: 'https://cdn/song.mid',
    soundBankUrl: 'https://cdn/song.sf2', originalName: 'song.mid',
  })
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, arrayBuffer: async () => REAL_BANK })
  const res = makeRes()
  await handler(bankReq(), res)
  expect(res.statusCode).toBe(200)
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://cdn/song.sf2')
  expect(res.headers['content-type']).toBe('application/octet-stream')
  expect(res.headers['x-content-type-options']).toBe('nosniff')
  expect(res.headers['content-disposition']).toMatch(/^attachment;/)
})

test('a stored "bank" that isn\'t a sound bank is not served', async () => {
  mockMedia.findUnique.mockResolvedValue({
    id: 'm1', mediaType: 'midi', visibility: 'public', userId: 'u1', fullUrl: 'https://cdn/song.mid',
    soundBankUrl: 'https://cdn/song.sf2', originalName: 'song.mid',
  })
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, arrayBuffer: async () => FAKE_HTML })
  const res = makeRes()
  await handler(bankReq(), res)
  expect(res.statusCode).toBe(404)
  expect(res.body).toEqual({ error: 'Sound bank not found' })
})

test('a song without a bank yet says so (the player uses the old synth)', async () => {
  mockMedia.findUnique.mockResolvedValue({
    id: 'm1', mediaType: 'midi', visibility: 'public', userId: 'u1', fullUrl: 'https://cdn/song.mid',
    soundBankUrl: null, originalName: 'song.mid',
  })
  const res = makeRes()
  await handler(bankReq(), res)
  expect(res.statusCode).toBe(404)
  expect(global.fetch).not.toHaveBeenCalled()
})

test('a private song\'s bank follows the song\'s rules', async () => {
  mockMedia.findUnique.mockResolvedValue({
    id: 'm1', mediaType: 'midi', visibility: 'private', userId: 'u1', fullUrl: 'https://cdn/song.mid',
    soundBankUrl: 'https://cdn/song.sf2', originalName: 'song.mid',
  })
  const res = makeRes()
  await handler(bankReq(), res)
  expect(res.statusCode).toBe(403)
  expect(global.fetch).not.toHaveBeenCalled()
})
