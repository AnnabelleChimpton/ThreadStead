import React from 'react';
import { screen } from '@testing-library/react';
import StickyNote from '../StickyNote';
import { renderWithTemplateContext } from './test-utils';

describe('StickyNote Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Note content</StickyNote>
      );
      
      expect(screen.getByText('Note content')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass(
        'inline-block',
        'bg-yellow-200',
        'border-yellow-300',
        'w-48',
        'h-48',
        'p-4',
        'text-sm',
        'border',
        'border-dashed',
        'shadow-md',
        'font-handwriting',
        'relative',
        'overflow-hidden'
      );
    });

    it('should render children content', () => {
      renderWithTemplateContext(
        <StickyNote>
          <div>Note title</div>
          <p>Note description</p>
        </StickyNote>
      );
      
      expect(screen.getByText('Note title')).toBeInTheDocument();
      expect(screen.getByText('Note description')).toBeInTheDocument();
    });

    it('should have proper structure with tape effect', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Content</StickyNote>
      );
      
      const note = container.firstChild;
      const tape = container.querySelector('.absolute.-top-1');
      const contentArea = container.querySelector('.relative.z-10');
      
      expect(note).toBeInTheDocument();
      expect(tape).toBeInTheDocument();
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveTextContent('Content');
    });

    it('should have default transform origin center', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transformOrigin: 'center'
      });
    });
  });

  describe('Color Variants', () => {
    it('should apply yellow color by default', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('bg-yellow-200', 'border-yellow-300');
    });

    it('should apply pink color variant', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color="pink">Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('bg-pink-200', 'border-pink-300');
    });

    it('should apply blue color variant', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color="blue">Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('bg-blue-200', 'border-blue-300');
    });

    it('should apply green color variant', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color="green">Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('bg-green-200', 'border-green-300');
    });

    it('should apply orange color variant', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color="orange">Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('bg-orange-200', 'border-orange-300');
    });

    it('should apply purple color variant', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color="purple">Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('bg-purple-200', 'border-purple-300');
    });

    it('should handle invalid color gracefully', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color={'invalid' as any}>Content</StickyNote>
      );
      
      // Should not crash and maintain some basic structure
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply md size by default', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('w-48', 'h-48', 'p-4', 'text-sm');
    });

    it('should apply sm size variant', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote size="sm">Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('w-32', 'h-32', 'p-3', 'text-xs');
    });

    it('should apply lg size variant', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote size="lg">Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('w-64', 'h-64', 'p-6', 'text-base');
    });

    it('should handle invalid size gracefully', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote size={'invalid' as any}>Content</StickyNote>
      );
      
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Rotation Functionality', () => {
    it('should have no rotation by default', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(0deg)'
      });
    });

    it('should apply positive rotation', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={5}>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(5deg)'
      });
    });

    it('should apply negative rotation', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={-8}>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(-8deg)'
      });
    });

    it('should handle large rotation values', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={90}>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(90deg)'
      });
    });

    it('should handle decimal rotation values', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={2.5}>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(2.5deg)'
      });
    });

    it('should handle zero rotation explicitly', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={0}>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(0deg)'
      });
    });
  });

  describe('Tape Effect', () => {
    it('should always render tape effect', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Content</StickyNote>
      );
      
      const tape = container.querySelector('.absolute.-top-1');
      expect(tape).toBeInTheDocument();
      expect(tape).toHaveClass(
        'absolute',
        '-top-1',
        'left-1/2',
        'transform',
        '-translate-x-1/2',
        'w-8',
        'h-4',
        'bg-white',
        'bg-opacity-70',
        'border',
        'border-gray-300',
        'rounded-sm'
      );
    });

    it('should position tape correctly for all sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach(size => {
        const { container } = renderWithTemplateContext(
          <StickyNote size={size}>Content {size}</StickyNote>
        );
        
        const tape = container.querySelector('.absolute.-top-1');
        expect(tape).toBeInTheDocument();
        expect(tape).toHaveClass('left-1/2', '-translate-x-1/2');
      });
    });

    it('should maintain tape position with rotation', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={15}>Content</StickyNote>
      );
      
      const tape = container.querySelector('.absolute.-top-1');
      expect(tape).toBeInTheDocument();
      // Tape positioning should not be affected by rotation
      expect(tape).toHaveClass('left-1/2', '-translate-x-1/2');
    });
  });

  describe('Content Rendering', () => {
    it('should render text content', () => {
      renderWithTemplateContext(
        <StickyNote>Remember to buy milk!</StickyNote>
      );
      
      expect(screen.getByText('Remember to buy milk!')).toBeInTheDocument();
    });

    it('should render complex JSX content', () => {
      renderWithTemplateContext(
        <StickyNote>
          <div className="note-header">
            <h4>To Do</h4>
          </div>
          <ul>
            <li>Task 1</li>
            <li>Task 2</li>
          </ul>
        </StickyNote>
      );
      
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('should handle long content with overflow', () => {
      const longContent = 'This is a very long note that might overflow the sticky note boundaries and should be handled gracefully by the component.';
      renderWithTemplateContext(
        <StickyNote>{longContent}</StickyNote>
      );
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote></StickyNote>
      );
      
      const contentArea = container.querySelector('.relative.z-10');
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveTextContent('');
    });

    it('should preserve content styling', () => {
      renderWithTemplateContext(
        <StickyNote>
          <div className="custom-note" style={{ fontWeight: 'bold' }}>
            Styled content
          </div>
        </StickyNote>
      );
      
      const content = screen.getByText('Styled content');
      expect(content).toHaveClass('custom-note');
      expect(content).toHaveStyle({ fontWeight: 'bold' });
    });

    it('should render interactive content', () => {
      renderWithTemplateContext(
        <StickyNote>
          <button>Click me</button>
          <input placeholder="Type here" />
        </StickyNote>
      );
      
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
    });
  });

  describe('Content Z-Index and Layering', () => {
    it('should have content above tape with z-index', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>Content</StickyNote>
      );
      
      const contentArea = container.querySelector('.relative.z-10');
      const tape = container.querySelector('.absolute.-top-1');
      
      expect(contentArea).toHaveClass('relative', 'z-10');
      expect(tape).not.toHaveClass('z-10');
    });

    it('should maintain proper layering with interactive content', () => {
      renderWithTemplateContext(
        <StickyNote>
          <button>Clickable button</button>
        </StickyNote>
      );
      
      const button = screen.getByRole('button', { name: 'Clickable button' });
      expect(button.closest('.z-10')).toBeInTheDocument();
    });
  });

  describe('Component Combinations', () => {
    it('should work with all props combined', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote 
          color="blue" 
          size="lg" 
          rotation={-3}
        >
          Large blue note
        </StickyNote>
      );
      
      // Check color
      expect(container.firstChild).toHaveClass('bg-blue-200', 'border-blue-300');
      
      // Check size
      expect(container.firstChild).toHaveClass('w-64', 'h-64', 'p-6', 'text-base');
      
      // Check rotation
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(-3deg)'
      });
      
      // Check content
      expect(screen.getByText('Large blue note')).toBeInTheDocument();
    });

    it('should work with minimal configuration', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color="green" size="sm">
          Small note
        </StickyNote>
      );
      
      expect(container.firstChild).toHaveClass('bg-green-200', 'w-32', 'h-32');
      expect(screen.getByText('Small note')).toBeInTheDocument();
    });

    it('should work with extreme rotation', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote color="pink" rotation={45}>
          Tilted note
        </StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(45deg)'
      });
      expect(screen.getByText('Tilted note')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not interfere with content accessibility', () => {
      renderWithTemplateContext(
        <StickyNote>
          <div role="note" aria-label="Important reminder">
            Don&apos;t forget the meeting at 3 PM
          </div>
        </StickyNote>
      );
      
      const noteElement = screen.getByRole('note');
      expect(noteElement).toBeInTheDocument();
      expect(noteElement).toHaveAttribute('aria-label', 'Important reminder');
    });

    it('should maintain focus management with interactive content', () => {
      renderWithTemplateContext(
        <StickyNote>
          <button>Complete task</button>
          <input placeholder="Add note" />
        </StickyNote>
      );
      
      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');
      
      expect(button).not.toHaveAttribute('tabindex', '-1');
      expect(input).not.toHaveAttribute('tabindex', '-1');
    });

    it('should work with screen reader content', () => {
      renderWithTemplateContext(
        <StickyNote>
          <div>
            <span aria-hidden="true">📝</span>
            <span>Meeting notes for today</span>
          </div>
        </StickyNote>
      );
      
      expect(screen.getByText('Meeting notes for today')).toBeInTheDocument();
      const hiddenIcon = screen.getByText('📝');
      expect(hiddenIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined children', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote>
          {null}
          {undefined}
          <span>Valid content</span>
        </StickyNote>
      );
      
      expect(screen.getByText('Valid content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle very large rotation values', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={360}>Content</StickyNote>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(360deg)'
      });
    });

    it('should handle NaN rotation gracefully', () => {
      const { container } = renderWithTemplateContext(
        <StickyNote rotation={NaN}>Content</StickyNote>
      );
      
      // Component should still render without crashing
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should handle special characters in content', () => {
      const specialContent = '!@#$%^&*()_+-=[]{}|;":,./<>?';
      renderWithTemplateContext(
        <StickyNote>{specialContent}</StickyNote>
      );
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('should handle Unicode characters', () => {
      const unicodeContent = '🎉 Reminder: Unicode test ñáéíóú 中文 العربية';
      renderWithTemplateContext(
        <StickyNote>{unicodeContent}</StickyNote>
      );
      
      expect(screen.getByText(unicodeContent)).toBeInTheDocument();
    });

    it('should handle very long single words', () => {
      const longWord = 'A'.repeat(100);
      renderWithTemplateContext(
        <StickyNote>{longWord}</StickyNote>
      );
      
      expect(screen.getByText(longWord)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <StickyNote color="purple">Performance test</StickyNote>
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <StickyNote color="yellow">Initial</StickyNote>
      );
      
      expect(screen.getByText('Initial')).toBeInTheDocument();
      
      rerender(<StickyNote color="blue" size="lg">Updated</StickyNote>);
      expect(screen.getByText('Updated')).toBeInTheDocument();
      
      rerender(<StickyNote color="green" size="sm" rotation={10}>Final</StickyNote>);
      expect(screen.getByText('Final')).toBeInTheDocument();
    });
  });
});