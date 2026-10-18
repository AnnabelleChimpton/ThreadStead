/**
 * @jest-environment node
 *
 * User identity derivation. Every value here is part of a user's identity on
 * RingHub: if one changes, every existing user gets a new DID and is locked
 * out of their rings. The golden values are frozen on purpose — a failing
 * test here means "you are about to re-key every user", not "update the
 * snapshot".
 */
import * as ed from '@noble/ed25519';

const mockUserDID = { findUnique: jest.fn(), upsert: jest.fn() };
// Getter: jest.mock is hoisted above the const, so read it lazily.
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    get userDID() {
      return mockUserDID;
    },
  },
}));

import {
  computeUserHash,
  decryptUserSecretKey,
  encryptUserSecretKey,
  generateDIDDocument,
  generateUserDIDDocument,
  getOrCreateUserDID,
  publicKeyToMultibase,
  signMessageAsUser,
} from '../server-did-client';
import { fromBase64Url } from '@/lib/utils/encoding/base64url';

// RFC 8032 §7.1 test vector 1 (Ed25519).
const RFC_SECRET_B64URL = 'nWGxne_9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A';
const RFC_PUBLIC_B64URL = '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo';
// The same key as a did:key-style multibase (also the did:key spec's example).
const RFC_PUBLIC_MULTIBASE = 'z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw';

const ENV_KEYS = [
  'THREADSTEAD_DID_SALT',
  'THREADSTEAD_DID',
  'THREADSTEAD_PUBLIC_KEY_MULTIBASE',
  'THREADSTEAD_PRIVATE_KEY_B64URL',
  'THREADSTEAD_KEY_ENCRYPTION_KEY',
  'NEXT_PUBLIC_BASE_URL',
  'SITE_HANDLE_DOMAIN',
  'NODE_ENV',
] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  for (const key of ENV_KEYS) if (key !== 'NODE_ENV') delete process.env[key];
  mockUserDID.findUnique.mockReset();
  mockUserDID.upsert.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else (process.env as Record<string, string>)[key] = savedEnv[key]!;
  }
  jest.restoreAllMocks();
});

describe('computeUserHash (FROZEN)', () => {
  it('hashes userId + salt, first 16 hex chars of sha256', () => {
    process.env.THREADSTEAD_DID_SALT = 'pepper';
    expect(computeUserHash('user_123')).toBe('df28a1795440d1df');
  });

  it('with no salt set, hashes userId + the literal string "undefined" (historical bug, kept)', () => {
    expect(computeUserHash('user_123')).toBe('892fca9ff20a0fef');
  });

  it('never falls back to "default-salt" (that branch was always dead)', () => {
    expect(computeUserHash('user_123')).not.toBe('4cd23bfe063093f7');
  });

  it('is deterministic and differs per user', () => {
    process.env.THREADSTEAD_DID_SALT = 'pepper';
    expect(computeUserHash('a')).toBe(computeUserHash('a'));
    expect(computeUserHash('a')).not.toBe(computeUserHash('b'));
    expect(computeUserHash('a')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('publicKeyToMultibase', () => {
  it('encodes an Ed25519 key as z + base58btc(0xed01 + key)', () => {
    expect(publicKeyToMultibase(RFC_PUBLIC_B64URL)).toBe(RFC_PUBLIC_MULTIBASE);
  });
});

describe('getOrCreateUserDID', () => {
  const row = (over: Partial<Record<string, unknown>> = {}) => ({
    userId: 'u1',
    did: 'did:web:example.com:users:abc',
    userHash: 'abc',
    publicKeyMultibase: RFC_PUBLIC_B64URL,
    secretKeyEncrypted: 'plain:' + RFC_SECRET_B64URL,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...over,
  });

  it('returns an existing row exactly and never mints', async () => {
    mockUserDID.findUnique.mockResolvedValue(row());
    const mapping = await getOrCreateUserDID('u1');
    expect(mapping).toEqual({
      userId: 'u1',
      did: 'did:web:example.com:users:abc',
      userHash: 'abc',
      publicKey: RFC_PUBLIC_B64URL,
      secretKey: RFC_SECRET_B64URL,
      created: '2025-01-01T00:00:00.000Z',
    });
    expect(mockUserDID.upsert).not.toHaveBeenCalled();
  });

  it('throws (and never mints) when the DB read fails', async () => {
    mockUserDID.findUnique.mockRejectedValue(new Error('connection reset'));
    await expect(getOrCreateUserDID('u1')).rejects.toThrow(/FATAL.*Refusing to mint/);
    expect(mockUserDID.upsert).not.toHaveBeenCalled();
  });

  async function mintFor(userId: string) {
    mockUserDID.findUnique.mockResolvedValue(null);
    mockUserDID.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) =>
      row({ ...create, createdAt: new Date() })
    );
    return getOrCreateUserDID(userId);
  }

  it('percent-encodes the port: did:web:localhost%3A3000:users:<hash>', async () => {
    process.env.THREADSTEAD_DID = 'did:web:localhost%3A3000';
    process.env.THREADSTEAD_DID_SALT = 'pepper';
    const mapping = await mintFor('user_123');
    expect(mapping.did).toBe('did:web:localhost%3A3000:users:df28a1795440d1df');
    expect(mapping.userHash).toBe('df28a1795440d1df');
  });

  it('falls back to SITE_HANDLE_DOMAIN, then localhost:3000', async () => {
    process.env.SITE_HANDLE_DOMAIN = 'Example.COM';
    expect((await mintFor('u')).did).toMatch(/^did:web:example\.com:users:[0-9a-f]{16}$/);
    delete process.env.SITE_HANDLE_DOMAIN;
    expect((await mintFor('u')).did).toMatch(/^did:web:localhost%3A3000:users:[0-9a-f]{16}$/);
  });

  it('mints a working Ed25519 keypair and never overwrites a concurrent winner', async () => {
    const mapping = await mintFor('u1');
    const upsertArgs = mockUserDID.upsert.mock.calls[0][0];
    expect(upsertArgs.update).toEqual({});
    const derived = await ed.getPublicKeyAsync(fromBase64Url(mapping.secretKey));
    expect(Buffer.from(derived).toString('base64url')).toBe(mapping.publicKey);
  });

  it('signs as the user with the stored key', async () => {
    mockUserDID.findUnique.mockResolvedValue(row());
    const sig = await signMessageAsUser('u1', 'hello');
    const ok = await ed.verifyAsync(fromBase64Url(sig), new TextEncoder().encode('hello'), fromBase64Url(RFC_PUBLIC_B64URL));
    expect(ok).toBe(true);
  });
});

describe('user secret-key storage', () => {
  it('stores plaintext with a prefix outside production', () => {
    expect(encryptUserSecretKey('secret')).toBe('plain:secret');
    expect(decryptUserSecretKey('plain:secret')).toBe('secret');
  });

  it('encrypts in production with a key, and round-trips', () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = 'k'.repeat(32);
    const stored = encryptUserSecretKey('secret');
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('secret');
    expect(decryptUserSecretKey(stored)).toBe('secret');
  });

  it('a row written in production still decrypts after NODE_ENV changes', () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = 'k'.repeat(32);
    const stored = encryptUserSecretKey('secret');
    (process.env as Record<string, string>).NODE_ENV = 'test';
    expect(decryptUserSecretKey(stored)).toBe('secret');
  });

  it('refuses to decrypt with the wrong key (GCM auth)', () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = 'k'.repeat(32);
    const stored = encryptUserSecretKey('secret');
    process.env.THREADSTEAD_KEY_ENCRYPTION_KEY = 'x'.repeat(32);
    expect(() => decryptUserSecretKey(stored)).toThrow();
  });

  it('treats un-prefixed legacy values as plaintext', () => {
    expect(decryptUserSecretKey(RFC_SECRET_B64URL)).toBe(RFC_SECRET_B64URL);
  });
});

