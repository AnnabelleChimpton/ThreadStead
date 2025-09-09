import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import UserAccount from '../UserAccount';

// Mock the auth components
jest.mock('@/components/features/auth/LoginButton', () => {
  return function MockLoginButton() {
    return <button data-testid="login-button">Login</button>;
  };
});

jest.mock('@/components/features/auth/UserDropdown', () => {
  return function MockUserDropdown() {
    return <div data-testid="user-dropdown">User Menu</div>;
  };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('UserAccount Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: false })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
    });

    it('should render visitor mode when not logged in', async () => {
      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
      });
    });

    it('should apply correct CSS classes to visitor mode', async () => {
      render(<UserAccount />);
      
      await waitFor(() => {
        const container = screen.getByText('visitor mode').closest('div');
        expect(container).toHaveClass('flex', 'items-center', 'gap-3');
      });
    });

    it('should apply thread-label styling to visitor mode text', async () => {
      render(<UserAccount />);
      
      await waitFor(() => {
        const visitorLabel = screen.getByText('visitor mode');
        expect(visitorLabel).toHaveClass('thread-label', 'text-sm');
      });
    });

    it('should render LoginButton component', async () => {
      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              loggedIn: true,
              user: {
                id: 'user123',
                did: 'did:web:example.com',
                primaryHandle: '@testuser'
              }
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
    });

    it('should render UserDropdown when logged in', async () => {
      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
        expect(screen.queryByText('visitor mode')).not.toBeInTheDocument();
        expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
      });
    });

    it('should not render visitor mode elements when authenticated', async () => {
      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.queryByText('visitor mode')).not.toBeInTheDocument();
        expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should handle initial loading state', () => {
      // Mock fetch that never resolves to simulate loading
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<UserAccount />);
      
      // During loading, component renders initial state (visitor mode)
      expect(screen.getByText('visitor mode')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    it('should call auth API on mount', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: false })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        // Should default to visitor mode on error
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
      });
    });

    it('should handle malformed response data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ invalid: 'data' })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        // Should default to visitor mode when loggedIn is missing/falsy
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
      });
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: false,
            status: 500
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        // Should default to visitor mode on non-ok response
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
      });
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.reject(new Error('Invalid JSON'))
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        // Should default to visitor mode on JSON parsing error
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should handle component unmounting during async operation', async () => {
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementation(() => slowPromise);

      const { unmount } = render(<UserAccount />);
      
      // Unmount before promise resolves
      unmount();
      
      // Resolve the promise after unmount
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ loggedIn: true })
      });

      // Should not cause any errors or state updates after unmount
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
      });
    });

    it('should not update state after unmounting', async () => {
      let resolveAuth: (value: any) => void;
      const authPromise = new Promise(resolve => {
        resolveAuth = resolve;
      });

      mockFetch.mockImplementation(() => ({
        ok: true,
        json: () => authPromise
      }));

      const { unmount } = render(<UserAccount />);
      
      // Unmount immediately
      unmount();
      
      // Try to resolve the promise
      resolveAuth!({ loggedIn: true });

      // Wait a bit to ensure no state updates occur
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // No assertions needed - test passes if no errors thrown
    });
  });

  describe('User Data Handling', () => {
    it('should handle user data with all fields', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              loggedIn: true,
              user: {
                id: 'user123',
                did: 'did:web:example.com',
                primaryHandle: '@testuser'
              }
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle user data with partial fields', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              loggedIn: true,
              user: {
                id: 'user123'
                // Missing did and primaryHandle
              }
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle missing user object when logged in', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              loggedIn: true
              // Missing user object
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle null user when logged in', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              loggedIn: true,
              user: null
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to visitor mode', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: false })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      // Component shows visitor mode initially (default state)
      expect(screen.getByText('visitor mode')).toBeInTheDocument();
      
      // After API call resolves, still in visitor mode (same state)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
      });
    });

    it('should transition from loading to authenticated mode', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      // Initially nothing should be rendered
      expect(screen.queryByTestId('user-dropdown')).not.toBeInTheDocument();
      
      // After API call resolves
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle multiple rapid re-renders', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const { rerender } = render(<UserAccount />);
      
      // Trigger multiple rerenders
      rerender(<UserAccount />);
      rerender(<UserAccount />);
      rerender(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle boolean true for loggedIn', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: true })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle boolean false for loggedIn', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: false })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
      });
    });

    it('should handle truthy non-boolean values for loggedIn', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: 'yes' })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle falsy non-boolean values for loggedIn', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ loggedIn: 0 })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<UserAccount />);
      
      await waitFor(() => {
        expect(screen.getByText('visitor mode')).toBeInTheDocument();
      });
    });
  });
});