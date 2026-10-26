import React, { useRef, useEffect } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';
import GridLayout from '../../GridLayout';
import FlexContainer from '../../FlexContainer';
import CenteredBox from '../../CenteredBox';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';
import DisplayName from '../../DisplayName';
import ProfilePhoto from '../../ProfilePhoto';
import Bio from '../../Bio';

describe('Layout Component Composition Integration', () => {
  describe('High-Risk Layout Combinations (Historical Bug Patterns)', () => {
    it('should handle GridLayout with mixed static HTML and React components', () => {
      const mockData = createMockResidentData({
        viewer: { id: 'owner123' },
        owner: { id: 'owner123', displayName: 'Grid Test User' }
      });

      const { container } = renderWithTemplateContext(
        <GridLayout columns={2} gapSize="md">
          <div className="static-html bg-blue-100 p-4" data-testid="static-1">
            <h2>Static Content 1</h2>
            <p>This is static HTML content</p>
          </div>
          <ProfilePhoto data-testid="react-component-1" />
          <p className="static-paragraph text-gray-700" data-testid="static-2">
            Another static element with <strong>formatting</strong>
          </p>
          <IfOwner>
            <Bio data-testid="conditional-react" />
          </IfOwner>
          <div className="static-wrapper" data-testid="static-3">
            <span>Static wrapper containing:</span>
            <DisplayName />
          </div>
          <div className="complex-static bg-gradient-to-r from-red-200 to-blue-200 p-2" data-testid="static-4">
            Complex static with gradient
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify all content renders correctly
      expect(screen.getByTestId('static-1')).toBeInTheDocument();
      expect(screen.getByText('Static Content 1')).toBeInTheDocument();
      expect(screen.getByText('This is static HTML content')).toBeInTheDocument();

      // React component should render
      const profilePhoto = container.querySelector('.profile-photo-wrapper');
      expect(profilePhoto).toBeInTheDocument();

      // Static elements should render
      expect(screen.getByTestId('static-2')).toBeInTheDocument();
      expect(screen.getByText('formatting')).toBeInTheDocument();

      // Conditional React component should render (viewer is owner)
      expect(screen.getByText('About Me')).toBeInTheDocument();
      expect(screen.getByText('This is a test user bio for template testing.')).toBeInTheDocument();

      // Mixed static wrapper with React component
      expect(screen.getByTestId('static-3')).toBeInTheDocument();
      expect(screen.getByText('Static wrapper containing:')).toBeInTheDocument();
      expect(screen.getByText('Grid Test User')).toBeInTheDocument();

      // Complex static element
      expect(screen.getByTestId('static-4')).toBeInTheDocument();
      expect(screen.getByText('Complex static with gradient')).toBeInTheDocument();

      // Verify grid structure is maintained
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-4');
      expect(gridContainer?.children).toHaveLength(6);
    });

    it('should handle deeply nested layout composition without breaking', () => {
      const mockData = createMockResidentData({
        viewer: { id: 'user123' },
        owner: { id: 'user123', displayName: 'Nested User' }
      });

      const { container } = renderWithTemplateContext(
        <GridLayout columns={1} gapSize="xl" data-testid="level-1-grid">
          <div className="split-layout">
            <CenteredBox containerMaxWidth="md" containerPadding="md" data-testid="level-3-center">
              <div className="gradient-box">
                <FlexContainer direction="column" align="center" gapSize="sm" data-testid="level-5-flex">
                  <div className="deeply-nested-static bg-white rounded p-2" data-testid="level-6-static">
                    <h3>6 Levels Deep</h3>
                    <DisplayName />
                  </div>
                  <IfOwner>
                    <div className="owner-content text-sm" data-testid="level-6-conditional">
                      Owner-only nested content
                    </div>
                  </IfOwner>
                </FlexContainer>
              </div>
            </CenteredBox>
            <div className="right-content p-4" data-testid="level-3-static">
              <ProfilePhoto />
              <Bio />
            </div>
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify each level maintains its structure
      const level1 = container.querySelector('.grid');
      expect(level1).toHaveClass('grid', 'grid-cols-1', 'gap-8');


      const level3 = container.querySelector('.mx-auto.max-w-md');
      expect(level3).toHaveClass('mx-auto', 'max-w-md', 'p-6');


      const level5 = container.querySelector('.flex.items-center');
      expect(level5).toHaveClass('flex', 'flex-col', 'items-center', 'justify-start', 'gap-2');

      // Verify deeply nested content renders
      expect(screen.getByTestId('level-6-static')).toBeInTheDocument();
      expect(screen.getByText('6 Levels Deep')).toBeInTheDocument();
      expect(screen.getByText('Nested User')).toBeInTheDocument(); // DisplayName

      // Verify conditional content renders (viewer is owner)
      expect(screen.getByTestId('level-6-conditional')).toBeInTheDocument();
      expect(screen.getByText('Owner-only nested content')).toBeInTheDocument();

      // Verify right side content
      expect(screen.getByTestId('level-3-static')).toBeInTheDocument();
      const profilePhoto = container.querySelector('.profile-photo-wrapper');
      expect(profilePhoto).toBeInTheDocument();
      expect(screen.getByText('About Me')).toBeInTheDocument();
    });
  });

  describe('Event Propagation Across Layout Boundaries', () => {
    it('should handle click events across nested layout components', () => {
      const mockData = createMockResidentData();
      const gridClickHandler = jest.fn();
      const buttonClickHandler = jest.fn();

      renderWithTemplateContext(
        <GridLayout columns={1} onClick={gridClickHandler} data-testid="clickable-grid">
          <div className="split-layout">
            <FlexContainer direction="column">
              <div className="gradient-box">
                <div className="content-area p-4">
                  <h2>Nested Content</h2>
                  <button 
                    data-testid="nested-button" 
                    onClick={buttonClickHandler}
                  >
                    Click Me
                  </button>
                  <DisplayName />
                </div>
              </div>
            </FlexContainer>
            <div className="static-side p-4">
              <Bio />
            </div>
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      const button = screen.getByTestId('nested-button');
      
      // Click the deeply nested button
      fireEvent.click(button);

      // Verify event bubbles through layout layers (at least to GridLayout)
      expect(buttonClickHandler).toHaveBeenCalledTimes(1);
      expect(gridClickHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle focus management across layout boundaries', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={2} gapSize="md">
          <div className="split-layout">
            <FlexContainer direction="column" gapSize="sm">
              <input data-testid="input-1" placeholder="Input 1" />
              <div className="gradient-box">
                <button data-testid="button-1">Button in Gradient</button>
                <input data-testid="input-2" placeholder="Input in Gradient" />
              </div>
            </FlexContainer>
            <CenteredBox containerMaxWidth="sm">
              <textarea data-testid="textarea-1" placeholder="Textarea in Center" />
              <button data-testid="button-2">Button in Center</button>
            </CenteredBox>
          </div>
          <div className="static-controls">
            <button data-testid="button-3">Static Button</button>
            <select data-testid="select-1">
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      // Test focus can move between elements across different layout containers
      const input1 = screen.getByTestId('input-1');
      const button1 = screen.getByTestId('button-1');
      const input2 = screen.getByTestId('input-2');
      const textarea1 = screen.getByTestId('textarea-1');
      const button2 = screen.getByTestId('button-2');
      const button3 = screen.getByTestId('button-3');
      const select1 = screen.getByTestId('select-1');

      // Test focus can be set on elements in different layout containers
      input1.focus();
      expect(input1).toHaveFocus();

      button1.focus();
      expect(button1).toHaveFocus();

      input2.focus();
      expect(input2).toHaveFocus();

      textarea1.focus();
      expect(textarea1).toHaveFocus();

      button2.focus();
      expect(button2).toHaveFocus();

      button3.focus();
      expect(button3).toHaveFocus();

      select1.focus();
      expect(select1).toHaveFocus();
    });
  });

  describe('Layout Component State Management', () => {
    it('should maintain independent state across layout components', () => {
      const TestComponentWithState = ({ testId }: { testId: string }) => {
        const [count, setCount] = React.useState(0);
        return (
          <div data-testid={testId}>
            <span data-testid={`${testId}-count`}>{count}</span>
            <button 
              data-testid={`${testId}-button`} 
              onClick={() => setCount(c => c + 1)}
            >
              Increment
            </button>
          </div>
        );
      };

      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <GridLayout columns={2}>
          <FlexContainer direction="column">
            <TestComponentWithState testId="component-1" />
            <div className="gradient-box">
              <TestComponentWithState testId="component-2" />
            </div>
          </FlexContainer>
          <div className="split-layout">
            <CenteredBox>
              <TestComponentWithState testId="component-3" />
            </CenteredBox>
            <div className="static-area">
              <TestComponentWithState testId="component-4" />
              <DisplayName />
            </div>
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify all components start with count 0
      expect(screen.getByTestId('component-1-count')).toHaveTextContent('0');
      expect(screen.getByTestId('component-2-count')).toHaveTextContent('0');
      expect(screen.getByTestId('component-3-count')).toHaveTextContent('0');
      expect(screen.getByTestId('component-4-count')).toHaveTextContent('0');

      // Click buttons in different layout containers
      fireEvent.click(screen.getByTestId('component-1-button'));
      fireEvent.click(screen.getByTestId('component-2-button'));
      fireEvent.click(screen.getByTestId('component-2-button')); // Click twice
      fireEvent.click(screen.getByTestId('component-4-button'));

      // Verify state is maintained independently
      expect(screen.getByTestId('component-1-count')).toHaveTextContent('1');
      expect(screen.getByTestId('component-2-count')).toHaveTextContent('2');
      expect(screen.getByTestId('component-3-count')).toHaveTextContent('0'); // Not clicked
      expect(screen.getByTestId('component-4-count')).toHaveTextContent('1');
    });
  });

  describe('Responsive Behavior with Layout Composition', () => {
    it('should handle responsive layout changes in nested components', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <GridLayout columns={3} responsive={true}>
          <div className="split-layout">
            <FlexContainer direction="row" responsive={true}>
              <div className="responsive-child" data-testid="flex-child-1">Flex Child 1</div>
              <div className="responsive-child" data-testid="flex-child-2">Flex Child 2</div>
            </FlexContainer>
            <CenteredBox containerMaxWidth="lg">
              <ProfilePhoto />
            </CenteredBox>
          </div>
          <div className="gradient-box">
            <div className="gradient-content" data-testid="gradient-content">
              Content in gradient
            </div>
          </div>
          <div className="static-responsive" data-testid="static-responsive">
            <Bio />
            <DisplayName />
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify responsive classes are applied correctly at each level
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3');


      const flexContainer = container.querySelector('.flex.flex-col.md\\:flex-row');
      expect(flexContainer).toHaveClass('flex-col', 'md:flex-row');

      // Verify content renders correctly
      expect(screen.getByTestId('flex-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('flex-child-2')).toBeInTheDocument();
      expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
      expect(screen.getByTestId('static-responsive')).toBeInTheDocument();
    });
  });

  describe('Performance with Complex Layout Composition', () => {
    it('should handle re-rendering of complex nested layouts efficiently', () => {
      const mockData = createMockResidentData();

      const ComplexLayout = ({ rerenderTrigger }: { rerenderTrigger: number }) => (
        <GridLayout columns={2} gapSize="lg">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="split-layout">
              <FlexContainer direction="column" gapSize="sm">
                <div className="gradient-box">
                  <div data-testid={`complex-content-${i}`}>
                    Content {i} - Render {rerenderTrigger}
                  </div>
                  {i % 2 === 0 ? <DisplayName /> : <ProfilePhoto />}
                </div>
              </FlexContainer>
              <CenteredBox containerMaxWidth="sm" containerPadding="sm">
                <div data-testid={`simple-content-${i}`}>
                  Simple {i} - Render {rerenderTrigger}
                </div>
                {i === 0 && <Bio />}
              </CenteredBox>
            </div>
          ))}
        </GridLayout>
      );

      const { rerender } = renderWithTemplateContext(
        <ComplexLayout rerenderTrigger={1} />,
        { residentData: mockData }
      );

      // Verify initial render
      expect(screen.getByTestId('complex-content-0')).toHaveTextContent('Content 0 - Render 1');
      expect(screen.getByTestId('simple-content-3')).toHaveTextContent('Simple 3 - Render 1');

      // Re-render multiple times to test performance
      rerender(<ComplexLayout rerenderTrigger={2} />);
      expect(screen.getByTestId('complex-content-0')).toHaveTextContent('Content 0 - Render 2');

      rerender(<ComplexLayout rerenderTrigger={3} />);
      expect(screen.getByTestId('complex-content-0')).toHaveTextContent('Content 0 - Render 3');

      // Verify all content is still present and correct
      for (let i = 0; i < 4; i++) {
        expect(screen.getByTestId(`complex-content-${i}`)).toHaveTextContent(`Content ${i} - Render 3`);
        expect(screen.getByTestId(`simple-content-${i}`)).toHaveTextContent(`Simple ${i} - Render 3`);
      }

      // Verify React components still render correctly
      expect(screen.getAllByText('Test User')).toHaveLength(2); // DisplayName appears twice (i=0,2)
      expect(screen.getByText('About Me')).toBeInTheDocument(); // Bio
    });
  });
});