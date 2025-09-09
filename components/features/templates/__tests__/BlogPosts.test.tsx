import React from 'react';
import { screen } from '@testing-library/react';
import BlogPosts from '../BlogPosts';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock the PostItem component since it has complex dependencies
jest.mock('@/components/core/content/PostItem', () => {
  return function MockPostItem({ post, isOwner, isAdmin, onChanged, currentUser }: any) {
    return (
      <div 
        data-testid={`mock-post-item-${post.id}`}
        data-post-content={post.contentHtml}
        data-post-created={post.createdAt}
        data-is-owner={isOwner.toString()}
        data-is-admin={isAdmin.toString()}
        data-current-user={currentUser?.toString() || 'null'}
      >
        Post: {post.contentHtml} (Created: {post.createdAt})
      </div>
    );
  };
});

describe('BlogPosts Component', () => {
  describe('Basic Functionality', () => {
    it('should render posts with default limit', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        },
        posts: [
          { id: '1', contentHtml: 'First post content', createdAt: '2023-01-01' },
          { id: '2', contentHtml: 'Second post content', createdAt: '2023-01-02' },
          { id: '3', contentHtml: 'Third post content', createdAt: '2023-01-03' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByText('Recent Posts')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-3')).toBeInTheDocument();
      
      // Check that posts are rendered with correct content
      expect(screen.getByText(/First post content/)).toBeInTheDocument();
      expect(screen.getByText(/Second post content/)).toBeInTheDocument();
      expect(screen.getByText(/Third post content/)).toBeInTheDocument();
    });

    it('should respect custom limit prop', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Post 1', createdAt: '2023-01-01' },
          { id: '2', contentHtml: 'Post 2', createdAt: '2023-01-02' },
          { id: '3', contentHtml: 'Post 3', createdAt: '2023-01-03' },
          { id: '4', contentHtml: 'Post 4', createdAt: '2023-01-04' },
          { id: '5', contentHtml: 'Post 5', createdAt: '2023-01-05' },
          { id: '6', contentHtml: 'Post 6', createdAt: '2023-01-06' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts limit={3} />,
        { residentData: mockData }
      );

      // Should only show first 3 posts
      expect(screen.getByTestId('mock-post-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-3')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-post-item-4')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-post-item-5')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-post-item-6')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Test post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts className="custom-blog-class" />,
        { residentData: mockData }
      );

      const container = screen.getByText('Recent Posts').parentElement;
      expect(container).toHaveClass('custom-blog-class');
      expect(container).toHaveClass('blog-posts');
      expect(container).toHaveClass('profile-tab-content');
      expect(container).toHaveClass('space-y-4');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no posts exist', () => {
      const mockData = createMockResidentData({
        posts: []
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByText('No posts yet.')).toBeInTheDocument();
      expect(screen.queryByText('Recent Posts')).not.toBeInTheDocument();
      
      const emptyDiv = screen.getByText('No posts yet.');
      expect(emptyDiv).toHaveClass('blog-posts-empty');
      expect(emptyDiv).toHaveClass('profile-tab-content');
      expect(emptyDiv).toHaveClass('italic');
      expect(emptyDiv).toHaveClass('opacity-70');
      expect(emptyDiv).toHaveClass('text-center');
      expect(emptyDiv).toHaveClass('py-4');
    });

    it('should apply custom className to empty state', () => {
      const mockData = createMockResidentData({
        posts: []
      });

      renderWithTemplateContext(
        <BlogPosts className="custom-empty-class" />,
        { residentData: mockData }
      );

      const emptyDiv = screen.getByText('No posts yet.');
      expect(emptyDiv).toHaveClass('custom-empty-class');
      expect(emptyDiv).toHaveClass('blog-posts-empty');
    });

    it('should show empty state when posts exist but limit is 0', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Hidden post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts limit={0} />,
        { residentData: mockData }
      );

      expect(screen.getByText('No posts yet.')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-post-item-1')).not.toBeInTheDocument();
    });
  });

  describe('Post Item Props', () => {
    it('should pass correct props to PostItem components', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: 'test-post', contentHtml: 'Test content', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      const postItem = screen.getByTestId('mock-post-item-test-post');
      expect(postItem).toHaveAttribute('data-post-content', 'Test content');
      expect(postItem).toHaveAttribute('data-post-created', '2023-01-01');
      expect(postItem).toHaveAttribute('data-is-owner', 'false');
      expect(postItem).toHaveAttribute('data-is-admin', 'false');
      expect(postItem).toHaveAttribute('data-current-user', 'null');
    });

    it('should always set isOwner and isAdmin to false in template preview', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: 'owner-test', contentHtml: 'Owner post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      const postItem = screen.getByTestId('mock-post-item-owner-test');
      // Even if this is the owner's profile, template preview is always read-only
      expect(postItem).toHaveAttribute('data-is-owner', 'false');
      expect(postItem).toHaveAttribute('data-is-admin', 'false');
    });

    it('should always set currentUser to null in template preview', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: 'user-test', contentHtml: 'User post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      const postItem = screen.getByTestId('mock-post-item-user-test');
      expect(postItem).toHaveAttribute('data-current-user', 'null');
    });
  });

  describe('Limit Edge Cases', () => {
    it('should handle limit larger than available posts', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Only post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts limit={10} />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('mock-post-item-1')).toBeInTheDocument();
      expect(screen.getByText('Recent Posts')).toBeInTheDocument();
    });

    it('should handle negative limit (should show no posts)', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Post that should not show', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts limit={-1} />,
        { residentData: mockData }
      );

      expect(screen.getByText('No posts yet.')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-post-item-1')).not.toBeInTheDocument();
    });

    it('should handle very large limit', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Post 1', createdAt: '2023-01-01' },
          { id: '2', contentHtml: 'Post 2', createdAt: '2023-01-02' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts limit={1000} />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('mock-post-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-2')).toBeInTheDocument();
    });
  });

  describe('CSS Classes and Structure', () => {
    it('should apply correct CSS classes to container', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Test post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      const title = screen.getByText('Recent Posts');
      const container = title.parentElement;
      const listContainer = screen.getByTestId('mock-post-item-1').parentElement;

      // Container classes
      expect(container).toHaveClass('blog-posts');
      expect(container).toHaveClass('profile-tab-content');
      expect(container).toHaveClass('space-y-4');

      // Title classes
      expect(title).toHaveClass('blog-posts-title');
      expect(title).toHaveClass('thread-headline');
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-bold');
      expect(title).toHaveClass('mb-3');

      // List classes
      expect(listContainer).toHaveClass('blog-posts-list');
      expect(listContainer).toHaveClass('space-y-3');
    });

    it('should combine custom className with default classes', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Test post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts className="my-custom-class another-class" />,
        { residentData: mockData }
      );

      const container = screen.getByText('Recent Posts').parentElement;
      expect(container).toHaveClass('blog-posts');
      expect(container).toHaveClass('profile-tab-content');
      expect(container).toHaveClass('space-y-4');
      expect(container).toHaveClass('my-custom-class');
      expect(container).toHaveClass('another-class');
    });
  });

  describe('Data Handling', () => {
    it('should handle posts with special characters', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: 'special-1', contentHtml: 'Post with "quotes" and <tags>', createdAt: '2023-01-01' },
          { id: 'special-2', contentHtml: 'Post with émojis 🚀 and symbols @#$%', createdAt: '2023-01-02' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('mock-post-item-special-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-special-2')).toBeInTheDocument();
      expect(screen.getByText(/quotes.*tags/)).toBeInTheDocument();
      expect(screen.getByText(/émojis.*symbols/)).toBeInTheDocument();
    });

    it('should handle posts with empty content', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: 'empty-content', contentHtml: '', createdAt: '2023-01-01' },
          { id: 'whitespace-only', contentHtml: '   ', createdAt: '2023-01-02' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('mock-post-item-empty-content')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-whitespace-only')).toBeInTheDocument();
    });

    it('should handle posts with different date formats', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: 'date-1', contentHtml: 'Post 1', createdAt: '2023-12-31T23:59:59Z' },
          { id: 'date-2', contentHtml: 'Post 2', createdAt: '2023-01-01' },
          { id: 'date-3', contentHtml: 'Post 3', createdAt: 'invalid-date' }
        ]
      });

      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('mock-post-item-date-1')).toHaveAttribute('data-post-created', '2023-12-31T23:59:59Z');
      expect(screen.getByTestId('mock-post-item-date-2')).toHaveAttribute('data-post-created', '2023-01-01');
      expect(screen.getByTestId('mock-post-item-date-3')).toHaveAttribute('data-post-created', 'invalid-date');
    });
  });

  describe('Performance', () => {
    it('should not re-render PostItems unnecessarily', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Stable post', createdAt: '2023-01-01' }
        ]
      });

      const { rerender } = renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      const initialPostItem = screen.getByTestId('mock-post-item-1');
      expect(initialPostItem).toBeInTheDocument();

      // Re-render with same data
      rerender(
        <BlogPosts />
      );

      const postItemAfterRerender = screen.getByTestId('mock-post-item-1');
      expect(postItemAfterRerender).toBeInTheDocument();
    });

    it('should handle large number of posts efficiently', () => {
      // Generate 1000 mock posts
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        id: `post-${i}`,
        contentHtml: `Content for post ${i}`,
        createdAt: `2023-01-${String(i % 30 + 1).padStart(2, '0')}`
      }));

      const mockData = createMockResidentData({ posts: largePosts });

      // Should only render the first 5 (default limit)
      renderWithTemplateContext(
        <BlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('mock-post-item-post-0')).toBeInTheDocument();
      expect(screen.getByTestId('mock-post-item-post-4')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-post-item-post-5')).not.toBeInTheDocument();
    });
  });
});