/**
 * @jest-environment node
 *
 * POST /api/profile/upload-photo — the one avatar route after
 * /api/user/photo (signup's copy, no CSRF, no Ring Hub sync) was merged into
 * it (TECH_DEBT_AUDIT §2.3). Real multer + real sharp; S3 is mocked under
 * lib/storage/r2 so keys, content types and URLs are checked end to end.
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
  db: { profile: { upsert: jest.fn().mockResolvedValue({}) } },
}));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/domain/users/capabilities', () => ({
  requireAction: jest.fn(() => async (token: string) => {
    if (token !== 'good-cap') throw new Error('cap: bad');
    return { sub: 'user-1' };
  }),
}));
jest.mock('@/lib/api/ringhub/ringhub-profile-sync', () => ({
  notifyRingHubIfMember: jest.fn().mockResolvedValue(undefined),
}));

import handler from '@/pages/api/profile/upload-photo';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';
import { notifyRingHubIfMember } from '@/lib/api/ringhub/ringhub-profile-sync';
import { resetServerEnvCache } from '@/lib/config/env';
import { resetStorageClient } from '@/lib/storage/r2';

const CSRF = 'csrf-tok';
const BOUNDARY = '----avatar-test';
const ENV = {
  R2_PUBLIC_URL: 'https://acct.r2.cloudflarestorage.com',
  R2_CDN_URL: 'https://cdn.example.com',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'bucket',
};
const savedEnv: Record<string, string | undefined> = {};

function multipart(parts: Array<{ name: string; value: string } | { name: string; file: Buffer; type: string }>) {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${BOUNDARY}\r\n`));
    if ('file' in part) {
      chunks.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${part.name}"; filename="photo"\r\nContent-Type: ${part.type}\r\n\r\n`
        ),
        part.file,
        Buffer.from('\r\n')
      );
    } else {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`));
    }
  }
  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`));
  return Buffer.concat(chunks);
}

async function call({ body, csrf = true }: { body: Buffer; csrf?: boolean }) {
  const req = Readable.from([body]) as unknown as NextApiRequest & Record<string, unknown>;
  Object.assign(req, {
    method: 'POST',
    url: '/api/profile/upload-photo',
    query: {},
    headers: {
      'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
      'content-length': String(body.length),
      ...(csrf ? { cookie: `csrf_token=${CSRF}`, 'x-csrf-token': CSRF } : {}),
    },
  });
  const res: any = {
    statusCode: 200,
    body: undefined,
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
  await handler(req, res as NextApiResponse);
  return res as { statusCode: number; body: any };
}

let jpeg: Buffer;
let userSeq = 0;

beforeAll(async () => {
  for (const k of Object.keys(ENV)) savedEnv[k] = process.env[k];
  Object.assign(process.env, ENV);
  resetServerEnvCache();
  resetStorageClient();
  jpeg = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#c33' } }).jpeg().toBuffer();
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
  // A fresh user each test so the route's 5-per-hour limiter never trips.
  (getSessionUser as jest.Mock).mockResolvedValue({ id: `user-${++userSeq}` });
});

const photo = () => ({ name: 'photo', file: jpeg, type: 'image/jpeg' });

test('CSRF is required: 403 and nothing stored without the token', async () => {
  const res = await call({ body: multipart([photo(), { name: 'cap', value: 'good-cap' }]), csrf: false });
  expect(res.statusCode).toBe(403);
  expect(res.body.error).toBe('CSRF token validation failed');
  expect(send).not.toHaveBeenCalled();
  expect(db.profile.upsert).not.toHaveBeenCalled();
});

test('signed out → 401', async () => {
  (getSessionUser as jest.Mock).mockResolvedValue(null);
  const res = await call({ body: multipart([photo(), { name: 'cap', value: 'good-cap' }]) });
  expect(res.statusCode).toBe(401);
  expect(send).not.toHaveBeenCalled();
});

test('a capability token is still required', async () => {
  expect((await call({ body: multipart([photo()]) })).statusCode).toBe(401);
  expect((await call({ body: multipart([photo(), { name: 'cap', value: 'forged' }]) })).statusCode).toBe(403);
  expect(send).not.toHaveBeenCalled();
});

test('rejects GIFs', async () => {
  const res = await call({
    body: multipart([{ name: 'photo', file: jpeg, type: 'image/gif' }, { name: 'cap', value: 'good-cap' }]),
  });
  expect(res.statusCode).toBe(400);
  expect(send).not.toHaveBeenCalled();
});

test('stores 64/200/800 square JPEGs under the same keys and URLs as before, then syncs Ring Hub', async () => {
  const res = await call({ body: multipart([photo(), { name: 'cap', value: 'good-cap' }]) });
  const userId = `user-${userSeq}`;

  expect(res.statusCode).toBe(200);
  expect(send).toHaveBeenCalledTimes(3);

  const puts = send.mock.calls.map((c) => c[0].input);
  const keyRe = new RegExp(`^profile-photos/${userId}/(\\d+)_(thumb|medium|full)\\.jpg$`);
  const sizes: Record<string, number> = { thumb: 64, medium: 200, full: 800 };
  const stamps = new Set<string>();

  for (const put of puts) {
    const m = put.Key.match(keyRe);
    expect(m).not.toBeNull();
    stamps.add(m[1]);
    expect(put).toMatchObject({
      Bucket: 'bucket',
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000',
    });
    const meta = await sharp(put.Body).metadata();
    expect(meta.format).toBe('jpeg');
    expect([meta.width, meta.height]).toEqual([sizes[m[2]], sizes[m[2]]]);
  }
  expect(stamps.size).toBe(1);
  expect(puts.map((p) => p.Key.match(keyRe)[2])).toEqual(['thumb', 'medium', 'full']);

  const urls = {
    thumbnailUrl: `https://cdn.example.com/${puts[0].Key}`,
    mediumUrl: `https://cdn.example.com/${puts[1].Key}`,
    fullUrl: `https://cdn.example.com/${puts[2].Key}`,
  };
  expect(res.body).toEqual({ success: true, urls, message: 'Profile photo uploaded successfully' });

  const avatar = {
    avatarUrl: urls.mediumUrl,
    avatarThumbnailUrl: urls.thumbnailUrl,
    avatarMediumUrl: urls.mediumUrl,
    avatarFullUrl: urls.fullUrl,
  };
  expect(db.profile.upsert).toHaveBeenCalledWith({
    where: { userId },
    update: avatar,
    create: { userId, ...avatar },
  });
  expect(notifyRingHubIfMember).toHaveBeenCalledWith(userId, db);
});

test('a storage failure is a 500 and the profile is untouched', async () => {
  send.mockRejectedValue(new Error('R2 down'));
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await call({ body: multipart([photo(), { name: 'cap', value: 'good-cap' }]) });
  spy.mockRestore();
  expect(res.statusCode).toBe(500);
  expect(db.profile.upsert).not.toHaveBeenCalled();
});
