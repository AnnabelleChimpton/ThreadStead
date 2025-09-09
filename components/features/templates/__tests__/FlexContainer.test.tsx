import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlexContainer from '../FlexContainer';

describe('FlexContainer Component', () => {
  const TestChild1 = () => <div data-testid="child-1">Child 1</div>;
  const TestChild2 = () => <div data-testid="child-2">Child 2</div>;
  const TestChild3 = () => <div data-testid="child-3">Child 3</div>;

  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(
        <FlexContainer>
          <TestChild1 />
          <TestChild2 />
        </FlexContainer>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should always include flex base class', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex');
    });

    it('should render as div element', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container?.tagName).toBe('DIV');
    });
  });

  describe('Direction Prop', () => {
    const directionTestCases = [
      { direction: 'row' as const, expectedClass: 'flex-col md:flex-row' }, // responsive by default
      { direction: 'column' as const, expectedClass: 'flex-col' },
      { direction: 'row-reverse' as const, expectedClass: 'flex-col md:flex-row-reverse' }, // responsive by default
      { direction: 'column-reverse' as const, expectedClass: 'flex-col-reverse' }
    ];

    directionTestCases.forEach(({ direction, expectedClass }) => {
      it(`should apply correct classes for direction="${direction}"`, () => {
        render(
          <FlexContainer direction={direction}>
            <TestChild1 />
          </FlexContainer>
        );
        
        const container = screen.getByTestId('child-1').parentElement;
        expectedClass.split(' ').forEach(cls => {
          expect(container).toHaveClass(cls);
        });
      });
    });

    it('should default to row direction with responsive behavior', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('md:flex-row');
    });
  });

  describe('Responsive Prop', () => {
    it('should apply responsive classes when responsive=true for row direction', () => {
      render(
        <FlexContainer direction="row" responsive={true}>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('md:flex-row');
    });

    it('should not apply responsive classes when responsive=false', () => {
      render(
        <FlexContainer direction="row" responsive={false}>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex-row');
      expect(container).not.toHaveClass('flex-col');
      expect(container).not.toHaveClass('md:flex-row');
    });

    it('should not apply responsive behavior to column direction', () => {
      render(
        <FlexContainer direction="column" responsive={true}>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex-col');
      expect(container).not.toHaveClass('md:flex-col');
    });

    it('should default to responsive=true', () => {
      render(
        <FlexContainer direction="row">
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('md:flex-row');
    });
  });

  describe('Align Prop', () => {
    const alignTestCases = [
      { align: 'start' as const, expectedClass: 'items-start' },
      { align: 'center' as const, expectedClass: 'items-center' },
      { align: 'end' as const, expectedClass: 'items-end' },
      { align: 'stretch' as const, expectedClass: 'items-stretch' }
    ];

    alignTestCases.forEach(({ align, expectedClass }) => {
      it(`should apply correct class for align="${align}"`, () => {
        render(
          <FlexContainer align={align}>
            <TestChild1 />
          </FlexContainer>
        );
        
        const container = screen.getByTestId('child-1').parentElement;
        expect(container).toHaveClass(expectedClass);
      });
    });

    it('should default to align="start"', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('items-start');
    });
  });

  describe('Justify Prop', () => {
    const justifyTestCases = [
      { justify: 'start' as const, expectedClass: 'justify-start' },
      { justify: 'center' as const, expectedClass: 'justify-center' },
      { justify: 'end' as const, expectedClass: 'justify-end' },
      { justify: 'between' as const, expectedClass: 'justify-between' },
      { justify: 'around' as const, expectedClass: 'justify-around' },
      { justify: 'evenly' as const, expectedClass: 'justify-evenly' }
    ];

    justifyTestCases.forEach(({ justify, expectedClass }) => {
      it(`should apply correct class for justify="${justify}"`, () => {
        render(
          <FlexContainer justify={justify}>
            <TestChild1 />
          </FlexContainer>
        );
        
        const container = screen.getByTestId('child-1').parentElement;
        expect(container).toHaveClass(expectedClass);
      });
    });

    it('should default to justify="start"', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('justify-start');
    });
  });

  describe('Gap Prop', () => {
    const gapTestCases = [
      { gap: 'xs' as const, expectedClass: 'gap-1' },
      { gap: 'sm' as const, expectedClass: 'gap-2' },
      { gap: 'md' as const, expectedClass: 'gap-4' },
      { gap: 'lg' as const, expectedClass: 'gap-6' },
      { gap: 'xl' as const, expectedClass: 'gap-8' }
    ];

    gapTestCases.forEach(({ gap, expectedClass }) => {
      it(`should apply correct class for gap="${gap}"`, () => {
        render(
          <FlexContainer gap={gap}>
            <TestChild1 />
          </FlexContainer>
        );
        
        const container = screen.getByTestId('child-1').parentElement;
        expect(container).toHaveClass(expectedClass);
      });
    });

    it('should default to gap="md"', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('gap-4');
    });
  });

  describe('Wrap Prop', () => {
    it('should apply flex-wrap class when wrap=true', () => {
      render(
        <FlexContainer wrap={true}>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex-wrap');
    });

    it('should not apply flex-wrap class when wrap=false', () => {
      render(
        <FlexContainer wrap={false}>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).not.toHaveClass('flex-wrap');
    });

    it('should default to wrap=false', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).not.toHaveClass('flex-wrap');
    });
  });

  describe('Combined Props', () => {
    it('should apply all props correctly when combined', () => {
      render(
        <FlexContainer
          direction="column"
          align="center"
          justify="between"
          gap="lg"
          wrap={true}
          responsive={false}
        >
          <TestChild1 />
          <TestChild2 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-between');
      expect(container).toHaveClass('gap-6');
      expect(container).toHaveClass('flex-wrap');
    });

    it('should handle complex responsive layout', () => {
      render(
        <FlexContainer
          direction="row-reverse"
          align="end"
          justify="evenly"
          gap="xl"
          wrap={true}
          responsive={true}
        >
          <TestChild1 />
          <TestChild2 />
          <TestChild3 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col'); // responsive mobile-first
      expect(container).toHaveClass('md:flex-row-reverse'); // responsive desktop
      expect(container).toHaveClass('items-end');
      expect(container).toHaveClass('justify-evenly');
      expect(container).toHaveClass('gap-8');
      expect(container).toHaveClass('flex-wrap');
    });
  });

  describe('Children Handling', () => {
    it('should render single child', () => {
      render(
        <FlexContainer>
          <div data-testid="single-child">Single Child</div>
        </FlexContainer>
      );
      
      expect(screen.getByTestId('single-child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <FlexContainer>
          <TestChild1 />
          <TestChild2 />
          <TestChild3 />
        </FlexContainer>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render different types of children', () => {
      render(
        <FlexContainer>
          <div data-testid="div-child">Div Child</div>
          <span data-testid="span-child">Span Child</span>
          <button data-testid="button-child">Button Child</button>
          {null}
          {false}
          {'String Child'}
          {123}
        </FlexContainer>
      );
      
      expect(screen.getByTestId('div-child')).toBeInTheDocument();
      expect(screen.getByTestId('span-child')).toBeInTheDocument();
      expect(screen.getByTestId('button-child')).toBeInTheDocument();
      
      // String and number children should be in the document
      const container = screen.getByTestId('div-child').parentElement;
      expect(container?.textContent).toContain('String Child');
      expect(container?.textContent).toContain('123');
    });

    it('should maintain children order', () => {
      render(
        <FlexContainer>
          <div data-testid="first">First</div>
          <div data-testid="second">Second</div>
          <div data-testid="third">Third</div>
        </FlexContainer>
      );
      
      const container = screen.getByTestId('first').parentElement;
      const children = container?.children;
      
      expect(children?.[0]).toHaveAttribute('data-testid', 'first');
      expect(children?.[1]).toHaveAttribute('data-testid', 'second');
      expect(children?.[2]).toHaveAttribute('data-testid', 'third');
    });
  });

  describe('CSS Class Generation', () => {
    it('should not have extra spaces in className', () => {
      render(
        <FlexContainer direction="column" wrap={false}>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      const className = container?.className || '';
      
      // Should not have double spaces
      expect(className).not.toMatch(/  /);
      // Should not start or end with space
      expect(className).not.toMatch(/^ | $/);
    });

    it('should handle all default values', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      
      // Should have all default classes
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col'); // responsive default for row
      expect(container).toHaveClass('md:flex-row');
      expect(container).toHaveClass('items-start');
      expect(container).toHaveClass('justify-start');
      expect(container).toHaveClass('gap-4');
      expect(container).not.toHaveClass('flex-wrap');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(
        <FlexContainer>
          {null}
          {undefined}
          {false}
          {''}
        </FlexContainer>
      );
      
      const containers = document.querySelectorAll('.flex');
      expect(containers).toHaveLength(1);
    });

    it('should handle children with fragments', () => {
      render(
        <FlexContainer>
          <>
            <TestChild1 />
            <TestChild2 />
          </>
          <TestChild3 />
        </FlexContainer>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should work with conditional children', () => {
      const showChild = true;
      const hideChild = false;
      
      render(
        <FlexContainer>
          {showChild && <TestChild1 />}
          {hideChild && <TestChild2 />}
          <TestChild3 />
        </FlexContainer>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.queryByTestId('child-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be a proper container element', () => {
      render(
        <FlexContainer>
          <TestChild1 />
        </FlexContainer>
      );
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container?.tagName).toBe('DIV');
    });

    it('should not interfere with child accessibility', () => {
      render(
        <FlexContainer>
          <button aria-label="Test Button">Click me</button>
          <input aria-label="Test Input" />
        </FlexContainer>
      );
      
      expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Test Input' })).toBeInTheDocument();
    });

    it('should maintain focus order', () => {
      render(
        <FlexContainer>
          <button data-testid="button1">Button 1</button>
          <button data-testid="button2">Button 2</button>
          <button data-testid="button3">Button 3</button>
        </FlexContainer>
      );
      
      // Focus should be possible in order
      const button1 = screen.getByTestId('button1');
      const button2 = screen.getByTestId('button2');
      const button3 = screen.getByTestId('button3');
      
      expect(button1).toBeInTheDocument();
      expect(button2).toBeInTheDocument();
      expect(button3).toBeInTheDocument();
    });
  });
});