/**
 * @jest-environment node
 *
 * lib/storage/r2 (TECH_DEBT_AUDIT §2.3): one S3 client from the typed env,
 * one public-URL resolution order, and deletes that log every failure
 * instead of swallowing it.
 */
const send = jest.fn();
const clientConfigs: unknown[] = [];

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation((config: unknown) => {
    clientConfigs.push(config);
    return { send };
  }),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ kind: 'put', input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ kind: 'delete', input })),
}));

import { resetServerEnvCache } from '@/lib/config/env';
import {
  deleteObjects,
  keyFromPublicUrl,
  publicUrl,
  putObject,
  resetStorageClient,
} from '@/lib/storage/r2';

const R2_VARS = [
  'R2_PUBLIC_URL',
  'R2_CDN_URL',
  'NEXT_PUBLIC_R2_CDN_URL',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_LOCAL_DIR',
] as const;
const saved: Record<string, string | undefined> = {};

function setEnv(vars: Partial<Record<(typeof R2_VARS)[number], string>>) {
  for (const name of R2_VARS) delete process.env[name];
  Object.assign(process.env, vars);
  resetServerEnvCache();
  resetStorageClient();
}

const CONFIGURED = {
  R2_PUBLIC_URL: 'https://acct.r2.cloudflarestorage.com',
  R2_CDN_URL: 'https://cdn.example.com',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'bucket',
};

let errorSpy: jest.SpyInstance;

beforeAll(() => {
  for (const name of R2_VARS) saved[name] = process.env[name];
});
afterAll(() => {
  setEnv({});
  for (const name of R2_VARS) if (saved[name] !== undefined) process.env[name] = saved[name];
  resetServerEnvCache();
});
beforeEach(() => {
  send.mockReset();
  clientConfigs.length = 0;
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  setEnv(CONFIGURED);
});
afterEach(() => errorSpy.mockRestore());

describe('putObject', () => {
  test('uploads with the bucket, content type and a year of cache, and returns the CDN URL', async () => {
    send.mockResolvedValue({});
    const url = await putObject({ key: 'media/u1/1_full.jpg', body: Buffer.from('x'), contentType: 'image/jpeg' });

    expect(url).toBe('https://cdn.example.com/media/u1/1_full.jpg');
    expect(send).toHaveBeenCalledWith({
      kind: 'put',
      input: {
        Bucket: 'bucket',
        Key: 'media/u1/1_full.jpg',
        Body: Buffer.from('x'),
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
      },
    });
  });

  test('builds one client, pointed at the R2 endpoint', async () => {
    send.mockResolvedValue({});
    await putObject({ key: 'a', body: Buffer.from(''), contentType: 'image/png' });
    await putObject({ key: 'b', body: Buffer.from(''), contentType: 'image/png' });

    expect(clientConfigs).toEqual([
      {
        region: 'auto',
        endpoint: 'https://acct.r2.cloudflarestorage.com',
        credentials: { accessKeyId: 'key', secretAccessKey: 'secret' },
        forcePathStyle: false,
      },
    ]);
  });

  test('throws the old "Missing required environment variable" error when unconfigured', async () => {
    setEnv({ R2_CDN_URL: 'https://cdn.example.com' });
    await expect(
      putObject({ key: 'a', body: Buffer.from(''), contentType: 'image/png' })
    ).rejects.toThrow('Missing required environment variable: R2_PUBLIC_URL');
    expect(send).not.toHaveBeenCalled();
  });

  test('bucket falls back to threadstead-media', async () => {
    const { R2_BUCKET_NAME: _omit, ...rest } = CONFIGURED;
    setEnv(rest);
    send.mockResolvedValue({});
    await putObject({ key: 'a', body: Buffer.from(''), contentType: 'image/png' });
    expect(send.mock.calls[0][0].input.Bucket).toBe('threadstead-media');
  });

  test('upload errors propagate', async () => {
    send.mockRejectedValue(new Error('boom'));
    await expect(putObject({ key: 'a', body: Buffer.from(''), contentType: 'image/png' })).rejects.toThrow('boom');
  });
});

describe('publicUrl resolution order', () => {
  test('R2_CDN_URL first', () => {
    setEnv({ ...CONFIGURED, NEXT_PUBLIC_R2_CDN_URL: 'https://public.example.com' });
    expect(publicUrl('k.png')).toBe('https://cdn.example.com/k.png');
  });

  test('then NEXT_PUBLIC_R2_CDN_URL', () => {
    const { R2_CDN_URL: _omit, ...rest } = CONFIGURED;
    setEnv({ ...rest, NEXT_PUBLIC_R2_CDN_URL: 'https://public.example.com' });
    expect(publicUrl('k.png')).toBe('https://public.example.com/k.png');
  });

  test('then the R2 endpoint as a last resort', () => {
    const { R2_CDN_URL: _omit, ...rest } = CONFIGURED;
    setEnv(rest);
    expect(publicUrl('k.png')).toBe('https://acct.r2.cloudflarestorage.com/k.png');
  });

  test('a trailing slash on the origin does not double up', () => {
    setEnv({ ...CONFIGURED, R2_CDN_URL: 'https://cdn.example.com/' });
    expect(publicUrl('k.png')).toBe('https://cdn.example.com/k.png');
  });
});

