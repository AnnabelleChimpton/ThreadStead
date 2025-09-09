import React from 'react';
import { screen } from '@testing-library/react';
import Choose, { When, Otherwise } from '../conditional/Choose';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Test child component
const TestChild: React.FC<{ testId?: string; text?: string }> = ({ 
  testId = 'test-child',
  text = 'Test content'
}) => (
  <div data-testid={testId}>{text}</div>
);

describe('Choose Component', () => {
  describe('Basic Choose-When-Otherwise Flow', () => {
    it('should render first matching When condition', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'John Doe',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Choose>
          <When condition="false">
            <TestChild testId="first-when" text="First condition" />
          </When>
          <When data="owner.displayName" equals="John Doe">
            <TestChild testId="second-when" text="Second condition" />
          </When>
          <When condition="true">
            <TestChild testId="third-when" text="Third condition" />
          </When>
          <Otherwise>
            <TestChild testId="otherwise" text="Otherwise" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('second-when')).toBeInTheDocument();
      expect(screen.queryByTestId('first-when')).not.toBeInTheDocument();
      expect(screen.queryByTestId('third-when')).not.toBeInTheDocument();
      expect(screen.queryByTestId('otherwise')).not.toBeInTheDocument();
    });

    it('should render Otherwise when no When conditions match', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Jane Smith',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Choose>
          <When data="owner.displayName" equals="John Doe">
            <TestChild testId="when-match" text="When matched" />
          </When>
          <When condition="false">
            <TestChild testId="when-false" text="When false" />
          </When>
          <Otherwise>
            <TestChild testId="otherwise" text="Otherwise content" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('otherwise')).toBeInTheDocument();
      expect(screen.queryByTestId('when-match')).not.toBeInTheDocument();
      expect(screen.queryByTestId('when-false')).not.toBeInTheDocument();
    });

    it('should render nothing when no conditions match and no Otherwise', () => {
      const mockData = createMockResidentData({});

      renderWithTemplateContext(
        <Choose>
          <When condition="false">
            <TestChild testId="when-false" text="Won't show" />
          </When>
          <When data="nonexistent.path">
            <TestChild testId="when-nonexistent" text="Won't show either" />
          </When>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.queryByTestId('when-false')).not.toBeInTheDocument();
      expect(screen.queryByTestId('when-nonexistent')).not.toBeInTheDocument();
    });
  });

  describe('When Component Condition Logic', () => {
    it('should handle condition prop with boolean values', () => {
      renderWithTemplateContext(
        <Choose>
          <When condition="true">
            <TestChild testId="true-condition" />
          </When>
          <Otherwise>
            <TestChild testId="otherwise" />
          </Otherwise>
        </Choose>
      );
      
      expect(screen.getByTestId('true-condition')).toBeInTheDocument();
    });

    it('should handle condition prop with data path evaluation', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Post 1', createdAt: '2023-01-01' },
          { id: '2', contentHtml: 'Post 2', createdAt: '2023-01-02' }
        ]
      });

      renderWithTemplateContext(
        <Choose>
          <When condition="posts">
            <TestChild testId="posts-exist" />
          </When>
          <Otherwise>
            <TestChild testId="no-posts" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('posts-exist')).toBeInTheDocument();
    });

    it('should handle condition prop with "has:" prefix', () => {
      const mockData = createMockResidentData({
        capabilities: { bio: 'User bio content' }
      });

      renderWithTemplateContext(
        <Choose>
          <When condition="has:capabilities.bio">
            <TestChild testId="has-bio" />
          </When>
          <Otherwise>
            <TestChild testId="no-bio" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('has-bio')).toBeInTheDocument();
    });
  });

  describe('When Component Data Logic', () => {
    it('should handle data prop with equals comparison', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Alice Johnson',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Choose>
          <When data="owner.displayName" equals="Alice Johnson">
            <TestChild testId="name-match" />
          </When>
          <Otherwise>
            <TestChild testId="name-mismatch" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('name-match')).toBeInTheDocument();
    });

    it('should handle data prop with exists check (true)', () => {
      const mockData = createMockResidentData({
        capabilities: { bio: 'Bio exists' }
      });

      renderWithTemplateContext(
        <Choose>
          <When data="capabilities.bio" exists={true}>
            <TestChild testId="bio-exists" />
          </When>
          <Otherwise>
            <TestChild testId="bio-missing" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('bio-exists')).toBeInTheDocument();
    });

    it('should handle data prop with exists check (false)', () => {
      const mockData = createMockResidentData({
        capabilities: {}
      });

      renderWithTemplateContext(
        <Choose>
          <When data="capabilities.bio" exists={false}>
            <TestChild testId="bio-missing" />
          </When>
          <Otherwise>
            <TestChild testId="bio-exists" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('bio-missing')).toBeInTheDocument();
    });

    it('should handle data prop with truthy evaluation (arrays)', () => {
      const mockData = createMockResidentData({
        posts: [{ id: '1', contentHtml: 'Post', createdAt: '2023-01-01' }]
      });

      renderWithTemplateContext(
        <Choose>
          <When data="posts">
            <TestChild testId="has-posts" />
          </When>
          <Otherwise>
            <TestChild testId="no-posts" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('has-posts')).toBeInTheDocument();
    });

    it('should handle data prop with falsy evaluation (empty arrays)', () => {
      const mockData = createMockResidentData({
        posts: []
      });

      renderWithTemplateContext(
        <Choose>
          <When data="posts">
            <TestChild testId="has-posts" />
          </When>
          <Otherwise>
            <TestChild testId="no-posts" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('no-posts')).toBeInTheDocument();
    });
  });

  describe('Complex Condition Scenarios', () => {
    it('should handle multiple When conditions with different prop types', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Bob Wilson',
          avatarUrl: '/test.jpg'
        },
        posts: [],
        capabilities: { bio: '' }
      });

      renderWithTemplateContext(
        <Choose>
          <When data="posts">
            <TestChild testId="has-posts" />
          </When>
          <When condition="has:capabilities.bio">
            <TestChild testId="has-bio" />
          </When>
          <When data="owner.displayName" equals="Bob Wilson">
            <TestChild testId="correct-name" />
          </When>
          <Otherwise>
            <TestChild testId="otherwise" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      // Should match the third When (correct name)
      expect(screen.getByTestId('correct-name')).toBeInTheDocument();
      expect(screen.queryByTestId('has-posts')).not.toBeInTheDocument();
      expect(screen.queryByTestId('has-bio')).not.toBeInTheDocument();
      expect(screen.queryByTestId('otherwise')).not.toBeInTheDocument();
    });

    it('should handle nested object access', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        },
        capabilities: {
          bio: 'User has a bio',
          customization: {
            theme: 'dark',
            layout: 'grid'
          }
        }
      });

      renderWithTemplateContext(
        <Choose>
          <When data="capabilities.customization.theme" equals="light">
            <TestChild testId="light-theme" />
          </When>
          <When data="capabilities.customization.theme" equals="dark">
            <TestChild testId="dark-theme" />
          </When>
          <Otherwise>
            <TestChild testId="default-theme" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('dark-theme')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty Choose component', () => {
      renderWithTemplateContext(
        <Choose>
        </Choose>
      );
      
      // Should render nothing without error
    });

    it('should handle Choose with only Otherwise', () => {
      renderWithTemplateContext(
        <Choose>
          <Otherwise>
            <TestChild testId="only-otherwise" />
          </Otherwise>
        </Choose>
      );
      
      expect(screen.getByTestId('only-otherwise')).toBeInTheDocument();
    });

    it('should handle malformed data paths', () => {
      renderWithTemplateContext(
        <Choose>
          <When data="...invalid..path..">
            <TestChild testId="invalid-path" />
          </When>
          <Otherwise>
            <TestChild testId="fallback" />
          </Otherwise>
        </Choose>
      );
      
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should handle null and undefined data gracefully', () => {
      const mockData = createMockResidentData({
        nullValue: null,
        undefinedValue: undefined
      });

      renderWithTemplateContext(
        <Choose>
          <When data="nullValue">
            <TestChild testId="null-value" />
          </When>
          <When data="undefinedValue">
            <TestChild testId="undefined-value" />
          </When>
          <Otherwise>
            <TestChild testId="neither" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('neither')).toBeInTheDocument();
    });
  });

  describe('When Component Standalone Usage', () => {
    it('should work as standalone component (not inside Choose)', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Standalone Test',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <When condition="true">
          <TestChild testId="standalone-when" />
        </When>,
        { residentData: mockData }
      );
      
      expect(screen.getByTestId('standalone-when')).toBeInTheDocument();
    });

    it('should hide when standalone condition is false', () => {
      renderWithTemplateContext(
        <When condition="false">
          <TestChild testId="standalone-false" />
        </When>
      );
      
      expect(screen.queryByTestId('standalone-false')).not.toBeInTheDocument();
    });
  });

  describe('Otherwise Component', () => {
    it('should render children when used standalone', () => {
      renderWithTemplateContext(
        <Otherwise>
          <TestChild testId="standalone-otherwise" />
        </Otherwise>
      );
      
      expect(screen.getByTestId('standalone-otherwise')).toBeInTheDocument();
    });
  });

  describe('Mixed Children Types', () => {
    it('should handle text and component children', () => {
      renderWithTemplateContext(
        <Choose>
          <When condition="true">
            Text content
            <TestChild testId="mixed-child" />
            More text
          </When>
          <Otherwise>
            <TestChild testId="otherwise" />
          </Otherwise>
        </Choose>
      );
      
      expect(screen.getByText(/Text content/)).toBeInTheDocument();
      expect(screen.getByTestId('mixed-child')).toBeInTheDocument();
      expect(screen.getByText(/More text/)).toBeInTheDocument();
    });

    it('should handle numeric and boolean children', () => {
      renderWithTemplateContext(
        <Choose>
          <When condition="true">
            <div data-testid="number-child">{42}</div>
            <div data-testid="boolean-child">{true.toString()}</div>
          </When>
          <Otherwise>
            <TestChild testId="otherwise" />
          </Otherwise>
        </Choose>
      );
      
      expect(screen.getByTestId('number-child')).toHaveTextContent('42');
      expect(screen.getByTestId('boolean-child')).toHaveTextContent('true');
    });
  });

  describe('Priority and Ordering', () => {
    it('should respect order of When conditions (first match wins)', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Priority Test',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Choose>
          <When condition="true">
            <TestChild testId="first-true" text="First true" />
          </When>
          <When condition="true">
            <TestChild testId="second-true" text="Second true" />
          </When>
          <When data="owner.displayName" equals="Priority Test">
            <TestChild testId="name-match" text="Name matches" />
          </When>
          <Otherwise>
            <TestChild testId="otherwise" />
          </Otherwise>
        </Choose>,
        { residentData: mockData }
      );
      
      // Should show only the first matching condition
      expect(screen.getByTestId('first-true')).toBeInTheDocument();
      expect(screen.queryByTestId('second-true')).not.toBeInTheDocument();
      expect(screen.queryByTestId('name-match')).not.toBeInTheDocument();
      expect(screen.queryByTestId('otherwise')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should stop at first matching When condition', () => {
      // This test verifies that Choose stops processing When conditions
      // after finding the first match (short-circuit behavior)
      
      renderWithTemplateContext(
        <Choose>
          <When condition="true">
            <TestChild testId="first-match" />
          </When>
          <When condition="true">
            <TestChild testId="second-match" />
          </When>
          <When condition="true">
            <TestChild testId="third-match" />
          </When>
          <Otherwise>
            <TestChild testId="otherwise" />
          </Otherwise>
        </Choose>
      );
      
      // Only the first matching condition should render
      expect(screen.getByTestId('first-match')).toBeInTheDocument();
      expect(screen.queryByTestId('second-match')).not.toBeInTheDocument();
      expect(screen.queryByTestId('third-match')).not.toBeInTheDocument();
      expect(screen.queryByTestId('otherwise')).not.toBeInTheDocument();
    });
  });
});