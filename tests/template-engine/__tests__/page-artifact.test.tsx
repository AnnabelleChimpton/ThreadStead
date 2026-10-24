/**
 * @jest-environment node
 *
 * A page's artifact (Profile.pageArtifact, lib/templates/rendering/page-artifact.ts)
 * renders exactly what its old stored compile result did, for owner and
 * visitor, over every starter and pasted page; and a page nested past where
 * the old jsonb copy failed to save goes through as text.
 */
jest.mock('@noble/ed25519', () => ({
  getPublicKey: jest.fn(),
  getPublicKeyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
  utils: {},
  etc: {},
}))
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null, default: () => null }))

import { compileTemplateToArtifacts } from '@/lib/templates/compilation/compile-pipeline'
import { pageForRender } from '@/lib/templates/rendering/page-tree-server'
import { artifactFor, parseArtifact, serializeArtifact, ARTIFACT_VERSION } from '@/lib/templates/rendering/page-artifact'
import { corpus } from '../ssr-golden-support'

const stored = (source: string) => {
  const compiled = compileTemplateToArtifacts(source)
  return { old: JSON.parse(JSON.stringify(compiled)), artifact: parseArtifact(serializeArtifact(artifactFor(compiled))) }
}

describe.each([...corpus(), ['owner and visitor sides', '<IfOwner><p>mine <Guestbook /></p></IfOwner><IfVisitor><p>yours</p></IfVisitor><p>both</p>']])(
  '%s',
  (_id, source) => {
    const { old, artifact } = stored(source)
    test.each([true, false])('renders as the old copy did (owner: %s)', (isOwner) => {
      expect(artifact).not.toBeNull()
      expect(pageForRender(artifact, { isOwner })).toEqual(pageForRender(old, { isOwner }))
    })
  }
)

test('a page nested 250 deep (the old copy failed past ~57) serializes, parses and renders', () => {
  const source = '<div>'.repeat(250) + 'deep' + '</div>'.repeat(250)
  const artifact = parseArtifact(serializeArtifact(artifactFor(compileTemplateToArtifacts(source))))
  expect(artifact?.v).toBe(ARTIFACT_VERSION)
  expect(JSON.stringify(pageForRender(artifact))).toContain('deep')
})

test('anything else stored there is no artifact', () => {
  for (const text of [null, '', 'not json', '{"tree":[]}', '{"v":1,"tree":"x","islands":[]}']) expect(parseArtifact(text)).toBeNull()
})
