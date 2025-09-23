/**
 * Test 4: End-to-End User Flow Test
 * Purpose: Simulate exact user workflow that's failing
 * This is the critical test that reproduces the actual bug the user is experiencing
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
import { generatePureHTML } from '@/lib/templates/visual-builder/pure-html-generator';
import { DEFAULT_CANVAS_CONTAINER } from '@/lib/templates/visual-builder/pure-positioning';
import type { AbsoluteCanvasState } from '@/lib/templates/visual-builder/pure-positioning';
import type { GlobalSettings } from '@/components/features/templates/visual-builder/GlobalSettingsPanel';

describe('Visual Builder Background Color Persistence E2E', () => {
  // Simulate the exact user workflow
  test('User sets background color, saves, refreshes, and sees persisted color', () => {
    console.log('=== SIMULATING USER WORKFLOW ===');

    // STEP 1: User sets a global background color in the visual builder
    console.log('STEP 1: User sets background color to #b01717');

    const userSettings: GlobalSettings = {
      background: {
        color: '#b01717',
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
    };

    // Generate CSS from user settings
    const globalCSS = generateCSSFromGlobalSettings(userSettings);
    console.log('Generated CSS variables:', {
      bgColor: globalCSS.css.includes('--global-bg-color: #b01717'),
      themeClass: globalCSS.css.includes('background-color: var(--global-bg-color)')
    });

    // STEP 2: Save template (generate HTML output)
    console.log('STEP 2: Saving template - generating HTML output');

    const mockCanvasState: AbsoluteCanvasState = {
      container: {
        ...DEFAULT_CANVAS_CONTAINER,
        backgroundColor: '#ffffff' // Default container bg
      },
      components: [],
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate HTML (mimicking VisualTemplateBuilder.generatePureHTMLOutput)
    const result = generatePureHTML(mockCanvasState, {
      containerClass: 'pure-absolute-container',
      includeMetadata: true,
      prettyPrint: true
    });

    let savedHTML = result.html;

    // Add global settings as CSS classes
    if (globalCSS.classNames.length > 0) {
      const classString = globalCSS.classNames.join(' ');
      savedHTML = savedHTML.replace(
        /class="pure-absolute-container"/,
        `class="pure-absolute-container ${classString}"`
      );
    }

    // Add CSS to HTML (mimicking the save process)
    if (globalCSS.css && globalCSS.css.trim()) {
      const styleTag = `<style>
${globalCSS.css}
</style>`;
      savedHTML = styleTag + '\n' + savedHTML;
    }

    console.log('Saved HTML contains:');
    console.log('- CSS style tag:', savedHTML.includes('<style>'));
    console.log('- Background color CSS:', savedHTML.includes('--global-bg-color: #b01717'));
    console.log('- Theme class:', savedHTML.includes('vb-theme-custom'));

    // STEP 3: User refreshes page - simulate loading from saved HTML
    console.log('STEP 3: User refreshes page - parsing saved template');

    const parseResult = parseExistingTemplate(savedHTML);

    console.log('Parsed global settings:', parseResult.globalSettings);
    console.log('Parse warnings:', parseResult.warnings);

    // STEP 4: Verify the background color is correctly restored
    console.log('STEP 4: Verifying background color persistence');

    // CRITICAL ASSERTIONS - This is what was failing before
    expect(parseResult.globalSettings).toBeTruthy();
    expect(parseResult.globalSettings?.background?.color).toBe('#b01717');
    expect(parseResult.globalSettings?.background?.type).toBe('solid');

    // Ensure no CSS variable references are stored (this was the bug!)
    expect(parseResult.globalSettings?.background?.color).not.toContain('var(');
    expect(parseResult.globalSettings?.background?.color).not.toContain('--global-bg-color');

    // Verify complete settings are preserved
    expect(parseResult.globalSettings?.typography?.fontFamily).toBe('Inter, sans-serif');
    expect(parseResult.globalSettings?.spacing?.containerPadding).toBe('24px');
    expect(parseResult.globalSettings?.theme).toBe('custom');

    console.log('✅ SUCCESS: Background color persistence works correctly!');
  });

  test('Multiple color changes persist correctly', () => {
    const colors = ['#b01717', '#ac2a2a', '#cc2e2e', '#ff5733', '#33ff57'];

    colors.forEach((color, index) => {
      console.log(`Testing color ${index + 1}: ${color}`);

      // Set color
      const settings: GlobalSettings = {
        background: { color, type: 'solid' },
        typography: { fontFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.2 },
        spacing: { containerPadding: '24px', sectionSpacing: '32px' },
        theme: 'custom',
        effects: {}
      };

      // Generate and save
      const css = generateCSSFromGlobalSettings(settings);
      const mockCanvasState: AbsoluteCanvasState = {
        container: DEFAULT_CANVAS_CONTAINER,
        components: [],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const htmlResult = generatePureHTML(mockCanvasState, {
        containerClass: 'pure-absolute-container',
        includeMetadata: true,
        prettyPrint: true
      });

      let finalHTML = htmlResult.html.replace(
        /class="pure-absolute-container"/,
        `class="pure-absolute-container ${css.classNames.join(' ')}"`
      );

      finalHTML = `<style>\n${css.css}\n</style>\n${finalHTML}`;

      // Parse back
      const parsed = parseExistingTemplate(finalHTML);

      // Verify persistence
      expect(parsed.globalSettings?.background?.color).toBe(color);
      expect(parsed.globalSettings?.background?.color).not.toContain('var(');
    });

    console.log('✅ Multiple color changes persist correctly!');
  });

  test('Settings panel editability after refresh', () => {
    // This test verifies that the settings panel remains editable after refresh
    const originalColor = '#b01717';
    const newColor = '#33ff57';

    // Create initial settings
    const initialSettings: GlobalSettings = {
      background: { color: originalColor, type: 'solid' },
      typography: { fontFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.2 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'custom',
      effects: {}
    };

    // Save and reload (simulating page refresh)
    const css = generateCSSFromGlobalSettings(initialSettings);
    const mockCanvasState: AbsoluteCanvasState = {
      container: DEFAULT_CANVAS_CONTAINER,
      components: [],
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const htmlResult = generatePureHTML(mockCanvasState, {
      containerClass: 'pure-absolute-container',
      includeMetadata: true,
      prettyPrint: true
    });

    let savedHTML = htmlResult.html.replace(
      /class="pure-absolute-container"/,
      `class="pure-absolute-container ${css.classNames.join(' ')}"`
    );
    savedHTML = `<style>\n${css.css}\n</style>\n${savedHTML}`;

    // Parse back to simulate settings panel loading
    const loadedSettings = parseExistingTemplate(savedHTML).globalSettings!;

    console.log('Loaded settings for editability test:', {
      backgroundColor: loadedSettings.background?.color,
      isEditable: !loadedSettings.background?.color?.includes('var(')
    });

    // Verify the settings panel can use these values
    expect(loadedSettings.background?.color).toBe(originalColor);
    expect(loadedSettings.background?.color).not.toContain('var(');

    // Simulate user changing color in settings panel
    const updatedSettings = {
      ...loadedSettings,
      background: {
        ...loadedSettings.background!,
        color: newColor
      }
    };

    // Generate new CSS with updated color
    const updatedCSS = generateCSSFromGlobalSettings(updatedSettings);

    // Verify new color is properly generated
    expect(updatedCSS.css).toContain(`--global-bg-color: ${newColor}`);
    expect(updatedCSS.css).not.toContain(originalColor);

    console.log('✅ Settings panel remains editable after refresh!');
  });

  test('CSS application to canvas after refresh', () => {
    const testColor = '#b01717';

    // Create settings with background color
    const settings: GlobalSettings = {
      background: { color: testColor, type: 'solid' },
      typography: { fontFamily: 'Inter, sans-serif', baseSize: '16px', scale: 1.2 },
      spacing: { containerPadding: '24px', sectionSpacing: '32px' },
      theme: 'custom',
      effects: {}
    };

    // Generate complete HTML with CSS
    const css = generateCSSFromGlobalSettings(settings);
    const mockCanvasState: AbsoluteCanvasState = {
      container: DEFAULT_CANVAS_CONTAINER,
      components: [],
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const htmlResult = generatePureHTML(mockCanvasState, {
      containerClass: 'pure-absolute-container',
      includeMetadata: true,
      prettyPrint: true
    });

    let finalHTML = htmlResult.html.replace(
      /class="pure-absolute-container"/,
      `class="pure-absolute-container ${css.classNames.join(' ')}"`
    );
    finalHTML = `<style>\n${css.css}\n</style>\n${finalHTML}`;

    console.log('Final HTML for CSS application test:');
    console.log('- Contains CSS:', finalHTML.includes('--global-bg-color:'));
    console.log('- Contains theme class:', finalHTML.includes('vb-theme-custom'));
    console.log('- CSS variable reference:', finalHTML.includes('background-color: var(--global-bg-color)'));

    // Parse the HTML as browser would
    const parser = new DOMParser();
    const doc = parser.parseFromString(finalHTML, 'text/html');

    // Verify CSS is present
    const styleTag = doc.querySelector('style');
    expect(styleTag).toBeTruthy();
    expect(styleTag?.textContent).toContain(`--global-bg-color: ${testColor}`);
    expect(styleTag?.textContent).toContain('background-color: var(--global-bg-color)');

    // Verify container has correct classes
    const container = doc.querySelector('.pure-absolute-container');
    expect(container).toBeTruthy();
    expect(container?.classList.contains('vb-theme-custom')).toBe(true);

    // Parse settings to verify they're correct after refresh
    const parsedSettings = parseExistingTemplate(finalHTML).globalSettings!;
    expect(parsedSettings.background?.color).toBe(testColor);
    expect(parsedSettings.background?.color).not.toContain('var(');

    console.log('✅ CSS applies correctly to canvas after refresh!');
  });
});