import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeatureGate, { NewUserTooltip } from '../FeatureGate';

// Mock the user-status module
jest.mock('@/lib/welcome/user-status', () => ({
  isNewUser: jest.fn()
}));

import { isNewUser } from '@/lib/welcome/user-status';
const mockIsNewUser = isNewUser as jest.MockedFunction<typeof isNewUser>;

describe('FeatureGate Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render children when requiresRegularUser is false', () => {
      mockIsNewUser.mockReturnValue(true); // User is new
      
      render(
        <FeatureGate requiresRegularUser={false}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(screen.getByText('Feature Button')).toBeInTheDocument();
    });

    it('should render children when user is regular and requiresRegularUser is true', () => {
      mockIsNewUser.mockReturnValue(false); // User is regular
      
      render(
        <FeatureGate requiresRegularUser={true}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(screen.getByText('Feature Button')).toBeInTheDocument();
    });

    it('should render fallback when user is new and requiresRegularUser is true', () => {
      mockIsNewUser.mockReturnValue(true); // User is new
      
      render(
        <FeatureGate 
          requiresRegularUser={true} 
          fallback={<div>Fallback Content</div>}
        >
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(screen.getByText('Fallback Content')).toBeInTheDocument();
      expect(screen.queryByText('Feature Button')).not.toBeInTheDocument();
    });

    it('should pass user prop to isNewUser function', () => {
      const mockUser = { id: 'user1', createdAt: new Date() };
      mockIsNewUser.mockReturnValue(false);
      
      render(
        <FeatureGate requiresRegularUser={true} user={mockUser}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(mockIsNewUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Default Props', () => {
    it('should default requiresRegularUser to false', () => {
      mockIsNewUser.mockReturnValue(true); // User is new
      
      render(
        <FeatureGate>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      // Should render children since requiresRegularUser defaults to false
      expect(screen.getByText('Feature Button')).toBeInTheDocument();
    });

    it('should render nothing when no fallback is provided and feature is gated', () => {
      mockIsNewUser.mockReturnValue(true); // User is new
      
      const { container } = render(
        <FeatureGate requiresRegularUser={true}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(screen.queryByText('Feature Button')).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user', () => {
      mockIsNewUser.mockReturnValue(false); // isNewUser should return false for null
      
      render(
        <FeatureGate requiresRegularUser={true} user={null}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(mockIsNewUser).toHaveBeenCalledWith(null);
      expect(screen.getByText('Feature Button')).toBeInTheDocument();
    });

    it('should handle undefined user', () => {
      mockIsNewUser.mockReturnValue(false); // isNewUser should return false for undefined
      
      render(
        <FeatureGate requiresRegularUser={true} user={undefined}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(mockIsNewUser).toHaveBeenCalledWith(undefined);
      expect(screen.getByText('Feature Button')).toBeInTheDocument();
    });

    it('should handle complex children elements', () => {
      mockIsNewUser.mockReturnValue(false);
      
      render(
        <FeatureGate requiresRegularUser={true}>
          <div>
            <h1>Complex Content</h1>
            <button>Button 1</button>
            <button>Button 2</button>
          </div>
        </FeatureGate>
      );
      
      expect(screen.getByText('Complex Content')).toBeInTheDocument();
      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Button 2')).toBeInTheDocument();
    });

    it('should handle complex fallback elements', () => {
      mockIsNewUser.mockReturnValue(true);
      
      render(
        <FeatureGate 
          requiresRegularUser={true}
          fallback={
            <div>
              <p>Feature not available</p>
              <button>Alternative Action</button>
            </div>
          }
        >
          <button>Gated Feature</button>
        </FeatureGate>
      );
      
      expect(screen.getByText('Feature not available')).toBeInTheDocument();
      expect(screen.getByText('Alternative Action')).toBeInTheDocument();
      expect(screen.queryByText('Gated Feature')).not.toBeInTheDocument();
    });
  });

  describe('User Status Integration', () => {
    it('should not call isNewUser when requiresRegularUser is false', () => {
      render(
        <FeatureGate requiresRegularUser={false}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(mockIsNewUser).not.toHaveBeenCalled();
    });

    it('should re-evaluate when user prop changes', () => {
      const user1 = { id: 'user1', createdAt: new Date() };
      const user2 = { id: 'user2', createdAt: new Date() };
      
      mockIsNewUser.mockReturnValue(true);
      
      const { rerender } = render(
        <FeatureGate requiresRegularUser={true} user={user1}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(mockIsNewUser).toHaveBeenCalledWith(user1);
      
      mockIsNewUser.mockReturnValue(false);
      
      rerender(
        <FeatureGate requiresRegularUser={true} user={user2}>
          <button>Feature Button</button>
        </FeatureGate>
      );
      
      expect(mockIsNewUser).toHaveBeenCalledWith(user2);
    });
  });
});

describe('NewUserTooltip Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default feature text', () => {
      render(<NewUserTooltip />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Start a New Ring');
    });

    it('should render with custom feature text', () => {
      render(<NewUserTooltip feature="creating posts" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Join a few Rings first, then you can use creating posts!');
    });

    it('should have correct accessibility attributes', () => {
      render(<NewUserTooltip feature="advanced features" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title');
      expect(button.getAttribute('title')).toContain('advanced features');
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes', () => {
      render(<NewUserTooltip />);
      
      const container = screen.getByRole('button').parentElement;
      expect(container).toHaveClass('relative', 'inline-block');
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'opacity-50',
        'cursor-not-allowed', 
        'border',
        'border-black',
        'px-4',
        'py-2',
        'bg-gray-100'
      );
    });

    it('should have tooltip element', () => {
      render(<NewUserTooltip />);
      
      const tooltip = screen.getByText('🌱 Join a few Rings first!');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveClass(
        'absolute',
        '-top-12',
        'left-1/2',
        'transform',
        '-translate-x-1/2',
        'bg-yellow-100',
        'border',
        'border-yellow-400',
        'px-3',
        'py-1',
        'rounded',
        'text-sm',
        'whitespace-nowrap'
      );
    });

    it('should have tooltip arrow', () => {
      const { container } = render(<NewUserTooltip />);
      
      const arrow = container.querySelector('.absolute.-bottom-1');
      expect(arrow).toBeInTheDocument();
      expect(arrow).toHaveClass(
        'absolute',
        '-bottom-1',
        'left-1/2',
        'transform',
        '-translate-x-1/2',
        'w-2',
        'h-2',
        'bg-yellow-100',
        'border-r',
        'border-b',
        'border-yellow-400',
        'rotate-45'
      );
    });
  });

  describe('Feature Customization', () => {
    it('should handle empty feature prop', () => {
      render(<NewUserTooltip feature="" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Join a few Rings first, then you can use !');
    });

    it('should handle long feature names', () => {
      const longFeature = 'this very long and complex feature that has many words';
      render(<NewUserTooltip feature={longFeature} />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('title')).toContain(longFeature);
    });

    it('should handle special characters in feature name', () => {
      render(<NewUserTooltip feature="advanced features & settings" />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('title')).toContain('advanced features & settings');
    });
  });

  describe('Accessibility', () => {
    it('should be focusable but disabled', () => {
      render(<NewUserTooltip />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
    });

    it('should provide helpful title attribute', () => {
      render(<NewUserTooltip feature="test feature" />);
      
      const button = screen.getByRole('button');
      const title = button.getAttribute('title');
      expect(title).toContain('Join a few Rings first');
      expect(title).toContain('test feature');
    });

    it('should have visible tooltip text', () => {
      render(<NewUserTooltip />);
      
      const tooltipText = screen.getByText('🌱 Join a few Rings first!');
      expect(tooltipText).toBeVisible();
    });

    it('should maintain semantic button structure', () => {
      render(<NewUserTooltip />);
      
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveTextContent('Start a New Ring');
    });
  });
});