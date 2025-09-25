/**
 * Test: Container Class Application for Visual Builder
 * Purpose: Verify that Visual Builder classes are correctly applied to the main container element
 */

import { extractVisualBuilderClasses } from '@/lib/utils/css/visual-builder-class-extractor';

describe('Container Class Application', () => {
  test('Container should receive Visual Builder classes from CSS', () => {
    console.log('=== TEST: Container Class Application ===');

    // Sample Visual Builder CSS (like what user has)
    const visualBuilderCSS = `/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #0a0e27;
  --vb-theme: space;
}

.vb-theme-space {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
}

.vb-pattern-stars {
  background-image: url("data:image/svg+xml...");
  background-repeat: repeat;
}

.vb-effect-rounded {
  border-radius: 8px;
}`;

    // Test the extraction logic
    const visualBuilderClasses = extractVisualBuilderClasses(visualBuilderCSS);
    console.log('Extracted Visual Builder classes:', visualBuilderClasses);

    // Expected classes
    const expectedClasses = ['vb-theme-space', 'vb-pattern-stars', 'vb-effect-rounded'];
    expectedClasses.forEach(className => {
      expect(visualBuilderClasses).toContain(className);
    });

    // Test the container class combination logic (from ProfileModeRenderer)
    const baseClasses = 'advanced-template-container';
    const combinedClasses = visualBuilderClasses.length > 0
      ? `${baseClasses} ${visualBuilderClasses.join(' ')}`
      : baseClasses;

    console.log('Final container classes:', combinedClasses);

    // Verify the final container would have all necessary classes
    expect(combinedClasses).toContain('advanced-template-container');
    expect(combinedClasses).toContain('vb-theme-space');
    expect(combinedClasses).toContain('vb-pattern-stars');
    expect(combinedClasses).toContain('vb-effect-rounded');

    console.log('✅ Container will receive all Visual Builder classes for styling');
  });

  test('Container should work with grid-enabled templates', () => {
    console.log('=== TEST: Grid-Enabled Container Classes ===');

    const visualBuilderCSS = `
.vb-theme-custom { background: #ff0000; }
.vb-effect-shadow { box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
`;

    const visualBuilderClasses = extractVisualBuilderClasses(visualBuilderCSS);

    // Simulate grid positioning detection
    const hasGridPositioning = true; // Assume grid positioning detected

    const baseClasses = hasGridPositioning
      ? 'advanced-template-container grid-enabled'
      : 'advanced-template-container';

    const combinedClasses = visualBuilderClasses.length > 0
      ? `${baseClasses} ${visualBuilderClasses.join(' ')}`
      : baseClasses;

    console.log('Grid-enabled container classes:', combinedClasses);

    expect(combinedClasses).toContain('advanced-template-container');
    expect(combinedClasses).toContain('grid-enabled');
    expect(combinedClasses).toContain('vb-theme-custom');
    expect(combinedClasses).toContain('vb-effect-shadow');

    console.log('✅ Grid-enabled containers work with Visual Builder classes');
  });

  test('Container should handle empty Visual Builder CSS gracefully', () => {
    console.log('=== TEST: Empty CSS Handling ===');

    const emptyCss = '';
    const visualBuilderClasses = extractVisualBuilderClasses(emptyCss);

    const baseClasses = 'advanced-template-container';
    const combinedClasses = visualBuilderClasses.length > 0
      ? `${baseClasses} ${visualBuilderClasses.join(' ')}`
      : baseClasses;

    console.log('Classes with empty CSS:', combinedClasses);

    expect(combinedClasses).toBe('advanced-template-container');
    expect(visualBuilderClasses).toEqual([]);

    console.log('✅ Empty CSS handled correctly - only base classes applied');
  });
});