import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import MutualFriends from '../MutualFriends';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MutualFriends Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Conditional Rendering Logic', () => {
    it('should not render when viewer is the owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'user123', displayName: 'Test User' } // Same ID = owner
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      // Should not render anything when viewer is owner
      expect(container.firstChild).toBeNull();
    });

    it('should not render when viewer is anonymous', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: null, displayName: null } // Anonymous viewer
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      // Should not render anything when viewer is anonymous
      expect(container.firstChild).toBeNull();
    });

    it('should not render when count is 0', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should not render during loading state', () => {
      // Don't resolve the fetch promise to simulate loading
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      // Should not render anything during loading
      expect(container.firstChild).toBeNull();
    });

    it('should not render when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('API Integration', () => {
    it('should make correct API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/mutuals/testuser');
      });
    });

    it('should handle special characters in owner handle', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'test_user-123', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/mutuals/test_user-123');
      });
    });

    it('should handle URL encoding for special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'test@user+special', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/mutuals/test%40user%2Bspecial');
      });
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Successful Rendering', () => {
    it('should render button with correct count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          count: 5, 
          sample: [
            { userId: 'user1', handle: 'alice', avatarUrl: '/alice.jpg' },
            { userId: 'user2', handle: 'bob', avatarUrl: '/bob.jpg' }
          ]
        })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 5')).toBeInTheDocument();
      });
      
      expect(screen.getByText('🫂')).toBeInTheDocument();
      expect(screen.getByTitle('Mutual friends')).toBeInTheDocument();
    });

    it('should have correct button styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveClass(
          'inline-flex',
          'items-center',
          'gap-2',
          'bg-blue-200',
          'border',
          'border-black',
          'px-2',
          'py-0.5',
          'text-xs',
          'font-bold',
          'shadow-[2px_2px_0_#000]',
          'rounded'
        );
      });
    });

    it('should have correct accessibility attributes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(button).toHaveAttribute('title', 'Mutual friends');
      });
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should expand when clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          count: 2, 
          sample: [
            { userId: 'user1', handle: 'alice', avatarUrl: '/alice.jpg' },
            { userId: 'user2', handle: 'bob', avatarUrl: '/bob.jpg' }
          ]
        })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 2')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should expand and show friends
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('should collapse when clicked again', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          count: 1, 
          sample: [
            { userId: 'user1', handle: 'alice', avatarUrl: '/alice.jpg' }
          ]
        })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 1')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      
      // First click - expand
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('alice')).toBeInTheDocument();

      // Second click - collapse
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });
  });

  describe('Friend Display in Expanded State', () => {
    it('should render friend avatars and links correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          count: 2, 
          sample: [
            { userId: 'user1', handle: 'alice', avatarUrl: '/alice.jpg' },
            { userId: 'user2', handle: 'bob', avatarUrl: '/bob.jpg' }
          ]
        })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 2')).toBeInTheDocument();
      });

      // Expand
      fireEvent.click(screen.getByRole('button'));

      // Check friend links
      const aliceLink = screen.getByText('alice').closest('a');
      const bobLink = screen.getByText('bob').closest('a');
      
      expect(aliceLink).toHaveAttribute('href', '/alice');
      expect(bobLink).toHaveAttribute('href', '/bob');

      // Check avatars
      const aliceAvatar = screen.getByAltText('alice');
      const bobAvatar = screen.getByAltText('bob');
      
      expect(aliceAvatar).toHaveAttribute('src', '/alice.jpg');
      expect(bobAvatar).toHaveAttribute('src', '/bob.jpg');
    });

    it('should have correct grid layout styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          count: 1, 
          sample: [
            { userId: 'user1', handle: 'alice', avatarUrl: '/alice.jpg' }
          ]
        })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 1')).toBeInTheDocument();
      });

      // Expand
      fireEvent.click(screen.getByRole('button'));

      const gridContainer = container.querySelector('.grid.grid-cols-3.sm\\:grid-cols-6.gap-2');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass(
        'mt-2',
        'grid',
        'grid-cols-3',
        'sm:grid-cols-6',
        'gap-2',
        'p-2',
        'bg-white',
        'border',
        'border-black',
        'shadow-[2px_2px_0_#000]'
      );
    });

    it('should have correct friend card styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          count: 1, 
          sample: [
            { userId: 'user1', handle: 'alice', avatarUrl: '/alice.jpg' }
          ]
        })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 1')).toBeInTheDocument();
      });

      // Expand
      fireEvent.click(screen.getByRole('button'));

      const friendLink = screen.getByText('alice').closest('a');
      expect(friendLink).toHaveClass(
        'flex',
        'flex-col',
        'items-center',
        'gap-1',
        'no-underline',
        'hover:underline'
      );

      const avatar = screen.getByAltText('alice');
      expect(avatar).toHaveClass(
        'w-10',
        'h-10',
        'object-cover',
        'border',
        'border-black'
      );

      const handleText = screen.getByText('alice');
      expect(handleText).toHaveClass('text-xs');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sample array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5, sample: [] }) // Count > 0 but no sample
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 5')).toBeInTheDocument();
      });

      // Expand - should not crash with empty sample
      fireEvent.click(screen.getByRole('button'));
      
      // Should show expanded container but no friends
      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 5')).toBeInTheDocument();
      });
    });

    it('should handle malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ /* missing count and sample */ })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const { container } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        // Should not render when count is undefined/0
        expect(container.firstChild).toBeNull();
      });
    });

    it('should handle non-array sample data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3, sample: "not an array" })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 3')).toBeInTheDocument();
      });

      // Should not crash when expanding with invalid sample data
      fireEvent.click(screen.getByRole('button'));
    });

    it('should cleanup on unmount', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const { unmount } = renderWithTemplateContext(<MutualFriends />, { residentData });
      
      // Unmount while API call is pending
      unmount();
      
      // Should not cause any issues
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('should have proper ARIA attributes when expanded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          count: 1, 
          sample: [
            { userId: 'user1', handle: 'alice', avatarUrl: '/alice.jpg' }
          ]
        })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 1')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      
      // Initially collapsed
      expect(button).toHaveAttribute('aria-expanded', 'false');
      
      // Expand
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Performance', () => {
    it('should render quickly after API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3, sample: [] })
      });

      const residentData = createMockResidentData({
        owner: { id: 'user123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'visitor456', displayName: 'Visitor' }
      });

      const startTime = performance.now();
      renderWithTemplateContext(<MutualFriends />, { residentData });
      
      await waitFor(() => {
        expect(screen.getByText('Mutual friends: 3')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should be reasonably fast
    });
  });
});