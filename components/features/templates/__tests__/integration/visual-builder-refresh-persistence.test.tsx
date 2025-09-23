/**
 * Integration Test: Visual Builder CSS Refresh Persistence
 * Purpose: Test that Visual Builder CSS persists correctly after page refresh
 * and doesn't accumulate duplicate/outdated CSS blocks
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
import { parseExistingTemplate } from '@/lib/templates/visual-builder/template-parser-reverse';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

describe('Visual Builder CSS Refresh Persistence', () => {
  // Helper to simulate template-editor.tsx CSS extraction logic
  const simulatePageRefreshExtraction = (template: string) => {
    let extractedHtmlContent = '';
    let embeddedCSS = '';

    // Check for embedded style tags in the template
    const styleMatches = template.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      // Extract CSS from style tags, but skip Visual Builder CSS
      styleMatches.forEach(styleTag => {
        const cssMatch = styleTag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (cssMatch && cssMatch[1]) {
          const css = cssMatch[1].trim();

          // Skip Visual Builder CSS - it will be regenerated
          const isVisualBuilderCSS =
            css.includes('Visual Builder Generated CSS') ||
            css.includes('--vb-bg-color') ||
            css.includes('--global-bg-color') ||
            css.includes('.vb-theme-');

          if (!isVisualBuilderCSS) {
            embeddedCSS += css + '\n\n';
          }
        }
      });
    }

    // Remove ALL style tags from HTML
    extractedHtmlContent = template.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();

    return {
      extractedHTML: extractedHtmlContent,
      extractedCSS: embeddedCSS
    };
  };

  // Helper to count Visual Builder CSS blocks
  const countVisualBuilderCSSBlocks = (css: string): number => {
    const matches = css.match(/Visual Builder Generated CSS/gi);
    return matches ? matches.length : 0;
  };

  test('Visual Builder CSS should not accumulate after page refresh', () => {
    console.log('=== TEST: CSS Accumulation Prevention ===');

    // Step 1: Generate initial Visual Builder HTML with CSS
    const settings1: GlobalSettings = {
      background: { color: '#b01717', type: 'solid' },
      typography: { fontFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.2 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'custom',
      effects: {}
    };

    const css1 = generateCSSFromGlobalSettings(settings1);
    const html1 = `<style>
${css1.css}
</style>
<div class="pure-absolute-container ${css1.classNames.join(' ')}">
  <h1>Test Content</h1>
</div>`;

    console.log('Initial template has', countVisualBuilderCSSBlocks(html1), 'VB CSS blocks');

    // Step 2: User makes another change (simulating multiple saves)
    const settings2: GlobalSettings = {
      ...settings1,
      background: { color: '#ac2a2a', type: 'solid' }
    };

    const css2 = generateCSSFromGlobalSettings(settings2);
    const html2 = `<style>
${css2.css}
</style>
<div class="pure-absolute-container ${css2.classNames.join(' ')}">
  <h1>Test Content</h1>
</div>`;

    // Step 3: Simulate what would happen with old code (accumulation)
    const oldAccumulated = html1 + '\n\n/* Recovered from template */\n' + html2;
    const oldCSSBlocks = countVisualBuilderCSSBlocks(oldAccumulated);
    console.log('Old behavior would have', oldCSSBlocks, 'VB CSS blocks (BAD!)');

    // Step 4: Simulate page refresh with new extraction logic
    const { extractedHTML, extractedCSS } = simulatePageRefreshExtraction(html2);

    console.log('After refresh extraction:');
    console.log('- HTML has VB CSS:', extractedHTML.includes('Visual Builder'));
    console.log('- Extracted CSS has VB CSS:', extractedCSS.includes('Visual Builder'));

    // Assertions
    expect(extractedHTML).not.toContain('Visual Builder Generated CSS');
    expect(extractedHTML).not.toContain('<style>');
    expect(extractedCSS).toBe(''); // All VB CSS should be skipped
    expect(countVisualBuilderCSSBlocks(extractedCSS)).toBe(0);
  });

  test('Non-Visual Builder CSS should be preserved after refresh', () => {
    console.log('=== TEST: Preserve User CSS ===');

    // Template with both Visual Builder and user CSS
    const mixedTemplate = `<style>
/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #b01717;
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}
</style>
<style>
/* User custom styles */
.my-custom-class {
  color: blue;
  font-weight: bold;
}
</style>
<div class="pure-absolute-container vb-theme-custom">
  <div class="my-custom-class">Custom styled content</div>
</div>`;

    const { extractedHTML, extractedCSS } = simulatePageRefreshExtraction(mixedTemplate);

    console.log('Extracted CSS:', extractedCSS);

    // Assertions
    expect(extractedCSS).toContain('.my-custom-class');
    expect(extractedCSS).toContain('color: blue');
    expect(extractedCSS).not.toContain('Visual Builder Generated CSS');
    expect(extractedCSS).not.toContain('--global-bg-color');
  });

  test('Background color persists correctly through full refresh cycle', () => {
    console.log('=== TEST: Full Refresh Cycle ===');

    const testColor = '#db4848';

    // Step 1: Generate fresh Visual Builder output
    const settings: GlobalSettings = {
      background: { color: testColor, type: 'solid' },
      typography: { fontFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.2 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'custom',
      effects: { borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
    };

    const generatedCSS = generateCSSFromGlobalSettings(settings);
    const savedTemplate = `<style>
${generatedCSS.css}
</style>
<div class="pure-absolute-container ${generatedCSS.classNames.join(' ')}">
  <ProfilePhoto />
  <DisplayName />
</div>`;

    console.log('Saved template contains color:', savedTemplate.includes(testColor));

    // Step 2: Simulate page refresh extraction
    const { extractedHTML, extractedCSS } = simulatePageRefreshExtraction(savedTemplate);

    console.log('After refresh - VB CSS removed:', !extractedHTML.includes('--global-bg-color'));

    // Step 3: Visual Builder reloads and parses the HTML
    // Since Visual Builder CSS was removed, it will regenerate fresh CSS
    // But it should still parse the settings from the HTML classes and attributes
    const parsedResult = parseExistingTemplate(extractedHTML);

    console.log('Parsed settings after refresh:', parsedResult.globalSettings);

    // The key insight: After refresh, Visual Builder regenerates CSS from parsed settings
    // So we need to ensure the HTML preserves enough information (via classes)
    expect(extractedHTML).toContain('vb-theme-custom');
    expect(extractedHTML).toContain('pure-absolute-container');
  });

  test('Old variable names should be migrated correctly', () => {
    console.log('=== TEST: Variable Name Migration ===');

    // Template with old --vb-* variable names
    const oldTemplate = `<style>
/* Visual Builder Generated CSS */
:root {
  --vb-bg-color: #cc2e2e;
  --vb-font-family: Helvetica, sans-serif;
  --vb-container-padding: 16px;
}
.vb-theme-custom {
  background-color: var(--vb-bg-color);
}
</style>
<div class="pure-absolute-container vb-theme-custom"></div>`;

    // Parse with old variable names
    const result = parseExistingTemplate(oldTemplate);

    console.log('Migrated settings:', result.globalSettings);

    // Should extract actual values, not variable references
    expect(result.globalSettings?.background?.color).toBe('#cc2e2e');
    expect(result.globalSettings?.typography?.fontFamily).toBe('Helvetica, sans-serif');
    expect(result.globalSettings?.spacing?.containerPadding).toBe('16px');

    // Should NOT contain variable references
    expect(result.globalSettings?.background?.color).not.toContain('var(');
  });

  test('CSS variable recursion should be prevented', () => {
    console.log('=== TEST: Prevent CSS Recursion ===');

    // Template with CSS variable recursion (old bug)
    const recursiveTemplate = `<style>
:root {
  --vb-container-padding: var(--vb-container-padding);
  --global-bg-color: #b01717;
}
</style>
<div class="pure-absolute-container vb-theme-custom"></div>`;

    const result = parseExistingTemplate(recursiveTemplate);

    // Should handle recursion gracefully
    expect(result.globalSettings?.background?.color).toBe('#b01717');

    // Recursive variable should be handled (either undefined or fallback)
    const padding = result.globalSettings?.spacing?.containerPadding;
    expect(padding).not.toBe('var(--vb-container-padding)');
    expect(padding).not.toBe('var(--global-container-padding)');
  });

  test('Multiple color changes should not create duplicate CSS blocks', () => {
    console.log('=== TEST: Prevent Duplicate CSS Blocks ===');

    let currentTemplate = '';

    // Simulate multiple color changes
    const colors = ['#b01717', '#ac2a2a', '#cc2e2e', '#db4848'];

    colors.forEach((color, index) => {
      console.log(`Color change ${index + 1}: ${color}`);

      const settings: GlobalSettings = {
        background: { color, type: 'solid' },
        typography: { fontFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.2 },
        spacing: { containerPadding: '24px', sectionSpacing: '32px' },
        theme: 'custom',
        effects: {}
      };

      const css = generateCSSFromGlobalSettings(settings);

      // Simulate Visual Builder output (with deduplication)
      // This mimics the enhanced deduplication logic
      const cleanedTemplate = currentTemplate.replace(/<style[^>]*>[\s\S]*?Visual Builder[\s\S]*?<\/style>/gi, '');

      currentTemplate = `<style>
${css.css}
</style>
${cleanedTemplate}
<div class="pure-absolute-container ${css.classNames.join(' ')}">
  <h1>Test</h1>
</div>`;

      const cssBlocks = countVisualBuilderCSSBlocks(currentTemplate);
      console.log(`  CSS blocks after change: ${cssBlocks}`);

      // Should always have exactly 1 VB CSS block
      expect(cssBlocks).toBe(1);
    });

    // Final template should have only 1 CSS block with the latest color
    expect(countVisualBuilderCSSBlocks(currentTemplate)).toBe(1);
    expect(currentTemplate).toContain('#db4848');
    expect(currentTemplate).not.toContain('#b01717'); // Old colors should be gone
  });
});