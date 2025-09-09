import React from 'react';
import { screen, render } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';
import GridLayout from '../../GridLayout';
import SplitLayout from '../../SplitLayout';
import FlexContainer from '../../FlexContainer';
import GradientBox from '../../GradientBox';
import CenteredBox from '../../CenteredBox';
import DisplayName from '../../DisplayName';
import ProfilePhoto from '../../ProfilePhoto';
import Bio from '../../Bio';

describe('CSS Isolation Integration', () => {
  describe('Wrapper Styles Should Not Bleed Into Children', () => {
    it('should prevent GridLayout styles from affecting child components', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <GridLayout columns={2} gap="lg">
          <div 
            className="child-with-explicit-styles bg-red-500 text-white p-2" 
            data-testid="explicit-child"
          >
            Explicitly styled child
          </div>
          <DisplayName data-testid="display-name-child" />
          <div 
            className="child-with-flex flex items-center justify-center" 
            data-testid="flex-child"
          >
            Child with flex
          </div>
          <Bio data-testid="bio-child" />
        </GridLayout>,
        { residentData: mockData }
      );

      const gridContainer = container.querySelector('.grid');
      const explicitChild = screen.getByTestId('explicit-child');
      const flexChild = screen.getByTestId('flex-child');

      // Verify GridLayout has its styles
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-6');

      // Verify children maintain their own styles and are not affected by grid classes
      expect(explicitChild).toHaveClass('child-with-explicit-styles', 'bg-red-500', 'text-white', 'p-2');
      expect(explicitChild).not.toHaveClass('grid', 'gap-6');

      expect(flexChild).toHaveClass('child-with-flex', 'flex', 'items-center', 'justify-center');
      expect(flexChild).not.toHaveClass('grid', 'grid-cols-1', 'gap-6');

      // Verify DisplayName and Bio render with their own styles, unaffected by parent
      const displayNameElement = screen.getByText('Test User');
      expect(displayNameElement).toHaveClass('ts-profile-display-name');
      expect(displayNameElement).not.toHaveClass('grid', 'gap-6');

      const bioSection = container.querySelector('.ts-profile-bio-section');
      expect(bioSection).toHaveClass('ts-profile-bio-section', 'mb-4');
      expect(bioSection).not.toHaveClass('grid', 'gap-6');
    });

    it('should prevent SplitLayout styles from affecting child components', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <SplitLayout ratio="2:1" gap="xl">
          <div 
            className="left-child bg-blue-300 border-2 border-solid border-black"
            data-testid="left-child"
            style={{ fontSize: '14px', lineHeight: '1.2' }}
          >
            <h3 className="text-red-600 font-bold">Left Side Title</h3>
            <DisplayName />
          </div>
          <div 
            className="right-child grid grid-cols-2 gap-2"
            data-testid="right-child"
          >
            <ProfilePhoto />
            <Bio />
          </div>
        </SplitLayout>,
        { residentData: mockData }
      );

      const splitContainer = container.querySelector('.w-full.flex.flex-col');
      const leftChild = screen.getByTestId('left-child');
      const rightChild = screen.getByTestId('right-child');

      // Verify SplitLayout has its flex styles
      expect(splitContainer).toHaveClass('w-full', 'flex', 'flex-col', 'lg:flex-row', 'gap-8');

      // Verify left child maintains its styles and is not affected by parent flex
      expect(leftChild).toHaveClass('left-child', 'bg-blue-300', 'border-2', 'border-solid', 'border-black');
      expect(leftChild).not.toHaveClass('w-full', 'flex', 'flex-col', 'gap-8');
      expect(leftChild).toHaveStyle({ fontSize: '14px', lineHeight: '1.2' });

      // Verify right child has its own grid styles, unaffected by parent flex
      expect(rightChild).toHaveClass('right-child', 'grid', 'grid-cols-2', 'gap-2');
      expect(rightChild).not.toHaveClass('w-full', 'flex', 'flex-col', 'lg:flex-row', 'gap-8');

      // Verify child components inside maintain their own styles
      const title = screen.getByText('Left Side Title');
      expect(title).toHaveClass('text-red-600', 'font-bold');
      expect(title).not.toHaveClass('w-full', 'flex', 'gap-8');
    });

    it('should prevent FlexContainer styles from affecting child components', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <FlexContainer direction="column" align="center" justify="between" gap="md">
          <div 
            className="flex-child-1 block text-left w-full"
            data-testid="block-child"
          >
            Block child that should stay block
          </div>
          <div 
            className="flex-child-2 inline-block bg-yellow-200"
            data-testid="inline-block-child"
          >
            Inline-block child
          </div>
          <DisplayName data-testid="display-name-in-flex" />
          <div 
            className="flex-child-3 grid grid-cols-3 gap-1"
            data-testid="grid-child"
          >
            <span>Grid</span>
            <span>Child</span>
            <span>Test</span>
          </div>
        </FlexContainer>,
        { residentData: mockData }
      );

      const flexContainer = container.querySelector('.flex');
      const blockChild = screen.getByTestId('block-child');
      const inlineBlockChild = screen.getByTestId('inline-block-child');
      const gridChild = screen.getByTestId('grid-child');

      // Verify FlexContainer has its flex styles
      expect(flexContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-between', 'gap-4');

      // Verify children maintain their own display properties
      expect(blockChild).toHaveClass('flex-child-1', 'block', 'text-left', 'w-full');
      expect(blockChild).not.toHaveClass('flex', 'items-center', 'justify-between', 'gap-4');

      expect(inlineBlockChild).toHaveClass('flex-child-2', 'inline-block', 'bg-yellow-200');
      expect(inlineBlockChild).not.toHaveClass('flex', 'items-center', 'justify-between', 'gap-4');

      expect(gridChild).toHaveClass('flex-child-3', 'grid', 'grid-cols-3', 'gap-1');
      expect(gridChild).not.toHaveClass('flex', 'items-center', 'justify-between', 'gap-4');

      // Verify DisplayName keeps its own styles
      const displayName = screen.getByText('Test User');
      expect(displayName).toHaveClass('ts-profile-display-name');
      expect(displayName).not.toHaveClass('flex', 'items-center', 'justify-between', 'gap-4');
    });

    it('should prevent GradientBox styles from affecting child components', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <GradientBox gradient="sunset" padding="lg" rounded>
          <div 
            className="child-with-own-bg bg-white text-black border rounded-none"
            data-testid="white-bg-child"
          >
            Child with white background
          </div>
          <div 
            className="child-with-transparent bg-transparent text-blue-600"
            data-testid="transparent-child"
          >
            Transparent child
          </div>
          <DisplayName data-testid="display-name-in-gradient" />
          <div 
            className="child-with-custom-padding p-1 m-2"
            data-testid="custom-padding-child"
          >
            Custom padding child
          </div>
        </GradientBox>,
        { residentData: mockData }
      );

      const gradientContainer = container.querySelector('.bg-gradient-to-br');
      const whiteBgChild = screen.getByTestId('white-bg-child');
      const transparentChild = screen.getByTestId('transparent-child');
      const customPaddingChild = screen.getByTestId('custom-padding-child');

      // Verify GradientBox has its background and styling
      expect(gradientContainer).toHaveClass('bg-gradient-to-br', 'from-orange-400', 'via-red-500', 'to-pink-500', 'p-8', 'rounded-lg');

      // Verify children maintain their own backgrounds and don't inherit gradient
      expect(whiteBgChild).toHaveClass('child-with-own-bg', 'bg-white', 'text-black', 'border', 'rounded-none');
      expect(whiteBgChild).not.toHaveClass('bg-gradient-to-br', 'from-orange-400', 'p-8', 'rounded-lg');

      expect(transparentChild).toHaveClass('child-with-transparent', 'bg-transparent', 'text-blue-600');
      expect(transparentChild).not.toHaveClass('bg-gradient-to-br', 'from-orange-400', 'p-8', 'rounded-lg');

      expect(customPaddingChild).toHaveClass('child-with-custom-padding', 'p-1', 'm-2');
      expect(customPaddingChild).not.toHaveClass('bg-gradient-to-br', 'p-8', 'rounded-lg');

      // Verify DisplayName keeps its own styles
      const displayName = screen.getByText('Test User');
      expect(displayName).toHaveClass('ts-profile-display-name');
      expect(displayName).not.toHaveClass('bg-gradient-to-br', 'p-8', 'rounded-lg');
    });

    it('should prevent CenteredBox styles from affecting child components', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <CenteredBox maxWidth="lg" padding="xl">
          <div 
            className="child-full-width w-full text-left"
            data-testid="full-width-child"
          >
            Full width child
          </div>
          <div 
            className="child-with-margin ml-auto mr-0"
            data-testid="right-aligned-child"
          >
            Right aligned child
          </div>
          <DisplayName data-testid="display-name-in-center" />
          <div 
            className="child-with-no-padding p-0 m-0"
            data-testid="no-padding-child"
          >
            No padding child
          </div>
        </CenteredBox>,
        { residentData: mockData }
      );

      const centeredContainer = container.querySelector('.mx-auto');
      const fullWidthChild = screen.getByTestId('full-width-child');
      const rightAlignedChild = screen.getByTestId('right-aligned-child');
      const noPaddingChild = screen.getByTestId('no-padding-child');

      // Verify CenteredBox has its centering and max-width styles
      expect(centeredContainer).toHaveClass('mx-auto', 'max-w-lg', 'p-12');

      // Verify children maintain their own width and alignment properties
      expect(fullWidthChild).toHaveClass('child-full-width', 'w-full', 'text-left');
      expect(fullWidthChild).not.toHaveClass('mx-auto', 'max-w-lg', 'p-12');

      expect(rightAlignedChild).toHaveClass('child-with-margin', 'ml-auto', 'mr-0');
      expect(rightAlignedChild).not.toHaveClass('mx-auto', 'max-w-lg', 'p-12');

      expect(noPaddingChild).toHaveClass('child-with-no-padding', 'p-0', 'm-0');
      expect(noPaddingChild).not.toHaveClass('mx-auto', 'max-w-lg', 'p-12');

      // Verify DisplayName keeps its own styles
      const displayName = screen.getByText('Test User');
      expect(displayName).toHaveClass('ts-profile-display-name');
      expect(displayName).not.toHaveClass('mx-auto', 'max-w-lg', 'p-12');
    });
  });

  describe('Child Styles Should Not Affect Wrapper Components', () => {
    it('should prevent child styles from breaking GridLayout structure', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <GridLayout columns={3} gap="sm" data-testid="grid-wrapper">
          <div className="child-that-tries-to-break-grid flex flex-col gap-8 w-screen">
            Problematic child 1
          </div>
          <div className="another-problematic-child absolute top-0 left-0 z-50">
            Problematic child 2
          </div>
          <div className="child-with-important-styles !important bg-red-500 !w-full">
            Child with !important styles
          </div>
          <div className="child-with-negative-margins -m-10 -p-5">
            Child with negative margins
          </div>
          <div className="child-with-transforms scale-150 rotate-45 translate-x-full">
            Child with transforms
          </div>
          <div className="child-with-overflow overflow-visible">
            Child with overflow
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      const gridContainer = container.querySelector('.grid');

      // Verify GridLayout maintains its structure despite problematic children
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'gap-2');
      
      // Verify grid container is not affected by child positioning
      expect(gridContainer).not.toHaveClass('flex', 'flex-col', 'absolute', 'scale-150', 'rotate-45');
      
      // Verify grid maintains its gap despite child gaps
      expect(gridContainer).toHaveClass('gap-2');
      expect(gridContainer).not.toHaveClass('gap-8');
    });

    it('should prevent child styles from breaking SplitLayout ratios', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <SplitLayout ratio="1:3" gap="md">
          <div className="left-child-with-fixed-width w-96 min-w-max">
            Fixed width left child that tries to break ratio
          </div>
          <div className="right-child-with-flex-grow flex-grow-0 flex-shrink-0">
            Right child that tries to prevent flex
          </div>
        </SplitLayout>,
        { residentData: mockData }
      );

      const splitContainer = container.querySelector('.w-full.flex');
      const leftWrapper = splitContainer?.firstElementChild;
      const rightWrapper = splitContainer?.lastElementChild;

      // Verify SplitLayout maintains its flex structure
      expect(splitContainer).toHaveClass('w-full', 'flex', 'flex-col', 'lg:flex-row', 'gap-4');
      
      // Verify wrappers maintain their width classes despite child attempts to override
      expect(leftWrapper).toHaveClass('w-full', 'lg:w-1/4'); // 1:3 ratio = 1/4
      expect(rightWrapper).toHaveClass('w-full', 'lg:w-3/4'); // 1:3 ratio = 3/4
      
      // Verify container is not affected by child positioning attempts
      expect(splitContainer).not.toHaveClass('w-96', 'min-w-max', 'flex-grow-0');
    });

    it('should prevent child styles from breaking FlexContainer alignment', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <FlexContainer direction="row" align="center" justify="evenly" gap="lg">
          <div className="child-that-tries-to-align text-left self-start justify-self-start">
            Child 1
          </div>
          <div className="child-with-margins mt-10 mb-5 ml-8 mr-2">
            Child 2
          </div>
          <div className="child-with-position relative top-5 left-3">
            Child 3
          </div>
        </FlexContainer>,
        { residentData: mockData }
      );

      const flexContainer = container.querySelector('.flex');

      // Verify FlexContainer maintains its alignment despite child attempts to override
      expect(flexContainer).toHaveClass('flex', 'flex-col', 'md:flex-row', 'items-center', 'justify-evenly', 'gap-6');
      
      // Verify container is not affected by child alignment attempts
      expect(flexContainer).not.toHaveClass('text-left', 'self-start', 'justify-self-start', 'mt-10', 'relative');
    });
  });

  describe('Nested Wrapper CSS Isolation', () => {
    it('should maintain CSS isolation with deeply nested wrappers', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <GridLayout columns={2} gap="lg" data-testid="outer-grid">
          <SplitLayout ratio="1:1" gap="md" data-testid="nested-split">
            <FlexContainer direction="column" gap="sm" data-testid="nested-flex">
              <GradientBox gradient="ocean" padding="sm" data-testid="nested-gradient">
                <CenteredBox maxWidth="sm" padding="xs" data-testid="nested-center">
                  <div className="deeply-nested-child bg-white p-1 text-black" data-testid="final-child">
                    Deeply nested content
                  </div>
                </CenteredBox>
              </GradientBox>
            </FlexContainer>
            <DisplayName />
          </SplitLayout>
          <Bio />
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify each wrapper maintains its own styles independently
      const outerGrid = container.querySelector('.grid');
      const nestedSplit = container.querySelector('.w-full.flex.lg\\:flex-row');
      const nestedFlex = container.querySelector('.flex.items-start'); // FlexContainer has items-start by default
      const nestedGradient = container.querySelector('.bg-gradient-to-br');
      const nestedCenter = container.querySelector('.mx-auto.max-w-sm');
      const finalChild = screen.getByTestId('final-child');

      // Each wrapper should have its own classes and not inherit from parents
      expect(outerGrid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-6');
      expect(outerGrid).not.toHaveClass('flex', 'bg-gradient-to-br', 'mx-auto');

      expect(nestedSplit).toHaveClass('w-full', 'flex', 'flex-col', 'lg:flex-row', 'gap-4');
      expect(nestedSplit).not.toHaveClass('grid', 'items-center', 'bg-gradient-to-br', 'mx-auto');

      expect(nestedFlex).toHaveClass('flex', 'flex-col', 'items-start', 'justify-start', 'gap-2');
      expect(nestedFlex).not.toHaveClass('grid', 'lg:flex-row', 'bg-gradient-to-br', 'mx-auto');

      expect(nestedGradient).toHaveClass('bg-gradient-to-br', 'from-blue-400', 'via-blue-500', 'to-blue-600', 'p-4', 'rounded-lg');
      expect(nestedGradient).not.toHaveClass('grid', 'flex', 'lg:flex-row', 'mx-auto');

      expect(nestedCenter).toHaveClass('mx-auto', 'max-w-sm', 'p-2');
      expect(nestedCenter).not.toHaveClass('grid', 'flex', 'bg-gradient-to-br', 'rounded-lg');

      // Final child should maintain its styles and not inherit any wrapper styles
      expect(finalChild).toHaveClass('deeply-nested-child', 'bg-white', 'p-1', 'text-black');
      expect(finalChild).not.toHaveClass('grid', 'flex', 'bg-gradient-to-br', 'mx-auto', 'gap-6', 'gap-4', 'gap-2');
    });
  });

  describe('CSS Specificity Conflicts', () => {
    it('should handle CSS specificity conflicts correctly', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <div className="parent-with-high-specificity">
          <style jsx>{`
            .parent-with-high-specificity .grid {
              background-color: red !important;
              padding: 50px !important;
            }
            .parent-with-high-specificity .flex {
              display: block !important;
            }
          `}</style>
          <GridLayout columns={1} gap="md">
            <div className="test-child" data-testid="grid-child">
              Child in grid
            </div>
          </GridLayout>
          <FlexContainer direction="row">
            <div className="test-child" data-testid="flex-child">
              Child in flex
            </div>
          </FlexContainer>
        </div>,
        { residentData: mockData }
      );

      const gridLayout = container.querySelector('.grid');
      const flexContainer = container.querySelector('.flex');

      // Components should maintain their essential structural classes even with CSS conflicts
      expect(gridLayout).toHaveClass('grid', 'grid-cols-1', 'gap-4');
      expect(flexContainer).toHaveClass('flex', 'flex-col', 'md:flex-row');

      // Children should not be affected by parent specificity rules targeting wrappers
      const gridChild = screen.getByTestId('grid-child');
      const flexChild = screen.getByTestId('flex-child');
      
      expect(gridChild).toHaveClass('test-child');
      expect(flexChild).toHaveClass('test-child');
    });
  });
});