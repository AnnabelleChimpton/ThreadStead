/**
 * `npm run env:check` — validate the current environment (.env files plus the
 * shell) with the PRODUCTION rules used at boot. Prints names, never values.
 * Run it against production config before deploying.
 */
import { loadEnvConfig } from '@next/env';
import { checkEnv } from '../lib/config/env';
import { formatIssues } from '../lib/config/env-core';

loadEnvConfig(process.cwd());

const issues = checkEnv(process.env, { production: true });
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

if (warnings.length) console.warn(`Warnings:\n${formatIssues(warnings)}`);
if (errors.length) {
  console.error(`Errors (production boot would fail):\n${formatIssues(errors)}`);
  process.exit(1);
}
console.log(warnings.length ? 'No errors.' : 'Environment OK.');
