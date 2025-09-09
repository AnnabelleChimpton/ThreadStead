import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import NotificationBell from '../NotificationBell';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock timers for interval testing
jest.useFakeTimers();

describe('NotificationBell Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Mock successful auth check and notification count
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
          json: () => Promise.resolve({ count: 3 })
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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

      const { container } = render(<NotificationBell />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should not render while loading', () => {
      const { container } = render(<NotificationBell />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when unreadCount is null', async () => {
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
            json: () => Promise.resolve({ count: null })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const { container } = render(<NotificationBell />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      }, { timeout: 3000 });
    });

    it('should render notification bell when logged in with valid count', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/notifications');
        expect(screen.getByText('🔔')).toBeInTheDocument();
      });
    });

    it('should have proper title attribute', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('title', '3 unread notifications');
      });
    });

    it('should call auth check on mount', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
      });
    });

    it('should call notification count when authenticated', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count');
      });
    });
  });

  describe('Notification Count Display', () => {
    it('should show unread count in badge', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-thread-sunset', 'text-white');
      });
    });

    it('should show text indicator for unread count', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('3 new')).toBeInTheDocument();
      });
    });

    it('should show 99+ for counts over 99', async () => {
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
            json: () => Promise.resolve({ count: 150 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
        expect(screen.getByText('150 new')).toBeInTheDocument();
      });
    });

    it('should handle zero unread count gracefully', async () => {
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
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        // Should not show badge or text for 0 count
        expect(screen.queryByText('0')).not.toBeInTheDocument();
        expect(screen.queryByText('0 new')).not.toBeInTheDocument();
      });
    });

    it('should not show badge when count is 0', async () => {
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
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('🔔')).toBeInTheDocument();
        expect(screen.queryByText('new')).not.toBeInTheDocument();
      });
    });
  });

  describe('Styling and Visual Elements', () => {
    it('should apply correct CSS classes to link', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveClass(
          'relative',
          'inline-flex',
          'items-center',
          'gap-2',
          'text-thread-pine',
          'hover:text-thread-sunset'
        );
      });
    });

    it('should apply correct styling to badge', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toHaveClass(
          'absolute',
          'bg-thread-sunset',
          'text-white',
          'text-xs',
          'rounded-full',
          'border',
          'border-black',
          'shadow-[1px_1px_0_#000]'
        );
      });
    });

    it('should apply correct styling to bell icon', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const bellSpan = screen.getByText('🔔');
        expect(bellSpan).toHaveClass('text-xl');
      });
    });

    it('should apply correct styling to text indicator', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const textSpan = screen.getByText('3 new');
        expect(textSpan).toHaveClass('text-sm', 'text-thread-sage');
      });
    });
  });

  describe('Periodic Refresh', () => {
    it('should set up periodic refresh when logged in', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count');
      });

      mockFetch.mockClear();

      // Fast forward 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count');
      });
    });

    it('should clear interval on unmount', async () => {
      const { unmount } = render(<NotificationBell />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count');
      });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should not set up periodic refresh when not logged in', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: false })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
      });

      mockFetch.mockClear();

      // Fast forward 30 seconds
      jest.advanceTimersByTime(30000);

      // Should not call notifications count
      expect(mockFetch).not.toHaveBeenCalled();
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

      const { container } = render(<NotificationBell />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should handle notification count API errors gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url === '/api/notifications/count') {
          return Promise.reject(new Error('Server error'));
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { container } = render(<NotificationBell />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch notification count:', expect.any(Error));
        // Should not render due to error
        expect(container.firstChild).toBeNull();
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle 401 response properly', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        if (url === '/api/notifications/count') {
          return Promise.resolve({
            ok: false,
            status: 401
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const { container } = render(<NotificationBell />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should handle malformed response data', async () => {
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
            json: () => Promise.resolve({ count: 'invalid' })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        // Should handle invalid count gracefully by not showing text
        expect(screen.queryByText('invalid new')).not.toBeInTheDocument();
        // But should still render the bell with appropriate title
        expect(link).toHaveAttribute('title', 'invalid unread notifications');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper link semantics', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/notifications');
      });
    });

    it('should have descriptive title attribute', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('title', '3 unread notifications');
      });
    });

    it('should update title when count changes', async () => {
      // Test with different mock counts by unmounting and remounting
      const { unmount } = render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('title', '3 unread notifications');
      });

      // Clean up and test with new count
      unmount();
      
      // Mock different count
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
            json: () => Promise.resolve({ count: 7 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      // Render again with new mock
      render(<NotificationBell />);

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('title', '7 unread notifications');
      });
    });

    it('should be keyboard accessible', async () => {
      render(<NotificationBell />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        link.focus();
        expect(link).toHaveFocus();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large notification counts', async () => {
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
            json: () => Promise.resolve({ count: 99999 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
        expect(screen.getByText('99999 new')).toBeInTheDocument();
      });
    });

    it('should handle negative counts', async () => {
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
            json: () => Promise.resolve({ count: -5 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        // Component should render but handle negative count gracefully
        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        // Negative counts shouldn't show the "new" text (since -5 > 0 is false)
        expect(screen.queryByText('-5 new')).not.toBeInTheDocument();
        // But should still have title with the count
        expect(link).toHaveAttribute('title', '-5 unread notifications');
      });
    });

    it('should handle component mounting and unmounting quickly', async () => {
      const { unmount } = render(<NotificationBell />);
      
      // Unmount before async operations complete
      unmount();
      
      // Should not cause any errors or warnings
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
    });

    it('should handle count exactly at 99', async () => {
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
            json: () => Promise.resolve({ count: 99 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('99')).toBeInTheDocument();
        expect(screen.queryByText('99+')).not.toBeInTheDocument();
      });
    });

    it('should handle count exactly at 100', async () => {
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
            json: () => Promise.resolve({ count: 100 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
        expect(screen.getByText('100 new')).toBeInTheDocument();
      });
    });
  });
});