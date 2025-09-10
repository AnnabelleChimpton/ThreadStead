import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoRingsEmptyState from '../NoRingsEmptyState';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('NoRingsEmptyState Component', () => {
  describe('Basic Rendering', () => {
    it('should render main heading and description', () => {
      render(<NoRingsEmptyState />);
      
      expect(screen.getByText('Your Ring neighborhood is empty!')).toBeInTheDocument();
      expect(screen.getByText(/ThreadRings are like cozy corners of the internet/)).toBeInTheDocument();
      expect(screen.getByText(/Ready to find your people?/)).toBeInTheDocument();
    });

    it('should render main house icon', () => {
      render(<NoRingsEmptyState />);
      
      const houseIcon = screen.getByText('⌂');
      expect(houseIcon).toBeInTheDocument();
      expect(houseIcon).toHaveClass('text-6xl');
    });

    it('should render decorative floating elements', () => {
      render(<NoRingsEmptyState />);
      
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('🌟')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render "Start with Welcome Ring" button', () => {
      render(<NoRingsEmptyState />);
      
      const welcomeButton = screen.getByText('Start with Welcome Ring');
      expect(welcomeButton).toBeInTheDocument();
      expect(welcomeButton.closest('a')).toHaveAttribute('href', '/tr/welcome');
    });

    it('should render "Browse All Rings" button', () => {
      render(<NoRingsEmptyState />);
      
      const browseButton = screen.getByText('Browse All Rings');
      expect(browseButton).toBeInTheDocument();
      expect(browseButton.closest('a')).toHaveAttribute('href', '/threadrings');
    });

    it('should render "or" separator between buttons', () => {
      render(<NoRingsEmptyState />);
      
      expect(screen.getByText('or')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should have correct container classes', () => {
      const { container } = render(<NoRingsEmptyState />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        'text-center',
        'py-12',
        'bg-gradient-to-br',
        'from-blue-50',
        'to-purple-50',
        'rounded-xl',
        'border-2',
        'border-dashed',
        'border-purple-200',
        'relative',
        'overflow-hidden'
      );
    });

    it('should have proper button styling', () => {
      render(<NoRingsEmptyState />);
      
      const welcomeButton = screen.getByText('Start with Welcome Ring');
      expect(welcomeButton).toHaveClass(
        'bg-purple-200',
        'hover:bg-purple-300',
        'px-6',
        'py-3',
        'rounded-lg',
        'border-2',
        'border-purple-400',
        'shadow-[3px_3px_0_#7c3aed]',
        'font-bold',
        'transition-all',
        'hover:translate-y-[-2px]',
        'hover:shadow-[4px_4px_0_#7c3aed]',
        'transform'
      );
      
      const browseButton = screen.getByText('Browse All Rings');
      expect(browseButton).toHaveClass(
        'bg-white',
        'hover:bg-gray-50',
        'px-6',
        'py-3',
        'rounded-lg',
        'border-2',
        'border-purple-200',
        'shadow-[2px_2px_0_#e5e7eb]',
        'transition-all',
        'hover:translate-y-[-1px]'
      );
    });

    it('should position decorative elements correctly', () => {
      const { container } = render(<NoRingsEmptyState />);
      
      const sparkle = container.querySelector('.absolute.top-4.right-4');
      expect(sparkle).toBeInTheDocument();
      expect(sparkle).toHaveTextContent('✨');
      expect(sparkle).toHaveClass('animate-pulse');
      
      const star = container.querySelector('.absolute.bottom-4.left-4');
      expect(star).toBeInTheDocument();
      expect(star).toHaveTextContent('🌟');
      expect(star).toHaveClass('animate-bounce');
    });
  });

  describe('Interactive Behavior', () => {
    it('should handle house icon hover interactions', () => {
      render(<NoRingsEmptyState />);
      
      const houseIcon = screen.getByText('⌂');
      expect(houseIcon).toHaveClass('transition-transform', 'duration-300');
      
      // Test hover state (styles applied via CSS)
      fireEvent.mouseEnter(houseIcon);
      // Note: Testing CSS hover states requires more complex setup
      // This mainly tests that the element is interactive
      expect(houseIcon).toBeInTheDocument();
      
      fireEvent.mouseLeave(houseIcon);
      expect(houseIcon).toBeInTheDocument();
    });

    it('should be accessible for keyboard navigation', () => {
      render(<NoRingsEmptyState />);
      
      const welcomeLink = screen.getByText('Start with Welcome Ring').closest('a');
      const browseLink = screen.getByText('Browse All Rings').closest('a');
      
      expect(welcomeLink).toHaveAttribute('href', '/tr/welcome');
      expect(browseLink).toHaveAttribute('href', '/threadrings');
      
      // Links should be focusable
      expect(welcomeLink?.tabIndex).not.toBe(-1);
      expect(browseLink?.tabIndex).not.toBe(-1);
    });
  });

  describe('Animation Classes', () => {
    it('should have animation classes on decorative elements', () => {
      const { container } = render(<NoRingsEmptyState />);
      
      const sparkle = container.querySelector('.animate-pulse');
      expect(sparkle).toBeInTheDocument();
      expect(sparkle).toHaveTextContent('✨');
      
      const star = container.querySelector('.animate-bounce');
      expect(star).toBeInTheDocument();
      expect(star).toHaveTextContent('🌟');
    });

    it('should have staggered animation delay on star', () => {
      const { container } = render(<NoRingsEmptyState />);
      
      const star = container.querySelector('.animate-bounce');
      expect(star).toHaveStyle({ animationDelay: '0.5s' });
    });

    it('should have transition classes on house icon', () => {
      render(<NoRingsEmptyState />);
      
      const houseIcon = screen.getByText('⌂');
      expect(houseIcon).toHaveClass('transition-transform', 'duration-300');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<NoRingsEmptyState />);
      
      // Main heading should be an h3 (or similar heading)
      const heading = screen.getByText('Your Ring neighborhood is empty!');
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveClass('text-xl', 'font-bold');
      
      // Description should be readable
      const description = screen.getByText(/ThreadRings are like cozy corners/);
      expect(description.tagName).toBe('P');
    });

    it('should have accessible link text', () => {
      render(<NoRingsEmptyState />);
      
      const welcomeLink = screen.getByText('Start with Welcome Ring');
      const browseLink = screen.getByText('Browse All Rings');
      
      // Link text should be descriptive
      expect(welcomeLink).toBeInTheDocument();
      expect(browseLink).toBeInTheDocument();
      
      // Links should have meaningful hrefs
      expect(welcomeLink.closest('a')).toHaveAttribute('href', '/tr/welcome');
      expect(browseLink.closest('a')).toHaveAttribute('href', '/threadrings');
    });

    it('should be screen reader friendly', () => {
      render(<NoRingsEmptyState />);
      
      // Content should be available to screen readers
      expect(screen.getByText('Your Ring neighborhood is empty!')).toBeVisible();
      expect(screen.getByText(/ThreadRings are like cozy corners/)).toBeVisible();
      expect(screen.getByText('Start with Welcome Ring')).toBeVisible();
      expect(screen.getByText('Browse All Rings')).toBeVisible();
    });
  });

  describe('Color Scheme and Theming', () => {
    it('should use consistent purple theme colors', () => {
      render(<NoRingsEmptyState />);
      
      const heading = screen.getByText('Your Ring neighborhood is empty!');
      expect(heading).toHaveClass('text-purple-800');
      
      const description = screen.getByText(/ThreadRings are like cozy corners/);
      expect(description).toHaveClass('text-purple-600');
      
      const separator = screen.getByText('or');
      expect(separator).toHaveClass('text-purple-500');
    });

    it('should have gradient background', () => {
      const { container } = render(<NoRingsEmptyState />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        'bg-gradient-to-br',
        'from-blue-50',
        'to-purple-50'
      );
    });

    it('should have consistent border theming', () => {
      const { container } = render(<NoRingsEmptyState />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        'border-2',
        'border-dashed',
        'border-purple-200'
      );
    });
  });

  describe('Layout Responsiveness', () => {
    it('should handle different screen sizes', () => {
      render(<NoRingsEmptyState />);
      
      const description = screen.getByText(/ThreadRings are like cozy corners/);
      expect(description).toHaveClass('max-w-md', 'mx-auto');
      
      // Buttons should be in a vertical stack
      const buttonContainer = screen.getByText('Start with Welcome Ring').closest('div')?.parentElement;
      expect(buttonContainer).toHaveClass('space-y-3');
    });

    it('should center content properly', () => {
      const { container } = render(<NoRingsEmptyState />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('text-center');
      
      const description = screen.getByText(/ThreadRings are like cozy corners/);
      expect(description).toHaveClass('mx-auto');
    });
  });

  describe('Content Hierarchy', () => {
    it('should have proper visual hierarchy', () => {
      render(<NoRingsEmptyState />);
      
      // Icon should be largest
      const icon = screen.getByText('⌂');
      expect(icon).toHaveClass('text-6xl');
      
      // Heading should be prominent
      const heading = screen.getByText('Your Ring neighborhood is empty!');
      expect(heading).toHaveClass('text-xl', 'font-bold');
      
      // Description should be readable but secondary
      const description = screen.getByText(/ThreadRings are like cozy corners/);
      expect(description).toHaveClass('text-purple-600'); // Lighter color than heading
    });

    it('should have appropriate spacing', () => {
      render(<NoRingsEmptyState />);
      
      const icon = screen.getByText('⌂');
      expect(icon).toHaveClass('mb-4');
      
      const heading = screen.getByText('Your Ring neighborhood is empty!');
      expect(heading).toHaveClass('mb-2');
      
      const description = screen.getByText(/ThreadRings are like cozy corners/);
      expect(description).toHaveClass('mb-6');
    });
  });
});