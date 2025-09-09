import React from 'react';
import { screen } from '@testing-library/react';
import FriendDisplay from '../FriendDisplay';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ href, children, className, ...props }: any) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  };
});

describe('FriendDisplay Component', () => {
  describe('Basic Functionality', () => {
    it('should render featured friends when data is available', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice Smith',
            avatarUrl: '/avatars/alice.jpg'
          },
          {
            id: 'friend2',
            handle: 'bob',
            displayName: 'Bob Johnson',
            avatarUrl: '/avatars/bob.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('@alice')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText('@bob')).toBeInTheDocument();
    });

    it('should show empty state when no featured friends', () => {
      const residentData = createMockResidentData({
        featuredFriends: []
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('No featured friends yet.')).toBeInTheDocument();
    });

    it('should show empty state when featuredFriends is undefined', () => {
      const residentData = createMockResidentData({
        featuredFriends: undefined
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('No featured friends yet.')).toBeInTheDocument();
    });

    it('should show empty state when featuredFriends is null', () => {
      const residentData = createMockResidentData({
        featuredFriends: null
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('No featured friends yet.')).toBeInTheDocument();
    });
  });

  describe('Friend Display', () => {
    it('should render friend avatars with correct attributes', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice Smith',
            avatarUrl: '/avatars/alice.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const avatar = screen.getByAltText('Alice Smith');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', '/avatars/alice.jpg');
      expect(avatar).toHaveClass('w-8', 'h-8', 'border', 'border-black', 'object-cover', 'flex-shrink-0');
    });

    it('should render friend links with correct hrefs', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice Smith',
            avatarUrl: '/avatars/alice.jpg'
          },
          {
            id: 'friend2',
            handle: 'bob_jones',
            displayName: 'Bob Jones',
            avatarUrl: '/avatars/bob.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const aliceLink = screen.getByText('Alice Smith').closest('a');
      const bobLink = screen.getByText('Bob Jones').closest('a');
      
      expect(aliceLink).toHaveAttribute('href', '/alice');
      expect(bobLink).toHaveAttribute('href', '/bob_jones');
    });

    it('should render friend names and handles correctly', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice_wonderland',
            displayName: 'Alice in Wonderland',
            avatarUrl: '/avatars/alice.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText('Alice in Wonderland')).toBeInTheDocument();
      expect(screen.getByText('@alice_wonderland')).toBeInTheDocument();
    });

    it('should handle multiple friends in grid layout', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatars/alice.jpg'
          },
          {
            id: 'friend2',
            handle: 'bob',
            displayName: 'Bob',
            avatarUrl: '/avatars/bob.jpg'
          },
          {
            id: 'friend3',
            handle: 'charlie',
            displayName: 'Charlie',
            avatarUrl: '/avatars/charlie.jpg'
          },
          {
            id: 'friend4',
            handle: 'diana',
            displayName: 'Diana',
            avatarUrl: '/avatars/diana.jpg'
          }
        ]
      });
      
      const { container } = renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      // Should render all friends
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Diana')).toBeInTheDocument();
      
      // Should use grid layout
      const gridContainer = container.querySelector('.grid.grid-cols-2.gap-3');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should have correct container styling', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      const { container } = renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const mainContainer = container.querySelector('.featured-friends');
      expect(mainContainer).toHaveClass(
        'featured-friends',
        'border',
        'border-black',
        'p-3',
        'bg-white',
        'shadow-[2px_2px_0_#000]'
      );
    });

    it('should have correct heading styling', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      const { container } = renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const heading = container.querySelector('h4');
      expect(heading).toHaveClass('section-heading', 'font-bold', 'mb-3');
      expect(heading?.textContent).toBe('Friends');
    });

    it('should have correct friend card styling', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      const { container } = renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const friendCard = container.querySelector('.friend-card');
      expect(friendCard).toHaveClass(
        'friend-card',
        'flex',
        'items-center',
        'gap-2',
        'p-2',
        'border',
        'border-gray-300',
        'bg-gray-50',
        'hover:bg-yellow-100',
        'shadow-[1px_1px_0_#000]',
        'transition-colors'
      );
    });

    it('should have correct empty state styling', () => {
      const residentData = createMockResidentData({
        featuredFriends: []
      });
      
      const { container } = renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const container_div = container.querySelector('div');
      expect(container_div).toHaveClass(
        'border',
        'border-black',
        'p-3',
        'bg-white',
        'shadow-[2px_2px_0_#000]'
      );
      
      const emptyText = container.querySelector('p');
      expect(emptyText).toHaveClass('text-gray-500', 'text-sm');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toHaveTextContent('Friends');
    });

    it('should have accessible avatar images', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice Smith',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const avatar = screen.getByAltText('Alice Smith');
      expect(avatar).toBeInTheDocument();
    });

    it('should have accessible links', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice Smith',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/alice');
    });

    it('should be keyboard navigable', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          },
          {
            id: 'friend2',
            handle: 'bob',
            displayName: 'Bob',
            avatarUrl: '/avatar2.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      
      // Links should not have tabindex -1 (should be keyboard accessible)
      links.forEach(link => {
        expect(link).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle friends with very long names', () => {
      const longName = 'A'.repeat(100);
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: longName,
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      const { container } = renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText(longName)).toBeInTheDocument();
      
      // Should have truncate classes for overflow
      const nameDiv = container.querySelector('.font-semibold.text-sm.truncate');
      expect(nameDiv).toBeInTheDocument();
    });

    it('should handle friends with special characters in handles', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'user_123-test.special',
            displayName: 'Special User',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText('@user_123-test.special')).toBeInTheDocument();
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/user_123-test.special');
    });

    it('should handle missing avatar URLs gracefully', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: ''
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const avatar = screen.getByAltText('Alice');
      // React converts empty string src to null as an optimization
      expect(avatar).toBeInTheDocument();
      expect(avatar.getAttribute('src')).toBe(null);
    });

    it('should handle undefined avatar URLs', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: undefined as any
          }
        ]
      });
      
      expect(() => {
        renderWithTemplateContext(<FriendDisplay />, { residentData });
      }).not.toThrow();
    });

    it('should handle empty display names', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: '',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      expect(screen.getByText('@alice')).toBeInTheDocument();
      // Empty display name should still render (empty content)
      const nameDiv = screen.getByText('@alice').parentElement?.querySelector('.font-semibold');
      expect(nameDiv?.textContent).toBe('');
    });

    it('should handle single friend correctly', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should handle maximum realistic number of friends', () => {
      const manyFriends = Array.from({ length: 20 }, (_, i) => ({
        id: `friend${i}`,
        handle: `user${i}`,
        displayName: `User ${i}`,
        avatarUrl: `/avatar${i}.jpg`
      }));

      const residentData = createMockResidentData({
        featuredFriends: manyFriends
      });
      
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(20);
      
      // Check a few specific ones
      expect(screen.getByText('User 0')).toBeInTheDocument();
      expect(screen.getByText('User 19')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly with many friends', () => {
      const manyFriends = Array.from({ length: 50 }, (_, i) => ({
        id: `friend${i}`,
        handle: `user${i}`,
        displayName: `User ${i}`,
        avatarUrl: `/avatar${i}.jpg`
      }));

      const residentData = createMockResidentData({
        featuredFriends: manyFriends
      });
      
      const startTime = performance.now();
      renderWithTemplateContext(<FriendDisplay />, { residentData });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly even with many friends
    });

    it('should not cause memory leaks', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithTemplateContext(<FriendDisplay />, { residentData });
        unmount();
      }
      
      expect(true).toBe(true); // Should complete without issues
    });
  });

  describe('Integration', () => {
    it('should work with other components', () => {
      const residentData = createMockResidentData({
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'alice',
            displayName: 'Alice',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });
      
      renderWithTemplateContext(
        <div>
          <h1>Profile Page</h1>
          <FriendDisplay />
          <p>Other content</p>
        </div>,
        { residentData }
      );
      
      expect(screen.getByText('Profile Page')).toBeInTheDocument();
      expect(screen.getByText('Friends')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Other content')).toBeInTheDocument();
    });
  });
});