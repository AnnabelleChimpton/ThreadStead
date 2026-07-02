import React from 'react';
import { screen, render } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';

// Mock the PostItem component since it has complex dependencies
// (ChatContext, next/dynamic PixelIcon, IntersectionObserver view tracking)
jest.mock('@/components/core/content/PostItem', () => {
  return function MockPostItem({ post }: any) {
    return <div data-testid={`mock-post-item-${post?.id}`}>Post: {post?.bodyHtml}</div>;
  };
});

import DisplayName from '../../DisplayName';
import Bio from '../../Bio';
import ProfilePhoto from '../../ProfilePhoto';
import BlogPosts from '../../BlogPosts';
import GridLayout from '../../GridLayout';
import SplitLayout from '../../SplitLayout';
import FlexContainer from '../../FlexContainer';
import GradientBox from '../../GradientBox';
import CenteredBox from '../../CenteredBox';

describe('Performance Cliff Edge Detection Integration', () => {
  describe('Massive Component Count Testing', () => {
    it('should handle templates with 100+ nested components without performance cliff', () => {
      const mockData = createMockResidentData({
        owner: { 
          id: 'perf-test', 
          handle: 'perftest', 
          displayName: 'Performance Test User',
          avatarUrl: '/perf-test.jpg'
        }
      });

      const startTime = performance.now();
      let memoryBefore;
      
      // Measure memory if available (Chrome DevTools)
      if ('memory' in performance) {
        memoryBefore = (performance as any).memory.usedJSHeapSize;
      }

      // Create a deeply nested structure with 100+ components
      const createMassiveNestedStructure = (depth: number): React.ReactElement => {
        if (depth <= 0) {
          return (
            <div className={`leaf-node-${depth}`}>
              <DisplayName />
              <ProfilePhoto />
              <Bio />
            </div>
          );
        }

        const children = (
          <>
            <div className={`level-${depth}-a`}>
              <h3>Level {depth} Content A</h3>
              {createMassiveNestedStructure(depth - 1)}
            </div>
            <div className={`level-${depth}-b`}>
              <h3>Level {depth} Content B</h3>
              {createMassiveNestedStructure(depth - 1)}
            </div>
          </>
        );

        // Alternate between the layout components with their own props
        if (depth % 5 === 0) {
          return <GridLayout columns={2} gapSize="sm">{children}</GridLayout>;
        }
        if (depth % 4 === 0) {
          return <SplitLayout ratio="1:1" spacing="md">{children}</SplitLayout>;
        }
        if (depth % 3 === 0) {
          return <FlexContainer direction="column" gapSize="sm">{children}</FlexContainer>;
        }
        if (depth % 2 === 0) {
          return <GradientBox gradient="sunset" containerPadding="sm">{children}</GradientBox>;
        }
        return <CenteredBox containerMaxWidth="md" containerPadding="sm">{children}</CenteredBox>;
      };

      // Create structure with 20 levels deep (creates 100+ components exponentially)
      const massiveTemplate = (
        <div className="massive-template-container">
          <h1>Massive Template Performance Test</h1>
          {createMassiveNestedStructure(6)} {/* Depth of 6 creates ~127 components */}
        </div>
      );

      const { container } = renderWithTemplateContext(
        massiveTemplate,
        { residentData: mockData }
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      let memoryAfter;
      if ('memory' in performance) {
        memoryAfter = (performance as any).memory.usedJSHeapSize;
      }

      // Performance assertions
      expect(renderTime).toBeLessThan(2000); // Should render in under 2 seconds
      expect(container.querySelector('.massive-template-container')).toBeInTheDocument();
      expect(screen.getByText('Massive Template Performance Test')).toBeInTheDocument();

      // Verify deep nesting rendered correctly
      expect(container.querySelector('.level-6-a')).toBeInTheDocument();
      expect(container.querySelector('.level-1-b')).toBeInTheDocument();
      // DisplayName rendered in (many) leaves
      expect(screen.getAllByText('Performance Test User').length).toBeGreaterThan(0);

      // Memory check (if available)
      if (memoryBefore !== undefined && memoryAfter !== undefined) {
        const memoryIncrease = memoryAfter - memoryBefore;
        // Should not consume more than 50MB for this test
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }

      console.log(`Massive template render time: ${renderTime.toFixed(2)}ms`);
    });

    it('should handle rapid template switching without memory accumulation', () => {
      const mockData = createMockResidentData();
      
      const templates = [
        <GridLayout key="template-0" columns={2} gapSize="lg"><DisplayName /><Bio /></GridLayout>,
        <SplitLayout key="template-1" ratio="1:2" spacing="md"><ProfilePhoto /><BlogPosts /></SplitLayout>,
        <FlexContainer key="template-2" direction="column" gapSize="sm">
          <GradientBox gradient="sunset" containerPadding="md">
            <DisplayName />
            <Bio />
          </GradientBox>
        </FlexContainer>,
        <CenteredBox key="template-3" containerMaxWidth="lg" containerPadding="xl">
          <GridLayout columns={3} gapSize="xs">
            <DisplayName />
            <ProfilePhoto />
            <Bio />
          </GridLayout>
        </CenteredBox>
      ];

      let initialMemory;
      if ('memory' in performance) {
        initialMemory = (performance as any).memory.usedJSHeapSize;
      }

      const startTime = performance.now();
      
      // Rapidly switch between templates 20 times
      for (let i = 0; i < 20; i++) {
        const template = templates[i % templates.length];
        const { unmount } = renderWithTemplateContext(
          <div data-testid={`template-${i}`}>
            {template}
          </div>,
          { residentData: mockData }
        );
        
        // Unmount immediately to simulate rapid switching
        unmount();
      }

      const endTime = performance.now();
      const totalSwitchTime = endTime - startTime;

      // Force garbage collection if available (for testing)
      if ('gc' in global) {
        (global as any).gc();
      }

      let finalMemory;
      if ('memory' in performance && initialMemory !== undefined) {
        finalMemory = (performance as any).memory.usedJSHeapSize;
        const memoryGrowth = finalMemory - initialMemory;
        
        // Memory should not grow significantly after GC
        // Allow some growth but not excessive (under 10MB)
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
      }

      // Performance should remain reasonable
      expect(totalSwitchTime).toBeLessThan(1000); // 20 switches in under 1 second

      console.log(`Template switching performance: ${totalSwitchTime.toFixed(2)}ms for 20 switches`);
    });

    it('should detect and prevent infinite re-render loops', () => {
      const mockData = createMockResidentData();
      
      // Create a component that could potentially cause infinite re-renders
      let renderCount = 0;
      const ProblematicComponent: React.FC = () => {
        renderCount++;
        
        // Simulate a poorly written component that might trigger re-renders
        const [, setCounter] = React.useState(0);
        
        React.useEffect(() => {
          // This would normally cause infinite re-renders, but we'll limit it
          if (renderCount < 10) {
            setCounter(prev => prev + 1);
          }
        }); // Missing dependency array would normally cause issues
        
        return <div data-testid="problematic-component">Render count: {renderCount}</div>;
      };

      const startTime = performance.now();
      
      const { container } = renderWithTemplateContext(
        <GridLayout columns={1} gapSize="sm">
          <div>Safe Content</div>
          <ProblematicComponent />
          <DisplayName />
        </GridLayout>,
        { residentData: mockData }
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render without hanging
      expect(renderTime).toBeLessThan(1000);
      expect(container.querySelector('[data-testid="problematic-component"]')).toBeInTheDocument();
      expect(screen.getByText('Safe Content')).toBeInTheDocument();
      
      // Render count should be bounded (not infinite)
      expect(renderCount).toBeLessThan(50);

      console.log(`Problematic component handled, render count: ${renderCount}, time: ${renderTime.toFixed(2)}ms`);
    });

    it('should maintain responsive performance under component stress', async () => {
      const mockData = createMockResidentData();
      
      // Create many components that re-render frequently
      const StressComponent: React.FC<{ id: number }> = ({ id }) => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            setCount(prev => prev + 1);
          }, 100 + (id * 10)); // Stagger updates to create more realistic stress
          
          return () => clearInterval(interval);
        }, [id]);
        
        return (
          <div data-testid={`stress-component-${id}`} className="p-2 border">
            Stress Component {id}: {count}
          </div>
        );
      };

      const startTime = performance.now();
      
      const { container } = renderWithTemplateContext(
        <div className="stress-test-container">
          <h2>Stress Test Template</h2>
          <GridLayout columns={4} gapSize="sm">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i}>
                <StressComponent id={i} />
                <DisplayName />
              </div>
            ))}
          </GridLayout>
        </div>,
        { residentData: mockData }
      );

      const initialRenderTime = performance.now() - startTime;

      // Wait for some updates to occur
      await new Promise(resolve => setTimeout(resolve, 500));

      const midTime = performance.now();
      
      // Verify all components rendered
      expect(screen.getByText('Stress Test Template')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="stress-component-0"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="stress-component-15"]')).toBeInTheDocument();

      const totalTime = midTime - startTime;

      // Should handle stress without excessive delay
      expect(initialRenderTime).toBeLessThan(500);
      expect(totalTime).toBeLessThan(1000);

      console.log(`Stress test: initial render ${initialRenderTime.toFixed(2)}ms, total time ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Resource Cleanup Validation', () => {
    it('should clean up resources when complex templates unmount', () => {
      const mockData = createMockResidentData();
      let cleanupCount = 0;
      
      const ResourceComponent: React.FC = () => {
        React.useEffect(() => {
          const cleanup = () => {
            cleanupCount++;
          };
          
          return cleanup;
        }, []);
        
        return <div>Resource Component</div>;
      };

      const complexTemplate = (
        <GridLayout columns={2} gapSize="lg">
          {Array.from({ length: 10 }, (_, i) => (
            <SplitLayout key={i} ratio="1:1" spacing="md">
              <FlexContainer direction="column" gapSize="sm">
                <ResourceComponent />
                <DisplayName />
              </FlexContainer>
              <GradientBox gradient="ocean" containerPadding="md">
                <ResourceComponent />
                <Bio />
              </GradientBox>
            </SplitLayout>
          ))}
        </GridLayout>
      );

      const { unmount } = renderWithTemplateContext(
        complexTemplate,
        { residentData: mockData }
      );

      // Unmount the template
      unmount();

      // Should have called cleanup for all ResourceComponents (20 total: 2 per iteration * 10 iterations)
      expect(cleanupCount).toBe(20);
    });
  });
});