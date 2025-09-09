import React, { useRef, useEffect } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';
import GridLayout from '../../GridLayout';
import SplitLayout from '../../SplitLayout';
import FlexContainer from '../../FlexContainer';
import GradientBox from '../../GradientBox';
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
        <GridLayout columns={2} gap="md">
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

    it('should handle SplitLayout with nested FlexContainer and mixed content', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <SplitLayout ratio="2:1" gap="lg">
          <FlexContainer direction="column" gap="md">
            <div className="static-header bg-yellow-100 p-3" data-testid="nested-static-1">
              <h1>Nested Static Header</h1>
              <div className="inline-meta">
                By: <DisplayName />
              </div>
            </div>
            <GradientBox gradient="sunset" padding="sm">
              <p className="nested-text" data-testid="nested-static-2">
                Static text inside gradient box
              </p>
              <ProfilePhoto />
            </GradientBox>
            <div className="static-footer border-t pt-2" data-testid="nested-static-3">
              Footer content
            </div>
          </FlexContainer>
          <div className="right-side bg-gray-50 p-4" data-testid="right-static">
            <h2>Right Side Static</h2>
            <Bio />
            <div className="static-controls mt-4">
              <button data-testid="static-button">Static Button</button>
              <input data-testid="static-input" placeholder="Static Input" />
            </div>
          </div>
        </SplitLayout>,
        { residentData: mockData }
      );

      // Verify left side FlexContainer structure
      const leftFlex = container.querySelector('.flex.flex-col.gap-4');
      expect(leftFlex).toHaveClass('flex', 'flex-col', 'items-start', 'justify-start', 'gap-4');

      // Verify nested static content in FlexContainer
      expect(screen.getByTestId('nested-static-1')).toBeInTheDocument();
      expect(screen.getByText('Nested Static Header')).toBeInTheDocument();
      expect(screen.getByText('By:')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument(); // DisplayName

      // Verify GradientBox with mixed content
      const gradientBox = container.querySelector('.bg-gradient-to-br');
      expect(gradientBox).toBeInTheDocument();
      expect(screen.getByTestId('nested-static-2')).toBeInTheDocument();
      expect(screen.getByText('Static text inside gradient box')).toBeInTheDocument();

      // Verify ProfilePhoto inside GradientBox
      const profilePhoto = container.querySelector('.profile-photo-wrapper');
      expect(profilePhoto).toBeInTheDocument();

      // Verify footer
      expect(screen.getByTestId('nested-static-3')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();

      // Verify right side static content
      expect(screen.getByTestId('right-static')).toBeInTheDocument();
      expect(screen.getByText('Right Side Static')).toBeInTheDocument();
      expect(screen.getByText('About Me')).toBeInTheDocument(); // Bio
      expect(screen.getByTestId('static-button')).toBeInTheDocument();
      expect(screen.getByTestId('static-input')).toBeInTheDocument();

      // Verify SplitLayout structure
      const splitContainer = container.querySelector('.w-full.flex');
      expect(splitContainer).toHaveClass('w-full', 'flex', 'flex-col', 'lg:flex-row', 'gap-6');
    });

    it('should handle deeply nested layout composition without breaking', () => {
      const mockData = createMockResidentData({
        viewer: { id: 'user123' },
        owner: { id: 'user123', displayName: 'Nested User' }
      });

      const { container } = renderWithTemplateContext(
        <GridLayout columns={1} gap="xl" data-testid="level-1-grid">
          <SplitLayout ratio="1:2" gap="lg" data-testid="level-2-split">
            <CenteredBox maxWidth="md" padding="md" data-testid="level-3-center">
              <GradientBox gradient="forest" padding="sm" data-testid="level-4-gradient">
                <FlexContainer direction="column" align="center" gap="sm" data-testid="level-5-flex">
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
              </GradientBox>
            </CenteredBox>
            <div className="right-content p-4" data-testid="level-3-static">
              <ProfilePhoto />
              <Bio />
            </div>
          </SplitLayout>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify each level maintains its structure
      const level1 = container.querySelector('.grid');
      expect(level1).toHaveClass('grid', 'grid-cols-1', 'gap-8');

      const level2 = container.querySelector('.w-full.flex.lg\\:flex-row');
      expect(level2).toHaveClass('w-full', 'flex', 'flex-col', 'lg:flex-row', 'gap-6');

      const level3 = container.querySelector('.mx-auto.max-w-md');
      expect(level3).toHaveClass('mx-auto', 'max-w-md', 'p-6');

      const level4 = container.querySelector('.bg-gradient-to-br.from-green-400');
      expect(level4).toHaveClass('bg-gradient-to-br', 'from-green-400', 'via-green-500', 'to-green-600', 'p-4', 'rounded-lg');

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
          <SplitLayout ratio="1:1">
            <FlexContainer direction="column">
              <GradientBox gradient="neon">
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
              </GradientBox>
            </FlexContainer>
            <div className="static-side p-4">
              <Bio />
            </div>
          </SplitLayout>
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
        <GridLayout columns={2} gap="md">
          <SplitLayout ratio="1:1">
            <FlexContainer direction="column" gap="sm">
              <input data-testid="input-1" placeholder="Input 1" />
              <GradientBox gradient="ocean" padding="sm">
                <button data-testid="button-1">Button in Gradient</button>
                <input data-testid="input-2" placeholder="Input in Gradient" />
              </GradientBox>
            </FlexContainer>
            <CenteredBox maxWidth="sm">
              <textarea data-testid="textarea-1" placeholder="Textarea in Center" />
              <button data-testid="button-2">Button in Center</button>
            </CenteredBox>
          </SplitLayout>
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
            <GradientBox gradient="sunset">
              <TestComponentWithState testId="component-2" />
            </GradientBox>
          </FlexContainer>
          <SplitLayout ratio="1:1">
            <CenteredBox>
              <TestComponentWithState testId="component-3" />
            </CenteredBox>
            <div className="static-area">
              <TestComponentWithState testId="component-4" />
              <DisplayName />
            </div>
          </SplitLayout>
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
          <SplitLayout ratio="1:2" responsive={true}>
            <FlexContainer direction="row" responsive={true}>
              <div className="responsive-child" data-testid="flex-child-1">Flex Child 1</div>
              <div className="responsive-child" data-testid="flex-child-2">Flex Child 2</div>
            </FlexContainer>
            <CenteredBox maxWidth="lg">
              <ProfilePhoto />
            </CenteredBox>
          </SplitLayout>
          <GradientBox gradient="rainbow" padding="md">
            <div className="gradient-content" data-testid="gradient-content">
              Content in gradient
            </div>
          </GradientBox>
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

      const splitContainer = container.querySelector('.w-full.flex.lg\\:flex-row');
      expect(splitContainer).toHaveClass('flex-col', 'lg:flex-row');

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
        <GridLayout columns={2} gap="lg">
          {Array.from({ length: 4 }, (_, i) => (
            <SplitLayout key={i} ratio="1:1" gap="md">
              <FlexContainer direction="column" gap="sm">
                <GradientBox gradient={i % 2 === 0 ? 'sunset' : 'ocean'} padding="xs">
                  <div data-testid={`complex-content-${i}`}>
                    Content {i} - Render {rerenderTrigger}
                  </div>
                  {i % 2 === 0 ? <DisplayName /> : <ProfilePhoto />}
                </GradientBox>
              </FlexContainer>
              <CenteredBox maxWidth="sm" padding="sm">
                <div data-testid={`simple-content-${i}`}>
                  Simple {i} - Render {rerenderTrigger}
                </div>
                {i === 0 && <Bio />}
              </CenteredBox>
            </SplitLayout>
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