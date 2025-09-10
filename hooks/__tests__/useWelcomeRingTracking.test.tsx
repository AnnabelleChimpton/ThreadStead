import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useWelcomeRingTracking } from '../useWelcomeRingTracking';

// Mock the Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

// Mock the welcome progress and celebrations
jest.mock('@/lib/welcome/progress', () => ({
  updateWelcomeProgress: jest.fn(),
  getWelcomeProgress: jest.fn()
}));

jest.mock('@/lib/welcome/celebrations', () => ({
  celebrateAction: jest.fn()
}));

import { useRouter } from 'next/router';
import { updateWelcomeProgress, getWelcomeProgress } from '@/lib/welcome/progress';
import { celebrateAction } from '@/lib/welcome/celebrations';

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUpdateWelcomeProgress = updateWelcomeProgress as jest.MockedFunction<typeof updateWelcomeProgress>;
const mockGetWelcomeProgress = getWelcomeProgress as jest.MockedFunction<typeof getWelcomeProgress>;
const mockCelebrateAction = celebrateAction as jest.MockedFunction<typeof celebrateAction>;

// Test component that uses the hook
const TestComponent: React.FC<{ ringSlug?: string }> = ({ ringSlug }) => {
  const { trackCommentCreated, isWelcomeRing } = useWelcomeRingTracking(ringSlug);
  
  return (
    <div>
      <div data-testid="is-welcome-ring">{isWelcomeRing.toString()}</div>
      <button data-testid="track-comment" onClick={trackCommentCreated}>
        Track Comment
      </button>
      
      {/* Simulate elements that the hook tracks */}
      <button className="comment-button">View Comments</button>
      <a href="/resident/testuser" className="user-link">@testuser</a>
    </div>
  );
};

