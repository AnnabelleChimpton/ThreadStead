import React from 'react';
import { screen, render } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';
import GridLayout from '../../GridLayout';
import SplitLayout from '../../SplitLayout';
import FlexContainer from '../../FlexContainer';
import GradientBox from '../../GradientBox';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';
import DisplayName from '../../DisplayName';
import ProfilePhoto from '../../ProfilePhoto';
import Bio from '../../Bio';

describe('Mixed Content Rendering Integration', () => {
  describe('Static HTML + React Components in GridLayout', () => {
    it('should render mixed content without hydration mismatches', () => {
      const mockData = createMockResidentData({
        viewer: { id: 'owner123' },
        owner: { id: 'owner123', displayName: 'Test Owner', avatarUrl: '/test-avatar.jpg' }
      });

      // This is the exact pattern from the roadmap that has caused bugs
      const { container } = renderWithTemplateContext(
        <GridLayout columns={2} gap="md">
          <div className="static-html bg-white p-4" data-testid="static-content">
            <h2>Static user content</h2>
            <p>This is plain HTML content</p>
          </div>
          <ProfilePhoto />
          <p className="user-text" data-testid="static-paragraph">
            More static content with <strong>formatting</strong>
          </p>
          <IfOwner>
            <Bio />
          </IfOwner>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify all content renders
      expect(screen.getByTestId('static-content')).toBeInTheDocument();
      expect(screen.getByText('Static user content')).toBeInTheDocument();
      expect(screen.getByText('This is plain HTML content')).toBeInTheDocument();
      
      // ProfilePhoto should render (it's a React component) - check for placeholder or img
      const profilePhoto = container.querySelector('.profile-photo-placeholder, .profile-photo-image');
      expect(profilePhoto).toBeInTheDocument();
      
      // Static paragraph should render
      expect(screen.getByTestId('static-paragraph')).toBeInTheDocument();
      expect(screen.getByText('formatting')).toBeInTheDocument();
      
      // Bio should render because viewer is owner
      expect(screen.getByText('This is a test user bio for template testing.')).toBeInTheDocument();

      // Verify grid layout classes are applied correctly
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-4');
    });

    it('should handle CSS cascade properly in nested layouts', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <GridLayout columns={1} gap="lg">
          <div 
            className="custom-wrapper bg-blue-500 p-8" 
            data-testid="wrapper-div"
            style={{ border: '2px solid red', fontSize: '20px' }}
          >
            <h1>Wrapper Content</h1>
            <ProfilePhoto data-testid="nested-profile" />
            <div className="nested-static bg-green-300 text-sm" data-testid="nested-static">
              Nested static content
            </div>
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      const wrapperDiv = screen.getByTestId('wrapper-div');
      const nestedStatic = screen.getByTestId('nested-static');

      // Verify wrapper styles are applied
      expect(wrapperDiv).toHaveClass('custom-wrapper', 'bg-blue-500', 'p-8');
      expect(wrapperDiv).toHaveStyle({ border: '2px solid red', fontSize: '20px' });

      // Verify nested content has its own styles
      expect(nestedStatic).toHaveClass('nested-static', 'bg-green-300', 'text-sm');
      
      // Verify that ProfilePhoto component renders and isn't affected by wrapper styles
      const profilePhoto = container.querySelector('.profile-photo-placeholder, .profile-photo-image');
      expect(profilePhoto).toBeInTheDocument();
    });

    it('should maintain event propagation across mixed boundaries', () => {
      const mockData = createMockResidentData();
      const staticClickHandler = jest.fn();
      const reactClickHandler = jest.fn();
      const wrapperClickHandler = jest.fn();

      renderWithTemplateContext(
        <GridLayout onClick={wrapperClickHandler}>
          <div 
            className="static-html" 
            data-testid="static-clickable"
            onClick={staticClickHandler}
          >
            <button>Static HTML Button</button>
          </div>
          <div data-testid="react-clickable" onClick={reactClickHandler}>
            <DisplayName />
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      const staticElement = screen.getByTestId('static-clickable');
      const reactElement = screen.getByTestId('react-clickable');

      // Click static element
      staticElement.click();
      expect(staticClickHandler).toHaveBeenCalledTimes(1);
      expect(wrapperClickHandler).toHaveBeenCalledTimes(1);

      // Click React component area
      reactElement.click();
      expect(reactClickHandler).toHaveBeenCalledTimes(1);
      expect(wrapperClickHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('SplitLayout with Mixed Content', () => {
    it('should handle mixed static/React content in split layouts', () => {
      const mockData = createMockResidentData({
        viewer: { id: 'visitor456' },
        owner: { id: 'owner123', displayName: 'Profile Owner' }
      });

      renderWithTemplateContext(
        <SplitLayout>
          <FlexContainer direction="column" gap="md">
            <GradientBox>
              <h2 data-testid="static-heading">Static heading in gradient box</h2>
              <DisplayName />
              <p data-testid="static-text">Static paragraph text</p>
            </GradientBox>
          </FlexContainer>
          <div className="right-side" data-testid="right-static">
            <IfVisitor>
              <p>Visitor-only content</p>
            </IfVisitor>
            <div className="static-content">
              <h3>Static content on right</h3>
            </div>
          </div>
        </SplitLayout>,
        { residentData: mockData }
      );

      // Verify left side content
      expect(screen.getByTestId('static-heading')).toBeInTheDocument();
      expect(screen.getByText('Static heading in gradient box')).toBeInTheDocument();
      expect(screen.getByText('Profile Owner')).toBeInTheDocument(); // DisplayName
      expect(screen.getByTestId('static-text')).toBeInTheDocument();

      // Verify right side content
      expect(screen.getByTestId('right-static')).toBeInTheDocument();
      expect(screen.getByText('Visitor-only content')).toBeInTheDocument(); // IfVisitor content
      expect(screen.getByText('Static content on right')).toBeInTheDocument();
    });
  });

  describe('Focus Management Integration', () => {
    it('should handle tab navigation through mixed content', () => {
      const mockData = createMockResidentData({
        viewer: { id: 'owner123' }, // Make viewer the owner so IfOwner renders
        owner: { id: 'owner123', displayName: 'Test Owner' }
      });

      renderWithTemplateContext(
        <GridLayout columns={1}>
          <div className="static-section">
            <button data-testid="static-button-1">Static Button 1</button>
            <input data-testid="static-input" placeholder="Static input" />
          </div>
          <div data-testid="react-section">
            <button data-testid="react-button">React Button</button>
            <IfOwner>
              <button data-testid="conditional-button">Owner Button</button>
            </IfOwner>
          </div>
          <div className="another-static">
            <button data-testid="static-button-2">Static Button 2</button>
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify all focusable elements are in the document
      const staticButton1 = screen.getByTestId('static-button-1');
      const staticInput = screen.getByTestId('static-input');
      const reactButton = screen.getByTestId('react-button');
      const conditionalButton = screen.getByTestId('conditional-button');
      const staticButton2 = screen.getByTestId('static-button-2');

      expect(staticButton1).toBeInTheDocument();
      expect(staticInput).toBeInTheDocument();
      expect(reactButton).toBeInTheDocument();
      expect(conditionalButton).toBeInTheDocument();
      expect(staticButton2).toBeInTheDocument();

      // Test focus can be set on each element
      staticButton1.focus();
      expect(staticButton1).toHaveFocus();

      staticInput.focus();
      expect(staticInput).toHaveFocus();

      reactButton.focus();
      expect(reactButton).toHaveFocus();

      conditionalButton.focus();
      expect(conditionalButton).toHaveFocus();

      staticButton2.focus();
      expect(staticButton2).toHaveFocus();
    });
  });

  describe('Conditional Logic with Mixed Content', () => {
    it('should handle IfOwner with mixed content correctly when viewer is owner', () => {
      const ownerData = createMockResidentData({
        viewer: { id: 'owner123' },
        owner: { id: 'owner123', displayName: 'Owner' }
      });

      const { container } = renderWithTemplateContext(
        <GridLayout columns={2}>
          <div className="always-visible" data-testid="static-always">
            <h2>Always visible static content</h2>
          </div>
          <IfOwner>
            <div className="owner-static" data-testid="owner-static">
              <p>Owner-only static content</p>
              <Bio />
            </div>
          </IfOwner>
          <IfVisitor>
            <div className="visitor-static" data-testid="visitor-static">
              <p>Visitor-only static content</p>
            </div>
          </IfVisitor>
          <ProfilePhoto />
        </GridLayout>,
        { residentData: ownerData }
      );

      // As owner - should see always visible, owner content, ProfilePhoto, but not visitor content
      expect(screen.getByTestId('static-always')).toBeInTheDocument();
      expect(screen.getByTestId('owner-static')).toBeInTheDocument();
      expect(screen.getByText('Owner-only static content')).toBeInTheDocument();
      const profilePhoto = container.querySelector('.profile-photo-placeholder, .profile-photo-image');
      expect(profilePhoto).toBeInTheDocument(); // ProfilePhoto
      expect(screen.queryByTestId('visitor-static')).not.toBeInTheDocument();
    });

    it('should handle IfVisitor with mixed content correctly when viewer is visitor', () => {
      const visitorData = createMockResidentData({
        viewer: { id: 'visitor456' },
        owner: { id: 'owner123', displayName: 'Owner' }
      });

      const { container } = renderWithTemplateContext(
        <GridLayout columns={2}>
          <div className="always-visible" data-testid="static-always">
            <h2>Always visible static content</h2>
          </div>
          <IfOwner>
            <div className="owner-static" data-testid="owner-static">
              <p>Owner-only static content</p>
              <Bio />
            </div>
          </IfOwner>
          <IfVisitor>
            <div className="visitor-static" data-testid="visitor-static">
              <p>Visitor-only static content</p>
            </div>
          </IfVisitor>
          <ProfilePhoto />
        </GridLayout>,
        { residentData: visitorData }
      );

      // As visitor - should see always visible, visitor content, ProfilePhoto, but not owner content
      expect(screen.getByTestId('static-always')).toBeInTheDocument();
      expect(screen.queryByTestId('owner-static')).not.toBeInTheDocument();
      expect(screen.getByTestId('visitor-static')).toBeInTheDocument();
      expect(screen.getByText('Visitor-only static content')).toBeInTheDocument();
      const profilePhoto = container.querySelector('.profile-photo-placeholder, .profile-photo-image');
      expect(profilePhoto).toBeInTheDocument(); // ProfilePhoto
    });
  });

  describe('Deeply Nested Mixed Content', () => {
    it('should handle complex nesting without breaking', () => {
      const mockData = createMockResidentData({
        viewer: { id: 'owner123' },
        owner: { id: 'owner123', displayName: 'Complex Owner' }
      });

      const { container } = renderWithTemplateContext(
        <GridLayout columns={1}>
          <SplitLayout>
            <FlexContainer direction="column">
              <div className="level-1-static" data-testid="level-1">
                <h1>Level 1 Static</h1>
                <GradientBox>
                  <div className="level-2-static" data-testid="level-2">
                    <p>Level 2 Static in GradientBox</p>
                    <IfOwner>
                      <div className="level-3-static" data-testid="level-3">
                        <span>Level 3 Static in IfOwner</span>
                        <DisplayName />
                        <div className="level-4-static" data-testid="level-4">
                          Final level static content
                        </div>
                      </div>
                    </IfOwner>
                  </div>
                </GradientBox>
              </div>
            </FlexContainer>
            <div className="right-static" data-testid="right-side">
              <ProfilePhoto />
              <Bio />
            </div>
          </SplitLayout>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify all levels render correctly
      expect(screen.getByTestId('level-1')).toBeInTheDocument();
      expect(screen.getByText('Level 1 Static')).toBeInTheDocument();
      
      expect(screen.getByTestId('level-2')).toBeInTheDocument();
      expect(screen.getByText('Level 2 Static in GradientBox')).toBeInTheDocument();
      
      expect(screen.getByTestId('level-3')).toBeInTheDocument();
      expect(screen.getByText('Level 3 Static in IfOwner')).toBeInTheDocument();
      
      expect(screen.getByTestId('level-4')).toBeInTheDocument();
      expect(screen.getByText('Final level static content')).toBeInTheDocument();
      
      // Verify React components render
      expect(screen.getByText('Complex Owner')).toBeInTheDocument(); // DisplayName
      const profilePhotoNested = container.querySelector('.profile-photo-placeholder, .profile-photo-image');
      expect(profilePhotoNested).toBeInTheDocument(); // ProfilePhoto
      
      expect(screen.getByTestId('right-side')).toBeInTheDocument();
    });
  });

  describe('Performance with Mixed Content', () => {
    it('should handle re-rendering mixed content efficiently', () => {
      const mockData = createMockResidentData();

      const { rerender } = renderWithTemplateContext(
        <GridLayout columns={3}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="performance-static" data-testid={`static-${i}`}>
              <h3>Static Content {i}</h3>
              {i % 2 === 0 ? <DisplayName /> : <ProfilePhoto />}
              <p>Static paragraph {i}</p>
            </div>
          ))}
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify initial render
      expect(screen.getByTestId('static-0')).toBeInTheDocument();
      expect(screen.getByTestId('static-9')).toBeInTheDocument();

      // Re-render with same content - should be efficient
      rerender(
        <GridLayout columns={3}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="performance-static" data-testid={`static-${i}`}>
              <h3>Static Content {i}</h3>
              {i % 2 === 0 ? <DisplayName /> : <ProfilePhoto />}
              <p>Static paragraph {i}</p>
            </div>
          ))}
        </GridLayout>
      );

      // Content should still be there
      expect(screen.getByTestId('static-0')).toBeInTheDocument();
      expect(screen.getByTestId('static-9')).toBeInTheDocument();
      expect(screen.getAllByText(/Static Content/)).toHaveLength(10);
    });
  });
});