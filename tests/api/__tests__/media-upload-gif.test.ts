/**
 * @jest-environment node
 *
 * POST /api/media/upload with a GIF: every stored size is still a GIF with
 * all its frames, the full size is the upload byte for byte, and the row
 * records its size. Real multer + real sharp; S3 is mocked under
 * lib/storage/r2, so nothing leaves the test.
 */
import { Readable } from 'stream';
import sharp from 'sharp';
import type { NextApiRequest, NextApiResponse } from 'next';

const send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
  DeleteObjectCommand: jest.fn(),
}));
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    media: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'media-1', createdAt: new Date(0), ...data })),
    },
  },
}));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/domain/users/capabilities', () => ({
  requireAction: jest.fn(() => async (token: string) => {
    if (token !== 'good-cap') throw new Error('cap: bad');
    return { sub: 'user-1' };
  }),
}));

import handler from '@/pages/api/media/upload';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';
import { resetServerEnvCache } from '@/lib/config/env';
import { resetStorageClient } from '@/lib/storage/r2';

const CSRF = 'csrf-tok';
const BOUNDARY = '----media-gif-test';
const ENV = {
  R2_PUBLIC_URL: 'https://acct.r2.cloudflarestorage.com',
  R2_CDN_URL: 'https://cdn.example.com',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'bucket',
};
const savedEnv: Record<string, string | undefined> = {};

function multipart(file: Buffer, type: string, filename: string) {
  return Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="cap"\r\n\r\ngood-cap\r\n` +
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`
    ),
    file,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
}

async function upload(file: Buffer, type = 'image/gif', filename = 'dance.gif') {
  const body = multipart(file, type, filename);
  const req = Readable.from([body]) as unknown as NextApiRequest & Record<string, unknown>;
  Object.assign(req, {
    method: 'POST',
    url: '/api/media/upload',
    query: {},
    headers: {
      'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
      'content-length': String(body.length),
      cookie: `csrf_token=${CSRF}`,
      'x-csrf-token': CSRF,
    },
  });
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    setHeader: jest.fn(),
  };
  await handler(req, res as unknown as NextApiResponse);
  return res as { statusCode: number; body: { error?: string; media?: { fullUrl: string } } };
}

/** A real 2-frame GIF: red then green, 100ms each. */
async function twoFrameGif(width: number, height: number) {
  const frame = width * height * 4;
  const raw = Buffer.alloc(frame * 2);
  for (let i = 0; i < width * height; i++) {
    raw.set([255, 0, 0, 255], i * 4);
    raw.set([0, 255, 0, 255], frame + i * 4);
  }
  return sharp(raw, { raw: { width, height: height * 2, channels: 4, pageHeight: height } })
    .gif({ delay: [100, 100], loop: 0 })
    .toBuffer();
}

let userSeq = 0;

beforeAll(() => {
  for (const k of Object.keys(ENV)) savedEnv[k] = process.env[k];
  Object.assign(process.env, ENV);
  resetServerEnvCache();
  resetStorageClient();
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetServerEnvCache();
  resetStorageClient();
});
beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue({});
  // A fresh user each test so the route's per-day limiter never trips
  (getSessionUser as jest.Mock).mockResolvedValue({ id: `user-${++userSeq}` });
});

test('a 2-frame GIF is stored as GIFs with both frames; the full size is the upload itself', async () => {
  const gif = await twoFrameGif(800, 640);
  const res = await upload(gif);

  expect(res.statusCode).toBe(200);
  expect(send).toHaveBeenCalledTimes(3);
  const puts: Array<{ Key: string; Body: Buffer; ContentType: string }> = send.mock.calls.map((c) => c[0].input);
  const bySize = Object.fromEntries(
    puts.map((p) => [p.Key.match(/_(thumb|medium)\.gif$/)?.[1] ?? 'full', p])
  );

  for (const put of puts) {
    expect(put.Key).toMatch(new RegExp(`^media/user-${userSeq}/\\d+(_thumb|_medium)?\\.gif$`));
    expect(put.ContentType).toBe('image/gif');
    const meta = await sharp(put.Body, { animated: true }).metadata();
    expect(meta.format).toBe('gif');
    expect(meta.pages).toBe(2);
  }
  expect(Buffer.compare(bySize.full.Body, gif)).toBe(0);
  const medium = await sharp(bySize.medium.Body, { animated: true }).metadata();
  expect([medium.width, medium.pageHeight]).toEqual([600, 480]);
  const thumb = await sharp(bySize.thumb.Body, { animated: true }).metadata();
  expect([thumb.width, thumb.pageHeight]).toEqual([150, 150]);

  expect(db.media.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ mediaType: 'gif', mimeType: 'image/gif', width: 800, height: 640, fileSize: gif.length }),
  });
  expect(res.body.media?.fullUrl).toBe(`https://cdn.example.com/${bySize.full.Key}`);
});

test('a file that says it is a GIF but is not is a 400, and nothing is stored', async () => {
  const res = await upload(Buffer.from('GIF89a<script>alert(1)</script>'));
  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe("That doesn't look like a GIF.");
  expect(send).not.toHaveBeenCalled();
  expect(db.media.create).not.toHaveBeenCalled();
});