describe('server DID document', () => {
  it('derives the published key from the signing key, matching the explicit multibase', async () => {
    process.env.THREADSTEAD_DID = 'did:web:localhost%3A3000';
    process.env.THREADSTEAD_PRIVATE_KEY_B64URL = RFC_SECRET_B64URL;
    const fromPrivate = await generateDIDDocument();

    delete process.env.THREADSTEAD_PRIVATE_KEY_B64URL;
    process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE = RFC_PUBLIC_MULTIBASE;
    const fromPublic = await generateDIDDocument();

    expect(fromPrivate.verificationMethod[0].publicKeyMultibase).toBe(RFC_PUBLIC_MULTIBASE);
    expect(fromPublic.verificationMethod).toEqual(fromPrivate.verificationMethod);
    expect(fromPrivate.id).toBe('did:web:localhost%3A3000');
    expect(fromPrivate.authentication).toEqual(['did:web:localhost%3A3000#key-1']);
  });

  it('rejects a multibase that is not an Ed25519 key', async () => {
    process.env.THREADSTEAD_DID = 'did:web:example.com';
    process.env.THREADSTEAD_PUBLIC_KEY_MULTIBASE = 'm' + RFC_PUBLIC_MULTIBASE.slice(1);
    await expect(generateDIDDocument()).rejects.toThrow(/multibase/);
  });
});

describe('user DID document', () => {
  it('decodes the port back out of the DID for the profile URL', async () => {
    const userDb = {
      handle: { findFirst: jest.fn().mockResolvedValue({ handle: 'alice' }) },
      profile: { findUnique: jest.fn().mockResolvedValue(null) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const doc = await generateUserDIDDocument(
      {
        userId: 'u1',
        did: 'did:web:localhost%3A3000:users:abc',
        userHash: 'abc',
        publicKey: RFC_PUBLIC_B64URL,
        secretKey: RFC_SECRET_B64URL,
        created: '2025-01-01T00:00:00.000Z',
      },
      userDb
    );
    expect(doc.id).toBe('did:web:localhost%3A3000:users:abc');
    expect(doc.verificationMethod[0].publicKeyMultibase).toBe(RFC_PUBLIC_MULTIBASE);
    expect(JSON.stringify(doc)).toContain('https://localhost:3000/resident/alice');
  });
});
