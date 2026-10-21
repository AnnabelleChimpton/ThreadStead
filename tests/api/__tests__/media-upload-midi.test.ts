/**
 * @jest-environment node
 *
 * POST /api/media/upload with a MIDI song (MIDI plan Phase 3): the song is
 * stored with its own sound bank, GeneralUser GS trimmed to the song, and
 * the row points at it. Real multer and the real trim; S3 is mocked under
 * lib/storage/r2, so nothing leaves the test.
 */
import { Readable } from 'stream';
import { Midi } from '@tonejs/midi';
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
jest.mock('@/lib/audio/server/trim-sound-bank', () => {
  const real = jest.requireActual('@/lib/audio/server/trim-sound-bank');
  return { ...real, trimSoundBank: jest.fn(real.trimSoundBank) };
});
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
import { isSoundBank, trimSoundBank } from '@/lib/audio/server/trim-sound-bank';

const CSRF = 'csrf-tok';
const BOUNDARY = '----media-midi-test';
const ENV = {
  R2_PUBLIC_URL: 'https://acct.r2.cloudflarestorage.com',
  R2_CDN_URL: 'https://cdn.example.com',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'bucket',
};
const savedEnv: Record<string, string | undefined> = {};

function multipart(file: Buffer, type: string, filename: string, context?: string) {
  return Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="cap"\r\n\r\ngood-cap\r\n` +
        (context ? `--${BOUNDARY}\r\nContent-Disposition: form-data; name="context"\r\n\r\n${context}\r\n` : '') +
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`
    ),
    file,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
}

async function upload(file: Buffer, type = 'audio/midi', filename = 'tune.mid', context?: string) {
  const body = multipart(file, type, filename, context);
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

function song(): Buffer {
  const midi = new Midi();
  const track = midi.addTrack();
  track.instrument.number = 0;
  track.addNote({ midi: 60, time: 0, duration: 1 });
  return Buffer.from(midi.toArray());
}

type Put = { Key: string; Body: Buffer; ContentType: string };

test('a song is stored with its own sound bank, and the row points at it', async () => {
  const midi = song();
  const res = await upload(midi);

  expect(res.statusCode).toBe(200);
  const puts: Put[] = send.mock.calls.map((c) => c[0].input);
  const bank = puts.find((p) => p.Key.endsWith('.sf2'));
  expect(bank).toBeDefined();
  expect(bank!.Key).toMatch(new RegExp(`^media/user-${userSeq}/\\d+\\.sf2$`));
  expect(bank!.ContentType).toBe('application/octet-stream');
  expect(isSoundBank(bank!.Body)).toBe(true);
  // Trimmed to one piano: far smaller than the 32 MB source
  expect(bank!.Body.length).toBeLessThan(3e6);

  const full = puts.find((p) => p.Key.endsWith('.mid') && !/_(thumb|medium)\./.test(p.Key));
  expect(Buffer.compare(full!.Body, midi)).toBe(0);
  expect(db.media.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ mediaType: 'midi', soundBankUrl: `https://cdn.example.com/${bank!.Key}` }),
  });
});

test('when the bank can’t be made the song still uploads (its first play makes one)', async () => {
  (trimSoundBank as jest.Mock).mockRejectedValueOnce(new Error('no bank today'));
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await upload(song());

  expect(res.statusCode).toBe(200);
  const puts: Put[] = send.mock.calls.map((c) => c[0].input);
  expect(puts.some((p) => p.Key.endsWith('.sf2'))).toBe(false);
  expect(db.media.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ mediaType: 'midi', soundBankUrl: null }),
  });
  error.mockRestore();
});

test('a photo gets no sound bank', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  const res = await upload(png, 'image/png', 'dot.png');
  expect(res.statusCode).toBe(200);
  expect(trimSoundBank).not.toHaveBeenCalled();
  expect(db.media.create).toHaveBeenCalledWith({ data: expect.objectContaining({ soundBankUrl: null }) });
});

test('a song is stored once, not three times, and never as a featured photo', async () => {
  const res = await upload(song());
  expect(res.statusCode).toBe(200);
  const puts: Put[] = send.mock.calls.map((c) => c[0].input);
  expect(puts.filter((p) => p.Key.endsWith('.mid'))).toHaveLength(1);
  const data = (db.media.create as jest.Mock).mock.calls[0][0].data;
  expect(data.thumbnailUrl).toBe(data.fullUrl);
  expect(data.mediumUrl).toBe(data.fullUrl);
  expect(data.featured).toBe(false);
  expect(data.featuredOrder).toBeNull();
  expect((res.body as { message?: string }).message).toBe('Song added.');
});

test('a MIDI with the right header but nothing playable after it is refused', async () => {
  const broken = Buffer.concat([Buffer.from('MThd'), Buffer.from([0, 0, 0, 6, 0, 1, 0, 1, 1, 224]), Buffer.from('MTrk garbage that is not a track')]);
  const res = await upload(broken);
  expect(res.statusCode).toBe(400);
  expect(res.body.error).toMatch(/broken|no notes/);
  expect(send).not.toHaveBeenCalled();
  expect(db.media.create).not.toHaveBeenCalled();
});

test('songs have their own monthly allowance, apart from photos', async () => {
  // Ten songs this month already, no photos
  (db.media.count as jest.Mock).mockImplementation(async ({ where }: { where: { mediaType?: unknown } }) =>
    where.mediaType === 'midi' ? 10 : 0
  );
  const full = await upload(song());
  expect(full.statusCode).toBe(413);
  expect(full.body.error).toBe("You can add 10 songs a month. There's room for more next month.");

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  const photo = await upload(png, 'image/png', 'dot.png');
  expect(photo.statusCode).toBe(200);
  (db.media.count as jest.Mock).mockResolvedValue(0);
});
