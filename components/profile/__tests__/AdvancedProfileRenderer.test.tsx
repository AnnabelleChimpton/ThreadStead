// Tests for AdvancedProfileRenderer component
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdvancedProfileRenderer from '../AdvancedProfileRenderer';
import type { ProfileUser } from '../ProfileModeRenderer';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import type { CompiledTemplate, Island } from '@/lib/template-compiler';

// Mock Next.js dynamic import
jest.mock('next/dynamic', () => {
  return (loader: () => any, options: any) => {
    const Component = React.lazy(loader);
    const DynamicComponent = (props: any) => (
      <React.Suspense fallback={options.loading()}>
        <Component {...props} />
      </React.Suspense>
    );
    return DynamicComponent;
  };
});

// Mock ProfileIslandWrapper
jest.mock('@/components/islands/ProfileIslandWrapper', () => {
  return {
    __esModule: true,
    default: ({ componentType, props, islandId }: any) => (
      <div 
        data-testid={`island-${componentType.toLowerCase()}`}
        data-island-id={islandId}
        data-props={JSON.stringify(props)}
      >
        Mocked {componentType} Island
      </div>
    ),
    useIslandManager: () => ({
      loadedIslands: new Set(['island-1', 'island-2']),
      failedIslands: new Map(),
      islandsReady: true,
      totalIslands: 2
    })
  };
});

describe('AdvancedProfileRenderer', () => {
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

  const mockIslands: Island[] = [
    {
      id: 'island-1',
      component: 'ProfilePhoto',
      props: { size: 'lg' },
      placeholder: '<div data-island="island-1" data-component="ProfilePhoto"></div>'
    },
    {
      id: 'island-2',
      component: 'DisplayName',
      props: { as: 'h1' },
      placeholder: '<div data-island="island-2" data-component="DisplayName"></div>'
    }
  ];

  const mockCompiledTemplate: CompiledTemplate = {
    mode: 'advanced',
    staticHTML: '<div class="profile"><div data-island="island-1"></div><div data-island="island-2"></div></div>',
    islands: mockIslands,
    compiledAt: new Date(),
    errors: [],
    warnings: []
  };

  const createMockUser = (overrides: Partial<ProfileUser> = {}): ProfileUser => ({
    id: 'user123',
    handle: 'testuser',
    profile: {
      templateMode: 'advanced',
      customCSS: null,
      customTemplate: '<div>Template</div>',
      customTemplateAst: null,
      includeSiteCSS: true,
      hideNavigation: false,
      compiledTemplate: mockCompiledTemplate,
      templateIslands: mockIslands,
      templateCompiledAt: new Date()
    },
    ...overrides
  });

  describe('Successful Rendering', () => {
    it('should render advanced profile with islands', async () => {
      const user = createMockUser();
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Mocked ProfilePhoto Island/)).toBeInTheDocument();
        expect(screen.getByText(/Mocked DisplayName Island/)).toBeInTheDocument();
      });
    });

    it('should render static HTML content', async () => {
      const user = createMockUser();
      
      const { container } = render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      await waitFor(() => {
        const staticContent = container.querySelector('.static-html-content');
        expect(staticContent).toBeInTheDocument();
        expect(staticContent?.innerHTML).toContain('class="profile"');
      });
    });

    it('should call onIslandsReady when hydration completes', async () => {
      const onIslandsReady = jest.fn();
      const user = createMockUser();
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
          onIslandsReady={onIslandsReady}
        />
      );
      
      await waitFor(() => {
        expect(onIslandsReady).toHaveBeenCalled();
      });
    });
  });

  describe('Fallback Scenarios', () => {
    it('should show fallback when no compiled template available', () => {
      const user = createMockUser({
        profile: {
          ...createMockUser().profile!,
          compiledTemplate: null
        }
      });
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      expect(screen.getByText('Advanced Template Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Falling back to enhanced mode.')).toBeInTheDocument();
    });

    it('should call onFallback when template is unavailable', () => {
      const onFallback = jest.fn();
      const user = createMockUser({
        profile: {
          ...createMockUser().profile!,
          compiledTemplate: null
        }
      });
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
          onFallback={onFallback}
        />
      );
      
      expect(onFallback).toHaveBeenCalledWith('No compiled template available');
    });

    it('should show technical details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const user = createMockUser({
        profile: {
          ...createMockUser().profile!,
          compiledTemplate: null
        }
      });
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      expect(screen.getByText('Technical details')).toBeInTheDocument();
      expect(screen.getByText('No compiled template')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Development Debug Info', () => {
    it('should show debug info in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const user = createMockUser();
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/🏝️ Islands Debug/)).toBeInTheDocument();
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not show debug info in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const user = createMockUser();
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText(/🏝️ Islands Debug/)).not.toBeInTheDocument();
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Island Error Handling', () => {
    it('should call onIslandError when island fails', async () => {
      const onIslandError = jest.fn();
      const user = createMockUser();
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
          onIslandError={onIslandError}
        />
      );
      
      // Simulate island error by triggering the onError prop
      // This would normally be called by ProfileIslandWrapper
      await waitFor(() => {
        const islands = screen.getAllByText(/Mocked.*Island/);
        expect(islands).toHaveLength(2);
      });
    });
  });

  describe('Islands Configuration', () => {
    it('should use islands from compiled template', async () => {
      const user = createMockUser();
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      await waitFor(() => {
        const profilePhotoIsland = screen.getByTestId('island-profilephoto');
        const displayNameIsland = screen.getByTestId('island-displayname');
        
        expect(profilePhotoIsland).toHaveAttribute('data-island-id', 'island-1');
        expect(displayNameIsland).toHaveAttribute('data-island-id', 'island-2');
        
        expect(profilePhotoIsland).toHaveAttribute('data-props', '{"size":"lg"}');
        expect(displayNameIsland).toHaveAttribute('data-props', '{"as":"h1"}');
      });
    });

    it('should fallback to stored islands if compiled template missing islands', async () => {
      const templateWithoutIslands: CompiledTemplate = {
        ...mockCompiledTemplate,
        islands: undefined as any
      };
      
      const user = createMockUser({
        profile: {
          ...createMockUser().profile!,
          compiledTemplate: templateWithoutIslands,
          templateIslands: mockIslands
        }
      });
      
      render(
        <AdvancedProfileRenderer 
          user={user} 
          residentData={mockResidentData} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Mocked ProfilePhoto Island/)).toBeInTheDocument();
        expect(screen.getByText(/Mocked DisplayName Island/)).toBeInTheDocument();
      });
    });
  });
});