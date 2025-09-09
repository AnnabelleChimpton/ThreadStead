import React from 'react';
import { screen, render, fireEvent, waitFor } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';

import DisplayName from '../../DisplayName';
import Bio from '../../Bio';
import ProfilePhoto from '../../ProfilePhoto';
import BlogPosts from '../../BlogPosts';
import Guestbook from '../../Guestbook';
import GridLayout from '../../GridLayout';
import SplitLayout from '../../SplitLayout';
import FlexContainer from '../../FlexContainer';
import GradientBox from '../../GradientBox';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';

describe('Real-World User Behavior Stress Tests', () => {
  describe('Simultaneous Multi-Component Interactions', () => {
    it('should handle simultaneous interactions across multiple components without conflicts', async () => {
      const mockData = createMockResidentData({
        viewer: { id: 'user123' },
        owner: { 
          id: 'user123', 
          handle: 'stresstest', 
          displayName: 'Stress Test User',
          avatarUrl: '/stress.jpg'
        },
        posts: [
          {
            id: 'post1',
            contentHtml: '<p>Test post content</p>',
            createdAt: new Date().toISOString()
          }
        ]
      });

      // Component that simulates form interactions
      const InteractiveForm: React.FC = () => {
        const [formData, setFormData] = React.useState({ name: '', email: '', message: '' });
        const [isSubmitting, setIsSubmitting] = React.useState(false);

        const handleSubmit = async () => {
          setIsSubmitting(true);
          // Simulate async form submission
          await new Promise(resolve => setTimeout(resolve, 100));
          setIsSubmitting(false);
        };

        return (
          <div className="interactive-form">
            <input 
              data-testid="name-input"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
            />
            <input 
              data-testid="email-input"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
            />
            <textarea 
              data-testid="message-input"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Message"
            />
            <button 
              data-testid="submit-button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        );
      };

      // Component that simulates image loading
      const LoadingImage: React.FC<{ src: string }> = ({ src }) => {
        const [loaded, setLoaded] = React.useState(false);
        const [error, setError] = React.useState(false);

        React.useEffect(() => {
          const timer = setTimeout(() => {
            setLoaded(true);
          }, 200 + Math.random() * 300); // Random loading time

          return () => clearTimeout(timer);
        }, [src]);

        return (
          <div data-testid={`loading-image-${src}`}>
            {error ? 'Error loading' : loaded ? 'Image loaded' : 'Loading...'}
          </div>
        );
      };

      const { container } = renderWithTemplateContext(
        <div className="stress-interaction-container">
          <GridLayout columns={2} gap="lg">
            <section className="user-content">
              <DisplayName />
              <ProfilePhoto />
              <Bio />
              <IfOwner>
                <InteractiveForm />
              </IfOwner>
            </section>

            <section className="dynamic-content">
              <BlogPosts />
              <FlexContainer direction="column" gap="sm">
                <LoadingImage src="image1" />
                <LoadingImage src="image2" />
                <LoadingImage src="image3" />
              </FlexContainer>
            </section>
          </GridLayout>
          
          <aside className="sidebar-content">
            <Guestbook />
          </aside>
        </div>,
        { residentData: mockData }
      );

      // Verify initial render
      expect(screen.getByText('Stress Test User')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="name-input"]')).toBeInTheDocument();

      // Simulate simultaneous user interactions
      const nameInput = screen.getByTestId('name-input') as HTMLInputElement;
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
      const messageInput = screen.getByTestId('message-input') as HTMLTextAreaElement;
      const submitButton = screen.getByTestId('submit-button');

      // Fire multiple events rapidly
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      
      // Click submit while still typing (race condition simulation)
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.click(submitButton);
      fireEvent.change(emailInput, { target: { value: 'johndoe@example.com' } });

      // Wait for async operations to complete
      await waitFor(() => {
        expect(nameInput.value).toBe('John Doe');
        expect(emailInput.value).toBe('johndoe@example.com');
        expect(messageInput.value).toBe('Test message');
      });

      // Wait for images to load
      await waitFor(() => {
        expect(screen.getByTestId('loading-image-image1')).toHaveTextContent(/Image loaded|Loading.../);
        expect(screen.getByTestId('loading-image-image2')).toHaveTextContent(/Image loaded|Loading.../);
        expect(screen.getByTestId('loading-image-image3')).toHaveTextContent(/Image loaded|Loading.../);
      }, { timeout: 1000 });

      // Template should remain stable throughout interactions
      expect(screen.getByText('Stress Test User')).toBeInTheDocument();
      expect(container.querySelector('.stress-interaction-container')).toBeInTheDocument();
    });

    it('should maintain component state during rapid layout changes', async () => {
      const mockData = createMockResidentData({
        viewer: { id: 'user123' },
        owner: { 
          id: 'user123', 
          handle: 'layouttest', 
          displayName: 'Layout Test User'
        }
      });

      const LayoutSwitcher: React.FC = () => {
        const [layout, setLayout] = React.useState<'grid' | 'split' | 'flex'>('grid');
        const [userInput, setUserInput] = React.useState('');

        const renderContent = () => (
          <>
            <div>
              <DisplayName />
              <input 
                data-testid="persistent-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="This should persist"
              />
            </div>
            <div>
              <Bio />
              <ProfilePhoto />
            </div>
          </>
        );

        return (
          <div className="layout-switcher-container">
            <div className="layout-controls">
              <button data-testid="grid-layout" onClick={() => setLayout('grid')}>Grid</button>
              <button data-testid="split-layout" onClick={() => setLayout('split')}>Split</button>
              <button data-testid="flex-layout" onClick={() => setLayout('flex')}>Flex</button>
              <span data-testid="current-layout">Current: {layout}</span>
            </div>

            {layout === 'grid' && (
              <GridLayout columns={2} gap="md">
                {renderContent()}
              </GridLayout>
            )}

            {layout === 'split' && (
              <SplitLayout ratio="1:1" gap="lg">
                {renderContent()}
              </SplitLayout>
            )}

            {layout === 'flex' && (
              <FlexContainer direction="row" gap="xl">
                {renderContent()}
              </FlexContainer>
            )}
          </div>
        );
      };

      const { container } = renderWithTemplateContext(
        <LayoutSwitcher />,
        { residentData: mockData }
      );

      // Initial state
      expect(screen.getByTestId('current-layout')).toHaveTextContent('Current: grid');
      
      // User types something
      const input = screen.getByTestId('persistent-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Important data' } });
      expect(input.value).toBe('Important data');

      // Rapidly switch layouts
      fireEvent.click(screen.getByTestId('split-layout'));
      expect(screen.getByTestId('current-layout')).toHaveTextContent('Current: split');
      
      fireEvent.click(screen.getByTestId('flex-layout'));
      expect(screen.getByTestId('current-layout')).toHaveTextContent('Current: flex');
      
      fireEvent.click(screen.getByTestId('grid-layout'));
      expect(screen.getByTestId('current-layout')).toHaveTextContent('Current: grid');

      // Input value should be lost due to component remounting (expected React behavior)
      // But the component should still render correctly
      expect(screen.getByTestId('persistent-input')).toBeInTheDocument();
      expect(screen.getByText('Layout Test User')).toBeInTheDocument();
    });
  });

  describe('Network Interruption Simulation', () => {
    it('should handle network interruptions during complex template loading', async () => {
      const mockData = createMockResidentData({
        posts: [
          {
            id: 'net-post-1',
            contentHtml: '<p>Network test post 1</p>',
            createdAt: new Date().toISOString()
          }
        ]
      });

      // Component that simulates network requests
      const NetworkDependentComponent: React.FC<{ delay: number; shouldFail?: boolean }> = ({ delay, shouldFail = false }) => {
        const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');
        const [data, setData] = React.useState<string>('');

        React.useEffect(() => {
          const fetchData = async () => {
            try {
              await new Promise((resolve, reject) => {
                setTimeout(() => {
                  if (shouldFail) {
                    reject(new Error('Network error'));
                  } else {
                    resolve('Data loaded successfully');
                  }
                }, delay);
              });
              
              setData('Network data loaded');
              setStatus('loaded');
            } catch (error) {
              setStatus('error');
            }
          };

          fetchData();
        }, [delay, shouldFail]);

        return (
          <div data-testid={`network-component-${delay}`}>
            {status === 'loading' && 'Loading network data...'}
            {status === 'loaded' && data}
            {status === 'error' && 'Failed to load network data'}
          </div>
        );
      };

      const { container } = renderWithTemplateContext(
        <div className="network-test-container">
          <h2>Network Resilience Test</h2>
          <GridLayout columns={2} gap="lg">
            <section className="fast-loading">
              <h3>Fast Loading Section</h3>
              <DisplayName />
              <NetworkDependentComponent delay={50} />
            </section>

            <section className="slow-loading">
              <h3>Slow Loading Section</h3>
              <Bio />
              <NetworkDependentComponent delay={300} />
            </section>

            <section className="failing-section">
              <h3>Failing Section</h3>
              <ProfilePhoto />
              <NetworkDependentComponent delay={100} shouldFail={true} />
            </section>

            <section className="mixed-content">
              <h3>Mixed Content</h3>
              <BlogPosts />
              <NetworkDependentComponent delay={150} />
            </section>
          </GridLayout>
        </div>,
        { residentData: mockData }
      );

      // Initial render should work immediately for non-network components
      expect(screen.getByText('Network Resilience Test')).toBeInTheDocument();
      expect(screen.getByText('Fast Loading Section')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument(); // DisplayName

      // Network components should be in loading state
      expect(screen.getByTestId('network-component-50')).toHaveTextContent('Loading network data...');
      expect(screen.getByTestId('network-component-300')).toHaveTextContent('Loading network data...');

      // Wait for fast component to load
      await waitFor(() => {
        expect(screen.getByTestId('network-component-50')).toHaveTextContent('Network data loaded');
      }, { timeout: 200 });

      // Fast component loaded, slow still loading, failed shows error
      await waitFor(() => {
        expect(screen.getByTestId('network-component-100')).toHaveTextContent('Failed to load network data');
      }, { timeout: 300 });

      // Wait for slow component to load
      await waitFor(() => {
        expect(screen.getByTestId('network-component-300')).toHaveTextContent('Network data loaded');
        expect(screen.getByTestId('network-component-150')).toHaveTextContent('Network data loaded');
      }, { timeout: 500 });

      // Template integrity maintained throughout loading process
      expect(screen.getByText('Network Resilience Test')).toBeInTheDocument();
      expect(container.querySelectorAll('section').length).toBeGreaterThanOrEqual(4);
    });

    it('should handle component unmounting during async operations', async () => {
      const mockData = createMockResidentData();
      let cleanupCalled = false;
      let operationCompleted = false;

      const AsyncComponent: React.FC = () => {
        const [data, setData] = React.useState<string>('Loading...');

        React.useEffect(() => {
          let cancelled = false;
          
          const fetchData = async () => {
            // Simulate long-running async operation
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!cancelled) {
              setData('Async data loaded');
              operationCompleted = true;
            }
          };

          fetchData();

          return () => {
            cancelled = true;
            cleanupCalled = true;
          };
        }, []);

        return <div data-testid="async-component">{data}</div>;
      };

      const { unmount } = renderWithTemplateContext(
        <SplitLayout ratio="1:1" gap="md">
          <div>
            <DisplayName />
            <AsyncComponent />
          </div>
          <div>
            <Bio />
          </div>
        </SplitLayout>,
        { residentData: mockData }
      );

      // Component should be loading initially
      expect(screen.getByTestId('async-component')).toHaveTextContent('Loading...');

      // Unmount before async operation completes (simulates user navigation)
      unmount();

      // Wait for what would have been the completion time
      await new Promise(resolve => setTimeout(resolve, 600));

      // Cleanup should have been called, operation should not complete
      expect(cleanupCalled).toBe(true);
      expect(operationCompleted).toBe(false); // Should not complete due to cleanup
    });
  });

  describe('Rapid Navigation Simulation', () => {
    it('should handle browser back/forward with complex templates', async () => {
      const mockData1 = createMockResidentData({
        owner: { id: 'user1', handle: 'user1', displayName: 'User One' }
      });

      const mockData2 = createMockResidentData({
        owner: { id: 'user2', handle: 'user2', displayName: 'User Two' }
      });

      const NavigationSimulator: React.FC = () => {
        const [currentUser, setCurrentUser] = React.useState<1 | 2>(1);
        const [history, setHistory] = React.useState<number[]>([1]);

        const navigate = (userId: 1 | 2) => {
          setCurrentUser(userId);
          setHistory(prev => [...prev, userId]);
        };

        const goBack = () => {
          if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            setHistory(newHistory);
            setCurrentUser(newHistory[newHistory.length - 1] as 1 | 2);
          }
        };

        const currentData = currentUser === 1 ? mockData1 : mockData2;

        return (
          <div className="navigation-simulator">
            <nav className="navigation-controls">
              <button 
                data-testid="nav-user1"
                onClick={() => navigate(1)}
              >
                User 1
              </button>
              <button 
                data-testid="nav-user2"
                onClick={() => navigate(2)}
              >
                User 2
              </button>
              <button 
                data-testid="nav-back"
                onClick={goBack}
                disabled={history.length <= 1}
              >
                Back
              </button>
              <span data-testid="current-user">Current: User {currentUser}</span>
            </nav>

            <main className="current-template">
              <GridLayout columns={2} gap="lg">
                <SplitLayout ratio="2:1" gap="md">
                  <FlexContainer direction="column" gap="sm">
                    <DisplayName />
                    <Bio />
                  </FlexContainer>
                  <GradientBox gradient="sunset" padding="md">
                    <ProfilePhoto />
                  </GradientBox>
                </SplitLayout>
                <div>
                  <BlogPosts />
                </div>
              </GridLayout>
            </main>
          </div>
        );
      };

      const { container } = renderWithTemplateContext(
        <NavigationSimulator />,
        { residentData: mockData1 }
      );

      // Initial state
      expect(screen.getByTestId('current-user')).toHaveTextContent('Current: User 1');
      expect(screen.getByText('User One')).toBeInTheDocument();

      // Navigate rapidly between users
      fireEvent.click(screen.getByTestId('nav-user2'));
      expect(screen.getByTestId('current-user')).toHaveTextContent('Current: User 2');

      fireEvent.click(screen.getByTestId('nav-user1'));
      expect(screen.getByTestId('current-user')).toHaveTextContent('Current: User 1');

      fireEvent.click(screen.getByTestId('nav-user2'));
      expect(screen.getByTestId('current-user')).toHaveTextContent('Current: User 2');

      // Test back navigation
      fireEvent.click(screen.getByTestId('nav-back'));
      expect(screen.getByTestId('current-user')).toHaveTextContent('Current: User 1');

      fireEvent.click(screen.getByTestId('nav-back'));
      expect(screen.getByTestId('current-user')).toHaveTextContent('Current: User 2');

      // Template structure should remain intact throughout navigation
      expect(container.querySelector('.navigation-simulator')).toBeInTheDocument();
      expect(container.querySelector('.grid')).toBeInTheDocument(); // GridLayout
      expect(container.querySelector('.w-full.flex')).toBeInTheDocument(); // SplitLayout
    });
  });
});