/**
 * Debug Test: Visual Builder CSS Generation Output
 * Purpose: Check exactly what CSS is being generated and why theme classes might be missing
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

describe('CSS Generation Debug', () => {
  test('Check exactly what CSS is being generated', () => {
    console.log('=== DEBUG: Full CSS Generation Output ===');

    // Use exact settings from user's CSS (space theme with pattern)
    const globalSettings: GlobalSettings = {
      background: {
        color: '#0a0e27',
        type: 'pattern',
        pattern: {
          type: 'stars',
          primaryColor: '#ffffff',
          secondaryColor: '#ffd700',
          size: 1,
          opacity: 0.8,
          animated: true
        }
      },
      typography: {
        fontFamily: '"Roboto", sans-serif',
        baseSize: '16px',
        scale: 1.333
      },
      spacing: {
        containerPadding: '24px',
        sectionSpacing: '32px'
      },
      theme: 'space',
      effects: {
        borderRadius: '8px',
        boxShadow: '0 0 50px rgba(100, 149, 237, 0.2)',
        animation: 'zoom'
      }
    };

    const result = generateCSSFromGlobalSettings(globalSettings);

    console.log('=== FULL CSS OUTPUT ===');
    console.log(result.css);
    console.log('\n=== END CSS OUTPUT ===');

    console.log('\n=== CLASS NAMES ===');
    console.log(result.classNames);

    console.log('\n=== CSS ANALYSIS ===');
    const cssLines = result.css.split('\n');
    let inRootBlock = false;
    let inClassBlock = false;
    let currentClass = '';
    let rootProperties = 0;
    let classBlocks = 0;

    cssLines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed === ':root {') {
        inRootBlock = true;
        console.log(`Line ${index + 1}: Starting :root block`);
      } else if (trimmed.startsWith('.vb-') && trimmed.endsWith(' {')) {
        inClassBlock = true;
        currentClass = trimmed.replace(' {', '');
        classBlocks++;
        console.log(`Line ${index + 1}: Starting class block: ${currentClass}`);
      } else if (trimmed === '}') {
        if (inRootBlock) {
          console.log(`Line ${index + 1}: Ending :root block (${rootProperties} properties)`);
          inRootBlock = false;
        } else if (inClassBlock) {
          console.log(`Line ${index + 1}: Ending class block: ${currentClass}`);
          inClassBlock = false;
          currentClass = '';
        }
      } else if (inRootBlock && trimmed.startsWith('--')) {
        rootProperties++;
      }
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total CSS lines: ${cssLines.length}`);
    console.log(`Root properties: ${rootProperties}`);
    console.log(`CSS class blocks: ${classBlocks}`);
    console.log(`Class names returned: ${result.classNames.length}`);

    // Critical checks
    console.log(`\n=== CRITICAL CHECKS ===`);
    console.log(`Contains :root: ${result.css.includes(':root')}`);
    console.log(`Contains .vb-theme-space: ${result.css.includes('.vb-theme-space')}`);
    console.log(`Contains background-color: var(: ${result.css.includes('background-color: var(')}`);
    console.log(`Contains pattern classes: ${result.css.includes('.vb-pattern-stars')}`);

    // Expectations
    expect(result.css).toContain(':root');
    expect(result.css).toContain('--global-bg-color: #0a0e27');
    expect(result.classNames).toContain('vb-theme-space');

    // The critical test - theme classes should be in CSS
    if (!result.css.includes('.vb-theme-space')) {
      console.error('❌ PROBLEM: CSS contains variables but NO theme classes!');
      console.error('This means elements will have variables but no CSS rules to apply them!');
    } else {
      console.log('✅ SUCCESS: CSS contains both variables AND theme classes');
    }
  });

  test('Compare working vs non-working CSS generation', () => {
    console.log('=== DEBUG: Simple vs Complex Settings ===');

    // Simple settings (should work)
    const simpleSettings: GlobalSettings = {
      background: { color: '#ff0000', type: 'solid' },
      typography: { fontFamily: 'Arial, sans-serif', baseSize: '16px', scale: 1.2 },
      spacing: { containerPadding: '20px', sectionSpacing: '30px' },
      theme: 'custom',
      effects: {}
    };

    const simpleResult = generateCSSFromGlobalSettings(simpleSettings);

    console.log('=== SIMPLE CSS ===');
    console.log(simpleResult.css);

    console.log('\n=== SIMPLE ANALYSIS ===');
    console.log(`Simple - Contains .vb-theme-custom: ${simpleResult.css.includes('.vb-theme-custom')}`);
    console.log(`Simple - Contains background-color: var(: ${simpleResult.css.includes('background-color: var(')}`);

    // Complex settings (user's settings)
    const complexSettings: GlobalSettings = {
      background: {
        color: '#0a0e27',
        type: 'pattern',
        pattern: {
          type: 'stars',
          primaryColor: '#ffffff',
          secondaryColor: '#ffd700',
          size: 1,
          opacity: 0.8,
          animated: true
        }
      },
      typography: { fontFamily: '"Roboto", sans-serif', baseSize: '16px', scale: 1.333 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'space',
      effects: { borderRadius: '8px', boxShadow: '0 0 50px rgba(100, 149, 237, 0.2)', animation: 'zoom' }
    };

    const complexResult = generateCSSFromGlobalSettings(complexSettings);

    console.log('\n=== COMPLEX ANALYSIS ===');
    console.log(`Complex - Contains .vb-theme-space: ${complexResult.css.includes('.vb-theme-space')}`);
    console.log(`Complex - Contains background-color: var(: ${complexResult.css.includes('background-color: var(')}`);

    // Compare
    const simpleHasClasses = simpleResult.css.includes('.vb-theme-custom');
    const complexHasClasses = complexResult.css.includes('.vb-theme-space');

    console.log(`\n=== COMPARISON ===`);
    console.log(`Simple settings generate theme classes: ${simpleHasClasses}`);
    console.log(`Complex settings generate theme classes: ${complexHasClasses}`);

    if (simpleHasClasses && !complexHasClasses) {
      console.error('❌ PROBLEM: Simple settings work but complex settings don\'t!');
      console.error('This suggests an issue with pattern/animation/effect handling in CSS generation');
    }
  });
});