describe('useWelcomeRingTracking Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default router mock
    mockUseRouter.mockReturnValue({
      asPath: '/tr/test-ring',
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      reload: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      defaultLocale: 'en',
      domainLocales: [],
      isPreview: false,
      route: '/tr/[slug]',
      pathname: '/tr/[slug]',
      query: { slug: 'test-ring' },
      basePath: '',
      locale: 'en',
      locales: ['en'],
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    } as any);
    
    // Default progress mock
    mockGetWelcomeProgress.mockReturnValue({
      joinedRing: false,
      readFirstPost: false,
      leftFirstComment: false,
      visitedProfile: false,
      browseRings: false,
      completedWelcome: false
    });
  });

  describe('Welcome Ring Detection', () => {
    it('should detect welcome ring by slug', () => {
      render(<TestComponent ringSlug="welcome" />);
      
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('true');
    });

    it('should detect welcome ring by router path', () => {
      mockUseRouter.mockReturnValue({
        ...mockUseRouter(),
        asPath: '/tr/welcome'
      } as any);
      
      render(<TestComponent />);
      
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('true');
    });

    it('should not detect non-welcome rings', () => {
      render(<TestComponent ringSlug="other-ring" />);
      
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('false');
    });

    it('should handle undefined ring slug', () => {
      render(<TestComponent />);
      
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('false');
    });
  });

  describe('Comment Tracking', () => {
    it('should track comment creation on welcome ring', () => {
      render(<TestComponent ringSlug="welcome" />);
      
      fireEvent.click(screen.getByTestId('track-comment'));
      
      expect(mockUpdateWelcomeProgress).toHaveBeenCalledWith({ leftFirstComment: true });
      expect(mockCelebrateAction).toHaveBeenCalledWith('firstComment');
    });

    it('should not track comment creation on non-welcome rings', () => {
      render(<TestComponent ringSlug="other-ring" />);
      
      fireEvent.click(screen.getByTestId('track-comment'));
      
      expect(mockUpdateWelcomeProgress).not.toHaveBeenCalled();
      expect(mockCelebrateAction).not.toHaveBeenCalled();
    });

    it('should only track first comment', () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true, // Already completed
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      render(<TestComponent ringSlug="welcome" />);
      
      fireEvent.click(screen.getByTestId('track-comment'));
      
      expect(mockUpdateWelcomeProgress).not.toHaveBeenCalled();
      expect(mockCelebrateAction).not.toHaveBeenCalled();
    });
  });

  describe('Click Event Tracking', () => {
    it('should track comment button clicks', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: false, // Not completed yet
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      render(<TestComponent ringSlug="welcome" />);
      
      const commentButton = screen.getByText('View Comments');
      fireEvent.click(commentButton);
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).toHaveBeenCalledWith({ readFirstPost: true });
        expect(mockCelebrateAction).toHaveBeenCalledWith('firstPost');
      });
    });

    it('should track profile link clicks', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: false, // Not completed yet
        browseRings: false,
        completedWelcome: false
      });
      
      render(<TestComponent ringSlug="welcome" />);
      
      const profileLink = screen.getByText('@testuser');
      fireEvent.click(profileLink);
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).toHaveBeenCalledWith({ visitedProfile: true });
        expect(mockCelebrateAction).toHaveBeenCalledWith('visitedProfile');
      });
    });

    it('should not track clicks on non-welcome rings', async () => {
      render(<TestComponent ringSlug="other-ring" />);
      
      const commentButton = screen.getByText('View Comments');
      fireEvent.click(commentButton);
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).not.toHaveBeenCalled();
        expect(mockCelebrateAction).not.toHaveBeenCalled();
      });
    });

    it('should not track already completed steps', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true, // Already completed
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      render(<TestComponent ringSlug="welcome" />);
      
      const commentButton = screen.getByText('View Comments');
      fireEvent.click(commentButton);
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).not.toHaveBeenCalled();
        expect(mockCelebrateAction).not.toHaveBeenCalled();
      });
    });
  });

  describe('Event Listener Management', () => {
    it('should add event listeners on mount for welcome ring', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      render(<TestComponent ringSlug="welcome" />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should not add event listeners for non-welcome rings', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      render(<TestComponent ringSlug="other-ring" />);
      
      expect(addEventListenerSpy).not.toHaveBeenCalled();
      
      addEventListenerSpy.mockRestore();
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<TestComponent ringSlug="welcome" />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should update listeners when ringSlug changes', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<TestComponent ringSlug="other-ring" />);
      
      expect(addEventListenerSpy).not.toHaveBeenCalled();
      
      rerender(<TestComponent ringSlug="welcome" />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      
      rerender(<TestComponent ringSlug="another-ring" />);
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Button Click Target Detection', () => {
    it('should detect clicks on buttons containing "Comments" text', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      const { container } = render(<TestComponent ringSlug="welcome" />);
      
      // Create a button with "Comments" in the text
      const button = document.createElement('button');
      button.textContent = 'View Comments (5)';
      container.appendChild(button);
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).toHaveBeenCalledWith({ readFirstPost: true });
      });
    });

    it('should detect clicks on nested elements within comment buttons', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      const { container } = render(<TestComponent ringSlug="welcome" />);
      
      // Create a button with nested span containing "Comments"
      const button = document.createElement('button');
      const span = document.createElement('span');
      span.textContent = 'Comments';
      button.appendChild(span);
      container.appendChild(button);
      
      fireEvent.click(span); // Click the nested span
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).toHaveBeenCalledWith({ readFirstPost: true });
      });
    });

    it('should detect clicks on profile links with /resident/ href', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      const { container } = render(<TestComponent ringSlug="welcome" />);
      
      // Create a link to a user profile
      const link = document.createElement('a');
      link.href = '/resident/johndoe';
      link.textContent = '@johndoe';
      container.appendChild(link);
      
      fireEvent.click(link);
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).toHaveBeenCalledWith({ visitedProfile: true });
      });
    });

    it('should ignore clicks on non-profile links', async () => {
      const { container } = render(<TestComponent ringSlug="welcome" />);
      
      // Create a non-profile link
      const link = document.createElement('a');
      link.href = '/some-other-page';
      link.textContent = 'Other Link';
      container.appendChild(link);
      
      fireEvent.click(link);
      
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).not.toHaveBeenCalled();
      });
    });
  });

  describe('Return Values', () => {
    it('should return correct isWelcomeRing value', () => {
      const { rerender } = render(<TestComponent ringSlug="welcome" />);
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('true');
      
      rerender(<TestComponent ringSlug="other-ring" />);
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('false');
    });

    it('should return trackCommentCreated function', () => {
      render(<TestComponent ringSlug="welcome" />);
      
      const trackButton = screen.getByTestId('track-comment');
      expect(trackButton).toBeInTheDocument();
      
      // Should not throw when clicked
      expect(() => fireEvent.click(trackButton)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle router asPath with query parameters', () => {
      mockUseRouter.mockReturnValue({
        ...mockUseRouter(),
        asPath: '/tr/welcome?tab=posts&sort=recent'
      } as any);
      
      render(<TestComponent />);
      
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('true');
    });

    it('should handle router asPath with fragments', () => {
      mockUseRouter.mockReturnValue({
        ...mockUseRouter(),
        asPath: '/tr/welcome#comments'
      } as any);
      
      render(<TestComponent />);
      
      expect(screen.getByTestId('is-welcome-ring')).toHaveTextContent('true');
    });

    it('should handle missing progress data gracefully', () => {
      mockGetWelcomeProgress.mockReturnValue(null as any);
      
      render(<TestComponent ringSlug="welcome" />);
      
      const commentButton = screen.getByText('View Comments');
      
      expect(() => fireEvent.click(commentButton)).not.toThrow();
    });

    it('should handle clicks on elements without closest method', async () => {
      const { container } = render(<TestComponent ringSlug="welcome" />);
      
      // Create an element that might not have proper closest method
      const textNode = document.createTextNode('Comments');
      container.appendChild(textNode);
      
      // Should not throw when clicking text nodes
      expect(() => {
        const event = new Event('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: textNode });
        document.dispatchEvent(event);
      }).not.toThrow();
    });
  });
});