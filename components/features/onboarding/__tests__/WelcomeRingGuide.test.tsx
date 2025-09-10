import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WelcomeRingGuide from '../WelcomeRingGuide';

// Mock modules with auto mocks
jest.mock('@/lib/welcome/progress');
jest.mock('@/lib/welcome/celebrations');
jest.mock('@/hooks/useToast');
jest.mock('@/hooks/useWelcomeRingIntro');
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Import mocked modules after mocking
import * as welcomeProgress from '@/lib/welcome/progress';
import * as welcomeCelebrations from '@/lib/welcome/celebrations';
import * as useToast from '@/hooks/useToast';
import * as useWelcomeRingIntro from '@/hooks/useWelcomeRingIntro';

// Type the mocks
const mockGetWelcomeProgress = welcomeProgress.getWelcomeProgress as jest.MockedFunction<typeof welcomeProgress.getWelcomeProgress>;
const mockUpdateWelcomeProgress = welcomeProgress.updateWelcomeProgress as jest.MockedFunction<typeof welcomeProgress.updateWelcomeProgress>;
const mockCelebrateAction = welcomeCelebrations.celebrateAction as jest.MockedFunction<typeof welcomeCelebrations.celebrateAction>;
const mockUseToast = useToast.useToast as jest.MockedFunction<typeof useToast.useToast>;
const mockUseWelcomeRingIntro = useWelcomeRingIntro.useWelcomeRingIntro as jest.MockedFunction<typeof useWelcomeRingIntro.useWelcomeRingIntro>;

describe('WelcomeRingGuide', () => {
  const mockViewer = {
    id: 'user1',
    handle: 'testuser'
  };

  const mockWelcomeRingMember = {
    id: 'user1',
    handle: 'testuser',
    threadRingMemberships: [
      { threadRingId: 'welcome' },
      { threadRingId: 'other-ring' }
    ]
  };

  const defaultProgress = {
    joinedRing: false,
    readFirstPost: false,
    leftFirstComment: false,
    visitedProfile: false,
    browseRings: false,
    completedWelcome: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetWelcomeProgress.mockReturnValue(defaultProgress);
    mockUpdateWelcomeProgress.mockImplementation((updates) => ({
      ...defaultProgress,
      ...updates
    }));
    
    mockUseToast.mockReturnValue({
      toasts: [],
      showSuccess: jest.fn(),
      hideToast: jest.fn()
    });
    
    mockUseWelcomeRingIntro.mockReturnValue({
      shouldShowIntro: false,
      isLoading: false,
      markIntroAsSeen: jest.fn(),
      resetIntro: jest.fn()
    });
  });

  describe('Membership Detection', () => {
    it('should auto-progress joinedRing step for existing welcome ring members', async () => {
      render(
        <WelcomeRingGuide 
          ringSlug="welcome" 
          viewer={mockWelcomeRingMember}
        />
      );

      // Wait for the effect to run
      await waitFor(() => {
        expect(mockUpdateWelcomeProgress).toHaveBeenCalledWith({ joinedRing: true });
        expect(mockCelebrateAction).toHaveBeenCalledWith('joinedRing');
      });
    });

    it('should not auto-progress for non-members', async () => {
      render(
        <WelcomeRingGuide 
          ringSlug="welcome" 
          viewer={mockViewer}
        />
      );

      // Wait a bit to ensure effects have run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockUpdateWelcomeProgress).not.toHaveBeenCalledWith({ joinedRing: true });
    });

    it('should not auto-progress if joinedRing is already true', async () => {
      mockGetWelcomeProgress.mockReturnValue({
        ...defaultProgress,
        joinedRing: true
      });

      render(
        <WelcomeRingGuide 
          ringSlug="welcome" 
          viewer={mockWelcomeRingMember}
        />
      );

      // Wait a bit to ensure effects have run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockUpdateWelcomeProgress).not.toHaveBeenCalledWith({ joinedRing: true });
    });

    it('should not auto-progress for users without threadRingMemberships', async () => {
      const userWithoutMemberships = {
        id: 'user1',
        handle: 'testuser'
        // No threadRingMemberships property
      };

      render(
        <WelcomeRingGuide 
          ringSlug="welcome" 
          viewer={userWithoutMemberships}
        />
      );

      // Wait a bit to ensure effects have run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockUpdateWelcomeProgress).not.toHaveBeenCalledWith({ joinedRing: true });
    });
  });

  describe('Basic Rendering', () => {
    it('should render welcome guide for welcome ring', () => {
      render(
        <WelcomeRingGuide 
          ringSlug="welcome" 
          viewer={mockViewer}
        />
      );

      expect(screen.getByText('Welcome Tour')).toBeInTheDocument();
    });

    it('should not render for non-welcome rings', () => {
      const { container } = render(
        <WelcomeRingGuide 
          ringSlug="other-ring" 
          viewer={mockViewer}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render completion message when welcome is completed', () => {
      mockGetWelcomeProgress.mockReturnValue({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: true,
        browseRings: true,
        completedWelcome: true
      });

      render(
        <WelcomeRingGuide 
          ringSlug="welcome" 
          viewer={mockViewer}
        />
      );

      expect(screen.getByText('🎓 Welcome Ring Graduate!')).toBeInTheDocument();
    });
  });
});