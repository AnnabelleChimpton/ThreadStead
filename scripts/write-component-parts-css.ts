/**
 * Writes styles/component-parts.css from lib/templates/styling/component-parts.ts.
 * Run after changing the parts table: npx tsx scripts/write-component-parts-css.ts
 * (tests/css-pipeline/__tests__/component-parts.test.ts checks they agree).
 */
import fs from 'fs';
import path from 'path';
import { componentPartsCssFile } from '../lib/templates/styling/component-parts';

fs.writeFileSync(path.join(__dirname, '..', 'styles', 'component-parts.css'), componentPartsCssFile());
console.log('wrote styles/component-parts.css');
