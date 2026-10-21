/**
 * The sampler's audio-thread code is served from public/ (an AudioWorklet
 * module has to be a same-origin URL). It must be the exact file of the
 * installed spessasynth_lib, or the two halves of the library won't agree.
 * After upgrading spessasynth_lib, copy the new processor in under its new
 * version and point SAMPLER_PROCESSOR_URL at it.
 */
import fs from 'fs';
import path from 'path';
import { SAMPLER_PROCESSOR_URL } from '../engines/sampler';

const root = path.join(__dirname, '../../..');

test('the served processor is the installed library’s, under its version', () => {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/spessasynth_lib/package.json'), 'utf8'));
  expect(SAMPLER_PROCESSOR_URL).toBe(`/audio/spessasynth_processor-${version}.min.js`);
  const served = fs.readFileSync(path.join(root, 'public', SAMPLER_PROCESSOR_URL));
  const installed = fs.readFileSync(path.join(root, 'node_modules/spessasynth_lib/dist/spessasynth_processor.min.js'));
  expect(served.equals(installed)).toBe(true);
});
