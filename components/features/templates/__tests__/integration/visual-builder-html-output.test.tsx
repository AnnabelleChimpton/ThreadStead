/**
 * Test 2: HTML Output Test
 * Purpose: Verify complete HTML output includes CSS in style tags
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useCanvasState } from '@/hooks/useCanvasState';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

// We need to test the HTML generation logic directly
// Import the HTML generation function from VisualTemplateBuilder
import { generatePureHTML } from '@/lib/templates/visual-builder/pure-html-generator';
import { generateCSSFromGlobalSettings } from '@/lib/templates/visual-builder/css-class-generator';
import { DEFAULT_CANVAS_CONTAINER } from '@/lib/templates/visual-builder/pure-positioning';
import type { AbsoluteCanvasState } from '@/lib/templates/visual-builder/pure-positioning';

describe('Visual Builder HTML Output', () => {
  const createTestGlobalSettings = (backgroundColor: string): GlobalSettings => ({
    background: {
      color: backgroundColor,
      type: 'solid'
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
      baseSize: '16px',
      scale: 1.2
    },
    spacing: {
      containerPadding: '24px',
      sectionSpacing: '32px'
    },
    theme: 'custom',
    effects: {
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      animation: 'zoom'
    }
  });

  // Mock simple absolute canvas state for testing
  const createMockAbsoluteCanvasState = (): AbsoluteCanvasState => ({
    container: {
      ...DEFAULT_CANVAS_CONTAINER,
      backgroundColor: '#ffffff' // Default background
    },
    components: [],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  test('should generate HTML with embedded CSS style tag', () => {
    const globalSettings = createTestGlobalSettings('#b01717');
    const canvasState = createMockAbsoluteCanvasState();

    // Generate CSS first
    const globalCSS = generateCSSFromGlobalSettings(globalSettings);

    // Generate HTML output
    const result = generatePureHTML(canvasState, {
      containerClass: 'pure-absolute-container',
      includeMetadata: true,
      prettyPrint: true
    });

    console.log('Generated HTML:', result.html);
    console.log('Generated CSS:', globalCSS.css);

    // Basic HTML structure assertions (note: HTML generator adds inline styles)
    expect(result.html).toContain('<div class="pure-absolute-container"');
    expect(result.html).toContain('</div>');

    // Test the complete flow: adding CSS to HTML (mimicking VisualTemplateBuilder)
    let finalHTML = result.html;

    // Add global settings as CSS classes
    if (globalCSS.classNames.length > 0) {
      const classString = globalCSS.classNames.join(' ');
      finalHTML = finalHTML.replace(
        /class="pure-absolute-container"/,
        `class="pure-absolute-container ${classString}"`
      );
    }

    // Add CSS to document
    if (globalCSS.css && globalCSS.css.trim()) {
      const styleTag = `<style>
${globalCSS.css}
</style>`;

      // Insert at the beginning (mimicking head insertion)
      finalHTML = styleTag + finalHTML;
    }

    console.log('Final HTML with CSS:', finalHTML);

    // Assert HTML contains style tag
    expect(finalHTML).toContain('<style>');
    expect(finalHTML).toContain('</style>');

    // Assert CSS contains Visual Builder signature
    expect(finalHTML).toContain('/* Visual Builder Generated CSS */');

    // Assert correct CSS variables
    expect(finalHTML).toContain('--global-bg-color: #b01717');
    expect(finalHTML).toContain('background-color: var(--global-bg-color)');

    // Assert container has correct classes
    expect(finalHTML).toContain('class="pure-absolute-container vb-theme-custom');
  });

  test('should generate HTML with correct CSS variable structure', () => {
    const globalSettings = createTestGlobalSettings('#ac2a2a');
    const globalCSS = generateCSSFromGlobalSettings(globalSettings);

    // Generate minimal HTML for testing
    const basicHTML = '<div class="pure-absolute-container"></div>';

    // Add CSS (mimicking the VisualTemplateBuilder process)
    const finalHTML = `<style>
${globalCSS.css}
</style>${basicHTML}`;

    console.log('HTML with CSS structure:', finalHTML);

    // Assert CSS structure is correct
    expect(finalHTML).toMatch(/<style>\s*\/\* Visual Builder Generated CSS \*\//);
    expect(finalHTML).toContain(':root {');
    expect(finalHTML).toContain('.vb-theme-custom {');

    // Assert CSS variables use global naming
    expect(finalHTML).toContain('--global-bg-color: #ac2a2a');
    expect(finalHTML).toContain('--global-font-family: Inter, sans-serif');
    expect(finalHTML).toContain('--global-container-padding: 24px');

    // Assert CSS contains proper variable references (this is correct behavior)
    expect(finalHTML).toContain('background-color: var(--global-bg-color)');
    expect(finalHTML).toContain('font-family: var(--global-font-family)');

    // Assert no CSS variable recursion in variable definitions
    expect(finalHTML).not.toContain('--global-bg-color: var(--global-bg-color)');
    expect(finalHTML).not.toContain('--global-font-family: var(--global-font-family)');
  });

  test('should handle multiple background colors correctly', () => {
    const colors = ['#b01717', '#ac2a2a', '#cc2e2e'];

    colors.forEach(color => {
      const globalSettings = createTestGlobalSettings(color);
      const globalCSS = generateCSSFromGlobalSettings(globalSettings);

      const finalHTML = `<style>
${globalCSS.css}
</style><div class="pure-absolute-container ${globalCSS.classNames.join(' ')}"></div>`;

      console.log(`Testing color ${color}:`, finalHTML.substring(0, 200));

      // Assert each color is correctly embedded
      expect(finalHTML).toContain(`--global-bg-color: ${color}`);
      expect(finalHTML).toContain('background-color: var(--global-bg-color)');
      expect(finalHTML).toContain('vb-theme-custom');
    });
  });

  test('should preserve CSS when no background color is set', () => {
    const settingsWithoutColor: GlobalSettings = {
      background: {
        type: 'solid'
        // Deliberately omit color
      } as any,
      typography: {
        fontFamily: 'Inter, sans-serif',
        baseSize: '16px',
        scale: 1.2
      },
      spacing: {
        containerPadding: '24px',
        sectionSpacing: '32px'
      },
      theme: 'custom',
      effects: {}
    };

    const globalCSS = generateCSSFromGlobalSettings(settingsWithoutColor);

    const finalHTML = `<style>
${globalCSS.css}
</style><div class="pure-absolute-container ${globalCSS.classNames.join(' ')}"></div>`;

    console.log('HTML without background color:', finalHTML);

    // Should not contain background color variable
    expect(finalHTML).not.toContain('--global-bg-color:');

    // But should still contain other CSS
    expect(finalHTML).toContain('--global-font-family:');
    expect(finalHTML).toContain('--global-container-padding:');
    expect(finalHTML).toContain('.vb-theme-custom');
  });

  test('should generate valid HTML that can be parsed', () => {
    const globalSettings = createTestGlobalSettings('#b01717');
    const globalCSS = generateCSSFromGlobalSettings(globalSettings);

    const finalHTML = `<!DOCTYPE html>
<html>
<head>
<style>
${globalCSS.css}
</style>
</head>
<body>
<div class="pure-absolute-container ${globalCSS.classNames.join(' ')}">
  <!-- Visual builder content would go here -->
</div>
</body>
</html>`;

    console.log('Complete HTML document:', finalHTML);

    // Test that the HTML can be parsed by DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(finalHTML, 'text/html');

    // Assert no parsing errors
    const parseError = doc.querySelector('parsererror');
    expect(parseError).toBeNull();

    // Assert structure is preserved
    const container = doc.querySelector('.pure-absolute-container');
    expect(container).toBeTruthy();
    expect(container?.classList.contains('vb-theme-custom')).toBe(true);

    // Assert CSS is preserved in style tag
    const styleTag = doc.querySelector('style');
    expect(styleTag).toBeTruthy();
    expect(styleTag?.textContent).toContain('--global-bg-color: #b01717');
  });

  test('should match expected HTML format for template editor', () => {
    const globalSettings = createTestGlobalSettings('#b01717');
    const globalCSS = generateCSSFromGlobalSettings(globalSettings);

    // This mimics exactly what VisualTemplateBuilder.generatePureHTMLOutput() does
    const canvasState = createMockAbsoluteCanvasState();
    const result = generatePureHTML(canvasState, {
      containerClass: 'pure-absolute-container',
      includeMetadata: true,
      prettyPrint: true
    });

    let finalHTML = result.html;

    // Add global settings as CSS classes
    if (globalCSS.classNames.length > 0) {
      const classString = globalCSS.classNames.join(' ');
      finalHTML = finalHTML.replace(
        /class="pure-absolute-container"/,
        `class="pure-absolute-container ${classString}"`
      );
    }

    // Add CSS styles
    if (globalCSS.css && globalCSS.css.trim()) {
      const styleTag = `<style>
${globalCSS.css}
</style>`;

      // Insert at the beginning (mimicking VisualTemplateBuilder's insertion logic)
      finalHTML = styleTag + '\n' + finalHTML;
    }

    console.log('Template editor format HTML:', finalHTML);

    // Assert the final format matches expectations
    expect(finalHTML).toMatch(/^<style>\s*\/\* Visual Builder Generated CSS \*\//);
    expect(finalHTML).toContain('pure-absolute-container vb-theme-custom');
    expect(finalHTML).toContain('--global-bg-color: #b01717');
    expect(finalHTML).toContain('background-color: var(--global-bg-color)');
  });
});