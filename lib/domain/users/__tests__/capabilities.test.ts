/**
 * @jest-environment node
 *
 * Capability tokens (HS256 JWTs) authorize writes such as comments. The
 * module caches its secret, so each test loads a fresh copy.
 */
type Caps = typeof import('../capabilities');

function load(env: { CAP_JWT_SECRET?: string; NODE_ENV?: string } = {}): Caps {
  const saved = { CAP_JWT_SECRET: process.env.CAP_JWT_SECRET, NODE_ENV: process.env.NODE_ENV };
  const set = (k: keyof typeof saved, v: string | undefined) => {
    if (v === undefined) delete process.env[k];
    else (process.env as Record<string, string>)[k] = v;
  };
  set('CAP_JWT_SECRET', env.CAP_JWT_SECRET);
  set('NODE_ENV', env.NODE_ENV ?? 'test');
  let mod!: Caps;
  jest.isolateModules(() => {
    mod = require('../capabilities');
  });
  // The secret is resolved lazily, so keep the env in place until the test ends.
  afterEachRestore.push(() => {
    set('CAP_JWT_SECRET', saved.CAP_JWT_SECRET);
    set('NODE_ENV', saved.NODE_ENV);
  });
  return mod;
}
const afterEachRestore: Array<() => void> = [];
afterEach(() => afterEachRestore.splice(0).forEach((fn) => fn()));

describe('capability tokens', () => {
  it('round-trips subject, actions and resource', async () => {
    const caps = load({ CAP_JWT_SECRET: 'test-secret' });
    const token = await caps.mintCapability('u1', ['write:comment'], 'post:p1', 60);
    const cap = await caps.verifyCapability(token);
    expect(cap).toMatchObject({ sub: 'u1', act: ['write:comment'], res: 'post:p1' });
    expect(cap.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60);
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await load({ CAP_JWT_SECRET: 'attacker' }).mintCapability('u1', ['write:comment'], 'post:p1');
    await expect(load({ CAP_JWT_SECRET: 'real' }).verifyCapability(forged)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const caps = load({ CAP_JWT_SECRET: 'test-secret' });
    const token = await caps.mintCapability('u1', ['write:comment'], 'post:p1', -10);
    await expect(caps.verifyCapability(token)).rejects.toThrow(/exp/);
  });

  it.each([undefined, '', '   ', 'devsecret'])('refuses to run in production with secret %p', async (secret) => {
    const caps = load({ CAP_JWT_SECRET: secret, NODE_ENV: 'production' });
    await expect(caps.mintCapability('u1', ['x'], 'r')).rejects.toThrow(/CAP_JWT_SECRET/);
  });

  it('falls back to the dev secret outside production', async () => {
    const caps = load({ CAP_JWT_SECRET: undefined });
    const token = await caps.mintCapability('u1', ['x'], 'r');
    const dev = load({ CAP_JWT_SECRET: 'devsecret' });
    await expect(dev.verifyCapability(token)).resolves.toMatchObject({ sub: 'u1' });
  });
});

describe('requireAction', () => {
  it('checks the action and the resource', async () => {
    const caps = load({ CAP_JWT_SECRET: 'test-secret' });
    const guard = caps.requireAction('write:comment', (res) => res === 'post:p1');
    const good = await caps.mintCapability('u1', ['write:comment'], 'post:p1');
    await expect(guard(good)).resolves.toMatchObject({ sub: 'u1' });
    await expect(guard(await caps.mintCapability('u1', ['read'], 'post:p1'))).rejects.toThrow('missing action');
    await expect(guard(await caps.mintCapability('u1', ['write:comment'], 'post:p2'))).rejects.toThrow('bad resource');
    await expect(guard(await caps.mintCapability('', ['write:comment'], 'post:p1'))).rejects.toThrow('no subject');
  });
});

describe('classifyExternalPostId', () => {
  const caps = () => load({ CAP_JWT_SECRET: 'test-secret' });

  it('accepts only ringhub-<safe id> and derives the key server-side', () => {
    expect(caps().classifyExternalPostId('ringhub-abc_123-XYZ')).toEqual({ kind: 'external', dbId: 'ringhub-abc_123-XYZ' });
  });

  it.each([
    'abc',
    'did:plc:victim:post:x',
    '0b1c3f9e-1111-2222-3333-444455556666',
    'ringhub-',
    'ringhub-a:b',
    'ringhub-../x',
    'ringhub-' + 'a'.repeat(129),
  ])('rejects %p', (id) => {
    expect(caps().classifyExternalPostId(id)).toEqual({ kind: 'invalid' });
  });
});
