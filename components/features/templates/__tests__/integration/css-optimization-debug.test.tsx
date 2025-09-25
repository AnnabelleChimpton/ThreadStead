/**
 * Debug Test: CSS Optimization Pipeline
 * Purpose: Check if generateOptimizedCSS is filtering out Visual Builder theme classes
 */

import { generateOptimizedCSS } from '@/lib/utils/css/layers';
import { generateCSSFromGlobalSettings } from '@/lib/templates/visual-builder/css-class-generator';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

describe('CSS Optimization Debug', () => {
  test('generateOptimizedCSS should preserve Visual Builder theme classes', () => {
    console.log('=== DEBUG: CSS Optimization Pipeline ===');

    // Generate Visual Builder CSS (we know this works from previous test)
    const globalSettings: GlobalSettings = {
      background: { color: '#0a0e27', type: 'solid' },
      typography: { fontFamily: '"Roboto", sans-serif', baseSize: '16px', scale: 1.333 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'space',
      effects: { borderRadius: '8px', boxShadow: '0 0 50px rgba(100, 149, 237, 0.2)' }
    };

    const visualBuilderCSS = generateCSSFromGlobalSettings(globalSettings);
    console.log('Original Visual Builder CSS (first 300 chars):');
    console.log(visualBuilderCSS.css.substring(0, 300));

    // Check original CSS content
    const originalHasRoot = visualBuilderCSS.css.includes(':root');
    const originalHasThemeClass = visualBuilderCSS.css.includes('.vb-theme-space');
    const originalHasBgColor = visualBuilderCSS.css.includes('background-color: var(--global-bg-color)');

    console.log('\nOriginal CSS Analysis:');
    console.log('- Has :root:', originalHasRoot);
    console.log('- Has .vb-theme-space:', originalHasThemeClass);
    console.log('- Has background-color: var:', originalHasBgColor);

    // Pass through CSS optimization (mimicking live profile flow)
    const optimizedCSS = generateOptimizedCSS({
      cssMode: 'override',
      templateMode: 'advanced',
      siteWideCSS: '', // No site CSS for override mode
      userCustomCSS: visualBuilderCSS.css,
      profileId: 'test-profile'
    });

    console.log('\nOptimized CSS (first 300 chars):');
    console.log(optimizedCSS.substring(0, 300));

    // Check optimized CSS content
    const optimizedHasRoot = optimizedCSS.includes(':root');
    const optimizedHasThemeClass = optimizedCSS.includes('.vb-theme-space');
    const optimizedHasBgColor = optimizedCSS.includes('background-color: var(--global-bg-color)');

    console.log('\nOptimized CSS Analysis:');
    console.log('- Has :root:', optimizedHasRoot);
    console.log('- Has .vb-theme-space:', optimizedHasThemeClass);
    console.log('- Has background-color: var:', optimizedHasBgColor);

    // Compare before and after
    console.log('\nComparison:');
    if (originalHasThemeClass && !optimizedHasThemeClass) {
      console.error('❌ PROBLEM: Theme classes were LOST during optimization!');
    } else if (originalHasThemeClass && optimizedHasThemeClass) {
      console.log('✅ SUCCESS: Theme classes preserved through optimization');
    } else {
      console.warn('⚠️ WARNING: Theme classes missing from original CSS');
    }

    // Check CSS length to see if truncation is happening
    console.log(`\nCSS Length Analysis:`);
    console.log(`- Original CSS length: ${visualBuilderCSS.css.length} chars`);
    console.log(`- Optimized CSS length: ${optimizedCSS.length} chars`);

    if (optimizedCSS.length < visualBuilderCSS.css.length * 0.5) {
      console.warn('⚠️ WARNING: Optimized CSS is significantly shorter - possible truncation');
    }

    // Assertions to catch the issue
    expect(originalHasRoot).toBe(true); // Original should have :root
    expect(originalHasThemeClass).toBe(true); // Original should have theme classes
    expect(optimizedHasRoot).toBe(true); // Optimized should preserve :root
    expect(optimizedHasThemeClass).toBe(true); // Optimized should preserve theme classes

    // This assertion will fail if the optimization is stripping theme classes
    if (originalHasThemeClass) {
      expect(optimizedHasThemeClass).toBe(true);
    }
  });

  test('Check CSS cleaning/filtering behavior', () => {
    console.log('=== DEBUG: CSS Cleaning Behavior ===');

    // Create CSS with Visual Builder comments and theme classes
    const testCSS = `/* CSS_MODE:override */
/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #0a0e27;
  --global-font-family: "Roboto", sans-serif;
}

.vb-theme-space {
  background-color: var(--global-bg-color) !important;
  font-family: var(--global-font-family);
}

.vb-effect-rounded {
  border-radius: 8px;
}`;

    console.log('Test CSS Input:');
    console.log(testCSS);

    // Pass through optimization
    const optimizedCSS = generateOptimizedCSS({
      cssMode: 'override',
      templateMode: 'advanced',
      siteWideCSS: '',
      userCustomCSS: testCSS,
      profileId: 'test-profile'
    });

    console.log('\nOptimized CSS Output:');
    console.log(optimizedCSS);

    // Check what survived the optimization
    console.log('\nSurvival Analysis:');
    console.log('- CSS_MODE comment preserved:', optimizedCSS.includes('CSS_MODE'));
    console.log('- Visual Builder comment preserved:', optimizedCSS.includes('Visual Builder Generated CSS'));
    console.log('- :root block preserved:', optimizedCSS.includes(':root'));
    console.log('- --global-bg-color preserved:', optimizedCSS.includes('--global-bg-color'));
    console.log('- .vb-theme-space preserved:', optimizedCSS.includes('.vb-theme-space'));
    console.log('- background-color rule preserved:', optimizedCSS.includes('background-color: var(--global-bg-color)'));
    console.log('- !important preserved:', optimizedCSS.includes('!important'));

    // The issue might be here - check what's being filtered
    const hasThemeClass = optimizedCSS.includes('.vb-theme-space');
    expect(hasThemeClass).toBe(true);
  });
});