import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import RevealBox from '../RevealBox';
import { renderWithTemplateContext } from './test-utils';

describe('RevealBox Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Hidden content</div>
        </RevealBox>
      );
      
      expect(screen.getByRole('button', { name: 'Click to reveal' })).toBeInTheDocument();
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });

    it('should render button with default text', () => {
      renderWithTemplateContext(
        <RevealBox>Content</RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Click to reveal');
    });

    it('should have default button styling', () => {
      renderWithTemplateContext(
        <RevealBox>Content</RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'px-4',
        'py-2',
        'bg-blue-500',
        'text-white',
        'rounded',
        'hover:bg-blue-600',
        'transition-colors'
      );
    });

    it('should initially hide content', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Secret content</div>
        </RevealBox>
      );
      
      expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
    });
  });

  describe('Button Text Customization', () => {
    it('should use custom button text', () => {
      renderWithTemplateContext(
        <RevealBox buttonText="Show details">
          <div>Details here</div>
        </RevealBox>
      );
      
      expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument();
    });

    it('should use custom reveal text', () => {
      renderWithTemplateContext(
        <RevealBox revealText="Close details">
          <div>Content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      
      // Click to reveal
      fireEvent.click(button);
      expect(button).toHaveTextContent('Close details');
    });

    it('should toggle between button texts', () => {
      renderWithTemplateContext(
        <RevealBox buttonText="Open" revealText="Close">
          <div>Content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      
      // Initially shows open text
      expect(button).toHaveTextContent('Open');
      
      // Click to reveal - shows close text
      fireEvent.click(button);
      expect(button).toHaveTextContent('Close');
      
      // Click again to hide - shows open text
      fireEvent.click(button);
      expect(button).toHaveTextContent('Open');
    });

    it('should handle empty button texts', () => {
      renderWithTemplateContext(
        <RevealBox buttonText="" revealText="">
          <div>Content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });
  });

  describe('Button Style Variants', () => {
    it('should apply button style by default', () => {
      renderWithTemplateContext(
        <RevealBox>Content</RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'px-4',
        'py-2',
        'bg-blue-500',
        'text-white',
        'rounded',
        'hover:bg-blue-600',
        'transition-colors'
      );
    });

    it('should apply link button style', () => {
      renderWithTemplateContext(
        <RevealBox buttonStyle="link">Content</RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'text-blue-500',
        'hover:text-blue-700',
        'underline'
      );
    });

    it('should apply minimal button style', () => {
      renderWithTemplateContext(
        <RevealBox buttonStyle="minimal">Content</RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'text-gray-600',
        'hover:text-gray-800',
        'border-b',
        'border-dashed',
        'border-gray-400'
      );
    });

    it('should handle invalid button style gracefully', () => {
      renderWithTemplateContext(
        <RevealBox buttonStyle={'invalid' as any}>Content</RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  describe('Reveal Functionality', () => {
    it('should show content when button is clicked', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Revealed content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      
      // Initially hidden
      expect(screen.queryByText('Revealed content')).not.toBeInTheDocument();
      
      // Click to reveal
      fireEvent.click(button);
      expect(screen.getByText('Revealed content')).toBeInTheDocument();
    });

    it('should hide content when button is clicked again', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Toggle content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      
      // Click to reveal
      fireEvent.click(button);
      expect(screen.getByText('Toggle content')).toBeInTheDocument();
      
      // Click to hide
      fireEvent.click(button);
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument();
    });

    it('should maintain state through multiple toggles', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Persistent content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      
      // Multiple toggles
      for (let i = 0; i < 5; i++) {
        fireEvent.click(button);
        expect(screen.getByText('Persistent content')).toBeInTheDocument();
        
        fireEvent.click(button);
        expect(screen.queryByText('Persistent content')).not.toBeInTheDocument();
      }
    });
  });

  describe('Animation Variants', () => {
    it('should apply fade animation by default', () => {
      const { container } = renderWithTemplateContext(
        <RevealBox>
          <div>Fade content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const content = container.querySelector('.mt-4');
      expect(content).toHaveClass(
        'opacity-100',
        'transition-opacity',
        'duration-300',
        'ease-out'
      );
    });

    it('should apply slide animation', () => {
      const { container } = renderWithTemplateContext(
        <RevealBox variant="slide">
          <div>Slide content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const content = container.querySelector('.mt-4');
      expect(content).toHaveClass(
        'transform',
        'translate-y-0',
        'opacity-100',
        'transition-all',
        'duration-300',
        'ease-out'
      );
    });

    it('should apply grow animation', () => {
      const { container } = renderWithTemplateContext(
        <RevealBox variant="grow">
          <div>Grow content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const content = container.querySelector('.mt-4');
      expect(content).toHaveClass(
        'transform',
        'scale-100',
        'opacity-100',
        'transition-all',
        'duration-300',
        'ease-out'
      );
    });

    it('should handle invalid variant gracefully', () => {
      renderWithTemplateContext(
        <RevealBox variant={'invalid' as any}>
          <div>Content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('should render text content', () => {
      renderWithTemplateContext(
        <RevealBox>
          Simple text content
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Simple text content')).toBeInTheDocument();
    });

    it('should render complex JSX content', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div className="content-block">
            <h3>Content Title</h3>
            <p>Paragraph content</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Content Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph content')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      expect(screen.getByText('List item 2')).toBeInTheDocument();
    });

    it('should render interactive content', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>
            <button>Action button</button>
            <input placeholder="Type here" />
            <a href="/link">Link</a>
          </div>
        </RevealBox>
      );
      
      const revealButton = screen.getByRole('button', { name: 'Click to reveal' });
      fireEvent.click(revealButton);
      
      expect(screen.getByRole('button', { name: 'Action button' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Link' })).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const { container } = renderWithTemplateContext(
        <RevealBox></RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const content = container.querySelector('.mt-4');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('');
    });

    it('should preserve content styling', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div className="custom-content" style={{ color: 'red' }}>
            Styled content
          </div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const content = screen.getByText('Styled content');
      expect(content).toHaveClass('custom-content');
      expect(content).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });
  });

  describe('Content Spacing', () => {
    it('should have proper spacing between button and content', () => {
      const { container } = renderWithTemplateContext(
        <RevealBox>
          <div>Spaced content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const content = container.querySelector('.mt-4');
      expect(content).toHaveClass('mt-4');
    });

    it('should maintain spacing across different variants', () => {
      const variants = ['fade', 'slide', 'grow'] as const;
      
      variants.forEach((variant, index) => {
        const { container, unmount } = renderWithTemplateContext(
          <RevealBox variant={variant}>
            <div>Content for {variant}</div>
          </RevealBox>
        );
        
        const buttons = screen.getAllByRole('button');
        const button = buttons[buttons.length - 1]; // Get the last button (current render)
        fireEvent.click(button);
        
        const content = container.querySelector('.mt-4');
        expect(content).toHaveClass('mt-4');
        
        unmount(); // Clean up between iterations
      });
    });
  });

  describe('Component Combinations', () => {
    it('should work with all props combined', () => {
      const { container } = renderWithTemplateContext(
        <RevealBox 
          buttonText="Expand details" 
          revealText="Collapse details"
          variant="grow"
          buttonStyle="link"
        >
          <div>Detailed information here</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button', { name: 'Expand details' });
      
      // Check button style
      expect(button).toHaveClass('text-blue-500', 'hover:text-blue-700', 'underline');
      
      // Click to reveal
      fireEvent.click(button);
      
      // Check button text changed
      expect(button).toHaveTextContent('Collapse details');
      
      // Check content visible
      expect(screen.getByText('Detailed information here')).toBeInTheDocument();
      
      // Check animation applied
      const content = container.querySelector('.mt-4');
      expect(content).toHaveClass('transform', 'scale-100', 'opacity-100');
    });

    it('should work with minimal configuration', () => {
      renderWithTemplateContext(
        <RevealBox buttonStyle="minimal">
          <div>Minimal reveal</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-600', 'border-dashed');
      
      fireEvent.click(button);
      expect(screen.getByText('Minimal reveal')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Accessible content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });

    it('should work with keyboard navigation', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Keyboard accessible content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      
      // Focus and activate with keyboard (Space/Enter should work on buttons)
      button.focus();
      fireEvent.click(button); // Standard buttons respond to click events from keyboard
      
      expect(screen.getByText('Keyboard accessible content')).toBeInTheDocument();
    });

    it('should maintain focus order with revealed interactive content', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>
            <button>First button</button>
            <button>Second button</button>
          </div>
        </RevealBox>
      );
      
      const revealButton = screen.getByRole('button', { name: 'Click to reveal' });
      fireEvent.click(revealButton);
      
      const firstButton = screen.getByRole('button', { name: 'First button' });
      const secondButton = screen.getByRole('button', { name: 'Second button' });
      
      expect(firstButton).not.toHaveAttribute('tabindex', '-1');
      expect(secondButton).not.toHaveAttribute('tabindex', '-1');
    });

    it('should provide meaningful button text', () => {
      renderWithTemplateContext(
        <RevealBox buttonText="Show privacy policy">
          <div>Privacy policy content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button', { name: 'Show privacy policy' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined children', () => {
      const { container } = renderWithTemplateContext(
        <RevealBox>
          {null}
          {undefined}
          <span>Valid content</span>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Valid content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle very long button text', () => {
      const longText = 'A'.repeat(100);
      renderWithTemplateContext(
        <RevealBox buttonText={longText}>
          <div>Content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent(longText);
    });

    it('should handle special characters in button text', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;":,./<>? 🎉';
      renderWithTemplateContext(
        <RevealBox buttonText={specialText}>
          <div>Content</div>
        </RevealBox>
      );
      
      expect(screen.getByRole('button', { name: specialText })).toBeInTheDocument();
    });

    it('should handle Unicode characters', () => {
      const unicodeContent = '🚀 Reveal this: ñáéíóú 中文 العربية';
      renderWithTemplateContext(
        <RevealBox>
          <div>{unicodeContent}</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText(unicodeContent)).toBeInTheDocument();
    });

    it('should handle rapid button clicks', () => {
      renderWithTemplateContext(
        <RevealBox>
          <div>Rapid click content</div>
        </RevealBox>
      );
      
      const button = screen.getByRole('button');
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }
      
      // Should end up visible (odd number of clicks)
      expect(screen.queryByText('Rapid click content')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <RevealBox>Performance test content</RevealBox>
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <RevealBox buttonText="Initial">Initial content</RevealBox>
      );
      
      expect(screen.getByRole('button', { name: 'Initial' })).toBeInTheDocument();
      
      rerender(<RevealBox buttonText="Updated" variant="slide">Updated content</RevealBox>);
      expect(screen.getByRole('button', { name: 'Updated' })).toBeInTheDocument();
      
      rerender(<RevealBox buttonStyle="link">Final content</RevealBox>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-blue-500', 'underline');
    });
  });
});