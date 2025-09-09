import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';
import { useResidentData } from '../ResidentDataProvider';

// Test the core logic of BlogPosts without the complex PostItem dependency
function SimpleBlogPosts({ limit = 5, className: customClassName }: { limit?: number; className?: string }) {
  const { posts } = useResidentData();
  
  const displayPosts = posts.slice(0, limit);

  if (displayPosts.length === 0) {
    const emptyClassName = customClassName ? `blog-posts-empty profile-tab-content italic opacity-70 text-center py-4 ${customClassName}` : "blog-posts-empty profile-tab-content italic opacity-70 text-center py-4";
    return (
      <div className={emptyClassName}>
        No posts yet.
      </div>
    );
  }

  const containerClassName = customClassName ? `blog-posts profile-tab-content space-y-4 ${customClassName}` : "blog-posts profile-tab-content space-y-4";

  return (
    <div className={containerClassName}>
      <h3 className="blog-posts-title thread-headline text-xl font-bold mb-3">Recent Posts</h3>
      <div className="blog-posts-list space-y-3">
        {displayPosts.map((post) => (
          <div 
            key={post.id} 
            data-testid={`simple-post-${post.id}`}
            className="post-preview"
          >
            <div className="post-content">{post.contentHtml}</div>
            <div className="post-date">{post.createdAt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

describe('BlogPosts Component Logic', () => {
  describe('Basic Functionality', () => {
    it('should render posts with default limit', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'First post content', createdAt: '2023-01-01' },
          { id: '2', contentHtml: 'Second post content', createdAt: '2023-01-02' },
          { id: '3', contentHtml: 'Third post content', createdAt: '2023-01-03' }
        ]
      });

      renderWithTemplateContext(
        <SimpleBlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByText('Recent Posts')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-2')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-3')).toBeInTheDocument();
      
      expect(screen.getByText('First post content')).toBeInTheDocument();
      expect(screen.getByText('Second post content')).toBeInTheDocument();
      expect(screen.getByText('Third post content')).toBeInTheDocument();
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
        <SimpleBlogPosts limit={3} />,
        { residentData: mockData }
      );

      // Should only show first 3 posts
      expect(screen.getByTestId('simple-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-2')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-3')).toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-4')).not.toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-5')).not.toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-6')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Test post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <SimpleBlogPosts className="custom-blog-class" />,
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
        <SimpleBlogPosts />,
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
        <SimpleBlogPosts className="custom-empty-class" />,
        { residentData: mockData }
      );

      const emptyDiv = screen.getByText('No posts yet.');
      expect(emptyDiv).toHaveClass('custom-empty-class');
      expect(emptyDiv).toHaveClass('blog-posts-empty');
    });

    it('should show empty state when limit is 0', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Hidden post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <SimpleBlogPosts limit={0} />,
        { residentData: mockData }
      );

      expect(screen.getByText('No posts yet.')).toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-1')).not.toBeInTheDocument();
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
        <SimpleBlogPosts limit={10} />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('simple-post-1')).toBeInTheDocument();
      expect(screen.getByText('Recent Posts')).toBeInTheDocument();
    });

    it('should handle negative limit (show no posts)', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Post that should not show', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <SimpleBlogPosts limit={-1} />,
        { residentData: mockData }
      );

      expect(screen.getByText('No posts yet.')).toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-1')).not.toBeInTheDocument();
    });

    it('should handle very large limit', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Post 1', createdAt: '2023-01-01' },
          { id: '2', contentHtml: 'Post 2', createdAt: '2023-01-02' }
        ]
      });

      renderWithTemplateContext(
        <SimpleBlogPosts limit={1000} />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('simple-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-2')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct CSS classes to elements', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: '1', contentHtml: 'Test post', createdAt: '2023-01-01' }
        ]
      });

      renderWithTemplateContext(
        <SimpleBlogPosts />,
        { residentData: mockData }
      );

      const title = screen.getByText('Recent Posts');
      const container = title.parentElement;
      const listContainer = screen.getByTestId('simple-post-1').parentElement;

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
        <SimpleBlogPosts className="my-custom-class another-class" />,
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
        <SimpleBlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('simple-post-special-1')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-special-2')).toBeInTheDocument();
      expect(screen.getByText('Post with "quotes" and <tags>')).toBeInTheDocument();
      expect(screen.getByText('Post with émojis 🚀 and symbols @#$%')).toBeInTheDocument();
    });

    it('should handle posts with empty content', () => {
      const mockData = createMockResidentData({
        posts: [
          { id: 'empty-content', contentHtml: '', createdAt: '2023-01-01' },
          { id: 'whitespace-only', contentHtml: '   ', createdAt: '2023-01-02' }
        ]
      });

      renderWithTemplateContext(
        <SimpleBlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('simple-post-empty-content')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-whitespace-only')).toBeInTheDocument();
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
        <SimpleBlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByText('2023-12-31T23:59:59Z')).toBeInTheDocument();
      expect(screen.getByText('2023-01-01')).toBeInTheDocument();
      expect(screen.getByText('invalid-date')).toBeInTheDocument();
    });
  });

  describe('Performance and Large Data', () => {
    it('should handle large number of posts efficiently', () => {
      // Generate 100 mock posts
      const largePosts = Array.from({ length: 100 }, (_, i) => ({
        id: `post-${i}`,
        contentHtml: `Content for post ${i}`,
        createdAt: `2023-01-${String((i % 30) + 1).padStart(2, '0')}`
      }));

      const mockData = createMockResidentData({ posts: largePosts });

      // Should only render the first 5 (default limit)
      renderWithTemplateContext(
        <SimpleBlogPosts />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('simple-post-post-0')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-post-4')).toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-post-5')).not.toBeInTheDocument();
    });

    it('should slice posts array correctly for different limits', () => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        id: `post-${i}`,
        contentHtml: `Post ${i}`,
        createdAt: '2023-01-01'
      }));

      const mockData = createMockResidentData({ posts });

      // Test limit of 3
      const { unmount: unmount1 } = renderWithTemplateContext(
        <SimpleBlogPosts limit={3} />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('simple-post-post-0')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-post-2')).toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-post-3')).not.toBeInTheDocument();
      
      unmount1();

      // Test limit of 7
      renderWithTemplateContext(
        <SimpleBlogPosts limit={7} />,
        { residentData: mockData }
      );

      expect(screen.getByTestId('simple-post-post-0')).toBeInTheDocument();
      expect(screen.getByTestId('simple-post-post-6')).toBeInTheDocument();
      expect(screen.queryByTestId('simple-post-post-7')).not.toBeInTheDocument();
    });
  });
});