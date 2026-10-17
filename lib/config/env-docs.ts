/**
 * Renders .env.example and ENVIRONMENT_VARIABLES.md from the env specs.
 * Written to disk by scripts/generate-env-docs.ts (`npm run env:docs`); a
 * unit test fails when the committed files drift from this output.
 */
import type { EnvVarSpec } from './env-core';
import { ALL_ENV_SPECS, OBSOLETE_ENV_VARS } from './env';

const GROUP_ORDER = [
  'Core',
  'Site',
  'Auth & security',
  'Email',
  'Storage (Cloudflare R2)',
  'Ring Hub & DID',
  'Rate limits',
  'ThreadRing reconciliation',
  'Feature flags',
  'External search',
  'Seed & setup scripts',
  'Tests',
];

function grouped(specs: readonly EnvVarSpec[]): Array<[string, EnvVarSpec[]]> {
  const groups = new Map<string, EnvVarSpec[]>();
  for (const spec of specs) {
    if (!groups.has(spec.group)) groups.set(spec.group, []);
    groups.get(spec.group)!.push(spec);
  }
  const rank = (g: string) => {
    const i = GROUP_ORDER.indexOf(g);
    return i === -1 ? GROUP_ORDER.length : i;
  };
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** dotenv-safe value: quote when it has spaces, quotes or #. Never a trailing `;`. */
function dotenvValue(v: string): string {
  return /[\s#'"]/.test(v) ? `"${v.replace(/"/g, '\\"')}"` : v;
}

function requiredLabel(spec: EnvVarSpec): string {
  if (spec.required === 'always') return 'required';
  if (spec.required === 'production') return 'required in production';
  return '';
}

const GENERATED_NOTE = 'Generated from lib/config/env.ts + public-env.ts by `npm run env:docs`. Edit the specs, not this file.';

export function renderEnvExample(specs: readonly EnvVarSpec[] = ALL_ENV_SPECS): string {
  const out: string[] = [
    '# ThreadStead environment variables',
    `# ${GENERATED_NOTE}`,
    '#',
    '# Copy to .env and fill in. Commented-out lines show the default the code',
    '# uses when the variable is unset. Write plain KEY=value lines — a trailing',
    '# `;` after a quoted value makes dotenv keep the quotes and the semicolon.',
    '',
  ];

  for (const [group, groupSpecs] of grouped(specs)) {
    out.push(`# ── ${group} ${'─'.repeat(Math.max(3, 70 - group.length))}`, '');
    for (const spec of groupSpecs) {
      const req = requiredLabel(spec);
      const desc = req ? `(${req}) ${spec.description}` : spec.description;
      for (const l of wrap(desc, 76)) out.push(`# ${l}`);

      const value = spec.secret ? '' : (spec.example ?? spec.default ?? '');
      const line = `${spec.name}=${value === '' ? '' : dotenvValue(value)}`;
      // Required vars and vars with a meaningful example are live lines;
      // everything else is commented out so the code default applies.
      const live = !!spec.required || (spec.example !== undefined && !spec.secret);
      out.push(live ? line : `# ${line}`, '');
    }
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function renderTable(specs: EnvVarSpec[]): string[] {
  const rows = ['| Variable | Required | Default | Description |', '|---|---|---|---|'];
  for (const s of specs) {
    const extra = s.kind === 'enum' && s.values ? ` One of: ${s.values.map((v) => `\`${v}\``).join(', ')}.` : '';
    const kind = s.kind === 'flag' ? ' `true`/`false`.' : s.kind === 'int' ? ' Integer.' : '';
    rows.push(
      `| \`${s.name}\`${s.secret ? ' 🔒' : ''} | ${requiredLabel(s) || '—'} | ${
        s.default !== undefined ? `\`${cell(s.default)}\`` : '—'
      } | ${cell(s.description + kind + extra)} |`
    );
  }
  return rows;
}

export function renderEnvMarkdown(specs: readonly EnvVarSpec[] = ALL_ENV_SPECS): string {
  const appSpecs = specs.filter((s) => s.scope === 'server' || s.scope === 'public');
  const otherSpecs = specs.filter((s) => s.scope === 'script' || s.scope === 'test');

  const out: string[] = [
    '# Environment Variables',
    '',
    `> ${GENERATED_NOTE}`,
    '',
    'Every variable the app reads, with the default the code falls back to. Start from `.env.example` (`cp .env.example .env`).',
    '',
    '- **Validation.** `instrumentation.ts` checks the environment on server start. In production a missing required variable, or a URL/integer that does not parse, stops the server with a list of what to fix; in development the same list is printed and the server keeps going. Run `npm run env:check` to apply the production rules to your current environment. Values are never printed.',
    '- **Reading them in code.** Server code: `getServerEnv()` from `lib/config/env.ts`. Client or shared code: `publicEnv` from `lib/config/public-env.ts`. The site URL: `getSiteBaseUrl()` from `lib/config/site-url.ts`.',
    '- **`NEXT_PUBLIC_*`** values are baked into the browser bundle at build time — rebuild after changing them, and never put a secret in one. 🔒 marks secrets.',
    '',
    '## Where the branding shows up',
    '',
    '```',
    '┌─────────────────────────────────────────┐',
    '│  [NEXT_PUBLIC_SITE_TITLE]               │  ← Header (top of every page)',
    '├─────────────────────────────────────────┤',
    '│  Welcome alice@[SITE_HANDLE_DOMAIN]!    │  ← User handles throughout site',
    '│                                         │',
    '│  Profile: [SEED_USER_DISPLAY_NAME]      │  ← Seed user (npm run seed)',
    '│  Bio: [SEED_USER_BIO]                   │',
    '│                                         │',
    '│  Username signup:                       │',
    '│  yourname@[NEXT_PUBLIC_SITE_HANDLE_DOMAIN] ← Signup form (client-side copy)',
    '└─────────────────────────────────────────┘',
    '```',
    '',
    'Unset, the branding falls back to "YourSiteHere". Set `SITE_HANDLE_DOMAIN` and `NEXT_PUBLIC_SITE_HANDLE_DOMAIN` to the same short value, and change the seed values before seeding — they are copied into the database, not read live.',
    '',
  ];

  for (const [group, groupSpecs] of grouped(appSpecs)) {
    out.push(`## ${group}`, '', ...renderTable(groupSpecs), '');
  }

  out.push('## Scripts and tests', '', 'Read only by `scripts/`, `prisma/seed.ts` or the federation test harness — not checked at app start.', '');
  for (const [group, groupSpecs] of grouped(otherSpecs)) {
    out.push(`### ${group}`, '', ...renderTable(groupSpecs), '');
  }

  out.push(
    '## Names nothing reads',
    '',
    'These appear in older docs or `.env` files. Setting them does nothing.',
    '',
    '| Variable | Note |',
    '|---|---|',
    ...OBSOLETE_ENV_VARS.map((o) => `| \`${o.name}\` | ${cell(o.note)} |`),
    '',
    '## Example: a small community',
    '',
    '```bash',
    'NEXT_PUBLIC_BASE_URL=https://retrospace.example',
    'NEXT_PUBLIC_SITE_TITLE="RetroSpace Community"',
    'SITE_HANDLE_DOMAIN=RetroSpace',
    'NEXT_PUBLIC_SITE_HANDLE_DOMAIN=RetroSpace',
    'SEED_USER_HANDLE=admin',
    'SEED_USER_DISPLAY_NAME="Community Manager"',
    '```',
    '',
    'Users get handles like `alice@RetroSpace` and the header reads "RetroSpace Community".',
    ''
  );

  return out.join('\n');
}
