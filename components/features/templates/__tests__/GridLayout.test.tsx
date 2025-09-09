import React from 'react';
import { screen } from '@testing-library/react';
import GridLayout from '../GridLayout';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Test child components
const TestChild: React.FC<{ testId?: string; text?: string }> = ({ 
  testId = 'test-child',
  text = 'Test content'
}) => (
  <div data-testid={testId}>{text}</div>
);

describe('GridLayout Component', () => {
  describe('Basic Functionality', () => {
    it('should render children in a grid container', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <TestChild testId="child-1" text="Child 1" />
          <TestChild testId="child-2" text="Child 2" />
          <TestChild testId="child-3" text="Child 3" />
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
      
      const container = screen.getByTestId('child-1').parentElement;
      expect(container).toHaveClass('grid');
    });

    it('should apply default grid classes', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <TestChild testId="default-test" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('default-test').parentElement;
      expect(container).toHaveClass('grid');
      expect(container).toHaveClass('grid-cols-1'); // Default responsive for 2 columns
      expect(container).toHaveClass('sm:grid-cols-2'); // Default responsive for 2 columns
      expect(container).toHaveClass('gap-4'); // Default md gap
    });
  });

  describe('Columns Prop', () => {
    const columnTests = [
      { columns: 1 as const, nonResponsive: 'grid-cols-1', responsive: 'grid-cols-1' },
      { columns: 2 as const, nonResponsive: 'grid-cols-2', responsive: 'grid-cols-1 sm:grid-cols-2' },
      { columns: 3 as const, nonResponsive: 'grid-cols-3', responsive: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' },
      { columns: 4 as const, nonResponsive: 'grid-cols-4', responsive: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' },
      { columns: 5 as const, nonResponsive: 'grid-cols-5', responsive: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5' },
      { columns: 6 as const, nonResponsive: 'grid-cols-6', responsive: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6' }
    ];

    columnTests.forEach(({ columns, nonResponsive, responsive }) => {
      it(`should apply correct classes for ${columns} columns when responsive=false`, () => {
        const mockData = createMockResidentData();

        renderWithTemplateContext(
          <GridLayout columns={columns} responsive={false}>
            <TestChild testId={`test-${columns}-col`} />
          </GridLayout>,
          { residentData: mockData }
        );

        const container = screen.getByTestId(`test-${columns}-col`).parentElement;
        expect(container).toHaveClass('grid');
        expect(container).toHaveClass(nonResponsive);
        
        // Should not have responsive classes
        expect(container).not.toHaveClass('sm:grid-cols-2');
        expect(container).not.toHaveClass('md:grid-cols-3');
        expect(container).not.toHaveClass('lg:grid-cols-4');
        expect(container).not.toHaveClass('lg:grid-cols-5');
        expect(container).not.toHaveClass('lg:grid-cols-6');
      });

      it(`should apply correct responsive classes for ${columns} columns when responsive=true`, () => {
        const mockData = createMockResidentData();

        renderWithTemplateContext(
          <GridLayout columns={columns} responsive={true}>
            <TestChild testId={`test-${columns}-responsive`} />
          </GridLayout>,
          { residentData: mockData }
        );

        const container = screen.getByTestId(`test-${columns}-responsive`).parentElement;
        expect(container).toHaveClass('grid');
        
        // Check each expected class from the responsive string
        responsive.split(' ').forEach(className => {
          expect(container).toHaveClass(className);
        });
      });
    });

    it('should default to 2 columns when no columns prop provided', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout responsive={false}>
          <TestChild testId="default-columns" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('default-columns').parentElement;
      expect(container).toHaveClass('grid-cols-2');
    });
  });

  describe('Gap Prop', () => {
    const gapTests = [
      { gap: 'xs' as const, expectedClass: 'gap-1' },
      { gap: 'sm' as const, expectedClass: 'gap-2' },
      { gap: 'md' as const, expectedClass: 'gap-4' },
      { gap: 'lg' as const, expectedClass: 'gap-6' },
      { gap: 'xl' as const, expectedClass: 'gap-8' }
    ];

    gapTests.forEach(({ gap, expectedClass }) => {
      it(`should apply correct gap class for gap="${gap}"`, () => {
        const mockData = createMockResidentData();

        renderWithTemplateContext(
          <GridLayout gap={gap}>
            <TestChild testId={`test-gap-${gap}`} />
          </GridLayout>,
          { residentData: mockData }
        );

        const container = screen.getByTestId(`test-gap-${gap}`).parentElement;
        expect(container).toHaveClass(expectedClass);
      });
    });

    it('should default to medium gap when no gap prop provided', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <TestChild testId="default-gap" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('default-gap').parentElement;
      expect(container).toHaveClass('gap-4'); // md gap
    });
  });

  describe('Responsive Prop', () => {
    it('should apply responsive classes by default', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={3}>
          <TestChild testId="responsive-default" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('responsive-default').parentElement;
      expect(container).toHaveClass('grid-cols-1');
      expect(container).toHaveClass('sm:grid-cols-2');
      expect(container).toHaveClass('md:grid-cols-3');
    });

    it('should apply responsive classes when responsive=true', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={4} responsive={true}>
          <TestChild testId="responsive-true" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('responsive-true').parentElement;
      expect(container).toHaveClass('grid-cols-1');
      expect(container).toHaveClass('sm:grid-cols-2');
      expect(container).toHaveClass('lg:grid-cols-4');
    });

    it('should not apply responsive classes when responsive=false', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={3} responsive={false}>
          <TestChild testId="responsive-false" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('responsive-false').parentElement;
      expect(container).toHaveClass('grid-cols-3');
      expect(container).not.toHaveClass('sm:grid-cols-2');
      expect(container).not.toHaveClass('md:grid-cols-3');
    });
  });

  describe('Combined Props', () => {
    it('should handle all props together', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={5} gap="xl" responsive={true}>
          <TestChild testId="combined-props" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('combined-props').parentElement;
      expect(container).toHaveClass('grid');
      expect(container).toHaveClass('gap-8'); // xl gap
      expect(container).toHaveClass('grid-cols-1'); // responsive
      expect(container).toHaveClass('sm:grid-cols-2'); // responsive
      expect(container).toHaveClass('md:grid-cols-3'); // responsive
      expect(container).toHaveClass('lg:grid-cols-5'); // responsive
    });

    it('should handle minimal props', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={1} gap="xs" responsive={false}>
          <TestChild testId="minimal-props" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('minimal-props').parentElement;
      expect(container).toHaveClass('grid');
      expect(container).toHaveClass('grid-cols-1');
      expect(container).toHaveClass('gap-1');
      expect(container).not.toHaveClass('sm:grid-cols-2');
    });
  });

  describe('Children Handling', () => {
    it('should render single child', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <TestChild testId="single-child" text="Only child" />
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Only child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <TestChild testId="child-1" text="Child 1" />
          <TestChild testId="child-2" text="Child 2" />
          <TestChild testId="child-3" text="Child 3" />
          <TestChild testId="child-4" text="Child 4" />
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
      expect(screen.getByText('Child 4')).toBeInTheDocument();
    });

    it('should render different types of children', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <div data-testid="div-child">Div child</div>
          <span data-testid="span-child">Span child</span>
          <p data-testid="p-child">Paragraph child</p>
          Text node child
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByTestId('div-child')).toBeInTheDocument();
      expect(screen.getByTestId('span-child')).toBeInTheDocument();
      expect(screen.getByTestId('p-child')).toBeInTheDocument();
      expect(screen.getByText('Text node child')).toBeInTheDocument();
    });

    it('should maintain children order', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <TestChild testId="first" text="First" />
          <TestChild testId="second" text="Second" />
          <TestChild testId="third" text="Third" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('first').parentElement;
      const children = Array.from(container!.children);
      
      expect(children[0]).toHaveAttribute('data-testid', 'first');
      expect(children[1]).toHaveAttribute('data-testid', 'second');
      expect(children[2]).toHaveAttribute('data-testid', 'third');
    });

    it('should handle empty children gracefully', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <GridLayout data-testid="empty-grid">
          {[]}
        </GridLayout>,
        { residentData: mockData }
      );

      // Should render empty grid without error
      const gridElement = container.querySelector('.grid');
      expect(gridElement).toBeInTheDocument();
      expect(gridElement).toHaveClass('grid');
    });
  });

  describe('CSS Classes and Structure', () => {
    it('should always include grid base class', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={1} gap="xs" responsive={false}>
          <TestChild testId="structure-test" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('structure-test').parentElement;
      expect(container).toHaveClass('grid');
    });

    it('should not have extra classes beyond expected ones', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={2} gap="md" responsive={false}>
          <TestChild testId="class-check" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('class-check').parentElement;
      const classList = Array.from(container!.classList);
      
      expect(classList).toEqual(
        expect.arrayContaining(['grid', 'grid-cols-2', 'gap-4'])
      );
    });

    it('should properly combine responsive classes', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={6} responsive={true}>
          <TestChild testId="responsive-combine" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('responsive-combine').parentElement;
      expect(container).toHaveClass('grid');
      expect(container).toHaveClass('grid-cols-1');
      expect(container).toHaveClass('sm:grid-cols-2');
      expect(container).toHaveClass('md:grid-cols-3');
      expect(container).toHaveClass('lg:grid-cols-6');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          {null}
          <TestChild testId="valid-child" text="Valid child" />
          {undefined}
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Valid child')).toBeInTheDocument();
    });

    it('should handle conditional children', () => {
      const mockData = createMockResidentData();
      const showChild = true;

      renderWithTemplateContext(
        <GridLayout>
          {showChild && <TestChild testId="conditional" text="Conditional child" />}
          <TestChild testId="always" text="Always shown" />
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Conditional child')).toBeInTheDocument();
      expect(screen.getByText('Always shown')).toBeInTheDocument();
    });

    it('should handle fragments as children', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <>
            <TestChild testId="fragment-1" text="Fragment child 1" />
            <TestChild testId="fragment-2" text="Fragment child 2" />
          </>
          <TestChild testId="direct" text="Direct child" />
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Fragment child 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment child 2')).toBeInTheDocument();
      expect(screen.getByText('Direct child')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be a proper container element', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <TestChild testId="accessibility-test" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container = screen.getByTestId('accessibility-test').parentElement;
      expect(container).toBeInstanceOf(HTMLDivElement);
    });

    it('should not interfere with child accessibility', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <button data-testid="accessible-button">Click me</button>
          <input data-testid="accessible-input" aria-label="Test input" />
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByLabelText('Test input')).toBeInTheDocument();
    });

    it('should maintain focus order', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout>
          <button data-testid="button-1">Button 1</button>
          <button data-testid="button-2">Button 2</button>
          <button data-testid="button-3">Button 3</button>
        </GridLayout>,
        { residentData: mockData }
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('Button 1');
      expect(buttons[1]).toHaveTextContent('Button 2');
      expect(buttons[2]).toHaveTextContent('Button 3');
    });
  });

  describe('Integration and Layout', () => {
    it('should work as a layout wrapper', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={3} gap="lg">
          <div data-testid="card-1" className="bg-white p-4">Card 1</div>
          <div data-testid="card-2" className="bg-white p-4">Card 2</div>
          <div data-testid="card-3" className="bg-white p-4">Card 3</div>
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByTestId('card-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-2')).toBeInTheDocument();
      expect(screen.getByTestId('card-3')).toBeInTheDocument();
      
      const container = screen.getByTestId('card-1').parentElement;
      expect(container).toHaveClass('gap-6'); // lg gap
    });

    it('should render consistently with same props', () => {
      const mockData = createMockResidentData();

      const { rerender } = renderWithTemplateContext(
        <GridLayout columns={4} gap="sm" responsive={true}>
          <TestChild testId="consistency-test" />
        </GridLayout>,
        { residentData: mockData }
      );

      const container1 = screen.getByTestId('consistency-test').parentElement;
      const classes1 = Array.from(container1!.classList).sort();

      rerender(
        <GridLayout columns={4} gap="sm" responsive={true}>
          <TestChild testId="consistency-test" />
        </GridLayout>
      );

      const container2 = screen.getByTestId('consistency-test').parentElement;
      const classes2 = Array.from(container2!.classList).sort();

      expect(classes1).toEqual(classes2);
    });

    it('should handle nested GridLayout components', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={2} gap="md">
          <div data-testid="outer-1">
            <GridLayout columns={2} gap="sm">
              <TestChild testId="nested-1" text="Nested 1" />
              <TestChild testId="nested-2" text="Nested 2" />
            </GridLayout>
          </div>
          <TestChild testId="outer-2" text="Outer 2" />
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Nested 1')).toBeInTheDocument();
      expect(screen.getByText('Nested 2')).toBeInTheDocument();
      expect(screen.getByText('Outer 2')).toBeInTheDocument();

      const outerContainer = screen.getByTestId('outer-1').parentElement;
      const innerContainer = screen.getByTestId('nested-1').parentElement;

      expect(outerContainer).toHaveClass('gap-4'); // md gap
      expect(innerContainer).toHaveClass('gap-2'); // sm gap
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of children efficiently', () => {
      const mockData = createMockResidentData();

      const manyChildren = Array.from({ length: 50 }, (_, i) => (
        <TestChild key={i} testId={`child-${i}`} text={`Child ${i}`} />
      ));

      renderWithTemplateContext(
        <GridLayout columns={5} gap="xs">
          {manyChildren}
        </GridLayout>,
        { residentData: mockData }
      );

      expect(screen.getByText('Child 0')).toBeInTheDocument();
      expect(screen.getByText('Child 25')).toBeInTheDocument();
      expect(screen.getByText('Child 49')).toBeInTheDocument();

      const container = screen.getByTestId('child-0').parentElement;
      expect(container).toHaveClass('grid');
      expect(container!.children).toHaveLength(50);
    });
  });
});