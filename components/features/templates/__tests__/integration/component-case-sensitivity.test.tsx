/**
 * Component tags resolve case-insensitively.
 *
 * The HTML parser lowercases tag names (e.g. <ProfileHero> becomes
 * "profilehero"), so the component registry must resolve them
 * case-insensitively. Rendering them on a page is pinned by
 * tests/template-engine/__tests__/ssr-golden.test.tsx.
 */

// The component registry transitively imports the DID client, whose
// @noble/ed25519 dependency is ESM-only and cannot be parsed by jest.
jest.mock('@/lib/api/did/did-client', () => ({}));

import { componentRegistry } from '@/lib/templates/core/template-registry';

describe('Component Case Sensitivity Test', () => {
  test('registry resolves PascalCase components from lowercased tag names', () => {
    // What the HTML parser actually emits for <ProfileHero>, <SkillChart>, etc.
    expect(componentRegistry.get('profilehero')?.name).toBe('ProfileHero');
    expect(componentRegistry.get('centeredbox')?.name).toBe('CenteredBox');
    expect(componentRegistry.get('skillchart')?.name).toBe('SkillChart');
    expect(componentRegistry.get('skill')?.name).toBe('Skill');
    expect(componentRegistry.get('gridlayout')?.name).toBe('GridLayout');
  });
});
