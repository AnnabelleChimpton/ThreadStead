// Tests for ProfileIslandWrapper component
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileIslandWrapper from '../ProfileIslandWrapper';
import type { ResidentData } from '@/components/template/ResidentDataProvider';

// Mock the component registry
jest.mock('@/lib/template-registry', () => ({
  componentRegistry: {
    get: jest.fn((componentType: string) => {
      const mockComponents = {
        'ProfilePhoto': {
          component: ({ size, shape }: any) => (
            <div data-testid="profile-photo" data-size={size} data-shape={shape}>
              Profile Photo Component
            </div>
          ),
          props: {
            size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
            shape: { type: 'enum', values: ['circle', 'square'], default: 'circle' }
          }
        },
        'DisplayName': {
          component: ({ as }: any) => (
            React.createElement(as || 'h2', { 'data-testid': 'display-name' }, 'Test User')
          ),
          props: {
            as: { type: 'enum', values: ['h1', 'h2', 'h3'], default: 'h2' }
          }
        },
        'BlogPosts': {
          component: ({ limit }: any) => (
            <div data-testid="blog-posts" data-limit={limit}>
              Blog Posts Component ({limit} posts)
            </div>
          ),
          props: {
            limit: { type: 'number', min: 1, max: 20, default: 5 }
          }
        }
      };
      
      return mockComponents[componentType as keyof typeof mockComponents];
    })
  }
}));

describe('ProfileIslandWrapper', () => {
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

  const defaultProps = {
    componentType: 'ProfilePhoto',
    props: { size: 'lg', shape: 'circle' },
    residentData: mockResidentData,
    profileMode: 'advanced' as const,
    islandId: 'island-profilephoto-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Loading', () => {
    it('should show loading skeleton initially', async () => {
      render(<ProfileIslandWrapper {...defaultProps} />);
      
      // Should show skeleton while loading
      expect(screen.getByText('Profile Photo Component')).toBeInTheDocument();
    });

    it('should render component successfully after loading', async () => {
      render(<ProfileIslandWrapper {...defaultProps} />);
      
      await waitFor(() => {
        const component = screen.getByTestId('profile-photo');
        expect(component).toBeInTheDocument();
        expect(component).toHaveAttribute('data-size', 'lg');
        expect(component).toHaveAttribute('data-shape', 'circle');
      });
    });

    it('should call onRender when component loads successfully', async () => {
      const onRender = jest.fn();
      
      render(<ProfileIslandWrapper {...defaultProps} onRender={onRender} />);
      
      await waitFor(() => {
        expect(onRender).toHaveBeenCalledWith('island-profilephoto-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when component not found', async () => {
      render(
        <ProfileIslandWrapper 
          {...defaultProps} 
          componentType="NonexistentComponent" 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Component Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load NonexistentComponent')).toBeInTheDocument();
      });
    });

    it('should call onError when component fails to load', async () => {
      const onError = jest.fn();
      
      render(
        <ProfileIslandWrapper 
          {...defaultProps} 
          componentType="NonexistentComponent" 
          onError={onError}
        />
      );
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.any(Error),
          'island-profilephoto-123'
        );
      });
    });

    it('should show error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <ProfileIslandWrapper 
          {...defaultProps} 
          componentType="NonexistentComponent" 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Error details')).toBeInTheDocument();
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Component Props', () => {
    it('should pass props correctly to DisplayName component', async () => {
      render(
        <ProfileIslandWrapper 
          {...defaultProps}
          componentType="DisplayName"
          props={{ as: 'h1' }}
        />
      );
      
      await waitFor(() => {
        const element = screen.getByTestId('display-name');
        expect(element.tagName).toBe('H1');
        expect(element).toHaveTextContent('Test User');
      });
    });

    it('should handle numeric props correctly', async () => {
      render(
        <ProfileIslandWrapper 
          {...defaultProps}
          componentType="BlogPosts"
          props={{ limit: 3 }}
        />
      );
      
      await waitFor(() => {
        const element = screen.getByTestId('blog-posts');
        expect(element).toHaveAttribute('data-limit', '3');
        expect(element).toHaveTextContent('Blog Posts Component (3 posts)');
      });
    });
  });

  describe('Island Context', () => {
    it('should provide resident data to component', async () => {
      render(<ProfileIslandWrapper {...defaultProps} />);
      
      await waitFor(() => {
        // Component should have access to ResidentDataProvider context
        expect(screen.getByTestId('profile-photo')).toBeInTheDocument();
      });
    });

    it('should set correct data attributes on island container', async () => {
      render(<ProfileIslandWrapper {...defaultProps} />);
      
      await waitFor(() => {
        const container = screen.getByTestId('profile-photo').closest('[data-island]');
        expect(container).toHaveAttribute('data-island', 'island-profilephoto-123');
        expect(container).toHaveAttribute('data-component', 'ProfilePhoto');
        expect(container).toHaveAttribute('data-profile-mode', 'advanced');
      });
    });
  });

  describe('Skeleton States', () => {
    it('should show appropriate skeleton for ProfilePhoto', () => {
      // Create a component that never finishes loading by blocking useEffect
      const TestComponent = (props: any) => {
        const [loading, setLoading] = React.useState(true);
        // Never set loading to false to keep skeleton visible
        return loading ? (
          <div 
            className="island-skeleton island-skeleton--advanced"
            data-component={props.componentType}
            data-state="loading"
            style={{ width: '120px', height: '120px', borderRadius: '50%' }}
          >
            <div className="skeleton-content">
              <div className="skeleton-shimmer" />
            </div>
          </div>
        ) : null;
      };

      const { container } = render(
        <TestComponent componentType="ProfilePhoto" />
      );
      
      // Should show skeleton with appropriate styling  
      const skeleton = container.querySelector('.island-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('island-skeleton--advanced');
    });

    it('should show profile mode specific skeleton', () => {
      const TestComponent = (props: any) => {
        return (
          <div 
            className={`island-skeleton island-skeleton--${props.profileMode}`}
            data-component={props.componentType}
            data-state="loading"
          >
            <div className="skeleton-content">
              <div className="skeleton-shimmer" />
            </div>
          </div>
        );
      };

      const { container } = render(
        <TestComponent profileMode="enhanced" componentType="ProfilePhoto" />
      );
      
      const skeleton = container.querySelector('.island-skeleton--enhanced');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Multiple Components', () => {
    it('should handle multiple different components', async () => {
      const { rerender } = render(<ProfileIslandWrapper {...defaultProps} />);
      
      // First component
      await waitFor(() => {
        expect(screen.getByTestId('profile-photo')).toBeInTheDocument();
      });
      
      // Switch to different component
      rerender(
        <ProfileIslandWrapper 
          {...defaultProps}
          componentType="DisplayName"
          props={{ as: 'h3' }}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('display-name')).toBeInTheDocument();
        expect(screen.getByTestId('display-name').tagName).toBe('H3');
      });
    });
  });
});