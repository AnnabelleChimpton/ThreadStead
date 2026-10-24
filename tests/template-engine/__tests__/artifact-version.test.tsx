/**
 * @jest-environment node
 *
 * A change to what a page's artifact holds (the compiler's output, the
 * tree's shape) bumps ARTIFACT_VERSION, so a deploy's
 * `scripts/recompile-pages.ts --apply` is known to be needed. The hashes of
 * every starter and pasted page's artifact are kept with the version they
 * were taken under; refresh them with UPDATE_ARTIFACT_HASHES=1.
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null, default: () => null }))

import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { artifactFor, serializeArtifact, ARTIFACT_VERSION } from '@/lib/templates/rendering/page-artifact'
import { corpus } from '../ssr-golden-support'

const FILE = path.join(__dirname, '..', 'artifact-hashes.json')

test('the artifacts are the ones taken under this ARTIFACT_VERSION', () => {
  const hashes = Object.fromEntries(
    corpus().map(([id, source]) => [id, createHash('sha256').update(serializeArtifact(artifactFor(compileTemplateToArtifacts(source)))).digest('hex').slice(0, 16)])
  )
  if (process.env.UPDATE_ARTIFACT_HASHES) fs.writeFileSync(FILE, JSON.stringify({ version: ARTIFACT_VERSION, hashes }, null, 2) + '\n')
  const kept = JSON.parse(fs.readFileSync(FILE, 'utf8')) as { version: number; hashes: Record<string, string> }
  const changed = Object.keys(hashes).filter((id) => kept.hashes[id] !== hashes[id])
  if (changed.length && kept.version === ARTIFACT_VERSION) {
    throw new Error(
      `Artifacts changed (${changed.join(', ')}) under the same ARTIFACT_VERSION. Bump it in lib/templates/rendering/page-artifact.ts, ` +
        'then UPDATE_ARTIFACT_HASHES=1, and run scripts/recompile-pages.ts --apply on deploy.'
    )
  }
  expect({ version: kept.version, changed }).toEqual({ version: ARTIFACT_VERSION, changed: [] })
})
