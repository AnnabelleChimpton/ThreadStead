/**
 * Debug Test: Visual Builder CSS Generation
 * Purpose: Debug why theme classes are missing from CSS output
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
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

describe('Visual Builder CSS Debug', () => {
  test('Should generate both CSS variables AND theme classes', () => {
    console.log('=== DEBUG: CSS Generation ===');

    // Test with space theme (matches user's CSS)
    const globalSettings: GlobalSettings = {
      background: { color: '#0a0e27', type: 'pattern', pattern: {
        type: 'stars',
        primaryColor: '#ffffff',
        secondaryColor: '#ffd700',
        size: 1,
        opacity: 0.8,
        animated: true
      }},
      typography: { fontFamily: '"Roboto", sans-serif', baseSize: '16px', scale: 1.333 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'space',
      effects: { borderRadius: '8px', boxShadow: '0 0 50px rgba(100, 149, 237, 0.2)', animation: 'zoom' }
    };

    // Generate CSS
    const result = generateCSSFromGlobalSettings(globalSettings);

    console.log('Generated CSS (first 500 chars):');
    console.log(result.css.substring(0, 500));
    console.log('\nGenerated class names:');
    console.log(result.classNames);

    // Check CSS content
    console.log('\nCSS Content Analysis:');
    console.log('- Contains :root:', result.css.includes(':root'));
    console.log('- Contains --global-bg-color:', result.css.includes('--global-bg-color'));
    console.log('- Contains .vb-theme-space:', result.css.includes('.vb-theme-space'));
    console.log('- Contains background-color: var:', result.css.includes('background-color: var(--global-bg-color)'));
    console.log('- Contains pattern classes:', result.css.includes('vb-pattern-stars'));

    // Detailed CSS analysis
    const cssLines = result.css.split('\n');
    const themeClassLines = cssLines.filter(line => line.includes('.vb-theme-'));
    console.log('\nTheme class lines found:');
    themeClassLines.forEach((line, index) => {
      console.log(`${index + 1}: ${line.trim()}`);
    });

    // Assertions
    expect(result.css).toContain(':root'); // CSS variables present
    expect(result.css).toContain('--global-bg-color: #0a0e27'); // Background color variable
    expect(result.css).toContain('.vb-theme-space'); // Theme class present
    expect(result.css).toContain('background-color: var(--global-bg-color)'); // Theme class uses variable
    expect(result.classNames).toContain('vb-theme-space'); // Class name included

    // Check if CSS is complete
    const hasVariables = result.css.includes('--global-bg-color');
    const hasClasses = result.css.includes('.vb-theme-space');

    if (hasVariables && !hasClasses) {
      console.error('❌ PROBLEM: CSS has variables but missing theme classes!');
    } else if (!hasVariables && hasClasses) {
      console.error('❌ PROBLEM: CSS has theme classes but missing variables!');
    } else if (hasVariables && hasClasses) {
      console.log('✅ SUCCESS: CSS has both variables and theme classes');
    } else {
      console.error('❌ PROBLEM: CSS missing both variables and theme classes!');
    }
  });

  test('Debug CSS string vs CSS application', () => {
    console.log('=== DEBUG: CSS String vs Application ===');

    const globalSettings: GlobalSettings = {
      background: { color: '#cc2e2e', type: 'solid' },
      typography: { fontFamily: 'Inter, sans-serif', baseSize: '18px', scale: 1.2 },
      spacing: { containerPadding: '32px', sectionSpacing: '24px' },
      theme: 'custom',
      effects: {}
    };

    const result = generateCSSFromGlobalSettings(globalSettings);

    // Split CSS into logical sections
    const cssLines = result.css.split('\n').filter(line => line.trim());

    console.log('CSS Structure Analysis:');
    console.log(`Total lines: ${cssLines.length}`);

    let inRoot = false;
    let inThemeClass = false;
    let rootLines = 0;
    let themeClassLines = 0;

    cssLines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed === ':root {') {
        inRoot = true;
        console.log('📍 Found :root start');
      } else if (trimmed.startsWith('.vb-theme-')) {
        inThemeClass = true;
        console.log(`📍 Found theme class start: ${trimmed}`);
      } else if (trimmed === '}') {
        if (inRoot) {
          console.log(`📍 :root end (${rootLines} properties)`);
          inRoot = false;
        } else if (inThemeClass) {
          console.log(`📍 Theme class end (${themeClassLines} properties)`);
          inThemeClass = false;
        }
      } else if (inRoot && trimmed.startsWith('--')) {
        rootLines++;
      } else if (inThemeClass && trimmed.includes(':')) {
        themeClassLines++;
      }
    });

    console.log(`\nSummary:`);
    console.log(`- Root properties found: ${rootLines}`);
    console.log(`- Theme class properties found: ${themeClassLines}`);
    console.log(`- Class names: ${result.classNames.join(', ')}`);

    // Verify essential parts are present
    expect(rootLines).toBeGreaterThan(0); // Should have root properties
    expect(themeClassLines).toBeGreaterThan(0); // Should have theme class properties
    expect(result.classNames.length).toBeGreaterThan(0); // Should have class names
  });
});