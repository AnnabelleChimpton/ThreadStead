/**
 * Test 3: Template Parsing Test
 * Purpose: Verify template parser correctly extracts global settings from HTML
 */

// Mock problematic dependencies
jest.mock('@/lib/templates/core/template-registry', () => ({
  componentRegistry: {
    get: jest.fn(),
    getAllowedTags: jest.fn(() => [])
  }
}));

jest.mock('@/lib/api/did/did-client', () => ({}));

import { parseExistingTemplate } from '@/lib/templates/visual-builder/template-parser-reverse';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

describe('Visual Builder Template Parsing', () => {
  test('should extract background color from CSS variables correctly', () => {
    const htmlWithCSS = `<style>
/* Visual Builder Generated CSS */
/* CSS Custom Properties for easy editing */
/* CSS Classes for styling */

:root {
  --global-bg-color: #b01717;
  --vb-bg-type: solid;
  --global-font-family: Inter, sans-serif;
  --global-base-font-size: 16px;
  --global-typography-scale: 1.2;
  --global-container-padding: 24px;
  --global-section-spacing: 32px;
  --vb-theme: custom;
}

.vb-theme-custom {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  font-size: var(--global-base-font-size);
  padding: var(--global-container-padding);
}
</style>
<div class="pure-absolute-container vb-theme-custom">
</div>`;

    console.log('Parsing HTML:', htmlWithCSS);

    const parseResult = parseExistingTemplate(htmlWithCSS);

    console.log('Parsed global settings:', parseResult.globalSettings);
    console.log('Parse warnings:', parseResult.warnings);

    // Assert global settings were extracted
    expect(parseResult.globalSettings).toBeTruthy();

    // Assert background color is extracted as actual color value, not CSS variable
    expect(parseResult.globalSettings?.background?.color).toBe('#b01717');
    expect(parseResult.globalSettings?.background?.type).toBe('solid');

    // Ensure no CSS variable references are stored in settings
    expect(parseResult.globalSettings?.background?.color).not.toContain('var(');
  });

  test('should handle CSS variable resolution correctly', () => {
    const htmlWithVariableRefs = `<style>
:root {
  --global-bg-color: #ac2a2a;
  --global-font-family: Arial, sans-serif;
}

.vb-theme-custom {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
}
</style>
<div class="pure-absolute-container vb-theme-custom">
</div>`;

    const parseResult = parseExistingTemplate(htmlWithVariableRefs);

    console.log('Variable resolution test - parsed settings:', parseResult.globalSettings);

    // Assert actual values are extracted, not var() references
    expect(parseResult.globalSettings?.background?.color).toBe('#ac2a2a');
    expect(parseResult.globalSettings?.typography?.fontFamily).toBe('Arial, sans-serif');

    // Ensure no CSS variables are leaked into settings
    expect(parseResult.globalSettings?.background?.color).not.toMatch(/var\(/);
    expect(parseResult.globalSettings?.typography?.fontFamily).not.toMatch(/var\(/);
  });

  test('should support both old and new CSS variable naming', () => {
    // Test with old --vb-* naming
    const htmlWithOldNaming = `<style>
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

    const oldResult = parseExistingTemplate(htmlWithOldNaming);

    console.log('Old naming test - parsed settings:', oldResult.globalSettings);

    // Should extract from old naming
    expect(oldResult.globalSettings?.background?.color).toBe('#cc2e2e');
    expect(oldResult.globalSettings?.typography?.fontFamily).toBe('Helvetica, sans-serif');
    expect(oldResult.globalSettings?.spacing?.containerPadding).toBe('16px');

    // Test with new --global-* naming (should take precedence)
    const htmlWithNewNaming = `<style>
:root {
  --vb-bg-color: #cc2e2e;
  --global-bg-color: #b01717;
  --vb-font-family: Helvetica, sans-serif;
  --global-font-family: Inter, sans-serif;
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}
</style>
<div class="pure-absolute-container vb-theme-custom"></div>`;

    const newResult = parseExistingTemplate(htmlWithNewNaming);

    console.log('New naming precedence test - parsed settings:', newResult.globalSettings);

    // Should prefer new naming over old
    expect(newResult.globalSettings?.background?.color).toBe('#b01717');
    expect(newResult.globalSettings?.typography?.fontFamily).toBe('Inter, sans-serif');
  });

  test('should handle missing or undefined CSS variables gracefully', () => {
    const htmlWithMissingVars = `<style>
.vb-theme-custom {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
}
</style>
<div class="pure-absolute-container vb-theme-custom"></div>`;

    const parseResult = parseExistingTemplate(htmlWithMissingVars);

    console.log('Missing variables test - parsed settings:', parseResult.globalSettings);

    // Should handle missing variables gracefully
    expect(parseResult.globalSettings).toBeTruthy();

    // Should not have background color if CSS variable is missing
    expect(parseResult.globalSettings?.background?.color).toBeUndefined();
    expect(parseResult.globalSettings?.typography?.fontFamily).toBeUndefined();
  });

  test('should prevent CSS variable recursion during parsing', () => {
    const htmlWithRecursion = `<style>
:root {
  --global-bg-color: var(--global-bg-color);
  --global-font-family: var(--global-font-family);
  --global-container-padding: var(--global-container-padding);
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}
</style>
<div class="pure-absolute-container vb-theme-custom"></div>`;

    const parseResult = parseExistingTemplate(htmlWithRecursion);

    console.log('Recursion test - parsed settings:', parseResult.globalSettings);

    // Should handle recursion gracefully (return null for recursive variables)
    expect(parseResult.globalSettings?.background?.color).toBeUndefined();
    expect(parseResult.globalSettings?.typography?.fontFamily).toBeUndefined();
    expect(parseResult.globalSettings?.spacing?.containerPadding).toBeUndefined();

    // Should not crash or cause infinite loops
    expect(parseResult.warnings).toBeDefined();
  });

  test('should extract theme and effect classes correctly', () => {
    const htmlWithClasses = `<style>
:root {
  --global-bg-color: #b01717;
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}
.vb-effect-rounded {
  border-radius: 12px;
}
.vb-effect-shadow {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>
<div class="pure-absolute-container vb-theme-custom vb-effect-rounded vb-effect-shadow">
</div>`;

    const parseResult = parseExistingTemplate(htmlWithClasses);

    console.log('Classes test - parsed settings:', parseResult.globalSettings);

    // Assert theme is extracted
    expect(parseResult.globalSettings?.theme).toBe('custom');

    // Assert effects are extracted
    expect(parseResult.globalSettings?.effects?.borderRadius).toBe('12px');
    expect(parseResult.globalSettings?.effects?.boxShadow).toBe('0 4px 12px rgba(0,0,0,0.1)');
  });

  test('should handle multiple CSS blocks correctly', () => {
    const htmlWithMultipleCSS = `<style>
/* First CSS block */
:root {
  --global-bg-color: #b01717;
}
</style>
<style>
/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #ac2a2a;
  --global-font-family: Inter, sans-serif;
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}
</style>
<div class="pure-absolute-container vb-theme-custom">
</div>`;

    const parseResult = parseExistingTemplate(htmlWithMultipleCSS);

    console.log('Multiple CSS blocks test - parsed settings:', parseResult.globalSettings);

    // Should prioritize Visual Builder CSS (the last one or the one with VB signature)
    expect(parseResult.globalSettings?.background?.color).toBe('#ac2a2a');
    expect(parseResult.globalSettings?.typography?.fontFamily).toBe('Inter, sans-serif');
  });

  test('should extract complete global settings structure', () => {
    const completeHTML = `<style>
/* Visual Builder Generated CSS */
/* CSS Custom Properties for easy editing */
/* CSS Classes for styling */

:root {
  --global-bg-color: #b01717;
  --vb-bg-type: solid;
  --global-font-family: Inter, sans-serif;
  --global-base-font-size: 16px;
  --global-typography-scale: 1.2;
  --global-container-padding: 24px;
  --global-section-spacing: 32px;
  --vb-theme: custom;
  --vb-border-radius: 12px;
  --vb-box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  --vb-animation: zoom;
}

.vb-theme-custom {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  font-size: var(--global-base-font-size);
  padding: var(--global-container-padding);
}

.vb-effect-rounded {
  border-radius: 12px;
}

.vb-effect-shadow {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.vb-effect-zoom {
  animation: vb-zoom-in 0.6s ease-out;
  transform: scale(0.95);
}
</style>
<div class="pure-absolute-container vb-theme-custom vb-effect-rounded vb-effect-shadow vb-effect-zoom">
</div>`;

    const parseResult = parseExistingTemplate(completeHTML);

    console.log('Complete structure test - parsed settings:', parseResult.globalSettings);

    // Assert complete structure is extracted correctly
    const settings = parseResult.globalSettings!;

    expect(settings.background?.color).toBe('#b01717');
    expect(settings.background?.type).toBe('solid');
    expect(settings.typography?.fontFamily).toBe('Inter, sans-serif');
    expect(settings.typography?.baseSize).toBe('16px');
    expect(settings.typography?.scale).toBe(1.2);
    expect(settings.spacing?.containerPadding).toBe('24px');
    expect(settings.spacing?.sectionSpacing).toBe('32px');
    expect(settings.theme).toBe('custom');
    expect(settings.effects?.borderRadius).toBe('12px');
    expect(settings.effects?.boxShadow).toBe('0 4px 12px rgba(0,0,0,0.1)');
    expect(settings.effects?.animation).toBe('zoom');
  });

  test('should handle empty or malformed HTML gracefully', () => {
    const emptyHTML = '';
    const malformedHTML = '<div><style>invalid css';
    const noCSS = '<div class="pure-absolute-container"></div>';

    const emptyResult = parseExistingTemplate(emptyHTML);
    const malformedResult = parseExistingTemplate(malformedHTML);
    const noCSSResult = parseExistingTemplate(noCSS);

    console.log('Empty HTML result:', emptyResult.globalSettings);
    console.log('Malformed HTML result:', malformedResult.globalSettings);
    console.log('No CSS result:', noCSSResult.globalSettings);

    // Should handle gracefully without crashing
    expect(emptyResult.warnings).toBeDefined();
    expect(malformedResult.warnings).toBeDefined();
    expect(noCSSResult.warnings).toBeDefined();

    // Global settings might be null for these cases
    expect([null, undefined].includes(emptyResult.globalSettings as any)).toBe(true);
  });
});