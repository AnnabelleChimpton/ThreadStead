import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ResidentDataProvider, type ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { componentRegistry } from '../core/template-registry';

// Default mock resident data for testing
export const createMockResidentData = (overrides: Partial<ResidentData> = {}): ResidentData => ({
  owner: {
    id: 'test-user-123',
    handle: 'testuser',
    displayName: 'Test User',
    avatarUrl: '/assets/default-avatar.gif'
  },
  viewer: { id: null },
  posts: [
    {
      id: 'post-1',
      bodyHtml: '<p>This is a test post with <strong>formatting</strong>.</p>',
      createdAt: new Date().toISOString()
    },
    {
      id: 'post-2',
      bodyHtml: '<p>Another test post for testing purposes.</p>',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  guestbook: [
    {
      id: 'guest-1',
      message: 'Hello from a test visitor!',
      authorUsername: 'visitor1',
      createdAt: new Date().toISOString()
    }
  ],
  relationships: {},
  capabilities: {
    bio: 'This is a test user bio for template testing.'
  },
  images: [
    {
      id: 'img-1',
      url: '/test-images/sample.jpg',
      alt: 'Test image',
      caption: 'A test image',
      createdAt: new Date().toISOString()
    }
  ],
  profileImages: [
    {
      id: 'profile-img-1',
      url: '/test-images/banner.jpg',
      alt: 'Profile banner',
      type: 'banner' as const
    }
  ],
  ...overrides
});

// Wrapper component that provides template context
interface TemplateTestWrapperProps {
  children: React.ReactNode;
  residentData?: ResidentData;
}

export const TemplateTestWrapper: React.FC<TemplateTestWrapperProps> = ({ 
  children, 
  residentData = createMockResidentData() 
}) => {
  return (
    <ResidentDataProvider data={residentData}>
      {children}
    </ResidentDataProvider>
  );
};

// Custom render function that includes template context
export const renderWithTemplateContext = (
  ui: React.ReactElement,
  options: {
    residentData?: ResidentData;
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  } = {}
): RenderResult => {
  const { residentData = createMockResidentData(), renderOptions = {} } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <TemplateTestWrapper residentData={residentData}>
        {children}
      </TemplateTestWrapper>
    ),
    ...renderOptions,
  });
};

// Helper to get a registered component for testing
export const getRegisteredComponent = (name: string) => {
  const registration = componentRegistry.get(name);
  if (!registration) {
    throw new Error(`Component ${name} not found in registry`);
  }
  return registration;
};

// Mock component registration for testing
export const createMockComponentRegistration = (name: string, Component: React.ComponentType<Record<string, unknown>>, props = {}) => {
  return {
    name,
    component: Component,
    props,
    fromAttrs: (attrs: Record<string, string>) => attrs
  };
};

// Helper to create test template AST
export interface TestTemplateNode {
  type: 'element' | 'text' | 'root';
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: TestTemplateNode[];
  value?: string;
}

export const createTestTemplateAST = (tagName: string, properties = {}, children: TestTemplateNode[] = []): TestTemplateNode => ({
  type: 'element',
  tagName,
  properties,
  children
});

export const createTestTextNode = (value: string): TestTemplateNode => ({
  type: 'text',
  value
});

// Template compilation test utilities  
export const expectValidTemplate = async (template: string) => {
  const { compileTemplate } = await import('../compilation/template-parser');
  const result = compileTemplate(template);
  expect(result.success).toBe(true);
  expect(result.errors).toHaveLength(0);
  return result;
};

export const expectInvalidTemplate = async (template: string, expectedError?: string) => {
  const { compileTemplate } = await import('../compilation/template-parser');
  const result = compileTemplate(template);
  expect(result.success).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  if (expectedError) {
    expect(result.errors.some(error => error.includes(expectedError))).toBe(true);
  }
  return result;
};

// Shadow DOM testing utilities
export const createTestShadowDOM = (): { shadowRoot: ShadowRoot; cleanup: () => void } => {
  const hostElement = document.createElement('div');
  document.body.appendChild(hostElement);
  
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  container.id = 'shadow-content';
  shadowRoot.appendChild(container);

  const cleanup = () => {
    document.body.removeChild(hostElement);
  };

  return { shadowRoot, cleanup };
};

// Component prop validation testing
export const testComponentProps = async (componentName: string, validProps: Record<string, unknown>, invalidProps: Record<string, unknown> = {}) => {
  const { validateAndCoerceProps } = await import('../core/template-registry');
  const registration = getRegisteredComponent(componentName);

  describe(`${componentName} props validation`, () => {
    it('should accept valid props', () => {
      const result = validateAndCoerceProps(validProps, registration.props);
      expect(result).toMatchObject(validProps);
    });

    if (Object.keys(invalidProps).length > 0) {
      it('should handle invalid props gracefully', () => {
        console.warn = jest.fn(); // Mock console.warn to avoid test noise
        const result = validateAndCoerceProps(invalidProps, registration.props);
        expect(result).toBeDefined();
      });
    }
  });
};

// Template rendering test utilities
export const testTemplateRendering = async (template: string, _expectedElements: string[]) => {
  const { TemplateEngine } = await import('../core/template-engine');
  const residentData = createMockResidentData();
  
  const compileResult = TemplateEngine.compile({ html: template, mode: 'custom-tags' });
  expect(compileResult.success).toBe(true);
  
  const renderResult = TemplateEngine.render({
    ast: compileResult.ast!,
    residentData,
    mode: 'preview'
  });
  
  expect(renderResult.success).toBe(true);
  return renderResult.content;
};

// Mock fetch for API testing
export const mockFetch = (responses: Record<string, any>) => {
  const originalFetch = global.fetch;
  
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const response = responses[url];
    if (response) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
        status: 200
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' })
    });
  });

  return () => {
    global.fetch = originalFetch;
  };
};

// Async component testing utilities
export const waitForComponent = async (getByTestId: (testId: string) => HTMLElement, testId: string, timeout = 5000) => {
  return new Promise<HTMLElement>((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        const element = getByTestId(testId);
        resolve(element);
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Component with testId "${testId}" not found within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      }
    };
    
    check();
  });
};

export default {
  createMockResidentData,
  TemplateTestWrapper,
  renderWithTemplateContext,
  getRegisteredComponent,
  createMockComponentRegistration,
  createTestTemplateAST,
  createTestTextNode,
  expectValidTemplate,
  expectInvalidTemplate,
  createTestShadowDOM,
  testComponentProps,
  testTemplateRendering,
  mockFetch,
  waitForComponent
};