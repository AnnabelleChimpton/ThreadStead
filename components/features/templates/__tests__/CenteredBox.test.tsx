import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CenteredBox from '../CenteredBox';

describe('CenteredBox Component', () => {
  const TestChild1 = () => <div data-testid="child-1">Child Content 1</div>;
  const TestChild2 = () => <div data-testid="child-2">Child Content 2</div>;

  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(
        <CenteredBox>
          <TestChild1 />
          <TestChild2 />
        </CenteredBox>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should always include mx-auto class for centering', () => {
      render(
        <CenteredBox>
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('mx-auto');
    });

    it('should render as div element', () => {
      render(
        <CenteredBox>
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container?.tagName).toBe('DIV');
    });
  });

  describe('MaxWidth Prop - Standard Values', () => {
    const maxWidthTestCases = [
      { maxWidth: 'sm' as const, expectedClass: 'max-w-sm' },
      { maxWidth: 'md' as const, expectedClass: 'max-w-md' },
      { maxWidth: 'lg' as const, expectedClass: 'max-w-lg' },
      { maxWidth: 'xl' as const, expectedClass: 'max-w-xl' },
      { maxWidth: '2xl' as const, expectedClass: 'max-w-2xl' },
      { maxWidth: 'full' as const, expectedClass: 'max-w-full' }
    ];

    maxWidthTestCases.forEach(({ maxWidth, expectedClass }) => {
      it(`should apply correct class for maxWidth="${maxWidth}"`, () => {
        render(
          <CenteredBox maxWidth={maxWidth}>
            <TestChild1 />
          </CenteredBox>
        );
        
        const container = screen.getByTestId('child-1').parentElement;
        expect(container).toHaveClass(expectedClass);
      });
    });

    it('should default to maxWidth="lg"', () => {
      render(
        <CenteredBox>
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('max-w-lg');
    });
  });

  describe('MaxWidth Prop - Custom Values', () => {
    it('should handle pixel values', () => {
      render(
        <CenteredBox maxWidth="500px">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '500px' });
    });

    it('should handle rem values', () => {
      render(
        <CenteredBox maxWidth="20rem">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '20rem' });
    });

    it('should handle percentage values', () => {
      render(
        <CenteredBox maxWidth="80%">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '80%' });
    });

    it('should handle numeric values as pixels', () => {
      render(
        <CenteredBox maxWidth="600">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '600px' });
    });

    it('should handle supported custom units (px, rem, %)', () => {
      const supportedCases = [
        { maxWidth: '400px', expected: '400px' },
        { maxWidth: '25rem', expected: '25rem' },
        { maxWidth: '80%', expected: '80%' }
      ];

      supportedCases.forEach(({ maxWidth, expected }) => {
        const { unmount } = render(
          <CenteredBox maxWidth={maxWidth}>
            <div data-testid={`test-${maxWidth.replace('%', 'percent')}`}>Test</div>
          </CenteredBox>
        );
        
        const container = screen.getByTestId(`test-${maxWidth.replace('%', 'percent')}`).parentElement;
        expect(container).toHaveStyle({ maxWidth: expected });
        
        unmount();
      });
    });

    it('should apply styles for all supported CSS units', () => {
      const supportedCases = [
        '10em', '50vw', '100vh', '5ch', '2ex', 
        '10vmin', '20vmax', '1in', '2.5cm', 
        '10mm', '12pt', '1pc'
      ];

      supportedCases.forEach(maxWidth => {
        const { unmount } = render(
          <CenteredBox maxWidth={maxWidth}>
            <div data-testid={`test-${maxWidth}`}>Test</div>
          </CenteredBox>
        );
        
        const container = screen.getByTestId(`test-${maxWidth}`).parentElement;
        expect(container).toHaveStyle({ maxWidth });
        
        unmount();
      });
    });

    it('should not apply styles for truly unsupported units', () => {
      const unsupportedCases = ['10xyz', 'invalidunit', '50badunit'];

      unsupportedCases.forEach(maxWidth => {
        const { unmount } = render(
          <CenteredBox maxWidth={maxWidth}>
            <div data-testid={`test-${maxWidth}`}>Test</div>
          </CenteredBox>
        );
        
        const container = screen.getByTestId(`test-${maxWidth}`).parentElement;
        expect(container).not.toHaveAttribute('style');
        
        unmount();
      });
    });

    it('should not apply styles for invalid custom values', () => {
      render(
        <CenteredBox maxWidth="invalid-value">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).not.toHaveAttribute('style');
    });
  });

  describe('Padding Prop', () => {
    const paddingTestCases = [
      { padding: 'xs' as const, expectedClass: 'p-2' },
      { padding: 'sm' as const, expectedClass: 'p-4' },
      { padding: 'md' as const, expectedClass: 'p-6' },
      { padding: 'lg' as const, expectedClass: 'p-8' },
      { padding: 'xl' as const, expectedClass: 'p-12' }
    ];

    paddingTestCases.forEach(({ padding, expectedClass }) => {
      it(`should apply correct class for padding="${padding}"`, () => {
        render(
          <CenteredBox padding={padding}>
            <TestChild1 />
          </CenteredBox>
        );
        
        const container = screen.getByTestId('child-1').parentElement;
        expect(container).toHaveClass(expectedClass);
      });
    });

    it('should default to padding="md"', () => {
      render(
        <CenteredBox>
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('p-6');
    });
  });

  describe('Combined Props', () => {
    it('should apply both standard maxWidth and padding classes', () => {
      render(
        <CenteredBox maxWidth="xl" padding="lg">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('mx-auto');
      expect(container).toHaveClass('max-w-xl');
      expect(container).toHaveClass('p-8');
    });

    it('should apply custom maxWidth with padding class', () => {
      render(
        <CenteredBox maxWidth="750px" padding="sm">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('mx-auto');
      expect(container).toHaveClass('p-4');
      expect(container).toHaveStyle({ maxWidth: '750px' });
    });

    it('should handle all props at minimum values', () => {
      render(
        <CenteredBox maxWidth="sm" padding="xs">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('mx-auto');
      expect(container).toHaveClass('max-w-sm');
      expect(container).toHaveClass('p-2');
    });

    it('should handle all props at maximum values', () => {
      render(
        <CenteredBox maxWidth="2xl" padding="xl">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('mx-auto');
      expect(container).toHaveClass('max-w-2xl');
      expect(container).toHaveClass('p-12');
    });
  });

  describe('Children Handling', () => {
    it('should render single child', () => {
      render(
        <CenteredBox>
          <div data-testid="single-child">Single Child</div>
        </CenteredBox>
      );
      
      expect(screen.getByTestId('single-child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <CenteredBox>
          <TestChild1 />
          <TestChild2 />
          <div data-testid="child-3">Child 3</div>
        </CenteredBox>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render different types of children', () => {
      render(
        <CenteredBox>
          <div data-testid="div-child">Div Child</div>
          <span data-testid="span-child">Span Child</span>
          <p data-testid="p-child">Paragraph Child</p>
          {'Text content'}
          {42}
        </CenteredBox>
      );
      
      expect(screen.getByTestId('div-child')).toBeInTheDocument();
      expect(screen.getByTestId('span-child')).toBeInTheDocument();
      expect(screen.getByTestId('p-child')).toBeInTheDocument();
      
      const container = screen.getByTestId('div-child').parentElement;
      expect(container?.textContent).toContain('Text content');
      expect(container?.textContent).toContain('42');
    });

    it('should maintain children order', () => {
      render(
        <CenteredBox>
          <div data-testid="first">First</div>
          <div data-testid="second">Second</div>
          <div data-testid="third">Third</div>
        </CenteredBox>
      );
      
      const container = screen.getByTestId('first').parentElement;
      const children = container?.children;
      
      expect(children?.[0]).toHaveAttribute('data-testid', 'first');
      expect(children?.[1]).toHaveAttribute('data-testid', 'second');
      expect(children?.[2]).toHaveAttribute('data-testid', 'third');
    });
  });

  describe('Style Application', () => {
    it('should not apply styles when using standard maxWidth', () => {
      render(
        <CenteredBox maxWidth="md">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('max-w-md');
      expect(container).not.toHaveAttribute('style');
    });

    it('should apply styles only for custom maxWidth', () => {
      render(
        <CenteredBox maxWidth="450px">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '450px' });
      expect(container).not.toHaveClass('max-w-md');
    });

    it('should handle empty style object correctly', () => {
      render(
        <CenteredBox maxWidth="lg">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).not.toHaveAttribute('style');
    });
  });

  describe('CSS Class Generation', () => {
    it('should not have extra spaces in className', () => {
      render(
        <CenteredBox maxWidth="md" padding="sm">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      const className = container?.className || '';
      
      // Should not have double spaces
      expect(className).not.toMatch(/  /);
      // Should not start or end with space
      expect(className).not.toMatch(/^ | $/);
    });

    it('should handle custom maxWidth without class pollution', () => {
      render(
        <CenteredBox maxWidth="600px" padding="md">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('mx-auto');
      expect(container).toHaveClass('p-6');
      
      // Should not have any max-w-* class
      const classes = container?.className.split(' ') || [];
      const hasMaxWClass = classes.some(cls => cls.startsWith('max-w-'));
      expect(hasMaxWClass).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      render(
        <CenteredBox>
          {null}
          {undefined}
          {false}
          {''}
        </CenteredBox>
      );
      
      const containers = document.querySelectorAll('.mx-auto');
      expect(containers).toHaveLength(1);
    });

    it('should handle zero as numeric maxWidth', () => {
      render(
        <CenteredBox maxWidth="0">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '0px' });
    });

    it('should handle decimal numeric values', () => {
      render(
        <CenteredBox maxWidth="123.5">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '123.5px' });
    });

    it('should handle negative numeric values', () => {
      render(
        <CenteredBox maxWidth="-100">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '-100px' });
    });

    it('should handle very large numeric values', () => {
      render(
        <CenteredBox maxWidth="999999">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveStyle({ maxWidth: '999999px' });
    });
  });

  describe('Accessibility', () => {
    it('should be a proper container element', () => {
      render(
        <CenteredBox>
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container?.tagName).toBe('DIV');
    });

    it('should not interfere with child accessibility', () => {
      render(
        <CenteredBox>
          <button aria-label="Test Button">Click me</button>
          <input aria-label="Test Input" />
          <h2 id="test-heading">Heading</h2>
        </CenteredBox>
      );
      
      expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Test Input' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should maintain focus order', () => {
      render(
        <CenteredBox>
          <button data-testid="button1">Button 1</button>
          <button data-testid="button2">Button 2</button>
          <input data-testid="input1" />
        </CenteredBox>
      );
      
      const button1 = screen.getByTestId('button1');
      const button2 = screen.getByTestId('button2');
      const input1 = screen.getByTestId('input1');
      
      expect(button1).toBeInTheDocument();
      expect(button2).toBeInTheDocument();
      expect(input1).toBeInTheDocument();
    });

    it('should not add any ARIA attributes that interfere with content', () => {
      render(
        <CenteredBox>
          <TestChild1 />
        </CenteredBox>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).not.toHaveAttribute('role');
      expect(container).not.toHaveAttribute('aria-label');
      expect(container).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('Component Integration', () => {
    it('should work well as a layout wrapper', () => {
      render(
        <CenteredBox maxWidth="xl" padding="lg">
          <div data-testid="header">Header Content</div>
          <div data-testid="main">Main Content</div>
          <div data-testid="footer">Footer Content</div>
        </CenteredBox>
      );
      
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('main')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      
      const container = screen.getByTestId('header').parentElement;
      expect(container).toHaveClass('mx-auto', 'max-w-xl', 'p-8');
    });

    it('should render consistently with same props', () => {
      const { rerender } = render(
        <CenteredBox maxWidth="lg" padding="md">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container1 = screen.getByTestId('child-1').parentElement;
      const classes1 = container1?.className;
      
      rerender(
        <CenteredBox maxWidth="lg" padding="md">
          <TestChild1 />
        </CenteredBox>
      );
      
      const container2 = screen.getByTestId('child-1').parentElement;
      expect(container2?.className).toBe(classes1);
    });

    it('should handle nested CenteredBox components', () => {
      render(
        <CenteredBox maxWidth="2xl" padding="xl">
          <CenteredBox maxWidth="md" padding="sm">
            <TestChild1 />
          </CenteredBox>
        </CenteredBox>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      
      // Both containers should be present
      const containers = document.querySelectorAll('.mx-auto');
      expect(containers).toHaveLength(2);
    });
  });
});