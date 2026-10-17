/**
 * Writes .env.example and ENVIRONMENT_VARIABLES.md from the env specs in
 * lib/config/env.ts + public-env.ts.
 *
 *   npm run env:docs           regenerate both files
 *   npm run env:docs -- --check  exit 1 if either is out of date
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { renderEnvExample, renderEnvMarkdown } from '../lib/config/env-docs';

const root = join(__dirname, '..');
const targets: Array<[string, string]> = [
  [join(root, '.env.example'), renderEnvExample()],
  [join(root, 'ENVIRONMENT_VARIABLES.md'), renderEnvMarkdown()],
];

const check = process.argv.includes('--check');
let stale = false;

for (const [path, content] of targets) {
  let current = '';
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    // missing → stale
  }
  if (current === content) continue;
  if (check) {
    console.error(`${path} is out of date — run \`npm run env:docs\``);
    stale = true;
  } else {
    writeFileSync(path, content);
    console.log(`wrote ${path}`);
  }
}

if (stale) process.exit(1);
