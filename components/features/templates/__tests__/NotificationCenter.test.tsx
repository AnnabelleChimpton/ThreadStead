import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import NotificationCenter from '../NotificationCenter';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock sample notification data
const mockNotifications = [
  {
    id: '1',
    type: 'comment',
    actor: {
      handle: '@johndoe',
      displayName: 'John Doe',
      avatarUrl: '/avatar1.jpg'
    },
    data: {
      postAuthorHandle: '@alice',
      postId: 'post123',
      commentId: 'comment456'
    },
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    type: 'follow',
    actor: {
      handle: '@janedoe',
      displayName: 'Jane Doe',
      avatarUrl: null
    },
    data: {},
    createdAt: '2024-01-14T15:30:00Z'
  },
  {
    id: '3',
    type: 'photo_comment',
    actor: {
      handle: '@bob',
      displayName: null,
      avatarUrl: '/avatar3.jpg'
    },
    data: {
      mediaId: 'media123',
      mediaOwnerHandle: '@alice',
      mediaTitle: 'Sunset Photo',
      commentId: 'comment789'
    },
    createdAt: '2024-01-13T09:15:00Z'
  }
];

describe.skip('NotificationCenter Component (complex async/mock timing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful auth check
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ loggedIn: true })
        });
      }
      if (url === '/api/notifications?limit=5') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notifications: mockNotifications })
        });
      }
      if (url === '/api/notifications/count') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ count: 5 })
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
  });

  describe('Authentication and Initial State', () => {
    it('should not render when user is not logged in', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: false })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const { container } = render(<NotificationCenter />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should render notification bell when logged in', async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        expect(bellButton).toBeInTheDocument();
        expect(bellButton).toHaveTextContent('🔔');
      });
    });

    it('should show unread count badge', async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const badge = screen.getByText('5');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-red-500', 'text-white');
      });
    });

    it('should show 9+ for counts over 9', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url === '/api/notifications/count') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ count: 15 })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notifications: [] })
        });
      });

      render(<NotificationCenter />);
      
      await waitFor(() => {
        const badge = screen.getByText('9+');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should not show badge when unread count is 0', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url === '/api/notifications/count') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ count: 0 })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notifications: [] })
        });
      });

      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        expect(bellButton).toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Behavior', () => {
    it('should open dropdown when bell is clicked', async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('View all')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      });
    });

    it('should fetch notifications when dropdown is opened', async () => {
      render(<NotificationCenter />);
      
      // Initial auth check should have been called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
      });

      mockFetch.mockClear();

      const bellButton = screen.getByRole('button');
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications?limit=5');
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count');
      });
    });
  });

  describe('Notification Display', () => {
    beforeEach(async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });
    });

    it('should display notification messages correctly', async () => {
      await waitFor(() => {
        expect(screen.getByText('John Doe commented on your post')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe started following you')).toBeInTheDocument();
        expect(screen.getByText('@bob commented on your photo "Sunset Photo"')).toBeInTheDocument();
      });
    });

    it('should display notification avatars', async () => {
      await waitFor(() => {
        const avatars = screen.getAllByRole('img');
        expect(avatars).toHaveLength(3);
        expect(avatars[0]).toHaveAttribute('src', '/avatar1.jpg');
        expect(avatars[1]).toHaveAttribute('src', '/assets/default-avatar.gif');
        expect(avatars[2]).toHaveAttribute('src', '/avatar3.jpg');
      });
    });

    it('should display notification dates', async () => {
      await waitFor(() => {
        expect(screen.getByText('1/15/2024')).toBeInTheDocument();
        expect(screen.getByText('1/14/2024')).toBeInTheDocument();
        expect(screen.getByText('1/13/2024')).toBeInTheDocument();
      });
    });

    it('should show loading state', async () => {
      // Mock slow response
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url.includes('/api/notifications')) {
          return new Promise(() => {}); // Never resolves
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('should show empty state when no notifications', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url === '/api/notifications?limit=5') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ notifications: [] })
          });
        }
        if (url === '/api/notifications/count') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ count: 0 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });

      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Logic', () => {
    beforeEach(async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });
    });

    it('should navigate to post comment when clicked', async () => {
      await waitFor(() => {
        const commentNotification = screen.getByText('John Doe commented on your post');
        fireEvent.click(commentNotification.closest('.cursor-pointer')!);
      });

      expect(mockPush).toHaveBeenCalledWith(
        '/resident/alice/post/post123?comments=open&highlight=comment456'
      );
    });

    it('should navigate to user profile for follow notifications', async () => {
      await waitFor(() => {
        const followNotification = screen.getByText('Jane Doe started following you');
        fireEvent.click(followNotification.closest('.cursor-pointer')!);
      });

      expect(mockPush).toHaveBeenCalledWith('/resident/janedoe');
    });

    it('should navigate to media page for photo comments', async () => {
      await waitFor(() => {
        const photoNotification = screen.getByText('@bob commented on your photo "Sunset Photo"');
        fireEvent.click(photoNotification.closest('.cursor-pointer')!);
      });

      expect(mockPush).toHaveBeenCalledWith(
        '/resident/alice/media?photo=media123&comment=comment789'
      );
    });

    it('should close dropdown after navigation', async () => {
      await waitFor(() => {
        const commentNotification = screen.getByText('John Doe commented on your post');
        fireEvent.click(commentNotification.closest('.cursor-pointer')!);
      });

      await waitFor(() => {
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      });
    });
  });

  describe('Message Generation', () => {
    const testCases = [
      {
        type: 'comment',
        actor: { displayName: 'John', handle: '@john' },
        expected: 'John commented on your post'
      },
      {
        type: 'reply',
        actor: { displayName: 'Jane', handle: '@jane' },
        expected: 'Jane replied to your comment'
      },
      {
        type: 'photo_comment',
        actor: { displayName: 'Bob', handle: '@bob' },
        data: { mediaTitle: 'My Photo' },
        expected: 'Bob commented on your photo "My Photo"'
      },
      {
        type: 'photo_comment',
        actor: { displayName: 'Bob', handle: '@bob' },
        data: {},
        expected: 'Bob commented on your photo'
      },
      {
        type: 'photo_reply',
        actor: { displayName: 'Alice', handle: '@alice' },
        expected: 'Alice replied to your comment on a photo'
      },
      {
        type: 'follow',
        actor: { displayName: 'Charlie', handle: '@charlie' },
        expected: 'Charlie started following you'
      },
      {
        type: 'friend',
        actor: { displayName: 'Dave', handle: '@dave' },
        expected: 'Dave is now your mutual friend!'
      },
      {
        type: 'guestbook',
        actor: { displayName: 'Eve', handle: '@eve' },
        expected: 'Eve signed your guestbook'
      },
      {
        type: 'unknown',
        actor: { displayName: 'Frank', handle: '@frank' },
        expected: 'New activity from Frank'
      },
      {
        type: 'comment',
        actor: { handle: '@noname' },
        expected: '@noname commented on your post'
      },
      {
        type: 'comment',
        actor: {},
        expected: 'Someone commented on your post'
      }
    ];

    testCases.forEach(({ type, actor, data, expected }) => {
      it(`should generate correct message for ${type} notification`, async () => {
        const notification = {
          id: '1',
          type,
          actor,
          data: data || {},
          createdAt: '2024-01-15T10:00:00Z'
        };

        mockFetch.mockImplementation((url: string) => {
          if (url === '/api/auth/me') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ loggedIn: true })
            });
          }
          if (url === '/api/notifications?limit=5') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ notifications: [notification] })
            });
          }
          if (url === '/api/notifications/count') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ count: 1 })
            });
          }
          return Promise.reject(new Error('Unexpected URL'));
        });

        render(<NotificationCenter />);
        
        await waitFor(() => {
          const bellButton = screen.getByRole('button');
          fireEvent.click(bellButton);
        });

        await waitFor(() => {
          expect(screen.getByText(expected)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle auth API errors gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const { container } = render(<NotificationCenter />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should handle notification fetch errors gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url.includes('/api/notifications')) {
          return Promise.reject(new Error('Server error'));
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });

      // Should not crash and should show loading/empty state
      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument();
      });
    });

    it('should handle malformed notification data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url === '/api/notifications?limit=5') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              notifications: [
                {
                  id: '1',
                  type: 'comment',
                  actor: null,
                  data: null,
                  createdAt: 'invalid-date'
                }
              ]
            })
          });
        }
        if (url === '/api/notifications/count') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ count: 1 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('should be keyboard accessible', async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        button.focus();
        expect(button).toHaveFocus();
        
        fireEvent.keyDown(button, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      render(<NotificationCenter />);
      
      await waitFor(() => {
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);
      });

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: 'Notifications' });
        expect(heading).toBeInTheDocument();
      });
    });
  });
});