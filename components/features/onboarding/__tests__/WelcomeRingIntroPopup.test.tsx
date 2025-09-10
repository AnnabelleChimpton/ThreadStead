import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WelcomeRingIntroPopup from '../WelcomeRingIntroPopup';

describe('WelcomeRingIntroPopup', () => {
  const mockOnClose = jest.fn();
  const mockOnStartTour = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the popup with initial step', () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      expect(screen.getByText('Welcome to your first ThreadRing! 🎉')).toBeInTheDocument();
      expect(screen.getByText(/You've just entered something special/)).toBeInTheDocument();
      expect(screen.getByText('🏠')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      const closeButton = screen.getByLabelText('Close popup');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent('×');
    });

    it('should render progress indicators', () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      // Should have 4 steps (4 progress dots)
      const progressDots = document.querySelectorAll('.w-3.h-3.rounded-full');
      expect(progressDots).toHaveLength(4);
    });
  });

  describe('Navigation', () => {
    it('should navigate through all steps', async () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      // Step 1
      expect(screen.getByText('Welcome to your first ThreadRing! 🎉')).toBeInTheDocument();
      
      // Go to step 2
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByText('How ThreadRings Work ✨')).toBeInTheDocument();
        expect(screen.getByText(/Discord/)).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Go to step 3
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByText('This Ring is Special 🌟')).toBeInTheDocument();
        expect(screen.getByText(/training ground/)).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Go to step 4 (final step)
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByText('Ready to Start Your Journey? 🚀')).toBeInTheDocument();
        expect(screen.getByText("Let's Go! 🚀")).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show back button after first step', async () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      // No back button on first step
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
      
      // Go to step 2
      fireEvent.click(screen.getByText('Next'));
      
      // Back button should appear after animation
      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Go back to step 1
      fireEvent.click(screen.getByText('Back'));
      await waitFor(() => {
        expect(screen.getByText('Welcome to your first ThreadRing! 🎉')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Final Step Actions', () => {
    beforeEach(async () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      // Navigate to final step
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => screen.getByText('How ThreadRings Work ✨'));
      
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => screen.getByText('This Ring is Special 🌟'));
      
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => screen.getByText('Ready to Start Your Journey? 🚀'));
    });

    it('should show final step action buttons', () => {
      expect(screen.getByText("I'll explore on my own")).toBeInTheDocument();
      expect(screen.getByText("Let's Go! 🚀")).toBeInTheDocument();
    });

    it('should call onClose when explore on my own is clicked', () => {
      fireEvent.click(screen.getByText("I'll explore on my own"));
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnStartTour).not.toHaveBeenCalled();
    });

    it('should call both callbacks when start tour is clicked', () => {
      fireEvent.click(screen.getByText("Let's Go! 🚀"));
      expect(mockOnStartTour).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Close Button', () => {
    it('should call onClose when close button is clicked', () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      fireEvent.click(screen.getByLabelText('Close popup'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Visual Elements', () => {
    it('should have proper styling and animations', () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      // Check main container styling
      const popup = document.querySelector('.fixed.inset-0.bg-black\\/60');
      expect(popup).toBeInTheDocument();
      
      // Check decorative elements
      expect(screen.getByText('⭐')).toBeInTheDocument();
      expect(screen.getByText('🌟')).toBeInTheDocument();
    });

    it('should update progress indicators correctly', async () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      let progressDots = document.querySelectorAll('.w-3.h-3.rounded-full');
      
      // First dot should be active (current step)
      expect(progressDots[0]).toHaveClass('bg-purple-500', 'scale-125');
      expect(progressDots[1]).toHaveClass('bg-gray-300');
      
      // Navigate to step 2
      fireEvent.click(screen.getByText('Next'));
      
      // Wait for animation and re-query elements
      await waitFor(() => {
        progressDots = document.querySelectorAll('.w-3.h-3.rounded-full');
        expect(progressDots[0]).toHaveClass('bg-green-500');
        expect(progressDots[1]).toHaveClass('bg-purple-500', 'scale-125');
      });
    });
  });

  describe('Content Validation', () => {
    it('should have all expected content in each step', async () => {
      render(<WelcomeRingIntroPopup onClose={mockOnClose} onStartTour={mockOnStartTour} />);
      
      // Step 1 content
      expect(screen.getByText(/cozy corner of the internet/)).toBeInTheDocument();
      expect(screen.getByText(/What's a ThreadRing?/)).toBeInTheDocument();
      
      // Step 2 content
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('Growing')).toBeInTheDocument();
        expect(screen.getByText('Themed')).toBeInTheDocument();
      });
      
      // Step 3 content
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByText(/training ground/)).toBeInTheDocument();
        expect(screen.getByText('Read posts')).toBeInTheDocument();
        expect(screen.getByText('Leave comments')).toBeInTheDocument();
        expect(screen.getByText('Visit profiles')).toBeInTheDocument();
      });
      
      // Step 4 content
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByText(/full of friendly faces/)).toBeInTheDocument();
        expect(screen.getByText(/Your Progress Will Be Tracked/)).toBeInTheDocument();
      });
    });
  });
});