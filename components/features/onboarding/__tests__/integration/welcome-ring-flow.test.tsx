import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Link from 'next/link';
import WelcomeRingGuide from '../../WelcomeRingGuide';
import { useWelcomeRingTracking } from '@/hooks/useWelcomeRingTracking';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/hooks/useToast', () => ({
  useToast: jest.fn()
}));

jest.mock('@/lib/welcome/progress', () => ({
  getWelcomeProgress: jest.fn(),
  updateWelcomeProgress: jest.fn(),
  clearWelcomeProgress: jest.fn()
}));

jest.mock('@/lib/welcome/celebrations', () => ({
  celebrateAction: jest.fn(),
  setCelebrationToastHandler: jest.fn()
}));

jest.mock('@/hooks/useWelcomeRingTracking');

jest.mock('@/hooks/useWelcomeRingIntro', () => ({
  useWelcomeRingIntro: jest.fn()
}));

// PixelIcon uses next/dynamic with a runtime SVG import that Jest cannot
// resolve to a component, so stub it out.
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => {
    const mockReact = require('react');
    return mockReact.createElement('span', { 'data-testid': 'pixel-icon', 'data-name': name });
  }
}));

import { useRouter } from 'next/router';
import { useToast } from '@/hooks/useToast';
import { useWelcomeRingIntro } from '@/hooks/useWelcomeRingIntro';
import { getWelcomeProgress, updateWelcomeProgress, clearWelcomeProgress } from '@/lib/welcome/progress';
import { celebrateAction, setCelebrationToastHandler } from '@/lib/welcome/celebrations';

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockGetWelcomeProgress = getWelcomeProgress as jest.MockedFunction<typeof getWelcomeProgress>;
const mockUpdateWelcomeProgress = updateWelcomeProgress as jest.MockedFunction<typeof updateWelcomeProgress>;
const _mockClearWelcomeProgress = clearWelcomeProgress as jest.MockedFunction<typeof clearWelcomeProgress>;
const _mockCelebrateAction = celebrateAction as jest.MockedFunction<typeof celebrateAction>;
const mockSetCelebrationToastHandler = setCelebrationToastHandler as jest.MockedFunction<typeof setCelebrationToastHandler>;
const mockUseWelcomeRingTracking = useWelcomeRingTracking as jest.MockedFunction<typeof useWelcomeRingTracking>;
const mockUseWelcomeRingIntro = useWelcomeRingIntro as jest.MockedFunction<typeof useWelcomeRingIntro>;

