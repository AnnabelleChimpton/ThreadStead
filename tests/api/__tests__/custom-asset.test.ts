/**
 * /api/home/custom-asset: replacing a slot's image never leaves placed
 * copies pointing at a deleted file (pixel-homes Phase 3 step 4).
 * Upload first, then point the slot at it, and only then delete the old
 * file. Nothing here touches R2: the uploader is mocked.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const calls: string[] = []
const stored = { customAssets: [{ slot: 1, url: 'https://cdn.test/pixel-homes/custom/u1-old.png' }] as unknown }

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    userHomeConfig: {
      findUnique: jest.fn(async () => ({ customAssets: stored.customAssets })),
      upsert: jest.fn(async (args: any) => {
        calls.push(`save ${JSON.stringify(args.update.customAssets)}`)
        stored.customAssets = args.update.customAssets
      }),
    },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'u1' })) }))
jest.mock('@/lib/pixel-homes/custom-asset-uploader', () => ({
  validateCustomAssetDataUrl: () => ({ valid: true }),
  uploadCustomPixelArt: jest.fn(async () => {
    calls.push('upload')
    return { customAssetUrl: 'https://cdn.test/pixel-homes/custom/u1-new.png' }
  }),
  deleteCustomPixelArt: jest.fn(async (url: string) => {
    calls.push(`delete ${url}`)
  }),
}))

import handler from '@/pages/api/home/custom-asset'
import { uploadCustomPixelArt, deleteCustomPixelArt } from '@/lib/pixel-homes/custom-asset-uploader'

async function call(method: string, body: any) {
  const req = { method, body, headers: { cookie: 'csrf_token=t', 'x-csrf-token': 't' } } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
    setHeader: jest.fn(),
  }
  await handler(req, res as NextApiResponse)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  calls.length = 0
  stored.customAssets = [{ slot: 1, url: 'https://cdn.test/pixel-homes/custom/u1-old.png' }]
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

test('replace: upload, then save the slot, then delete the old file', async () => {
  const res = await call('POST', { slot: 1, imageDataUrl: 'data:image/png;base64,AAAA' })
  expect(res.statusCode).toBe(200)
  expect(calls).toEqual([
    'upload',
    'save [{"slot":1,"url":"https://cdn.test/pixel-homes/custom/u1-new.png"}]',
    'delete https://cdn.test/pixel-homes/custom/u1-old.png',
  ])
})

test('a failed upload keeps the old image and deletes nothing', async () => {
  ;(uploadCustomPixelArt as jest.Mock).mockRejectedValueOnce(new Error('R2 is down'))
  const res = await call('POST', { slot: 1, imageDataUrl: 'data:image/png;base64,AAAA' })
  expect(res.statusCode).toBe(500)
  expect(deleteCustomPixelArt).not.toHaveBeenCalled()
  expect(stored.customAssets).toEqual([{ slot: 1, url: 'https://cdn.test/pixel-homes/custom/u1-old.png' }])
})

test('a failed delete of the old file still saves the new image', async () => {
  ;(deleteCustomPixelArt as jest.Mock).mockRejectedValueOnce(new Error('gone already'))
  const res = await call('POST', { slot: 1, imageDataUrl: 'data:image/png;base64,AAAA' })
  expect(res.statusCode).toBe(200)
  expect(stored.customAssets).toEqual([{ slot: 1, url: 'https://cdn.test/pixel-homes/custom/u1-new.png' }])
})

test('remove: clear the slot first, then delete the file', async () => {
  const res = await call('DELETE', { slot: 1 })
  expect(res.statusCode).toBe(200)
  expect(calls).toEqual(['save []', 'delete https://cdn.test/pixel-homes/custom/u1-old.png'])
})

test.each([[1.5], [-1], [5], ['1'], [null]])('slot %p is a 400, before anything is uploaded or saved', async (slot) => {
  const post = await call('POST', { slot, imageDataUrl: 'data:image/png;base64,AAAA' })
  expect(post.statusCode).toBe(400)
  expect(post.body.error).toBe('Pick a slot from 0 to 4.')
  expect((await call('DELETE', { slot })).statusCode).toBe(400)
  expect(calls).toEqual([])
})

test('image data that isn\'t text is a 400, not a 500', async () => {
  const res = await call('POST', { slot: 1, imageDataUrl: { not: 'text' } })
  expect(res.statusCode).toBe(400)
  expect(calls).toEqual([])
})