describe('keyFromPublicUrl', () => {
  test('reverses publicUrl', () => {
    expect(keyFromPublicUrl(publicUrl('media/u1/1_thumb.jpg'))).toBe('media/u1/1_thumb.jpg');
  });

  test('accepts URLs stored under any configured origin', () => {
    expect(keyFromPublicUrl('https://acct.r2.cloudflarestorage.com/badges/x.png')).toBe('badges/x.png');
  });

  test('tolerates a double slash from an origin once set with a trailing slash', () => {
    expect(keyFromPublicUrl('https://cdn.example.com//media/a.jpg')).toBe('media/a.jpg');
  });

  test('null for foreign URLs and look-alike hosts', () => {
    expect(keyFromPublicUrl('https://elsewhere.com/media/a.jpg')).toBeNull();
    expect(keyFromPublicUrl('https://cdn.example.com.evil.com/media/a.jpg')).toBeNull();
  });
});

describe('deleteObjects', () => {
  test('deletes each key and reports them', async () => {
    send.mockResolvedValue({});
    const result = await deleteObjects(['a', 'b']);
    expect(result).toEqual({ deleted: ['a', 'b'], failed: [] });
    expect(send.mock.calls.map((c) => c[0])).toEqual([
      { kind: 'delete', input: { Bucket: 'bucket', Key: 'a' } },
      { kind: 'delete', input: { Bucket: 'bucket', Key: 'b' } },
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('a failed delete is logged with its context and returned, and the rest still run', async () => {
    send.mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce({});
    const result = await deleteObjects(['a', 'b'], { context: 'media:m1' });

    expect(result).toEqual({ deleted: ['b'], failed: ['a'] });
    expect(errorSpy).toHaveBeenCalledWith('[media:m1] Failed to delete a from R2:', expect.any(Error));
    expect(errorSpy).toHaveBeenCalledWith('[media:m1] 1/2 R2 objects orphaned: a');
  });

  test('unconfigured storage is logged, not thrown', async () => {
    setEnv({});
    const result = await deleteObjects(['a'], { context: 'x' });
    expect(result).toEqual({ deleted: [], failed: ['a'] });
    expect(errorSpy).toHaveBeenCalledWith('[x] Cannot delete 1 R2 object(s):', expect.any(Error));
  });

  test('no keys, no client', async () => {
    setEnv({});
    expect(await deleteObjects([])).toEqual({ deleted: [], failed: [] });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('R2_LOCAL_DIR (development stand-in for the bucket)', () => {
  const fs = jest.requireActual('fs') as typeof import('fs');
  const path = jest.requireActual('path') as typeof import('path');
  const folder = `_local-r2-test-${process.pid}`;
  const root = path.join(process.cwd(), 'public', folder);
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test('writes under public/<folder>, serves from /<folder>, deletes there, never calls S3', async () => {
    setEnv({ ...CONFIGURED, R2_LOCAL_DIR: folder });
    send.mockClear();
    const url = await putObject({ key: 'pixel-homes/decorations/a.v1.png', body: Buffer.from('png'), contentType: 'image/png' });
    expect(url).toBe(`/${folder}/pixel-homes/decorations/a.v1.png`);
    expect(fs.readFileSync(path.join(root, 'pixel-homes/decorations/a.v1.png'), 'utf8')).toBe('png');
    expect(keyFromPublicUrl(url)).toBe('pixel-homes/decorations/a.v1.png');
    expect(await deleteObjects(['pixel-homes/decorations/a.v1.png'])).toEqual({ deleted: ['pixel-homes/decorations/a.v1.png'], failed: [] });
    expect(fs.existsSync(path.join(root, 'pixel-homes/decorations/a.v1.png'))).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  test('refuses keys that climb out of the folder', async () => {
    setEnv({ ...CONFIGURED, R2_LOCAL_DIR: folder });
    await expect(putObject({ key: '../../evil.png', body: Buffer.from(''), contentType: 'image/png' })).rejects.toThrow(/Refusing/);
  });

  test('is ignored in production', async () => {
    const env = process.env as Record<string, string | undefined>;
    const before = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      setEnv({ ...CONFIGURED, R2_LOCAL_DIR: folder });
      expect(publicUrl('k.png')).toBe('https://cdn.example.com/k.png');
    } finally {
      env.NODE_ENV = before;
    }
  });
});
