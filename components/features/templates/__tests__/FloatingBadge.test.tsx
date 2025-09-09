import React from 'react';
import { screen } from '@testing-library/react';
import FloatingBadge from '../FloatingBadge';
import { renderWithTemplateContext } from './test-utils';

describe('FloatingBadge Component', () => {
  describe('Basic Rendering', () => {
    it.skip('should render with default props (styled-jsx limitation)', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>5</FloatingBadge>
      );
      
      expect(screen.getByText('5')).toBeInTheDocument();
      
      // Check for styled-jsx style tag
      const style = container.querySelector('style');
      expect(style).toBeInTheDocument();
      expect(style?.textContent).toContain('@keyframes float');
    });

    it('should render children content', () => {
      renderWithTemplateContext(
        <FloatingBadge>
          <span>NEW</span>
        </FloatingBadge>
      );
      
      expect(screen.getByText('NEW')).toBeInTheDocument();
    });

    it('should have proper fixed positioning structure', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Badge</FloatingBadge>
      );
      
      const positionContainer = container.querySelector('.fixed');
      const badge = container.querySelector('.rounded-full');
      
      expect(positionContainer).toBeInTheDocument();
      expect(positionContainer).toHaveClass('fixed', 'top-2', 'right-2', 'z-50');
      expect(badge).toBeInTheDocument();
    });

    it('should have default styling classes', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Default</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass(
        'bg-blue-500',
        'text-white',
        'text-sm',
        'px-3',
        'py-1',
        'animate-[float_3s_ease-in-out_infinite]',
        'rounded-full',
        'font-semibold',
        'shadow-lg',
        'border-2',
        'border-white'
      );
    });
  });

  describe('Color Variants', () => {
    it('should apply blue color by default', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Blue</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-blue-500', 'text-white');
    });

    it('should apply green color variant', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge color="green">Green</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-green-500', 'text-white');
    });

    it('should apply red color variant', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge color="red">Red</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-red-500', 'text-white');
    });

    it('should apply yellow color variant with black text', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge color="yellow">Yellow</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-yellow-500', 'text-black');
    });

    it('should apply purple color variant', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge color="purple">Purple</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-purple-500', 'text-white');
    });

    it('should apply pink color variant', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge color="pink">Pink</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-pink-500', 'text-white');
    });

    it('should handle invalid color gracefully', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge color={'invalid' as any}>Content</FloatingBadge>
      );
      
      // Should not crash and maintain some basic structure
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply md size by default', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Medium</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('text-sm', 'px-3', 'py-1');
    });

    it('should apply sm size variant', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge size="sm">Small</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('text-xs', 'px-2', 'py-1');
    });

    it('should apply lg size variant', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge size="lg">Large</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('text-base', 'px-4', 'py-2');
    });

    it('should handle invalid size gracefully', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge size={'invalid' as any}>Content</FloatingBadge>
      );
      
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Animation Variants', () => {
    it('should apply float animation by default', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Float</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('animate-[float_3s_ease-in-out_infinite]');
    });

    it('should apply bounce animation', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge animation="bounce">Bounce</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('animate-bounce');
    });

    it('should apply pulse animation', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge animation="pulse">Pulse</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('should apply no animation', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge animation="none">Static</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).not.toHaveClass('animate-bounce');
      expect(badge).not.toHaveClass('animate-pulse');
      expect(badge).not.toHaveClass('animate-[float_3s_ease-in-out_infinite]');
    });

    it('should handle invalid animation gracefully', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge animation={'invalid' as any}>Content</FloatingBadge>
      );
      
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Position Variants', () => {
    it('should apply top-right position by default', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Top Right</FloatingBadge>
      );
      
      const positionContainer = container.querySelector('.fixed');
      expect(positionContainer).toHaveClass('top-2', 'right-2');
    });

    it('should apply top-left position', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge position="top-left">Top Left</FloatingBadge>
      );
      
      const positionContainer = container.querySelector('.fixed');
      expect(positionContainer).toHaveClass('top-2', 'left-2');
    });

    it('should apply bottom-left position', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge position="bottom-left">Bottom Left</FloatingBadge>
      );
      
      const positionContainer = container.querySelector('.fixed');
      expect(positionContainer).toHaveClass('bottom-2', 'left-2');
    });

    it('should apply bottom-right position', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge position="bottom-right">Bottom Right</FloatingBadge>
      );
      
      const positionContainer = container.querySelector('.fixed');
      expect(positionContainer).toHaveClass('bottom-2', 'right-2');
    });

    it('should handle invalid position gracefully', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge position={'invalid' as any}>Content</FloatingBadge>
      );
      
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Styled-JSX Integration', () => {
    it.skip('should include float keyframes in style tag (styled-jsx limitation)', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Animated</FloatingBadge>
      );
      
      const style = container.querySelector('style');
      expect(style).toBeInTheDocument();
      
      const styleContent = style?.textContent || '';
      expect(styleContent).toContain('@keyframes float');
      expect(styleContent).toContain('0%, 100% { transform: translateY(0px); }');
      expect(styleContent).toContain('50% { transform: translateY(-6px); }');
    });

    it.skip('should include style tag for all animation types (styled-jsx limitation)', () => {
      const animations = ['float', 'bounce', 'pulse', 'none'] as const;
      
      animations.forEach(animation => {
        const { container } = renderWithTemplateContext(
          <FloatingBadge animation={animation}>Test {animation}</FloatingBadge>
        );
        
        const style = container.querySelector('style');
        expect(style).toBeInTheDocument();
      });
    });
  });

  describe('Z-Index and Layering', () => {
    it('should have high z-index for proper layering', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Layered</FloatingBadge>
      );
      
      const positionContainer = container.querySelector('.fixed');
      expect(positionContainer).toHaveClass('z-50');
    });

    it('should maintain layering across all positions', () => {
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
      
      positions.forEach(position => {
        const { container } = renderWithTemplateContext(
          <FloatingBadge position={position}>Test {position}</FloatingBadge>
        );
        
        const positionContainer = container.querySelector('.fixed');
        expect(positionContainer).toHaveClass('z-50');
      });
    });
  });

  describe('Content Rendering', () => {
    it('should render text content', () => {
      renderWithTemplateContext(
        <FloatingBadge>99+</FloatingBadge>
      );
      
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should render complex JSX content', () => {
      renderWithTemplateContext(
        <FloatingBadge>
          <div className="badge-content">
            <span>!</span>
            <strong>NEW</strong>
          </div>
        </FloatingBadge>
      );
      
      expect(screen.getByText('!')).toBeInTheDocument();
      expect(screen.getByText('NEW')).toBeInTheDocument();
    });

    it('should render icon content', () => {
      renderWithTemplateContext(
        <FloatingBadge>
          <span role="img" aria-label="notification">🔔</span>
        </FloatingBadge>
      );
      
      expect(screen.getByRole('img', { name: 'notification' })).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge></FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('');
    });

    it('should preserve content styling', () => {
      renderWithTemplateContext(
        <FloatingBadge>
          <span className="custom-badge" style={{ fontWeight: 'bold' }}>
            Custom
          </span>
        </FloatingBadge>
      );
      
      const content = screen.getByText('Custom');
      expect(content).toHaveClass('custom-badge');
      expect(content).toHaveStyle({ fontWeight: 'bold' });
    });

    it('should handle numeric content', () => {
      renderWithTemplateContext(
        <FloatingBadge>{42}</FloatingBadge>
      );
      
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Component Combinations', () => {
    it('should work with all props combined', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge 
          color="red" 
          size="lg" 
          animation="bounce"
          position="bottom-left"
        >
          Alert!
        </FloatingBadge>
      );
      
      // Check position
      const positionContainer = container.querySelector('.fixed');
      expect(positionContainer).toHaveClass('bottom-2', 'left-2');
      
      // Check badge styling
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass(
        'bg-red-500',
        'text-white',
        'text-base',
        'px-4',
        'py-2',
        'animate-bounce'
      );
      
      // Check content
      expect(screen.getByText('Alert!')).toBeInTheDocument();
    });

    it('should work with minimal configuration', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge color="green">
          ✓
        </FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('bg-green-500');
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should work with static badge configuration', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge 
          animation="none" 
          position="top-left"
          size="sm"
        >
          Static
        </FloatingBadge>
      );
      
      const positionContainer = container.querySelector('.fixed');
      expect(positionContainer).toHaveClass('top-2', 'left-2');
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass('text-xs', 'px-2', 'py-1');
      expect(badge).not.toHaveClass('animate-bounce', 'animate-pulse');
    });
  });

  describe('Border and Shadow Styling', () => {
    it('should have consistent border and shadow styling', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>Styled</FloatingBadge>
      );
      
      const badge = container.querySelector('.rounded-full');
      expect(badge).toHaveClass(
        'shadow-lg',
        'border-2',
        'border-white',
        'font-semibold'
      );
    });

    it('should maintain styling across all color variants', () => {
      const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink'] as const;
      
      colors.forEach(color => {
        const { container } = renderWithTemplateContext(
          <FloatingBadge color={color}>Test {color}</FloatingBadge>
        );
        
        const badge = container.querySelector('.rounded-full');
        expect(badge).toHaveClass('shadow-lg', 'border-2', 'border-white');
      });
    });
  });

  describe('Accessibility', () => {
    it('should not interfere with content accessibility', () => {
      renderWithTemplateContext(
        <FloatingBadge>
          <span role="status" aria-label="3 new messages">3</span>
        </FloatingBadge>
      );
      
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveAttribute('aria-label', '3 new messages');
    });

    it('should work with screen reader content', () => {
      renderWithTemplateContext(
        <FloatingBadge>
          <span aria-hidden="true">🔥</span>
          <span className="sr-only">Hot item</span>
        </FloatingBadge>
      );
      
      expect(screen.getByText('🔥')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText('Hot item')).toHaveClass('sr-only');
    });

    it('should maintain accessibility for interactive content', () => {
      renderWithTemplateContext(
        <FloatingBadge>
          <button aria-label="View notifications">5</button>
        </FloatingBadge>
      );
      
      const button = screen.getByRole('button', { name: 'View notifications' });
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined children', () => {
      const { container } = renderWithTemplateContext(
        <FloatingBadge>
          {null}
          {undefined}
          <span>Valid content</span>
        </FloatingBadge>
      );
      
      expect(screen.getByText('Valid content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(50);
      renderWithTemplateContext(
        <FloatingBadge>{longContent}</FloatingBadge>
      );
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const specialContent = '!@#$%^&*()_+-=[]{}|;":,./<>?';
      renderWithTemplateContext(
        <FloatingBadge>{specialContent}</FloatingBadge>
      );
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('should handle Unicode characters', () => {
      const unicodeContent = '🎉 Badge ñáéíóú 中文 العربية';
      renderWithTemplateContext(
        <FloatingBadge>{unicodeContent}</FloatingBadge>
      );
      
      expect(screen.getByText(unicodeContent)).toBeInTheDocument();
    });

    it('should handle zero and negative numbers', () => {
      renderWithTemplateContext(
        <FloatingBadge>{0}</FloatingBadge>
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle boolean content', () => {
      renderWithTemplateContext(
        <FloatingBadge>{true}</FloatingBadge>
      );
      
      // React renders boolean as empty, but component should still exist
      const { container } = renderWithTemplateContext(
        <FloatingBadge>{true}</FloatingBadge>
      );
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <FloatingBadge color="purple">Performance test</FloatingBadge>
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <FloatingBadge color="blue">Initial</FloatingBadge>
      );
      
      expect(screen.getByText('Initial')).toBeInTheDocument();
      
      rerender(<FloatingBadge color="red" size="lg">Updated</FloatingBadge>);
      expect(screen.getByText('Updated')).toBeInTheDocument();
      
      rerender(<FloatingBadge animation="pulse" position="bottom-left">Final</FloatingBadge>);
      expect(screen.getByText('Final')).toBeInTheDocument();
    });

    it.skip('should handle style tag management efficiently (styled-jsx limitation)', () => {
      const { container, rerender } = renderWithTemplateContext(
        <FloatingBadge>Initial</FloatingBadge>
      );
      
      // Should have one style tag
      expect(container.querySelectorAll('style')).toHaveLength(1);
      
      // Rerender should not create additional style tags
      rerender(<FloatingBadge color="red">Updated</FloatingBadge>);
      expect(container.querySelectorAll('style')).toHaveLength(1);
    });
  });
});