/**
 * Test: EnhancedTemplateEditor ↔ VisualBuilder CSS Integration
 * Purpose: Verify CSS from the CSS tab is correctly passed to Visual Builder
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock problematic dependencies
jest.mock('@/lib/templates/core/template-registry', () => ({
  componentRegistry: {
    get: jest.fn(),
    getAllowedTags: jest.fn(() => [])
  }
}));

jest.mock('@/lib/api/did/did-client', () => ({}));
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/test'
  })
}));

jest.mock('@/hooks/useSiteConfig', () => ({
  useSiteConfig: () => ({ isLoading: false, siteConfig: null })
}));

jest.mock('@/hooks/useSiteCSS', () => ({
  useSiteCSS: () => ({ css: '', isLoading: false })
}));

// Mock VisualTemplateBuilder to capture what props it receives
jest.mock('../../visual-builder/VisualTemplateBuilder', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="visual-builder">Visual Builder</div>)
}));

import EnhancedTemplateEditor from '../../EnhancedTemplateEditor';
import MockedVisualTemplateBuilder from '../../visual-builder/VisualTemplateBuilder';

const MockVisualTemplateBuilder = MockedVisualTemplateBuilder as jest.MockedFunction<typeof MockedVisualTemplateBuilder>;

describe('EnhancedTemplateEditor ↔ VisualBuilder CSS Integration', () => {
  beforeEach(() => {
    MockVisualTemplateBuilder.mockClear();
  });

  test('Visual Builder should receive combined HTML + CSS when CSS tab has content', async () => {
    const htmlContent = '<div class="pure-absolute-container vb-theme-custom"><h1>Test</h1></div>';
    const cssContent = `/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #b01717;
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}`;

    const mockResidentData = {
      owner: { id: 'test', handle: 'test', displayName: 'Test' },
      viewer: { id: 'test' },
      posts: [],
      guestbook: [],
      relationships: {},
      capabilities: {},
      images: [],
      profileImages: []
    };

    // Render with separated HTML and CSS (simulating CSS tab)
    const { getByText } = render(
      <EnhancedTemplateEditor
        user={{ id: 'test-user', primaryHandle: 'test@example.com' }}
        initialTemplate={htmlContent}
        initialCSS={cssContent}
        onSave={jest.fn()}
        residentData={mockResidentData}
        templateEnabled={true}
      />
    );

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading editor...')).not.toBeInTheDocument();
    });

    // Switch to visual mode
    const visualModeButton = getByText('Visual Builder');
    fireEvent.click(visualModeButton);

    // Check that VisualTemplateBuilder was called
    expect(MockVisualTemplateBuilder).toHaveBeenCalled();

    // Get the props passed to VisualTemplateBuilder
    const props = MockVisualTemplateBuilder.mock.calls[0][0];
    console.log('VisualBuilder received initialTemplate:', props.initialTemplate);

    // The initialTemplate should contain both CSS and HTML combined
    expect(props.initialTemplate).toContain('<style>');
    expect(props.initialTemplate).toContain('--global-bg-color: #b01717');
    expect(props.initialTemplate).toContain('.vb-theme-custom');
    expect(props.initialTemplate).toContain('<div class="pure-absolute-container vb-theme-custom">');
    expect(props.initialTemplate).toContain('<h1>Test</h1>');
  });

  test('Visual Builder should receive only HTML when CSS tab is empty', async () => {
    const htmlContent = '<div class="pure-absolute-container"><h1>Test</h1></div>';
    const emptyCssContent = '/* Add your custom CSS here */\n\n';

    const mockResidentData = {
      owner: { id: 'test', handle: 'test', displayName: 'Test' },
      viewer: { id: 'test' },
      posts: [],
      guestbook: [],
      relationships: {},
      capabilities: {},
      images: [],
      profileImages: []
    };

    const { getByText } = render(
      <EnhancedTemplateEditor
        user={{ id: 'test-user', primaryHandle: 'test@example.com' }}
        initialTemplate={htmlContent}
        initialCSS={emptyCssContent}
        onSave={jest.fn()}
        residentData={mockResidentData}
        templateEnabled={true}
      />
    );

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading editor...')).not.toBeInTheDocument();
    });

    // Switch to visual mode
    const visualModeButton = getByText('Visual Builder');
    fireEvent.click(visualModeButton);

    // Get the props passed to VisualTemplateBuilder
    const props = MockVisualTemplateBuilder.mock.calls[0][0];
    console.log('VisualBuilder received for empty CSS:', props.initialTemplate);

    // Should receive only HTML, no CSS injection
    expect(props.initialTemplate).toBe(htmlContent);
    expect(props.initialTemplate).not.toContain('<style>');
  });

  test('handleVisualTemplateChange should separate CSS and HTML correctly', () => {
    const htmlContent = '<div class="pure-absolute-container"><h1>Test</h1></div>';
    const initialCSS = '/* My custom styles */\n.my-class { color: blue; }';

    // Mock the callback to capture what gets passed to handleVisualTemplateChange
    let capturedTemplate = '';
    let capturedCSS = '';

    const TestWrapper = () => {
      const [template, setTemplate] = React.useState(htmlContent);
      const [customCSS, setCustomCSS] = React.useState(initialCSS);

      // Create a mock handleVisualTemplateChange that we can observe
      const handleVisualTemplateChange = React.useCallback((html: string) => {
        capturedTemplate = html;

        // Simulate the logic from EnhancedTemplateEditor
        const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);

        if (styleMatches && styleMatches.length > 0) {
          let newCSS = '';
          let userCSS = customCSS || '';

          styleMatches.forEach(styleTag => {
            const cssMatch = styleTag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            if (cssMatch && cssMatch[1]) {
              const css = cssMatch[1].trim();

              const isVisualBuilderCSS =
                css.includes('Visual Builder Generated CSS') ||
                css.includes('--global-bg-color') ||
                css.includes('.vb-theme-');

              if (isVisualBuilderCSS) {
                userCSS = userCSS.replace(/\/\* Visual Builder Generated CSS \*\/[\s\S]*?(?=\/\*[^*]|\s*$)/g, '').trim();
                newCSS = css;
              } else {
                if (!userCSS.includes(css)) {
                  userCSS += userCSS ? '\n\n' + css : css;
                }
              }
            }
          });

          const combinedCSS = newCSS ?
            (userCSS ? `${userCSS}\n\n/* Visual Builder Generated CSS */\n${newCSS}` : newCSS) :
            userCSS;

          capturedCSS = combinedCSS;
          setCustomCSS(combinedCSS);
        }

        const cleanedHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
        setTemplate(cleanedHtml);
      }, [customCSS]);

      // Simulate Visual Builder returning HTML with embedded CSS
      React.useEffect(() => {
        const htmlWithCSS = `<style>
/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #cc2e2e;
}
.vb-theme-custom {
  background-color: var(--global-bg-color);
}
</style>
<div class="pure-absolute-container vb-theme-custom">
  <h1>Updated Content</h1>
</div>`;

        handleVisualTemplateChange(htmlWithCSS);
      }, [handleVisualTemplateChange]);

      return <div data-testid="wrapper">Wrapper</div>;
    };

    render(<TestWrapper />);

    // Verify the separation worked correctly
    console.log('Captured template:', capturedTemplate);
    console.log('Captured CSS:', capturedCSS);

    // Template should have CSS removed
    expect(capturedTemplate).toContain('<div class="pure-absolute-container vb-theme-custom">');
    expect(capturedTemplate).toContain('<h1>Updated Content</h1>');
    expect(capturedTemplate).not.toContain('<style>');
    expect(capturedTemplate).not.toContain('--global-bg-color');

    // CSS should contain both user CSS and Visual Builder CSS
    expect(capturedCSS).toContain('/* My custom styles */');
    expect(capturedCSS).toContain('.my-class { color: blue; }');
    expect(capturedCSS).toContain('/* Visual Builder Generated CSS */');
    expect(capturedCSS).toContain('--global-bg-color: #cc2e2e');
  });

  test('CSS with Visual Builder content should be properly combined', async () => {
    const htmlContent = '<div class="pure-absolute-container vb-theme-custom"></div>';

    // CSS that already contains Visual Builder CSS
    const cssWithVB = `/* User styles */
.my-class { font-size: 14px; }

/* Visual Builder Generated CSS */
:root {
  --global-bg-color: #old-color;
}`;

    const mockResidentData = {
      owner: { id: 'test', handle: 'test', displayName: 'Test' },
      viewer: { id: 'test' },
      posts: [],
      guestbook: [],
      relationships: {},
      capabilities: {},
      images: [],
      profileImages: []
    };

    const { getByText } = render(
      <EnhancedTemplateEditor
        user={{ id: 'test-user', primaryHandle: 'test@example.com' }}
        initialTemplate={htmlContent}
        initialCSS={cssWithVB}
        onSave={jest.fn()}
        residentData={mockResidentData}
        templateEnabled={true}
      />
    );

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading editor...')).not.toBeInTheDocument();
    });

    // Switch to visual mode
    const visualModeButton = getByText('Visual Builder');
    fireEvent.click(visualModeButton);

    const props = MockVisualTemplateBuilder.mock.calls[0][0];
    console.log('Combined template with existing VB CSS:', props.initialTemplate);

    // Should contain both the user styles and Visual Builder styles
    expect(props.initialTemplate).toContain('/* User styles */');
    expect(props.initialTemplate).toContain('.my-class { font-size: 14px; }');
    expect(props.initialTemplate).toContain('/* Visual Builder Generated CSS */');
    expect(props.initialTemplate).toContain('--global-bg-color: #old-color');
    expect(props.initialTemplate).toContain('<div class="pure-absolute-container vb-theme-custom">');
  });
});