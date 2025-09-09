import React from 'react';
import { render, screen } from '@testing-library/react';
import RetroCard from '../../../ui/layout/RetroCard';

describe('RetroCard Component', () => {
  describe('Basic Rendering', () => {
    it('should render children content', () => {
      render(
        <RetroCard>
          <p>Test content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render as a section element', () => {
      const { container } = render(
        <RetroCard>
          <div>Content</div>
        </RetroCard>
      );
      
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should apply correct CSS classes to section', () => {
      const { container } = render(
        <RetroCard>
          <div>Content</div>
        </RetroCard>
      );
      
      const section = container.querySelector('section');
      expect(section).toHaveClass(
        'thread-module',
        'p-4',
        'sm:p-5',
        'md:p-6',
        'mb-3',
        'sm:mb-4',
        'md:mb-6'
      );
    });
  });

  describe('Title Handling', () => {
    it('should render title when provided', () => {
      render(
        <RetroCard title="My Card Title">
          <p>Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      const { container } = render(
        <RetroCard>
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = container.querySelector('h3');
      expect(heading).not.toBeInTheDocument();
    });

    it('should render title as h3 element with correct classes', () => {
      render(
        <RetroCard title="Test Title">
          <div>Content</div>
        </RetroCard>
      );
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test Title');
      expect(heading).toHaveClass(
        'thread-headline',
        'text-lg',
        'sm:text-xl',
        'font-bold',
        'mb-3',
        'sm:mb-4'
      );
    });

    it('should handle empty string title', () => {
      const { container } = render(
        <RetroCard title="">
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = container.querySelector('h3');
      expect(heading).not.toBeInTheDocument();
    });

    it('should handle null title', () => {
      const { container } = render(
        <RetroCard title={null as any}>
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = container.querySelector('h3');
      expect(heading).not.toBeInTheDocument();
    });

    it('should handle undefined title explicitly', () => {
      const { container } = render(
        <RetroCard title={undefined}>
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = container.querySelector('h3');
      expect(heading).not.toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('should render multiple children', () => {
      render(
        <RetroCard title="Multi-child Card">
          <p>First paragraph</p>
          <p>Second paragraph</p>
          <div>A div element</div>
        </RetroCard>
      );
      
      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
      expect(screen.getByText('A div element')).toBeInTheDocument();
    });

    it('should render complex nested content', () => {
      render(
        <RetroCard title="Complex Content">
          <div className="nested-content">
            <h4>Nested Title</h4>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
            <button>Action Button</button>
          </div>
        </RetroCard>
      );
      
      expect(screen.getByText('Nested Title')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });

    it('should render React components as children', () => {
      const TestComponent = () => <span data-testid="test-component">Test Component</span>;
      
      render(
        <RetroCard>
          <TestComponent />
        </RetroCard>
      );
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    it('should render string content directly', () => {
      render(
        <RetroCard>
          Just a string
        </RetroCard>
      );
      
      expect(screen.getByText('Just a string')).toBeInTheDocument();
    });

    it('should render fragments', () => {
      render(
        <RetroCard>
          <>
            <p>Fragment child 1</p>
            <p>Fragment child 2</p>
          </>
        </RetroCard>
      );
      
      expect(screen.getByText('Fragment child 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment child 2')).toBeInTheDocument();
    });
  });

  describe('Special Character and Content Handling', () => {
    it('should handle special characters in title', () => {
      render(
        <RetroCard title="Special & Characters 'Test' &quot;Quote&quot; &lt;HTML&gt;">
          <p>Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText(/Special & Characters 'Test'/)).toBeInTheDocument();
    });

    it('should handle Unicode characters in title', () => {
      render(
        <RetroCard title="🎉 Unicode Title 中文 ñáéíóú">
          <p>Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('🎉 Unicode Title 中文 ñáéíóú')).toBeInTheDocument();
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(100);
      render(
        <RetroCard title={longTitle}>
          <p>Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle special characters in content', () => {
      render(
        <RetroCard>
          <p>Content with &amp; symbols &apos;quotes&apos; &quot;double-quotes&quot; &lt;HTML&gt;</p>
        </RetroCard>
      );
      
      expect(screen.getByText(/Content with & symbols 'quotes' "double-quotes"/)).toBeInTheDocument();
    });

    it('should handle numeric titles', () => {
      render(
        <RetroCard title={123 as any}>
          <p>Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('should maintain correct document structure with title', () => {
      const { container } = render(
        <RetroCard title="Card Title">
          <p>Card content</p>
        </RetroCard>
      );
      
      const section = container.querySelector('section');
      const heading = section?.querySelector('h3');
      const content = section?.querySelector('p');
      
      expect(section).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      
      // Verify heading comes before content
      expect(heading?.nextElementSibling).toBe(content);
    });

    it('should maintain correct document structure without title', () => {
      const { container } = render(
        <RetroCard>
          <p>Card content</p>
        </RetroCard>
      );
      
      const section = container.querySelector('section');
      const heading = section?.querySelector('h3');
      const content = section?.querySelector('p');
      
      expect(section).toBeInTheDocument();
      expect(heading).not.toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(section?.firstElementChild).toBe(content);
    });

    it('should handle empty children gracefully', () => {
      const { container } = render(
        <RetroCard title="Empty Card">
          {null}
        </RetroCard>
      );
      
      expect(screen.getByText('Empty Card')).toBeInTheDocument();
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should handle conditional children rendering', () => {
      const showContent = true;
      render(
        <RetroCard title="Conditional Card">
          {showContent && <p>Conditionally rendered content</p>}
          {!showContent && <p>Alternative content</p>}
        </RetroCard>
      );
      
      expect(screen.getByText('Conditionally rendered content')).toBeInTheDocument();
      expect(screen.queryByText('Alternative content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic section element', () => {
      const { container } = render(
        <RetroCard title="Accessible Card">
          <p>Content</p>
        </RetroCard>
      );
      
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
      expect(section?.tagName).toBe('SECTION');
    });

    it('should have proper heading hierarchy', () => {
      render(
        <RetroCard title="Card Heading">
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Card Heading');
    });

    it('should be keyboard accessible', () => {
      render(
        <RetroCard title="Keyboard Test">
          <button>Focusable Button</button>
        </RetroCard>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should support ARIA attributes through children', () => {
      render(
        <RetroCard title="ARIA Test">
          <div role="tabpanel" aria-labelledby="tab1">
            Tab panel content
          </div>
        </RetroCard>
      );
      
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toBeInTheDocument();
      expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab1');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive padding classes', () => {
      const { container } = render(
        <RetroCard>
          <p>Content</p>
        </RetroCard>
      );
      
      const section = container.querySelector('section');
      expect(section).toHaveClass('p-4', 'sm:p-5', 'md:p-6');
    });

    it('should have responsive margin classes', () => {
      const { container } = render(
        <RetroCard>
          <p>Content</p>
        </RetroCard>
      );
      
      const section = container.querySelector('section');
      expect(section).toHaveClass('mb-3', 'sm:mb-4', 'md:mb-6');
    });

    it('should have responsive title text sizing', () => {
      render(
        <RetroCard title="Responsive Title">
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('text-lg', 'sm:text-xl');
    });

    it('should have responsive title margins', () => {
      render(
        <RetroCard title="Responsive Margins">
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('mb-3', 'sm:mb-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle boolean children', () => {
      render(
        <RetroCard>
          {true}
          {false}
          <p>Real content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('Real content')).toBeInTheDocument();
    });

    it('should handle array of children', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      render(
        <RetroCard>
          {items.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
        </RetroCard>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should handle zero as title', () => {
      render(
        <RetroCard title={0 as any}>
          <p>Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle whitespace-only title', () => {
      render(
        <RetroCard title="   ">
          <p>Content</p>
        </RetroCard>
      );
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toBe('   ');
    });

    it('should handle nested RetroCard components', () => {
      render(
        <RetroCard title="Outer Card">
          <RetroCard title="Inner Card">
            <p>Nested content</p>
          </RetroCard>
        </RetroCard>
      );
      
      expect(screen.getByText('Outer Card')).toBeInTheDocument();
      expect(screen.getByText('Inner Card')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
      
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(2);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid re-renders', () => {
      const { rerender } = render(
        <RetroCard title="Initial Title">
          <p>Initial Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('Initial Title')).toBeInTheDocument();
      
      rerender(
        <RetroCard title="Updated Title">
          <p>Updated Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
      expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
    });

    it('should handle component unmounting cleanly', () => {
      const { unmount } = render(
        <RetroCard title="Unmount Test">
          <p>Content</p>
        </RetroCard>
      );
      
      expect(screen.getByText('Unmount Test')).toBeInTheDocument();
      
      unmount();
      
      expect(screen.queryByText('Unmount Test')).not.toBeInTheDocument();
    });

    it('should handle large amounts of content', () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => (
        <p key={i}>Content item {i + 1}</p>
      ));
      
      render(
        <RetroCard title="Large Content Test">
          {largeContent}
        </RetroCard>
      );
      
      expect(screen.getByText('Large Content Test')).toBeInTheDocument();
      expect(screen.getByText('Content item 1')).toBeInTheDocument();
      expect(screen.getByText('Content item 100')).toBeInTheDocument();
    });
  });
});