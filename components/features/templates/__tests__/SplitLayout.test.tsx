import React from 'react';
import { screen } from '@testing-library/react';
import SplitLayout from '../SplitLayout';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

describe('SplitLayout Component', () => {
  const testChildren = (
    <>
      <div data-testid="first-child">First Content</div>
      <div data-testid="second-child">Second Content</div>
    </>
  );

  const testChildrenArray = [
    <div key="1" data-testid="first-child">First Content</div>,
    <div key="2" data-testid="second-child">Second Content</div>,
    <div key="3" data-testid="third-child">Third Content (ignored)</div>
  ];

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      renderWithTemplateContext(<SplitLayout>{testChildren}</SplitLayout>);

      expect(screen.getByTestId('first-child')).toBeInTheDocument();
      expect(screen.getByTestId('second-child')).toBeInTheDocument();
    });

    it('should render only the first two children when more are provided', () => {
      const { container } = renderWithTemplateContext(<SplitLayout>{testChildrenArray}</SplitLayout>);

      expect(screen.getByTestId('first-child')).toBeInTheDocument();
      expect(screen.getByTestId('second-child')).toBeInTheDocument();
      
      // Check that only 2 wrapper divs exist (should be the direct children of the layout div)
      const layoutDiv = container.firstChild as HTMLElement;
      const wrapperDivs = layoutDiv.children;
      expect(wrapperDivs).toHaveLength(2); // Should only have 2 wrapper divs for the 2 children
      
      // Check the third child is not in the DOM at all
      expect(screen.queryByTestId('third-child')).not.toBeInTheDocument();
    });

    it('should handle single child gracefully', () => {
      renderWithTemplateContext(
        <SplitLayout>
          <div data-testid="only-child">Only Content</div>
        </SplitLayout>
      );

      expect(screen.getByTestId('only-child')).toBeInTheDocument();
    });

    it('should handle no children', () => {
      const { container } = renderWithTemplateContext(<SplitLayout></SplitLayout>);

      // Should render the container but with empty child divs
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Layout Direction', () => {
    it('should use flex-col by default (mobile-first)', () => {
      const { container } = renderWithTemplateContext(<SplitLayout>{testChildren}</SplitLayout>);

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('flex-col');
    });

    it('should add responsive row layout when responsive is true (default)', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout responsive={true}>{testChildren}</SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('lg:flex-row');
    });

    it('should use flex-row when vertical=false and responsive=false', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout vertical={false} responsive={false}>{testChildren}</SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('flex-row');
      expect(layoutDiv).not.toHaveClass('flex-col');
    });

    it('should keep flex-col when vertical=true and responsive=false', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout vertical={true} responsive={false}>{testChildren}</SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('flex-col');
      expect(layoutDiv).not.toHaveClass('flex-row');
    });
  });

  describe('Gap Spacing', () => {
    const gapTests = [
      { gap: 'xs' as const, expectedClass: 'gap-1' },
      { gap: 'sm' as const, expectedClass: 'gap-2' },
      { gap: 'md' as const, expectedClass: 'gap-4' },
      { gap: 'lg' as const, expectedClass: 'gap-6' },
      { gap: 'xl' as const, expectedClass: 'gap-8' },
    ];

    gapTests.forEach(({ gap, expectedClass }) => {
      it(`should apply ${expectedClass} for gap="${gap}"`, () => {
        const { container } = renderWithTemplateContext(
          <SplitLayout gap={gap}>{testChildren}</SplitLayout>
        );

        const layoutDiv = container.firstChild as HTMLElement;
        expect(layoutDiv).toHaveClass(expectedClass);
      });
    });

    it('should use gap-4 by default (md)', () => {
      const { container } = renderWithTemplateContext(<SplitLayout>{testChildren}</SplitLayout>);

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('gap-4');
    });
  });

  describe('Ratio Handling', () => {
    describe('1:1 Ratio (default)', () => {
      it('should apply equal widths for 1:1 ratio', () => {
        const { container } = renderWithTemplateContext(
          <SplitLayout ratio="1:1">{testChildren}</SplitLayout>
        );

        const layoutDiv = container.firstChild as HTMLElement;
        const firstWrapper = layoutDiv.children[0] as HTMLElement;
        const secondWrapper = layoutDiv.children[1] as HTMLElement;

        expect(firstWrapper).toHaveClass('w-full', 'lg:w-1/2');
        expect(secondWrapper).toHaveClass('w-full', 'lg:w-1/2');
      });

      it('should use 1:1 ratio by default', () => {
        const { container } = renderWithTemplateContext(<SplitLayout>{testChildren}</SplitLayout>);

        const layoutDiv = container.firstChild as HTMLElement;
        const firstWrapper = layoutDiv.children[0] as HTMLElement;
        const secondWrapper = layoutDiv.children[1] as HTMLElement;

        expect(firstWrapper).toHaveClass('w-full', 'lg:w-1/2');
        expect(secondWrapper).toHaveClass('w-full', 'lg:w-1/2');
      });
    });

    describe('1:2 Ratio', () => {
      it('should apply 1:2 width ratio', () => {
        const { container } = renderWithTemplateContext(
          <SplitLayout ratio="1:2">{testChildren}</SplitLayout>
        );

        // Get the wrapper divs in order
        const layoutDiv = container.firstChild as HTMLElement;
        const firstWrapper = layoutDiv.children[0] as HTMLElement; // First wrapper div
        const secondWrapper = layoutDiv.children[1] as HTMLElement; // Second wrapper div

        expect(firstWrapper).toHaveClass('w-full', 'lg:w-1/3'); // 1 part
        expect(secondWrapper).toHaveClass('w-full', 'lg:w-2/3'); // 2 parts
      });
    });

    describe('2:1 Ratio', () => {
      it('should apply 2:1 width ratio', () => {
        const { container } = renderWithTemplateContext(
          <SplitLayout ratio="2:1">{testChildren}</SplitLayout>
        );

        const layoutDiv = container.firstChild as HTMLElement;
        const firstWrapper = layoutDiv.children[0] as HTMLElement;
        const secondWrapper = layoutDiv.children[1] as HTMLElement;

        expect(firstWrapper).toHaveClass('w-full', 'lg:w-2/3');
        expect(secondWrapper).toHaveClass('w-full', 'lg:w-1/3');
      });
    });

    describe('1:3 Ratio', () => {
      it('should apply 1:3 width ratio', () => {
        const { container } = renderWithTemplateContext(
          <SplitLayout ratio="1:3">{testChildren}</SplitLayout>
        );

        const layoutDiv = container.firstChild as HTMLElement;
        const firstWrapper = layoutDiv.children[0] as HTMLElement;
        const secondWrapper = layoutDiv.children[1] as HTMLElement;

        expect(firstWrapper).toHaveClass('w-full', 'lg:w-1/4');
        expect(secondWrapper).toHaveClass('w-full', 'lg:w-3/4');
      });
    });

    describe('3:1 Ratio', () => {
      it('should apply 3:1 width ratio', () => {
        const { container } = renderWithTemplateContext(
          <SplitLayout ratio="3:1">{testChildren}</SplitLayout>
        );

        const layoutDiv = container.firstChild as HTMLElement;
        const firstWrapper = layoutDiv.children[0] as HTMLElement;
        const secondWrapper = layoutDiv.children[1] as HTMLElement;

        expect(firstWrapper).toHaveClass('w-full', 'lg:w-3/4');
        expect(secondWrapper).toHaveClass('w-full', 'lg:w-1/4');
      });
    });
  });

  describe('Vertical Layout Handling', () => {
    it('should use full width for both children when vertical=true', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout vertical={true} ratio="1:2">{testChildren}</SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      const firstWrapper = layoutDiv.children[0] as HTMLElement;
      const secondWrapper = layoutDiv.children[1] as HTMLElement;

      expect(firstWrapper).toHaveClass('w-full');
      expect(secondWrapper).toHaveClass('w-full');
      // Should not have lg: responsive width classes when vertical
      expect(firstWrapper).not.toHaveClass('lg:w-1/3');
      expect(secondWrapper).not.toHaveClass('lg:w-2/3');
    });

    it('should ignore ratio prop when vertical=true', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout vertical={true} ratio="3:1">{testChildren}</SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      const firstWrapper = layoutDiv.children[0] as HTMLElement;
      const secondWrapper = layoutDiv.children[1] as HTMLElement;

      expect(firstWrapper).toHaveClass('w-full');
      expect(secondWrapper).toHaveClass('w-full');
      expect(firstWrapper).not.toHaveClass('lg:w-3/4');
      expect(secondWrapper).not.toHaveClass('lg:w-1/4');
    });
  });

  describe('Responsive vs Non-Responsive', () => {
    it('should add responsive classes when responsive=true (default)', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout responsive={true}>{testChildren}</SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('flex-col', 'lg:flex-row');
    });

    it('should not add responsive classes when responsive=false', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout responsive={false} vertical={false}>{testChildren}</SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('flex-row');
      expect(layoutDiv).not.toHaveClass('lg:flex-row');
      expect(layoutDiv).not.toHaveClass('flex-col');
    });
  });

  describe('CSS Class Structure', () => {
    it('should have correct base classes', () => {
      const { container } = renderWithTemplateContext(<SplitLayout>{testChildren}</SplitLayout>);

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('w-full', 'flex');
    });

    it('should combine all classes correctly', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout gap="lg" ratio="2:1" vertical={false} responsive={true}>
          {testChildren}
        </SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      expect(layoutDiv).toHaveClass('w-full', 'flex', 'flex-col', 'lg:flex-row', 'gap-6');
    });
  });

  describe('Edge Cases', () => {
    it('should handle React fragments as children', () => {
      renderWithTemplateContext(
        <SplitLayout>
          <React.Fragment>
            <div data-testid="fragment-child-1">Fragment Child 1</div>
            <div data-testid="fragment-child-2">Fragment Child 2</div>
          </React.Fragment>
        </SplitLayout>
      );

      // React.Children.toArray should flatten fragments
      expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
    });

    it('should handle string children', () => {
      renderWithTemplateContext(
        <SplitLayout>
          First text
          Second text
        </SplitLayout>
      );

      // String children get concatenated by React.Children.toArray
      // So both strings end up in the first wrapper div
      expect(screen.getByText('First text Second text')).toBeInTheDocument();
    });

    it('should handle mixed child types', () => {
      renderWithTemplateContext(
        <SplitLayout>
          <div data-testid="div-child">Div Child</div>
          Mixed string content
        </SplitLayout>
      );

      expect(screen.getByTestId('div-child')).toBeInTheDocument();
      expect(screen.getByText('Mixed string content')).toBeInTheDocument();
    });

    it('should handle null/undefined children gracefully', () => {
      renderWithTemplateContext(
        <SplitLayout>
          <div data-testid="valid-child">Valid Child</div>
          {null}
          {undefined}
          <div data-testid="another-valid-child">Another Valid Child</div>
        </SplitLayout>
      );

      expect(screen.getByTestId('valid-child')).toBeInTheDocument();
      expect(screen.getByTestId('another-valid-child')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    describe('Ratio Prop', () => {
      const validRatios = ['1:1', '1:2', '2:1', '1:3', '3:1'] as const;
      
      validRatios.forEach(ratio => {
        it(`should accept ratio="${ratio}"`, () => {
          renderWithTemplateContext(<SplitLayout ratio={ratio}>{testChildren}</SplitLayout>);
          expect(screen.getByTestId('first-child')).toBeInTheDocument();
          expect(screen.getByTestId('second-child')).toBeInTheDocument();
        });
      });
    });

    describe('Gap Prop', () => {
      const validGaps = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
      
      validGaps.forEach(gap => {
        it(`should accept gap="${gap}"`, () => {
          renderWithTemplateContext(<SplitLayout gap={gap}>{testChildren}</SplitLayout>);
          expect(screen.getByTestId('first-child')).toBeInTheDocument();
          expect(screen.getByTestId('second-child')).toBeInTheDocument();
        });
      });
    });

    describe('Boolean Props', () => {
      it('should accept vertical=true', () => {
        renderWithTemplateContext(<SplitLayout vertical={true}>{testChildren}</SplitLayout>);
        expect(screen.getByTestId('first-child')).toBeInTheDocument();
        expect(screen.getByTestId('second-child')).toBeInTheDocument();
      });

      it('should accept vertical=false', () => {
        renderWithTemplateContext(<SplitLayout vertical={false}>{testChildren}</SplitLayout>);
        expect(screen.getByTestId('first-child')).toBeInTheDocument();
        expect(screen.getByTestId('second-child')).toBeInTheDocument();
      });

      it('should accept responsive=true', () => {
        renderWithTemplateContext(<SplitLayout responsive={true}>{testChildren}</SplitLayout>);
        expect(screen.getByTestId('first-child')).toBeInTheDocument();
        expect(screen.getByTestId('second-child')).toBeInTheDocument();
      });

      it('should accept responsive=false', () => {
        renderWithTemplateContext(<SplitLayout responsive={false}>{testChildren}</SplitLayout>);
        expect(screen.getByTestId('first-child')).toBeInTheDocument();
        expect(screen.getByTestId('second-child')).toBeInTheDocument();
      });
    });
  });

  describe('Default Props', () => {
    it('should use correct default values', () => {
      const { container } = renderWithTemplateContext(<SplitLayout>{testChildren}</SplitLayout>);

      const layoutDiv = container.firstChild as HTMLElement;
      const firstWrapper = layoutDiv.children[0] as HTMLElement;
      const secondWrapper = layoutDiv.children[1] as HTMLElement;

      // Default ratio: 1:1
      expect(firstWrapper).toHaveClass('lg:w-1/2');
      expect(secondWrapper).toHaveClass('lg:w-1/2');

      // Default vertical: false (responsive horizontal)
      expect(layoutDiv).toHaveClass('lg:flex-row');

      // Default gap: md
      expect(layoutDiv).toHaveClass('gap-4');

      // Default responsive: true
      expect(layoutDiv).toHaveClass('flex-col', 'lg:flex-row');
    });
  });

  describe('Complex Combinations', () => {
    it('should handle all props together correctly', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout ratio="2:1" vertical={false} gap="xl" responsive={false}>
          {testChildren}
        </SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      const firstWrapper = layoutDiv.children[0] as HTMLElement;
      const secondWrapper = layoutDiv.children[1] as HTMLElement;

      // Should be horizontal (flex-row) without responsive classes
      expect(layoutDiv).toHaveClass('flex-row');
      expect(layoutDiv).not.toHaveClass('lg:flex-row');

      // Should have xl gap
      expect(layoutDiv).toHaveClass('gap-8');

      // Should have 2:1 ratio - component still uses lg: classes even when non-responsive
      expect(firstWrapper).toHaveClass('w-full', 'lg:w-2/3');
      expect(secondWrapper).toHaveClass('w-full', 'lg:w-1/3');
    });

    it('should override responsive when vertical is true', () => {
      const { container } = renderWithTemplateContext(
        <SplitLayout ratio="3:1" vertical={true} responsive={false}>
          {testChildren}
        </SplitLayout>
      );

      const layoutDiv = container.firstChild as HTMLElement;
      const firstWrapper = layoutDiv.children[0] as HTMLElement;
      const secondWrapper = layoutDiv.children[1] as HTMLElement;

      // Should be vertical (flex-col)
      expect(layoutDiv).toHaveClass('flex-col');

      // Should ignore ratio and use full width
      expect(firstWrapper).toHaveClass('w-full');
      expect(secondWrapper).toHaveClass('w-full');
      expect(firstWrapper).not.toHaveClass('lg:w-3/4');
      expect(secondWrapper).not.toHaveClass('lg:w-1/4');
    });
  });

  describe('Accessibility', () => {
    it('should maintain proper document structure', () => {
      renderWithTemplateContext(
        <SplitLayout>
          <div role="main" data-testid="main-content">Main Content</div>
          <div role="complementary" data-testid="sidebar">Sidebar</div>
        </SplitLayout>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('should preserve child accessibility attributes', () => {
      renderWithTemplateContext(
        <SplitLayout>
          <button aria-label="Primary Action" data-testid="button1">Click me</button>
          <button aria-label="Secondary Action" data-testid="button2">Or me</button>
        </SplitLayout>
      );

      expect(screen.getByLabelText('Primary Action')).toBeInTheDocument();
      expect(screen.getByLabelText('Secondary Action')).toBeInTheDocument();
    });
  });
});