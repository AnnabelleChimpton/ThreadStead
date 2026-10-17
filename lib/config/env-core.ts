/**
 * Shared machinery for the typed env modules. Pure: never reads process.env
 * itself, so both lib/config/env.ts (server) and lib/config/public-env.ts
 * (client-safe) can build on it, and tests can feed it any source object.
 *
 * Each variable is declared once as an EnvVarSpec. The spec drives three
 * things: the zod schema, the typed value, and the generated docs
 * (.env.example + ENVIRONMENT_VARIABLES.md via `npm run env:docs`).
 */
import { z } from 'zod';

export type EnvKind =
  /** Free-form string. */
  | 'string'
  /** Absolute http(s) URL. */
  | 'url'
  /** Integer (parsed like the old `parseInt(x || 'default')`). */
  | 'int'
  /** Boolean read as `=== 'true'`, matching every existing call site. */
  | 'flag'
  /** One of `values`. */
  | 'enum';

export type EnvScope =
  /** Read by the running app on the server. */
  | 'server'
  /** NEXT_PUBLIC_*: inlined into the client bundle at build time. */
  | 'public'
  /** Only read by scripts/, prisma/seed.ts or server.js. */
  | 'script'
  /** Only read by the test harness. */
  | 'test';

export interface EnvVarSpec {
  name: string;
  kind: EnvKind;
  scope: EnvScope;
  /** Section heading in the generated docs. */
  group: string;
  description: string;
  /** The fallback the code uses when unset (documented; also applied for int/flag). */
  default?: string;
  /** Value written to .env.example. Defaults to `default`, else empty. */
  example?: string;
  /** For kind 'enum'. */
  values?: readonly string[];
  /** Never echo the value; .env.example gets an empty placeholder. */
  secret?: boolean;
  /**
   * 'always': boot fails without it. 'production': boot fails without it when
   * NODE_ENV=production, and warns in development.
   */
  required?: 'always' | 'production';
}

type ValueOf<S extends EnvVarSpec> = S['kind'] extends 'flag'
  ? boolean
  : S extends { default: string }
    ? S['kind'] extends 'int'
      ? number
      : S extends { values: readonly (infer V)[] }
        ? V
        : string
    : S['kind'] extends 'int'
      ? number | undefined
      : S extends { values: readonly (infer V)[] }
        ? V | undefined
        : string | undefined;

export type EnvValues<T extends readonly EnvVarSpec[]> = {
  [S in T[number] as S['name']]: ValueOf<S>;
};

/** The old code treats '' exactly like unset (`process.env[name] || fallback`). */
const blankToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** The zod schema for one variable (unset → default or undefined). */
export function schemaFor(spec: EnvVarSpec): z.ZodType {
  let base: z.ZodType;
  switch (spec.kind) {
    case 'int':
      base = z
        .string()
        .regex(/^-?\d+$/, 'must be an integer')
        .transform((v) => parseInt(v, 10));
      break;
    case 'flag':
      base = z.enum(['true', 'false']).transform((v) => v === 'true');
      break;
    case 'url':
      base = z.string().refine(isHttpUrl, 'must be an absolute http(s) URL');
      break;
    case 'enum':
      base = z.enum(spec.values as [string, ...string[]]);
      break;
    default:
      base = z.string();
  }

  // An unset flag is false, same as `undefined === 'true'`.
  const fallback =
    spec.kind === 'flag'
      ? spec.default === 'true'
      : spec.default === undefined
        ? undefined
        : spec.kind === 'int'
          ? parseInt(spec.default, 10)
          : spec.default;

  return z.preprocess(
    blankToUndefined,
    fallback === undefined ? base.optional() : base.optional().transform((v) => v ?? fallback)
  );
}

export interface EnvIssue {
  name: string;
  /** 'error' fails boot; 'warning' is logged. */
  level: 'error' | 'warning';
  message: string;
}

export interface ParseResult<T> {
  values: T;
  issues: EnvIssue[];
}

/**
 * Parse every spec against `source`. Never throws: a value that fails its
 * schema is reported as an issue and the variable falls back to what the old
 * code did with it — the raw string for string/url/enum kinds (so a quirky
 * value keeps working exactly as before), and the default for int/flag kinds
 * (`'yes' === 'true'` is false, so false/the default is the honest
 * stand-in). Boot validation decides whether issues are fatal.
 */
export function parseEnv<T extends readonly EnvVarSpec[]>(
  specs: T,
  source: Record<string, string | undefined>,
  opts: { production?: boolean } = {}
): ParseResult<EnvValues<T>> {
  const values: Record<string, unknown> = {};
  const issues: EnvIssue[] = [];

  for (const spec of specs) {
    const raw = blankToUndefined(source[spec.name]) as string | undefined;

    if (raw === undefined && spec.required) {
      const fatal = spec.required === 'always' || opts.production;
      issues.push({
        name: spec.name,
        level: fatal ? 'error' : 'warning',
        message:
          spec.required === 'always'
            ? 'is required'
            : opts.production
              ? 'is required in production'
              : 'is unset (required in production)',
      });
    }

    const result = schemaFor(spec).safeParse(raw);
    if (result.success) {
      values[spec.name] = result.data;
      continue;
    }

    const message = `is invalid: ${result.error.issues[0]?.message ?? 'bad value'}`;
    // Flags and enums already degrade safely in the old code (unknown value →
    // false / the safe mode), so a typo there is a warning; a malformed URL or
    // integer breaks things at runtime, so it fails boot.
    const level = spec.kind === 'flag' || spec.kind === 'enum' ? 'warning' : 'error';
    issues.push({ name: spec.name, level, message });
    values[spec.name] =
      spec.kind === 'string' || spec.kind === 'url' || spec.kind === 'enum'
        ? raw
        : schemaFor({ ...spec, required: undefined }).parse(undefined);
  }

  return { values: values as EnvValues<T>, issues };
}

/** Human-readable one-liner per issue, never including the value. */
export function formatIssues(issues: EnvIssue[]): string {
  return issues.map((i) => `  - ${i.name} ${i.message}`).join('\n');
}
