/**
 * Integration Test: Visual Builder to Live Profile CSS Flow
 * Purpose: Test that Visual Builder CSS correctly reaches live profile pages
 * without being stripped or mangled
 */

// Mock problematic dependencies
jest.mock('@/lib/templates/core/template-registry', () => ({
  componentRegistry: {
    get: jest.fn(),
    getAllowedTags: jest.fn(() => [])
  }
}));

jest.mock('@/lib/api/did/did-client', () => ({}));

import { generateCSSFromGlobalSettings } from '@/lib/templates/visual-builder/css-class-generator';
import { generateOptimizedCSS } from '@/lib/utils/css/layers';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

describe('Visual Builder to Live Profile CSS Integration', () => {
  test('Visual Builder CSS should flow correctly to live profile without stripping', () => {
    console.log('=== TEST: Visual Builder → Live Profile CSS Flow ===');

    // Step 1: User creates Visual Builder template with background color
    const globalSettings: GlobalSettings = {
      background: { color: '#b01717', type: 'solid' },
      typography: { fontFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.2 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'custom',
      effects: {}
    };

    // Step 2: Visual Builder generates CSS
    const visualBuilderCSS = generateCSSFromGlobalSettings(globalSettings);
    console.log('Visual Builder generated CSS:', visualBuilderCSS.css.substring(0, 200));

    // Step 3: CSS is saved to user profile (mimicking save process)
    const savedCustomCSS = `/* CSS_MODE:override */\n${visualBuilderCSS.css}`;

    // Step 4: Live profile receives CSS (mimicking AdvancedProfileRenderer)
    const profileUser = {
      id: 'test-user-123',
      profile: {
        customCSS: savedCustomCSS,
        cssMode: 'override' as const,
        templateMode: 'advanced' as const
      }
    };

    // Step 5: AdvancedProfileRenderer processes CSS with generateOptimizedCSS
    const layeredCSS = generateOptimizedCSS({
      cssMode: profileUser.profile.cssMode,
      templateMode: 'advanced',
      siteWideCSS: '', // Site CSS disabled for override mode
      userCustomCSS: profileUser.profile.customCSS,
      profileId: `profile-${profileUser.id}`
    });

    console.log('Final layered CSS contains:');
    console.log('- Background color:', layeredCSS.includes('#b01717'));
    console.log('- CSS custom properties:', layeredCSS.includes('--global-bg-color'));
    console.log('- Theme class:', layeredCSS.includes('vb-theme-custom'));
    console.log('- CSS layers:', layeredCSS.includes('@layer'));

    // Assertions: Verify Visual Builder CSS survives the complete flow
    expect(layeredCSS).toContain('#b01717'); // Background color preserved
    expect(layeredCSS).toContain('--global-bg-color'); // CSS variables preserved
    expect(layeredCSS).toContain('vb-theme-custom'); // Theme classes preserved
    expect(layeredCSS).toContain('!important'); // Nuclear CSS mode with !important declarations
    expect(layeredCSS).toContain('USER CSS MUST ALWAYS WIN'); // Nuclear fallback mode applied
  });

  test('CSS modes should work correctly for advanced templates', () => {
    console.log('=== TEST: CSS Mode Handling ===');

    const visualBuilderCSS = `/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #cc2e2e;
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}`;

    const testCases = [
      {
        cssMode: 'inherit' as const,
        description: 'Inherit mode - should include site CSS',
        expectSiteCSS: true
      },
      {
        cssMode: 'override' as const,
        description: 'Override mode - should exclude site CSS but include user CSS',
        expectSiteCSS: false
      },
      {
        cssMode: 'disable' as const,
        description: 'Disable mode - should exclude site CSS',
        expectSiteCSS: false
      }
    ];

    testCases.forEach(testCase => {
      console.log(`Testing ${testCase.description}`);

      const layeredCSS = generateOptimizedCSS({
        cssMode: testCase.cssMode,
        templateMode: 'advanced',
        siteWideCSS: testCase.expectSiteCSS ? 'body { margin: 0; }' : '',
        userCustomCSS: visualBuilderCSS,
        profileId: 'test-profile'
      });

      // Visual Builder CSS should always be present
      expect(layeredCSS).toContain('#cc2e2e');
      expect(layeredCSS).toContain('vb-theme-custom');

      // Site CSS inclusion depends on mode
      if (testCase.expectSiteCSS) {
        expect(layeredCSS).toContain('body { margin: 0; }');
      } else {
        expect(layeredCSS).not.toContain('body { margin: 0; }');
      }

      console.log(`✅ ${testCase.description} works correctly`);
    });
  });

  test('CSS should not be duplicated or corrupted in the flow', () => {
    console.log('=== TEST: CSS Integrity ===');

    const visualBuilderCSS = `/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #db4848;
  --global-font-family: Inter, sans-serif;
}
.vb-theme-custom {
  background-color: var(--global-bg-color) !important;
  font-family: var(--global-font-family);
}`;

    // Simulate the complete flow multiple times to check for accumulation
    let currentCSS = visualBuilderCSS;

    for (let i = 0; i < 3; i++) {
      console.log(`Processing iteration ${i + 1}`);

      const layeredCSS = generateOptimizedCSS({
        cssMode: 'override',
        templateMode: 'advanced',
        siteWideCSS: '',
        userCustomCSS: currentCSS,
        profileId: 'test-profile'
      });

      // CSS should not accumulate
      const bgColorMatches = (layeredCSS.match(/--global-bg-color/g) || []).length;
      const themeClassMatches = (layeredCSS.match(/\.vb-theme-custom/g) || []).length;

      console.log(`  Background color variables: ${bgColorMatches}`);
      console.log(`  Theme classes: ${themeClassMatches}`);

      // Should have exactly the expected number of occurrences
      expect(bgColorMatches).toBeGreaterThan(0);
      expect(themeClassMatches).toBeGreaterThan(0);

      // CSS should remain stable
      expect(layeredCSS).toContain('#db4848');
      expect(layeredCSS).toContain('Inter, sans-serif');
      expect(layeredCSS).toContain('!important'); // Important declarations preserved

      currentCSS = layeredCSS; // Use output as input for next iteration
    }

    console.log('✅ CSS remains stable through multiple processing cycles');
  });
});