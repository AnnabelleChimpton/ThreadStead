/**
 * Test: Visual Builder Class Injection for Live Profiles
 * Purpose: Verify that Visual Builder classes are correctly injected into live profile HTML
 */

import { extractVisualBuilderClasses, generateContainerClasses } from '@/lib/utils/css/visual-builder-class-extractor';

describe('Visual Builder Class Injection', () => {
  test('extractVisualBuilderClasses should extract all VB classes from CSS', () => {
    console.log('=== TEST: CSS Class Extraction ===');

    const sampleCSS = `
/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #0a0e27;
  --vb-pattern-type: stars;
}

.vb-theme-space {
  background-color: var(--global-bg-color);
}

.vb-pattern-stars {
  background-image: url("data:image/svg+xml...");
}

.vb-pattern-stars-animated {
  animation: vb-twinkle 3s ease-in-out infinite;
}

.vb-effect-rounded {
  border-radius: 8px;
}

.vb-effect-shadow {
  box-shadow: 0 0 50px rgba(100, 149, 237, 0.2);
}
`;

    const extractedClasses = extractVisualBuilderClasses(sampleCSS);

    console.log('Extracted VB classes:', extractedClasses);

    expect(extractedClasses).toContain('vb-theme-space');
    expect(extractedClasses).toContain('vb-pattern-stars');
    expect(extractedClasses).toContain('vb-pattern-stars-animated');
    expect(extractedClasses).toContain('vb-effect-rounded');
    expect(extractedClasses).toContain('vb-effect-shadow');

    // Should not contain duplicates
    const uniqueClasses = Array.from(new Set(extractedClasses));
    expect(extractedClasses.length).toBe(uniqueClasses.length);
  });

  test('generateContainerClasses should combine existing and VB classes', () => {
    console.log('=== TEST: Container Class Generation ===');

    const css = `
.vb-theme-space { background: #0a0e27; }
.vb-pattern-stars { background-image: url(...); }
.vb-effect-rounded { border-radius: 8px; }
`;

    const existingClasses = 'pure-absolute-container template-wrapper';

    const result = generateContainerClasses(css, existingClasses);

    console.log('Generated container classes:', result);

    expect(result).toContain('pure-absolute-container');
    expect(result).toContain('template-wrapper');
    expect(result).toContain('vb-theme-space');
    expect(result).toContain('vb-pattern-stars');
    expect(result).toContain('vb-effect-rounded');

    // Verify no duplicates
    const classes = result.split(' ').filter(c => c.trim());
    const uniqueClasses = Array.from(new Set(classes));
    expect(classes.length).toBe(uniqueClasses.length);
  });

  test('HTML class injection should work correctly', () => {
    console.log('=== TEST: HTML Class Injection ===');

    // Simulate the HTML transformation logic from AdvancedProfileRenderer
    const originalHTML = `<div class="pure-absolute-container">
  <ProfilePhoto />
  <DisplayName />
</div>`;

    const visualBuilderClasses = ['vb-theme-space', 'vb-pattern-stars', 'vb-effect-rounded'];
    const vbClassString = visualBuilderClasses.join(' ');

    // Apply the same transformation logic
    const processedHTML = originalHTML.replace(
      /class="(pure-absolute-container[^"]*?)"/g,
      `class="$1 ${vbClassString}"`
    );

    console.log('Original HTML:', originalHTML);
    console.log('Processed HTML:', processedHTML);

    expect(processedHTML).toContain('class="pure-absolute-container vb-theme-space vb-pattern-stars vb-effect-rounded"');
    expect(processedHTML).toContain('<ProfilePhoto />');
    expect(processedHTML).toContain('<DisplayName />');
  });

  test('Should handle template-container fallback', () => {
    console.log('=== TEST: Template Container Fallback ===');

    const htmlWithTemplateContainer = `<div class="template-container grid-container">
  <h1>Profile Content</h1>
</div>`;

    const visualBuilderClasses = ['vb-theme-custom', 'vb-effect-shadow'];
    const vbClassString = visualBuilderClasses.join(' ');

    // First try pure-absolute-container (should not match)
    let processedHTML = htmlWithTemplateContainer.replace(
      /class="(pure-absolute-container[^"]*?)"/g,
      `class="$1 ${vbClassString}"`
    );

    // Fallback to template-container (should match)
    if (!processedHTML.includes(vbClassString)) {
      processedHTML = processedHTML.replace(
        /class="(template-container[^"]*?)"/g,
        `class="$1 ${vbClassString}"`
      );
    }

    console.log('Template container result:', processedHTML);

    expect(processedHTML).toContain('class="template-container grid-container vb-theme-custom vb-effect-shadow"');
    expect(processedHTML).toContain('<h1>Profile Content</h1>');
  });

  test('Should handle edge cases gracefully', () => {
    console.log('=== TEST: Edge Cases ===');

    // Empty CSS
    expect(extractVisualBuilderClasses('')).toEqual([]);
    expect(extractVisualBuilderClasses(null as any)).toEqual([]);
    expect(extractVisualBuilderClasses(undefined as any)).toEqual([]);

    // CSS without VB classes
    const normalCSS = `.header { color: blue; } .footer { margin: 10px; }`;
    expect(extractVisualBuilderClasses(normalCSS)).toEqual([]);

    // HTML without container classes
    const htmlWithoutContainer = `<div><p>No container class</p></div>`;
    const vbClasses = ['vb-theme-space'];
    const vbClassString = vbClasses.join(' ');

    let result = htmlWithoutContainer.replace(
      /class="(pure-absolute-container[^"]*?)"/g,
      `class="$1 ${vbClassString}"`
    );

    if (!result.includes(vbClassString)) {
      result = result.replace(
        /class="(template-container[^"]*?)"/g,
        `class="$1 ${vbClassString}"`
      );
    }

    // Should remain unchanged
    expect(result).toBe(htmlWithoutContainer);

    console.log('✅ All edge cases handled correctly');
  });
});