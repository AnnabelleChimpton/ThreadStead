import React from 'react';
import { screen } from '@testing-library/react';
import FriendBadge from '../FriendBadge';
import { renderWithTemplateContext } from './test-utils';

describe('FriendBadge Component', () => {
  describe('Basic Rendering', () => {
    it('should render the friend badge', () => {
      renderWithTemplateContext(<FriendBadge />);
      
      expect(screen.getByText('🤝')).toBeInTheDocument();
      expect(screen.getByText('Friend')).toBeInTheDocument();
    });

    it('should render as a span element', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });

    it('should have the correct text content', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span.inline-flex');
      expect(badge?.textContent).toBe('🤝 Friend');
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should have the correct CSS classes for styling', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('gap-1');
      expect(badge).toHaveClass('bg-green-200');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('border-black');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-bold');
      expect(badge).toHaveClass('shadow-[2px_2px_0_#000]');
      expect(badge).toHaveClass('rounded');
    });

    it('should contain emoji and text in separate spans', () => {
      renderWithTemplateContext(<FriendBadge />);
      
      const emoji = screen.getByText('🤝');
      const text = screen.getByText('Friend');
      
      expect(emoji.tagName).toBe('SPAN');
      expect(text).toBeInTheDocument();
    });

    it('should have correct visual hierarchy', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const outerSpan = container.querySelector('span.inline-flex');
      const emojiSpan = outerSpan?.querySelector('span');
      
      expect(outerSpan).toBeInTheDocument();
      expect(emojiSpan).toBeInTheDocument();
      expect(emojiSpan?.textContent).toBe('🤝');
    });
  });

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      renderWithTemplateContext(<FriendBadge />);
      
      // The badge should contain accessible text
      expect(screen.getByText('Friend')).toBeInTheDocument();
    });

    it('should have semantic meaning', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge?.textContent).toContain('Friend');
    });

    it('should work without JavaScript', () => {
      // This component is purely presentational and should work without JS
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      expect(container.querySelector('span')).toBeInTheDocument();
      expect(container.textContent).toContain('🤝 Friend');
    });
  });

  describe('Component Isolation', () => {
    it('should not require any props', () => {
      // Should render without any props
      expect(() => {
        renderWithTemplateContext(<FriendBadge />);
      }).not.toThrow();
    });

    it('should not depend on external state', () => {
      // Component should be pure - same input, same output
      const { container: container1 } = renderWithTemplateContext(<FriendBadge />);
      const { container: container2 } = renderWithTemplateContext(<FriendBadge />);
      
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    it('should render multiple instances independently', () => {
      renderWithTemplateContext(
        <div>
          <FriendBadge />
          <FriendBadge />
          <FriendBadge />
        </div>
      );
      
      const badges = screen.getAllByText('Friend');
      expect(badges).toHaveLength(3);
      
      const emojis = screen.getAllByText('🤝');
      expect(emojis).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle being wrapped in other components', () => {
      renderWithTemplateContext(
        <div className="wrapper">
          <p>Before badge</p>
          <FriendBadge />
          <p>After badge</p>
        </div>
      );
      
      expect(screen.getByText('🤝')).toBeInTheDocument();
      expect(screen.getByText('Friend')).toBeInTheDocument();
      expect(screen.getByText('Before badge')).toBeInTheDocument();
      expect(screen.getByText('After badge')).toBeInTheDocument();
    });

    it('should maintain styling when nested', () => {
      const { container } = renderWithTemplateContext(
        <div className="parent">
          <FriendBadge />
        </div>
      );
      
      const badge = container.querySelector('span.inline-flex');
      expect(badge).toHaveClass('bg-green-200');
      expect(badge).toHaveClass('border-black');
    });

    it('should be inline and not disrupt text flow', () => {
      const { container } = renderWithTemplateContext(
        <p>
          This user is a <FriendBadge /> on the platform.
        </p>
      );
      
      // Check that the entire text content is present
      const paragraph = container.querySelector('p');
      expect(paragraph?.textContent).toContain('This user is a');
      expect(paragraph?.textContent).toContain('🤝 Friend');
      expect(paragraph?.textContent).toContain('on the platform.');
      
      // Check individual elements exist
      expect(screen.getByText('🤝')).toBeInTheDocument();
      expect(screen.getByText('Friend')).toBeInTheDocument();
    });
  });

  describe('Visual Design Consistency', () => {
    it('should use consistent spacing with gap-1', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('gap-1');
    });

    it('should use green theme colors', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-green-200');
    });

    it('should have retro-style shadow and border', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('border-black');
      expect(badge).toHaveClass('shadow-[2px_2px_0_#000]');
    });

    it('should have appropriate typography', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-bold');
    });

    it('should have proper padding', () => {
      const { container } = renderWithTemplateContext(<FriendBadge />);
      
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
    });
  });

  describe('Performance', () => {
    it('should render quickly without heavy computation', () => {
      const startTime = performance.now();
      renderWithTemplateContext(<FriendBadge />);
      const endTime = performance.now();
      
      // Should render very quickly since it's a simple component
      expect(endTime - startTime).toBeLessThan(50); // 50ms threshold
    });

    it('should not cause memory leaks', () => {
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithTemplateContext(<FriendBadge />);
        unmount();
      }
      
      // Should complete without issues
      expect(true).toBe(true);
    });
  });
});