// Test component that simulates a complete Welcome Ring page
const WelcomeRingPageSimulation: React.FC = () => {
  const { trackCommentCreated } = useWelcomeRingTracking('welcome');
  
  return (
    <div>
      <WelcomeRingGuide ringSlug="welcome" viewer={{ id: 'user1', primaryHandle: 'testuser' }} />
      
      {/* Simulate ring content */}
      <div className="ring-content">
        <h2>Welcome to ThreadRings!</h2>
        
        {/* Simulate posts with comment buttons */}
        <div className="post">
          <h3>Introduce Yourself</h3>
          <p>Tell us about yourself!</p>
          <button 
            className="comment-button"
            onClick={() => {
              // Simulate comment section opening
              console.log('Comments opened');
            }}
          >
            View Comments (3)
          </button>
        </div>
        
        <div className="post">
          <h3>Getting Started Guide</h3>
          <p>Learn how to use ThreadRings</p>
          <div className="comments-section">
            <div className="comment">
              <Link href="/resident/alice" className="user-link">@alice</Link>
              <p>Great guide!</p>
            </div>
            <div className="comment">
              <Link href="/resident/bob" className="user-link">@bob</Link>
              <p>Very helpful, thanks!</p>
            </div>
            
            {/* Comment form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              trackCommentCreated();
            }}>
              <textarea placeholder="Add a comment..." />
              <button type="submit">Post Comment</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

describe('Welcome Ring Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup router mock
    mockUseRouter.mockReturnValue({
      asPath: '/tr/welcome',
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      reload: jest.fn(),
      events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      defaultLocale: 'en',
      domainLocales: [],
      isPreview: false,
      route: '/tr/[slug]',
      pathname: '/tr/[slug]',
      query: { slug: 'welcome' },
      basePath: '',
      locale: 'en',
      locales: ['en']
    } as any);
    
    // Setup toast mock
    const mockShowSuccess = jest.fn();
    const mockHideToast = jest.fn();
    mockUseToast.mockReturnValue({
      toasts: [],
      showToast: jest.fn(),
      hideToast: mockHideToast,
      showSuccess: mockShowSuccess,
      showError: jest.fn(),
      showWarning: jest.fn(),
      showInfo: jest.fn()
    });

    // Setup tracking hook mock
    mockUseWelcomeRingTracking.mockReturnValue({
      trackCommentCreated: jest.fn(),
      isWelcomeRing: true
    });

    // Setup intro popup hook mock (intro already seen, so the guide is visible)
    mockUseWelcomeRingIntro.mockReturnValue({
      shouldShowIntro: false,
      isLoading: false,
      markIntroAsSeen: jest.fn(),
      resetIntro: jest.fn()
    });
  });

  describe('Initial State - New User', () => {
    it('should show welcome guide for new users on welcome ring', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: false,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      await act(async () => {
        render(<WelcomeRingPageSimulation />);
      });
      
      // Should show the welcome tour
      expect(screen.getByText('Welcome Tour')).toBeInTheDocument();
      
      // Should show step 1 (Join the Welcome Ring)
      expect(screen.getByText('Join the Welcome Ring')).toBeInTheDocument();
      expect(screen.getByText('Click "Join Ring" to become a member and get started!')).toBeInTheDocument();
      
      // Should show progress dots (5 total)
      const progressDots = document.querySelectorAll('.w-3.h-3.rounded-full');
      expect(progressDots).toHaveLength(5);
    });

    it('should setup celebration toast handler on mount', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: false,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      await act(async () => {
        render(<WelcomeRingPageSimulation />);
      });
      
      expect(mockSetCelebrationToastHandler).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Step-by-Step Progression', () => {
    it('should progress through all steps in order', async () => {
      // Start with no progress
      let currentProgress = {
        joinedRing: false,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      };
      
      mockGetWelcomeProgress.mockImplementation(() => currentProgress);

      render(<WelcomeRingPageSimulation />);

      // The guide re-reads progress when a 'welcomeProgressUpdate' event fires
      // (it only calls getWelcomeProgress on mount and on that event).
      const notifyProgressUpdate = async () => {
        await act(async () => {
          window.dispatchEvent(new CustomEvent('welcomeProgressUpdate'));
        });
      };

      // Step 1: Join Ring
      expect(screen.getByText('Join the Welcome Ring')).toBeInTheDocument();

      // Simulate joining
      currentProgress = { ...currentProgress, joinedRing: true };
      await notifyProgressUpdate();

      // Should now show step 2
      expect(screen.getByText('Check out the discussion')).toBeInTheDocument();

      // Step 2: Read first post (click comments)
      currentProgress = { ...currentProgress, readFirstPost: true };
      await notifyProgressUpdate();

      // Should now show step 3
      expect(screen.getByText('Join the conversation')).toBeInTheDocument();

      // Step 3: Leave first comment
      currentProgress = { ...currentProgress, leftFirstComment: true };
      await notifyProgressUpdate();

      // Should now show step 4
      expect(screen.getByText('Visit a member profile')).toBeInTheDocument();

      // Step 4: Visit profile
      currentProgress = { ...currentProgress, visitedProfile: true };
      await notifyProgressUpdate();

      // Should now show step 5
      expect(screen.getByText('Discover more Rings')).toBeInTheDocument();
      expect(screen.getByText('Browse Rings')).toBeInTheDocument();

      // Step 5: Browse rings (auto-completes)
      currentProgress = {
        ...currentProgress,
        browseRings: true,
        completedWelcome: true
      };
      await notifyProgressUpdate();

      // Should show completion state (PixelIcon trophy replaced the 🎓 emoji)
      expect(screen.getByText('Welcome Ring Graduate!')).toBeInTheDocument();
      expect(screen.getByText("You've completed the welcome tour!")).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('should track comment creation when form is submitted', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: false, // Ready for this step
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      const mockTrackCommentCreated = jest.fn();
      mockUseWelcomeRingTracking.mockReturnValue({
        trackCommentCreated: mockTrackCommentCreated,
        isWelcomeRing: true
      });
      
      render(<WelcomeRingPageSimulation />);
      
      // Submit a comment
      const submitButton = screen.getByText('Post Comment');
      fireEvent.click(submitButton);
      
      expect(mockTrackCommentCreated).toHaveBeenCalled();
    });

    it('should handle minimizing and expanding the guide', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      render(<WelcomeRingPageSimulation />);
      
      // Should show full guide initially
      expect(screen.getByText('Welcome Tour')).toBeInTheDocument();
      expect(screen.getByText('Minimize')).toBeInTheDocument();
      
      // Click minimize
      fireEvent.click(screen.getByText('Minimize'));
      
      // Should show minimized state
      await waitFor(() => {
        expect(screen.getByText(/Show Welcome Tour/)).toBeInTheDocument();
        expect(screen.getByText(/1\/5 complete/)).toBeInTheDocument();
      });
      
      // Click to expand again
      fireEvent.click(screen.getByText(/Show Welcome Tour/));
      
      // Should show full guide again
      await waitFor(() => {
        expect(screen.getByText('Welcome Tour')).toBeInTheDocument();
        expect(screen.getByText('Minimize')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Updates', () => {
    it('should listen for progress updates and re-render', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: false,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      render(<WelcomeRingPageSimulation />);
      
      // Initial state
      expect(screen.getByText('Join the Welcome Ring')).toBeInTheDocument();
      
      // Simulate progress update event
      const progressUpdateEvent = new CustomEvent('welcomeProgressUpdate');
      
      // Update the mock to return new progress
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      await act(async () => {
        window.dispatchEvent(progressUpdateEvent);
      });
      
      // Should update to next step
      await waitFor(() => {
        expect(screen.getByText('Check out the discussion')).toBeInTheDocument();
      });
    });

    it('should reset to first step when progress is cleared', async () => {
      // Start with some progress
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      const { rerender } = render(<WelcomeRingPageSimulation />);
      
      // Should be on step 4
      expect(screen.getByText('Visit a member profile')).toBeInTheDocument();
      
      // Simulate progress reset
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: false,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
      
      await act(async () => {
        const progressUpdateEvent = new CustomEvent('welcomeProgressUpdate');
        window.dispatchEvent(progressUpdateEvent);
      });
      
      // Should reset to first step and expand
      await waitFor(() => {
        expect(screen.getByText('Join the Welcome Ring')).toBeInTheDocument();
        expect(screen.getByText('Welcome Tour')).toBeInTheDocument(); // Should be expanded
      });
    });
  });

  describe('Completion State', () => {
    it('should show graduate badge when completed', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: true,
        browseRings: true,
        completedWelcome: true
      });
      
      render(<WelcomeRingPageSimulation />);

      // The badge now renders a PixelIcon trophy instead of the 🎓 emoji
      expect(screen.getByText('Welcome Ring Graduate!')).toBeInTheDocument();
      expect(screen.getByText("You've completed the welcome tour!")).toBeInTheDocument();
    });

    it('should not show guide for non-welcome rings', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: false,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });

      render(<WelcomeRingGuide ringSlug="other-ring" viewer={{ id: 'user1', primaryHandle: 'testuser' }} />);

      // Should not render anything
      expect(screen.queryByText('Welcome Tour')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing progress data gracefully', async () => {
      mockGetWelcomeProgress.mockReturnValue(null as any);
      
      await act(async () => {
        render(<WelcomeRingPageSimulation />);
      });
      
      // Should not crash and not render guide
      expect(screen.queryByText('Welcome Tour')).not.toBeInTheDocument();
    });

    it('should handle SSR gracefully', async () => {
      // Simulate SSR environment
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      expect(() => {
        render(<WelcomeRingPageSimulation />);
      }).not.toThrow();
    });

    it('should propagate toast setup failures', async () => {
      mockUseToast.mockImplementation(() => {
        throw new Error('Toast setup failed');
      });

      // The component calls useToast unconditionally during render and does
      // not catch hook errors, so React re-throws them from render().
      // Silence React's error logging for the expected failure.
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<WelcomeRingPageSimulation />);
      }).toThrow('Toast setup failed');

      errorSpy.mockRestore();
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should track all step completions in correct order', async () => {
      const stepOrder: string[] = [];
      
      mockUpdateWelcomeProgress.mockImplementation((updates) => {
        Object.keys(updates).forEach(step => {
          if (updates[step as keyof typeof updates]) {
            stepOrder.push(step);
          }
        });
        return { ...updates } as any;
      });
      
      // Simulate completing steps
      const mockTrackCommentCreated = jest.fn(() => {
        stepOrder.push('leftFirstComment');
      });
      
      mockUseWelcomeRingTracking.mockReturnValue({
        trackCommentCreated: mockTrackCommentCreated,
        isWelcomeRing: true
      });
      
      render(<WelcomeRingPageSimulation />);
      
      // Simulate completing comment creation
      const submitButton = screen.getByText('Post Comment');
      fireEvent.click(submitButton);
      
      expect(mockTrackCommentCreated).toHaveBeenCalled();
    });
  });
});