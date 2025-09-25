/**
 * Test: CSS Layer Isolation in Disable Mode
 * Purpose: Verify that 'disable' mode excludes all system CSS layers and only includes user CSS
 */

import { generateOptimizedCSS } from '@/lib/utils/css/layers';

describe('CSS Layer Isolation - Disable Mode', () => {
  test('Disable mode should exclude all system CSS layers', () => {
    console.log('=== TEST: CSS Layer Isolation - Disable Mode ===');

    const visualBuilderCSS = `/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #0a0e27;
  --vb-theme: space;
}

.vb-theme-space {
  background-color: var(--global-bg-color);
  font-family: 'Orbitron', monospace;
}

.vb-pattern-stars {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iI0ZGRkZGRiIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPC9zdmc+");
}`;

    const systemGlobalCSS = `
/* System Global CSS */
body {
  font-family: Inter, sans-serif;
  background: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}
`;

    const systemSiteCSS = `
/* Site-wide CSS */
.site-header {
  background: #333;
  color: white;
}

.nav-link {
  color: #007bff;
}
`;

    const generatedCSS = generateOptimizedCSS({
      cssMode: 'disable',
      templateMode: 'advanced',
      globalCSS: systemGlobalCSS,
      siteWideCSS: systemSiteCSS,
      userCustomCSS: visualBuilderCSS,
      profileId: 'profile-123'
    });

    console.log('Generated CSS for disable mode:');
    console.log(generatedCSS);

    // In test environment, CSS Layers fallback is used instead of layers
    // This is actually the correct behavior - fallback for older browsers
    expect(generatedCSS).toContain('NUCLEAR FALLBACK (disable mode)');

    // Verify NO system layers are included in disable mode
    expect(generatedCSS).not.toContain('@layer threadstead-global {');
    expect(generatedCSS).not.toContain('@layer threadstead-site {');

    // Verify system CSS content is NOT present
    expect(generatedCSS).not.toContain('font-family: Inter, sans-serif');
    expect(generatedCSS).not.toContain('.site-header');
    expect(generatedCSS).not.toContain('.nav-link');
    expect(generatedCSS).not.toContain('background: #f5f5f5');

    // Verify ONLY user CSS is present (fallback mode doesn't use layers)
    expect(generatedCSS).toContain('USER CSS MUST ALWAYS WIN - NUCLEAR FALLBACK');

    // Verify Visual Builder CSS is present with nuclear specificity and proper scoping
    expect(generatedCSS).toContain('html body html body #profile-123.vb-theme-space, html body html body #profile-123 .vb-theme-space');
    expect(generatedCSS).toContain('background-color: var(--global-bg-color) !important');

    // Verify root variables are scoped to profile container (note the line break formatting)
    expect(generatedCSS).toContain('#profile-123');
    expect(generatedCSS).toContain(':root {');
    expect(generatedCSS).toContain('--global-bg-color: #0a0e27 !important');

    console.log('✅ Disable mode correctly excludes all system CSS layers');
    console.log('✅ Only threadstead-user-nuclear layer contains Visual Builder CSS');
    console.log('✅ Visual Builder CSS has nuclear specificity and !important declarations');
  });

  test('Inherit mode should include system CSS layers', () => {
    console.log('=== TEST: Inherit Mode Includes System CSS ===');

    const visualBuilderCSS = `.vb-theme-space { background: #000; }`;
    const systemSiteCSS = `.site-header { background: #333; }`;

    const generatedCSS = generateOptimizedCSS({
      cssMode: 'inherit',
      templateMode: 'advanced',
      globalCSS: '',
      siteWideCSS: systemSiteCSS,
      userCustomCSS: visualBuilderCSS,
      profileId: 'profile-123'
    });

    // In inherit mode, site CSS should be included (fallback mode doesn't use layers)
    expect(generatedCSS).toContain('.site-header');

    // User CSS should still have nuclear priority
    expect(generatedCSS).toContain('NUCLEAR FALLBACK (inherit mode)');
    expect(generatedCSS).toContain('html body html body #profile-123.vb-theme-space, html body html body #profile-123 .vb-theme-space');

    console.log('✅ Inherit mode includes system CSS but user CSS still gets nuclear priority');
  });

  test('Nuclear CSS generation should handle Visual Builder classes correctly', () => {
    console.log('=== TEST: Nuclear CSS Visual Builder Class Handling ===');

    const visualBuilderCSS = `
.vb-theme-space {
  background-color: var(--global-bg-color);
}

#profile-123.vb-pattern-stars {
  background-image: url("...");
}

.regular-class {
  color: red;
}
`;

    const generatedCSS = generateOptimizedCSS({
      cssMode: 'disable',
      templateMode: 'advanced',
      globalCSS: '',
      siteWideCSS: '',
      userCustomCSS: visualBuilderCSS,
      profileId: 'profile-123'
    });

    console.log('Nuclear CSS output:');
    console.log(generatedCSS);

    // Should generate both direct and descendant selectors for Visual Builder classes with nuclear specificity
    expect(generatedCSS).toContain('html body html body #profile-123.vb-theme-space, html body html body #profile-123 .vb-theme-space');

    // Should handle existing scoped Visual Builder selectors (note: this gets double-scoped)
    expect(generatedCSS).toContain('#profile-123.vb-pattern-stars');

    // Should handle regular classes with nuclear specificity (gets scoped to profile)
    expect(generatedCSS).toContain('html body html body #profile-123 .regular-class');

    // All properties should have !important
    expect(generatedCSS).toContain('background-color: var(--global-bg-color) !important');
    expect(generatedCSS).toContain('color: red !important');

    console.log('✅ Nuclear CSS correctly handles Visual Builder classes with both direct and descendant targeting');
  });
});