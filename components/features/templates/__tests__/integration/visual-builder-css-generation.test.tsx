/**
 * Test 1: CSS Generation Test
 * Purpose: Verify CSS generation creates correct variable names and values
 */

import { generateCSSFromGlobalSettings } from '@/lib/templates/visual-builder/css-class-generator';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

describe('Visual Builder CSS Generation', () => {
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

  test('should generate CSS with correct global variable names', () => {
    const settings = createTestGlobalSettings('#b01717');
    const result = generateCSSFromGlobalSettings(settings);

    console.log('Generated CSS:', result.css);
    console.log('Generated Classes:', result.classes);
    console.log('Generated Class Names:', result.classNames);

    // Assert CSS contains correct variable name (global, not vb)
    expect(result.css).toContain('--global-bg-color: #b01717');
    expect(result.css).not.toContain('--vb-bg-color');

    // Assert CSS contains background-color reference to the variable
    expect(result.css).toContain('background-color: var(--global-bg-color)');

    // Assert no CSS variable recursion
    expect(result.css).not.toMatch(/--global-bg-color:\s*var\(--global-bg-color\)/);
    expect(result.css).not.toMatch(/--global-container-padding:\s*var\(--global-container-padding\)/);
  });

  test('should generate CSS with correct theme class', () => {
    const settings = createTestGlobalSettings('#ac2a2a');
    const result = generateCSSFromGlobalSettings(settings);

    // Assert theme class is included
    expect(result.classNames).toContain('vb-theme-custom');

    // Assert CSS contains theme class definition
    expect(result.css).toContain('.vb-theme-custom {');
    expect(result.css).toContain('background-color: var(--global-bg-color)');
  });

  test('should handle typography variables with global naming', () => {
    const settings = createTestGlobalSettings('#cc2e2e');
    const result = generateCSSFromGlobalSettings(settings);

    // Assert typography uses global naming
    expect(result.css).toContain('--global-font-family: Inter, sans-serif');
    expect(result.css).toContain('--global-base-font-size: 16px');

    // Assert CSS references the variables correctly
    expect(result.css).toContain('font-family: var(--global-font-family)');
    expect(result.css).toContain('font-size: var(--global-base-font-size)');
  });

  test('should handle spacing variables with global naming', () => {
    const settings = createTestGlobalSettings('#b01717');
    const result = generateCSSFromGlobalSettings(settings);

    // Assert spacing uses global naming
    expect(result.css).toContain('--global-container-padding: 24px');
    expect(result.css).toContain('--global-section-spacing: 32px');

    // Assert CSS references the variables correctly
    expect(result.css).toContain('padding: var(--global-container-padding)');
  });

  test('should prevent CSS variable recursion completely', () => {
    // Create settings that might cause recursion
    const recursiveSettings: GlobalSettings = {
      background: {
        color: 'var(--global-bg-color)',
        type: 'solid'
      },
      typography: {
        fontFamily: 'var(--global-font-family)',
        baseSize: 'var(--global-base-font-size)',
        scale: 1.2
      },
      spacing: {
        containerPadding: 'var(--global-container-padding)',
        sectionSpacing: 'var(--global-section-spacing)'
      },
      theme: 'custom',
      effects: {}
    };

    const result = generateCSSFromGlobalSettings(recursiveSettings);

    console.log('Recursion test CSS:', result.css);

    // Assert no CSS variable recursion exists
    expect(result.css).not.toMatch(/--global-bg-color:\s*var\(--global-bg-color\)/);
    expect(result.css).not.toMatch(/--global-font-family:\s*var\(--global-font-family\)/);
    expect(result.css).not.toMatch(/--global-container-padding:\s*var\(--global-container-padding\)/);

    // Assert fallback values are used instead
    expect(result.css).toMatch(/--global-bg-color:\s*#ffffff/);
    expect(result.css).toMatch(/--global-container-padding:\s*24px/);
  });

  test('should generate valid CSS structure', () => {
    const settings = createTestGlobalSettings('#b01717');
    const result = generateCSSFromGlobalSettings(settings);

    // Assert CSS has proper structure
    expect(result.css).toContain(':root {');
    expect(result.css).toContain('.vb-theme-custom {');
    expect(result.css).toContain('}');

    // Assert CSS contains expected comment headers
    expect(result.css).toContain('/* Visual Builder Generated CSS */');
    expect(result.css).toContain('/* CSS Custom Properties for easy editing */');

    // Assert CSS is properly formatted (has newlines and indentation)
    expect(result.css).toMatch(/\n\s+--global-bg-color:/);
  });

  test('should handle undefined background color gracefully', () => {
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

    const result = generateCSSFromGlobalSettings(settingsWithoutColor);

    // Should not contain background color variable if color is undefined
    expect(result.css).not.toContain('--global-bg-color:');

    // But should still contain other variables
    expect(result.css).toContain('--global-font-family:');
    expect(result.css).toContain('--global-container-padding:');
  });
});