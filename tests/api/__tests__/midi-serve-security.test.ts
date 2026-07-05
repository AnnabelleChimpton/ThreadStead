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
