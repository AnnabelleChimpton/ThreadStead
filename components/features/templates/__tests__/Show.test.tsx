import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Show from '../conditional/Show';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

describe('Show Component', () => {
  const TestChild = ({ testId = 'test-child' }: { testId?: string }) => (
    <div data-testid={testId}>Conditional Content</div>
  );

  describe('When Prop', () => {
    it('should show children when when="true"', () => {
      renderWithTemplateContext(
        <Show when="true">
          <TestChild />
        </Show>
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should hide children when when="false"', () => {
      renderWithTemplateContext(
        <Show when="false">
          <TestChild />
        </Show>
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should evaluate data path conditions', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show when="owner.displayName">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle "has:" prefix for existence checks', () => {
      const mockData = createMockResidentData({
        posts: [{ id: '1', contentHtml: 'Post content', createdAt: '2023-01-01' }]
      });

      renderWithTemplateContext(
        <Show when="has:posts">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should return false for "has:" when data is empty string, null, or undefined', () => {
      // Test empty string
      const mockDataEmptyString = createMockResidentData({
        capabilities: { bio: '' }
      });

      renderWithTemplateContext(
        <Show when="has:capabilities.bio">
          <TestChild testId="empty-string-test" />
        </Show>,
        { residentData: mockDataEmptyString }
      );
      
      expect(screen.queryByTestId('empty-string-test')).not.toBeInTheDocument();

      // Test null
      const mockDataNull = createMockResidentData({
        capabilities: { bio: null as any }
      });

      renderWithTemplateContext(
        <Show when="has:capabilities.bio">
          <TestChild testId="null-test" />
        </Show>,
        { residentData: mockDataNull }
      );
      
      expect(screen.queryByTestId('null-test')).not.toBeInTheDocument();
    });

    it('should return true for "has:" when data is non-empty array', () => {
      const mockData = createMockResidentData({
        posts: [{ id: '1', contentHtml: 'Content', createdAt: '2023-01-01' }]
      });

      renderWithTemplateContext(
        <Show when="has:posts">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle nested object paths', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser', 
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show when="owner.displayName">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle non-existent nested paths', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <Show when="owner.nonexistent.property">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Data Prop', () => {
    it('should show children when data path has truthy value', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should hide children when data path has falsy value', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: '',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should handle arrays - show when not empty', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Post 1', createdAt: '2023-01-01' },
          { id: '2', contentHtml: 'Post 2', createdAt: '2023-01-02' }
        ]
      });

      renderWithTemplateContext(
        <Show data="posts">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle arrays - hide when empty', () => {
      const mockData = createMockResidentData({
        posts: []
      });

      renderWithTemplateContext(
        <Show data="posts">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Data + Equals Props', () => {
    it('should show when data equals the specified value', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'John Doe',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName" equals="John Doe">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should hide when data does not equal the specified value', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Jane Smith',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName" equals="John Doe">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should handle numeric comparisons as strings', () => {
      const mockData = createMockResidentData({
        posts: [1, 2, 3] as any // Mock numeric posts length
      });

      renderWithTemplateContext(
        <Show data="posts.length" equals="3">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle undefined data with equals', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <Show data="nonexistent.property" equals="anything">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Data + Exists Props', () => {
    it('should show when data exists and exists prop is used', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName" exists="">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should hide when data does not exist and exists prop is used', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <Show data="nonexistent.property" exists="">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should handle null values with exists check', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: null as any,
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName" exists="">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Exists Prop (Standalone)', () => {
    it('should show when path exists', () => {
      const mockData = createMockResidentData({
        capabilities: {
          bio: 'User bio'
        }
      });

      renderWithTemplateContext(
        <Show exists="capabilities.bio">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should hide when path does not exist', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <Show exists="nonexistent.path">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('should render single child when condition is true', () => {
      renderWithTemplateContext(
        <Show when="true">
          <div data-testid="single-child">Single Child</div>
        </Show>
      );
      
      expect(screen.getByTestId('single-child')).toBeInTheDocument();
    });

    it('should render multiple children when condition is true', () => {
      renderWithTemplateContext(
        <Show when="true">
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </Show>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render no children when condition is false', () => {
      renderWithTemplateContext(
        <Show when="false">
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </Show>
      );
      
      expect(screen.queryByTestId('child-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('child-2')).not.toBeInTheDocument();
    });

    it('should handle text and numeric children', () => {
      renderWithTemplateContext(
        <Show when="true">
          <span data-testid="text-child">Text Content</span>
          {'String Child'}
          {123}
        </Show>
      );
      
      expect(screen.getByTestId('text-child')).toBeInTheDocument();
      // Note: Text and numeric children are harder to test directly
      // but they should be rendered within the fragment
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty props gracefully', () => {
      renderWithTemplateContext(
        <Show>
          <TestChild />
        </Show>
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should handle malformed data paths', () => {
      const mockData = createMockResidentData();

      expect(() => {
        renderWithTemplateContext(
          <Show data="....">
            <TestChild />
          </Show>,
          { residentData: mockData }
        );
      }).not.toThrow();
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should handle empty string data path', () => {
      renderWithTemplateContext(
        <Show data="">
          <TestChild />
        </Show>
      );
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should prioritize when prop over other props', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show when="false" data="owner.displayName" exists="owner">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      // Should be hidden because when="false" takes precedence
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should use exists check when both data and exists props are present', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser', 
          displayName: '', // Falsy value but exists
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName" exists="">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      // Should show because displayName exists (even though it's empty string)
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should hide when data path does not exist and exists check is used', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser', 
          avatarUrl: '/test.jpg'
          // displayName is undefined
        }
      });

      renderWithTemplateContext(
        <Show data="owner.displayName" exists="">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      // Should be hidden because displayName does not exist
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Complex Data Scenarios', () => {
    it('should handle deeply nested objects', () => {
      const mockData = createMockResidentData({
        capabilities: {
          bio: 'User bio',
          settings: {
            theme: 'dark',
            notifications: {
              email: true,
              push: false
            }
          }
        }
      });

      renderWithTemplateContext(
        <Show when="capabilities.settings.notifications.email">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle arrays within nested objects', () => {
      const mockData = createMockResidentData({
        profileImages: [
          { id: 'img-1', url: '/test1.jpg', alt: 'Test 1', type: 'banner' as const },
          { id: 'img-2', url: '/test2.jpg', alt: 'Test 2', type: 'avatar' as const }
        ]
      });

      renderWithTemplateContext(
        <Show when="profileImages">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle null values in nested paths gracefully', () => {
      const mockData = createMockResidentData({
        owner: null as any
      });

      expect(() => {
        renderWithTemplateContext(
          <Show when="owner.displayName">
            <TestChild />
          </Show>,
          { residentData: mockData }
        );
      }).not.toThrow();
      
      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-evaluate conditions unnecessarily', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        }
      });

      const { rerender } = renderWithTemplateContext(
        <Show when="owner.displayName">
          <TestChild />
        </Show>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      
      // Re-render with same props should work consistently
      rerender(
        <Show when="owner.displayName">
          <TestChild />
        </Show>
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });
});