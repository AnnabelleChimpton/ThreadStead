/**
 * @jest-environment node
 *
 * Typed env (TECH_DEBT_AUDIT §2.2): parsing semantics must match the old
 * inline `process.env.X || 'default'` reads, boot validation must fail only
 * in production, values must never be echoed, and the generated docs + the
 * set of variables the code actually reads must not drift from the specs.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { parseEnv, type EnvVarSpec } from '../env-core';
import {
  ALL_ENV_SPECS,
  RUNTIME_ENV_VARS,
  SERVER_ENV_SPECS,
  checkEnv,
  getServerEnv,
  resetServerEnvCache,
  validateEnvAtBoot,
} from '../env';
import { PUBLIC_ENV_SPECS } from '../public-env';
import { renderEnvExample, renderEnvMarkdown } from '../env-docs';

const ROOT = join(__dirname, '..', '..', '..');

const SPECS = [
  { name: 'A_URL', kind: 'url', scope: 'server', group: 'g', description: '' },
  { name: 'A_REQ', kind: 'string', scope: 'server', group: 'g', description: '', required: 'production' },
  { name: 'A_ALWAYS', kind: 'string', scope: 'server', group: 'g', description: '', required: 'always' },
  { name: 'A_INT', kind: 'int', scope: 'server', group: 'g', description: '', default: '60' },
  { name: 'A_FLAG', kind: 'flag', scope: 'server', group: 'g', description: '' },
  { name: 'A_MODE', kind: 'enum', values: ['user', 'proxy'], scope: 'server', group: 'g', description: '', default: 'user' },
  { name: 'A_STR', kind: 'string', scope: 'server', group: 'g', description: '', default: 'fallback' },
] as const satisfies readonly EnvVarSpec[];

const ok = { A_ALWAYS: 'x' };

describe('parseEnv', () => {
  test('applies defaults like the old `|| default` reads, and treats "" as unset', () => {
    const { values, issues } = parseEnv(SPECS, { ...ok, A_INT: '', A_STR: '' });
    expect(values.A_INT).toBe(60);
    expect(values.A_STR).toBe('fallback');
    expect(values.A_FLAG).toBe(false);
    expect(values.A_MODE).toBe('user');
    expect(values.A_URL).toBeUndefined();
    expect(issues).toEqual([{ name: 'A_REQ', level: 'warning', message: 'is unset (required in production)' }]);
  });

  test('parses set values', () => {
    const { values } = parseEnv(SPECS, { ...ok, A_INT: '42', A_FLAG: 'true', A_URL: 'https://x.test/', A_MODE: 'proxy' });
    expect(values).toMatchObject({ A_INT: 42, A_FLAG: true, A_URL: 'https://x.test/', A_MODE: 'proxy' });
  });

  test('keeps a URL exactly as configured (no trailing-slash normalization — hub URIs depend on it)', () => {
    expect(parseEnv(SPECS, { ...ok, A_URL: 'https://x.test/' }).values.A_URL).toBe('https://x.test/');
  });

  test('a malformed URL is an error but the raw value is kept, so behavior is unchanged', () => {
    const raw = '"http://localhost:3000";';
    const { values, issues } = parseEnv(SPECS, { ...ok, A_URL: raw });
    expect(values.A_URL).toBe(raw);
    expect(issues).toContainEqual(expect.objectContaining({ name: 'A_URL', level: 'error' }));
  });

  test('a malformed integer is an error and falls back to the default', () => {
    const { values, issues } = parseEnv(SPECS, { ...ok, A_INT: '12abc' });
    expect(values.A_INT).toBe(60);
    expect(issues).toContainEqual(expect.objectContaining({ name: 'A_INT', level: 'error' }));
  });

  test('an unrecognized flag or enum value is only a warning and degrades like the old code', () => {
    const { values, issues } = parseEnv(SPECS, { ...ok, A_FLAG: 'TRUE', A_MODE: 'nope' });
    expect(values.A_FLAG).toBe(false); // 'TRUE' === 'true' was false before too
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.map((i) => i.name)).toEqual(expect.arrayContaining(['A_FLAG', 'A_MODE']));
  });

  test('required: always is an error everywhere; production-required only in production', () => {
    expect(parseEnv(SPECS, {}).issues).toContainEqual({ name: 'A_ALWAYS', level: 'error', message: 'is required' });
    expect(parseEnv(SPECS, ok, { production: true }).issues).toContainEqual({
      name: 'A_REQ',
      level: 'error',
      message: 'is required in production',
    });
  });

  test('issue messages never include the value', () => {
    const secret = 'super-secret-value-123';
    const { issues } = parseEnv(SPECS, { ...ok, A_URL: secret, A_INT: secret, A_FLAG: secret });
    expect(JSON.stringify(issues)).not.toContain(secret);
  });
});

describe('validateEnvAtBoot', () => {
  const good = { DATABASE_URL: 'postgresql://x', NEXT_PUBLIC_BASE_URL: 'https://site.test', CAP_JWT_SECRET: 's' };
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('passes a complete production env', () => {
    expect(() => validateEnvAtBoot({ ...good, NODE_ENV: 'production' })).not.toThrow();
  });

  test('throws in production on a missing required var, naming it', () => {
    expect(() => validateEnvAtBoot({ DATABASE_URL: 'postgresql://x', NODE_ENV: 'production' })).toThrow(
      /NEXT_PUBLIC_BASE_URL is required in production[\s\S]*CAP_JWT_SECRET/
    );
  });

  test('throws in production on a malformed URL', () => {
    expect(() =>
      validateEnvAtBoot({ ...good, NODE_ENV: 'production', R2_CDN_URL: '"https://cdn.test";' })
    ).toThrow(/R2_CDN_URL is invalid/);
  });

  test('only logs in development', () => {
    expect(() => validateEnvAtBoot({ NODE_ENV: 'development', R2_CDN_URL: 'nope' })).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL is required'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('R2_CDN_URL is invalid'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('NEXT_PUBLIC_BASE_URL is unset'));
  });

  test('checkEnv ignores script/test-only variables', () => {
    const names = checkEnv({ ...good, CHAT_RETENTION_DAYS: 'abc' }, { production: true }).map((i) => i.name);
    expect(names).not.toContain('CHAT_RETENTION_DAYS');
  });
});

describe('getServerEnv', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    resetServerEnvCache();
  });

  test('exposes typed values with the old defaults', () => {
    process.env = { ...saved, RING_HUB_TIMEOUT_MS: '', RINGHUB_USER_AUTH_MODE: '' };
    resetServerEnvCache();
    const env = getServerEnv();
    expect(env.RING_HUB_TIMEOUT_MS).toBe(15000);
    expect(env.RINGHUB_USER_AUTH_MODE).toBe('user');
    expect(env.R2_BUCKET_NAME).toBe(process.env.R2_BUCKET_NAME || 'threadstead-media');
  });
});

describe('specs', () => {
  test('names are unique and public/server are split by prefix', () => {
    const names = ALL_ENV_SPECS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const s of PUBLIC_ENV_SPECS) expect(s.name).toMatch(/^NEXT_PUBLIC_/);
    for (const s of SERVER_ENV_SPECS) expect(s.name).not.toMatch(/^NEXT_PUBLIC_/);
  });

  test('every public spec has a literal process.env read in public-env.ts (or Next will not inline it)', () => {
    const src = readFileSync(join(ROOT, 'lib/config/public-env.ts'), 'utf8');
    for (const s of PUBLIC_ENV_SPECS) expect(src).toContain(`process.env.${s.name}`);
  });

  test('generated .env.example and ENVIRONMENT_VARIABLES.md are up to date (npm run env:docs)', () => {
    expect(readFileSync(join(ROOT, '.env.example'), 'utf8')).toBe(renderEnvExample());
    expect(readFileSync(join(ROOT, 'ENVIRONMENT_VARIABLES.md'), 'utf8')).toBe(renderEnvMarkdown());
  });

  test('every env var the code reads is declared in a spec', () => {
    const declared = new Set<string>([...ALL_ENV_SPECS.map((s) => s.name), ...RUNTIME_ENV_VARS]);
    const read = new Map<string, string>();
    const scan = (path: string) => {
      if (statSync(path).isDirectory()) {
        for (const entry of readdirSync(path)) {
          if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
          scan(join(path, entry));
        }
        return;
      }
      if (!/\.(ts|tsx|js|mjs)$/.test(path)) return;
      for (const m of readFileSync(path, 'utf8').matchAll(/process\.env(?:\.|\[['"])([A-Za-z0-9_]+)/g)) {
        if (!read.has(m[1])) read.set(m[1], path.slice(ROOT.length + 1));
      }
    };
    for (const p of ['lib', 'pages', 'components', 'hooks', 'contexts', 'prisma', 'scripts', 'server.ts', 'instrumentation.ts', 'tests/federation']) {
      scan(join(ROOT, p));
    }
    const undeclared = [...read].filter(([name]) => !declared.has(name)).map(([n, f]) => `${n} (${f})`);
    expect(undeclared).toEqual([]);
  });
});
