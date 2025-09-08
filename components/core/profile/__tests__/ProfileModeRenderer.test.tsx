// Tests for ProfileModeRenderer component
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileModeRenderer from '../ProfileModeRenderer';
import type { ProfileUser } from '../ProfileModeRenderer';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { featureFlags } from '@/lib/feature-flags';
import { transformNodeToReact } from '@/lib/template-renderer';

// Mock the feature flags
jest.mock('@/lib/feature-flags', () => ({
  featureFlags: {
    templateIslands: jest.fn(() => false)
  }
}));

// Mock the template renderer
jest.mock('@/lib/template-renderer', () => ({
  transformNodeToReact: jest.fn(() => <div data-testid="custom-template">Custom Template Content</div>)
}));

// Mock ProfileLayout
jest.mock('@/components/ui/layout/ProfileLayout', () => {
  return function MockProfileLayout({ children, customCSS }: any) {
    return (
      <div data-testid="profile-layout" data-custom-css={!!customCSS}>
        {children}
      </div>
    );
  };
});

describe('ProfileModeRenderer', () => {
  const mockResidentData: ResidentData = {
    owner: {
      id: 'user123',
      handle: 'testuser',
      displayName: 'Test User',
      avatarUrl: '/assets/default-avatar.gif'
    },
    viewer: { id: null },
    posts: [],
    guestbook: [],
    capabilities: { bio: 'Test bio' },
    images: [],
    profileImages: []
  };

  const createMockUser = (overrides: Partial<ProfileUser> = {}): ProfileUser => ({
    id: 'user123',
    handle: 'testuser',
    profile: {
      templateMode: 'default',
      customCSS: null,
      customTemplate: null,
      customTemplateAst: null,
      includeSiteCSS: true,
      hideNavigation: false,
      compiledTemplate: null,
      templateIslands: [],
      templateCompiledAt: null
    },
    ...overrides
  });

  describe('Default Mode', () => {
    it('should render default mode with fallback content', () => {
      const user = createMockUser();
      const fallbackContent = <div data-testid="fallback-content">Default Profile</div>;

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          fallbackContent={fallbackContent}
        />
      );

      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
      // Fallback content is rendered directly in default mode
    });

    it('should render placeholder when no fallback content provided', () => {
      const user = createMockUser();

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
        />
      );

      expect(screen.getByText('Profile loading...')).toBeInTheDocument();
      expect(screen.getByText('Default profile layout not provided')).toBeInTheDocument();
    });
  });

  describe('Enhanced Mode', () => {
    it('should render enhanced mode with custom CSS', () => {
      const user = createMockUser({
        profile: {
          templateMode: 'enhanced',
          customCSS: '.profile { background: red; }',
          customTemplate: null,
          customTemplateAst: null,
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: null,
          templateIslands: [],
          templateCompiledAt: null
        }
      });

      const fallbackContent = <div data-testid="enhanced-content">Enhanced Profile</div>;

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          fallbackContent={fallbackContent}
        />
      );

      expect(screen.getByTestId('enhanced-content')).toBeInTheDocument();
      expect(screen.getByTestId('profile-layout')).toHaveAttribute('data-custom-css', 'true');
    });

    it('should work without custom CSS', () => {
      const user = createMockUser({
        profile: {
          templateMode: 'enhanced',
          customCSS: null,
          customTemplate: null,
          customTemplateAst: null,
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: null,
          templateIslands: [],
          templateCompiledAt: null
        }
      });

      const fallbackContent = <div data-testid="enhanced-content">Enhanced Profile</div>;

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          fallbackContent={fallbackContent}
        />
      );

      expect(screen.getByTestId('enhanced-content')).toBeInTheDocument();
      expect(screen.getByTestId('profile-layout')).toHaveAttribute('data-custom-css', 'false');
    });
  });

  describe('Advanced Mode', () => {
    it('should render advanced mode with legacy template renderer', () => {
      const user = createMockUser({
        profile: {
          templateMode: 'advanced',
          customCSS: null,
          customTemplate: '<div>Custom template</div>',
          customTemplateAst: JSON.stringify({
            type: 'element',
            tagName: 'div',
            properties: {},
            children: [{ type: 'text', value: 'Custom template' }]
          }),
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: null,
          templateIslands: [],
          templateCompiledAt: null
        }
      });

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
        />
      );

      expect(screen.getByTestId('custom-template')).toBeInTheDocument();
    });

    it('should fallback to enhanced mode when no template AST available', () => {
      const user = createMockUser({
        profile: {
          templateMode: 'advanced',
          customCSS: '.fallback { color: blue; }',
          customTemplate: null,
          customTemplateAst: null,
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: null,
          templateIslands: [],
          templateCompiledAt: null
        }
      });

      const fallbackContent = <div data-testid="fallback-to-enhanced">Fallback Enhanced</div>;

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          fallbackContent={fallbackContent}
        />
      );

      // Should fallback to enhanced mode
      expect(screen.getByTestId('fallback-to-enhanced')).toBeInTheDocument();
      expect(screen.getByTestId('profile-layout')).toHaveAttribute('data-custom-css', 'true');
    });

    it('should render islands mode when feature is enabled and compiled template available', () => {
      // Mock feature flag to return true
      (featureFlags.templateIslands as jest.Mock).mockReturnValue(true);

      const user = createMockUser({
        profile: {
          templateMode: 'advanced',
          customCSS: null,
          customTemplate: '<div>Template</div>',
          customTemplateAst: '{}',
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: {
            mode: 'advanced',
            staticHTML: '<div data-island="test">Island Content</div>',
            islands: [],
            compiledAt: new Date(),
            errors: [],
            warnings: []
          },
          templateIslands: [],
          templateCompiledAt: new Date()
        }
      });

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          useIslands={true}
        />
      );

      expect(screen.getByText('Island Content')).toBeInTheDocument();
      // Islands mode renders static HTML with island placeholders

      // Reset mock
      featureFlags.templateIslands.mockReturnValue(false);
    });
  });

  describe('Error Handling', () => {
    it('should fallback gracefully when rendering fails', () => {
      // Mock template renderer to throw error
      (transformNodeToReact as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Template rendering failed');
      });

      const user = createMockUser({
        profile: {
          templateMode: 'advanced',
          customCSS: '.fallback { color: green; }',
          customTemplate: '<div>Template</div>',
          customTemplateAst: '{}',
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: null,
          templateIslands: [],
          templateCompiledAt: null
        }
      });

      const fallbackContent = <div data-testid="error-fallback">Error Fallback</div>;

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          fallbackContent={fallbackContent}
        />
      );

      // Should fallback to enhanced mode with custom CSS
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('profile-layout')).toHaveAttribute('data-custom-css', 'true');

      // Reset mock
      transformNodeToReact.mockRestore();
    });

    it('should handle unknown template mode', () => {
      const user = createMockUser({
        profile: {
          templateMode: 'unknown' as any,
          customCSS: null,
          customTemplate: null,
          customTemplateAst: null,
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: null,
          templateIslands: [],
          templateCompiledAt: null
        }
      });

      const fallbackContent = <div data-testid="unknown-mode-fallback">Unknown Mode Fallback</div>;

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          fallbackContent={fallbackContent}
        />
      );

      // Should fallback to default mode
      expect(screen.getByTestId('unknown-mode-fallback')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onModeChange when component mounts', () => {
      const onModeChange = jest.fn();
      const user = createMockUser({
        profile: {
          templateMode: 'enhanced',
          customCSS: null,
          customTemplate: null,
          customTemplateAst: null,
          includeSiteCSS: true,
          hideNavigation: false,
          compiledTemplate: null,
          templateIslands: [],
          templateCompiledAt: null
        }
      });

      render(
        <ProfileModeRenderer
          user={user}
          residentData={mockResidentData}
          onModeChange={onModeChange}
        />
      );

      expect(onModeChange).toHaveBeenCalledWith('enhanced');
    });
  });
});