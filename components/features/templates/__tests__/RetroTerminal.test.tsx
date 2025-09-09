import React from 'react';
import { screen } from '@testing-library/react';
import RetroTerminal from '../RetroTerminal';
import { renderWithTemplateContext } from './test-utils';

describe('RetroTerminal Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal>Terminal content</RetroTerminal>
      );
      
      expect(screen.getByText('Terminal content')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('bg-black', 'border-green-400', 'border-2', 'rounded', 'font-mono', 'shadow-lg');
    });

    it('should render children content', () => {
      renderWithTemplateContext(
        <RetroTerminal>
          <div>Child content</div>
          <span>Another child</span>
        </RetroTerminal>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.getByText('Another child')).toBeInTheDocument();
    });

    it('should have proper structure with header and content areas', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal>Content</RetroTerminal>
      );
      
      const terminal = container.firstChild;
      const header = container.querySelector('.border-b');
      const content = container.querySelector('.p-6');
      
      expect(terminal).toBeInTheDocument();
      expect(header).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Content');
    });
  });

  describe('Variant Styles', () => {
    it('should apply green variant by default', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal>Content</RetroTerminal>
      );
      
      expect(container.firstChild).toHaveClass('bg-black', 'border-green-400');
      
      const header = container.querySelector('.border-b');
      const content = container.querySelector('.p-6');
      expect(header).toHaveClass('text-green-400', 'border-green-400');
      expect(content).toHaveClass('text-green-400');
    });

    it('should apply amber variant styles', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal variant="amber">Content</RetroTerminal>
      );
      
      expect(container.firstChild).toHaveClass('bg-black', 'border-amber-400');
      
      const header = container.querySelector('.border-b');
      const content = container.querySelector('.p-6');
      expect(header).toHaveClass('text-amber-400', 'border-amber-400');
      expect(content).toHaveClass('text-amber-400');
    });

    it('should apply blue variant styles', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal variant="blue">Content</RetroTerminal>
      );
      
      expect(container.firstChild).toHaveClass('bg-black', 'border-blue-400');
      
      const header = container.querySelector('.border-b');
      const content = container.querySelector('.p-6');
      expect(header).toHaveClass('text-blue-400', 'border-blue-400');
      expect(content).toHaveClass('text-blue-400');
    });

    it('should apply white variant styles', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal variant="white">Content</RetroTerminal>
      );
      
      expect(container.firstChild).toHaveClass('bg-black', 'border-white');
      
      const header = container.querySelector('.border-b');
      const content = container.querySelector('.p-6');
      expect(header).toHaveClass('text-white', 'border-white');
      expect(content).toHaveClass('text-white');
    });

    it('should handle invalid variant gracefully', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal variant={'invalid' as any}>Content</RetroTerminal>
      );
      
      // Should not crash and maintain some basic structure
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Header Display', () => {
    it('should show header by default', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal>Content</RetroTerminal>
      );
      
      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('terminal');
      
      // Check for traffic light buttons
      const redButton = container.querySelector('.bg-red-500');
      const yellowButton = container.querySelector('.bg-yellow-500');
      const greenButton = container.querySelector('.bg-green-500');
      expect(redButton).toBeInTheDocument();
      expect(yellowButton).toBeInTheDocument();
      expect(greenButton).toBeInTheDocument();
    });

    it('should hide header when showHeader is false', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal showHeader={false}>Content</RetroTerminal>
      );
      
      const header = container.querySelector('.border-b');
      expect(header).not.toBeInTheDocument();
      expect(screen.queryByText('terminal')).not.toBeInTheDocument();
    });

    it('should show header when showHeader is true', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal showHeader={true}>Content</RetroTerminal>
      );
      
      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('terminal')).toBeInTheDocument();
    });

    it('should handle string "true" value for showHeader', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal showHeader="true">Content</RetroTerminal>
      );
      
      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('terminal')).toBeInTheDocument();
    });

    it('should handle string "false" value for showHeader', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal showHeader="false">Content</RetroTerminal>
      );
      
      const header = container.querySelector('.border-b');
      expect(header).not.toBeInTheDocument();
    });

    it('should have correct header styling', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal variant="blue">Content</RetroTerminal>
      );
      
      const header = container.querySelector('.border-b');
      expect(header).toHaveClass(
        'text-blue-400',
        'border-b',
        'border-blue-400',
        'px-4',
        'py-2',
        'text-sm',
        'flex',
        'items-center',
        'gap-2'
      );
    });

    it('should have proper traffic light button styling', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal>Content</RetroTerminal>
      );
      
      const redButton = container.querySelector('.bg-red-500');
      const yellowButton = container.querySelector('.bg-yellow-500');
      const greenButton = container.querySelector('.bg-green-500');
      
      [redButton, yellowButton, greenButton].forEach(button => {
        expect(button).toHaveClass('inline-block', 'w-3', 'h-3', 'rounded-full');
      });
    });
  });

  describe('Padding Options', () => {
    it('should apply xs padding', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal padding="xs">Content</RetroTerminal>
      );
      
      const content = container.querySelector('.p-2');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Content');
    });

    it('should apply sm padding', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal padding="sm">Content</RetroTerminal>
      );
      
      const content = container.querySelector('.p-4');
      expect(content).toBeInTheDocument();
    });

    it('should apply md padding by default', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal>Content</RetroTerminal>
      );
      
      const content = container.querySelector('.p-6');
      expect(content).toBeInTheDocument();
    });

    it('should apply lg padding', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal padding="lg">Content</RetroTerminal>
      );
      
      const content = container.querySelector('.p-8');
      expect(content).toBeInTheDocument();
    });

    it('should apply xl padding', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal padding="xl">Content</RetroTerminal>
      );
      
      const content = container.querySelector('.p-12');
      expect(content).toBeInTheDocument();
    });

    it('should handle invalid padding gracefully', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal padding={'invalid' as any}>Content</RetroTerminal>
      );
      
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('should render text content', () => {
      renderWithTemplateContext(
        <RetroTerminal>Simple text content</RetroTerminal>
      );
      
      expect(screen.getByText('Simple text content')).toBeInTheDocument();
    });

    it('should render complex JSX content', () => {
      renderWithTemplateContext(
        <RetroTerminal>
          <div className="command-line">
            <span className="prompt">$ </span>
            <span className="command">ls -la</span>
          </div>
          <div className="output">
            <p>total 42</p>
            <p>drwxr-xr-x 3 user group 4096 Jan 1 12:00 .</p>
          </div>
        </RetroTerminal>
      );
      
      expect(screen.getByText((content, element) => content.includes('$'))).toBeInTheDocument();
      expect(screen.getByText('ls -la')).toBeInTheDocument();
      expect(screen.getByText('total 42')).toBeInTheDocument();
      expect(screen.getByText('drwxr-xr-x 3 user group 4096 Jan 1 12:00 .')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      renderWithTemplateContext(
        <RetroTerminal>
          <div>
            <button>Click me</button>
            <input placeholder="Type here" />
            <img src="/test.jpg" alt="Test" />
          </div>
        </RetroTerminal>
      );
      
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
      expect(screen.getByAltText('Test')).toBeInTheDocument();
    });

    it('should preserve text formatting', () => {
      renderWithTemplateContext(
        <RetroTerminal>
          <pre>{`Line 1
Line 2
  Indented line`}</pre>
        </RetroTerminal>
      );
      
      const preElement = screen.getByText((content, element) => {
        return element?.tagName === 'PRE' && content.includes('Line 1');
      });
      expect(preElement).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal></RetroTerminal>
      );
      
      // Get the content div (second div, not the header with traffic lights)
      const allDivsWithPadding = container.querySelectorAll('[class*="p-"]');
      const contentDiv = Array.from(allDivsWithPadding).find(div => 
        !div.classList.contains('px-4') // Exclude header div which has px-4
      );
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toBeEmptyDOMElement();
    });
  });

  describe('Component Combinations', () => {
    it('should work with all props combined', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal 
          variant="amber" 
          showHeader={true} 
          padding="lg"
        >
          Terminal output here
        </RetroTerminal>
      );
      
      // Check variant
      expect(container.firstChild).toHaveClass('border-amber-400');
      
      // Check header
      expect(screen.getByText('terminal')).toBeInTheDocument();
      
      // Check padding
      const content = container.querySelector('.p-8');
      expect(content).toBeInTheDocument();
      
      // Check content
      expect(screen.getByText('Terminal output here')).toBeInTheDocument();
    });

    it('should work without header and with minimal padding', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal 
          variant="white" 
          showHeader={false} 
          padding="xs"
        >
          Minimal terminal
        </RetroTerminal>
      );
      
      expect(container.firstChild).toHaveClass('border-white');
      expect(screen.queryByText('terminal')).not.toBeInTheDocument();
      
      const content = container.querySelector('.p-2');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Minimal terminal');
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', () => {
      renderWithTemplateContext(
        <RetroTerminal>
          <div role="log" aria-label="Terminal output">
            Command output here
          </div>
        </RetroTerminal>
      );
      
      const logElement = screen.getByRole('log');
      expect(logElement).toBeInTheDocument();
      expect(logElement).toHaveAttribute('aria-label', 'Terminal output');
    });

    it('should maintain focus management when nested interactive elements', () => {
      renderWithTemplateContext(
        <RetroTerminal>
          <button>Terminal button</button>
          <input placeholder="Terminal input" />
        </RetroTerminal>
      );
      
      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');
      
      expect(button).not.toHaveAttribute('tabindex', '-1');
      expect(input).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', () => {
      const longContent = 'A'.repeat(1000);
      renderWithTemplateContext(
        <RetroTerminal>{longContent}</RetroTerminal>
      );
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle special characters in content', () => {
      const specialContent = '!@#$%^&*()_+-=[]{}|;":,./<>?';
      renderWithTemplateContext(
        <RetroTerminal>{specialContent}</RetroTerminal>
      );
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('should handle Unicode characters', () => {
      const unicodeContent = '🚀 Unicode test ñáéíóú 中文 العربية';
      renderWithTemplateContext(
        <RetroTerminal>{unicodeContent}</RetroTerminal>
      );
      
      expect(screen.getByText(unicodeContent)).toBeInTheDocument();
    });

    it('should handle null/undefined children gracefully', () => {
      const { container } = renderWithTemplateContext(
        <RetroTerminal>
          {null}
          {undefined}
          <span>Valid content</span>
        </RetroTerminal>
      );
      
      expect(screen.getByText('Valid content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <RetroTerminal>Performance test</RetroTerminal>
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <RetroTerminal variant="green">Initial</RetroTerminal>
      );
      
      expect(screen.getByText('Initial')).toBeInTheDocument();
      
      rerender(<RetroTerminal variant="blue">Updated</RetroTerminal>);
      expect(screen.getByText('Updated')).toBeInTheDocument();
      
      rerender(<RetroTerminal variant="amber" showHeader={false}>Final</RetroTerminal>);
      expect(screen.getByText('Final')).toBeInTheDocument();
      expect(screen.queryByText('terminal')).not.toBeInTheDocument();
    });
  });
});