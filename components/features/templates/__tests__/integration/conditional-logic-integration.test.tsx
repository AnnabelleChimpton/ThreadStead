import React from 'react';
import { screen, render } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';

// Mock the PostItem component since it has complex dependencies
// (ChatContext, next/dynamic PixelIcon, IntersectionObserver view tracking)
jest.mock('@/components/core/content/PostItem', () => {
  return function MockPostItem({ post }: any) {
    return <div data-testid={`mock-post-item-${post.id}`}>Post: {post.bodyHtml}</div>;
  };
});

// PixelIcon uses next/dynamic which does not resolve in the jest environment
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />
}));

import DisplayName from '../../DisplayName';
import Bio from '../../Bio';
import ProfilePhoto from '../../ProfilePhoto';
import BlogPosts from '../../BlogPosts';
import WebsiteDisplay from '../../WebsiteDisplay';
import ProfileBadges from '../../ProfileBadges';
import GridLayout from '../../GridLayout';
import FlexContainer from '../../FlexContainer';
import CenteredBox from '../../CenteredBox';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';

describe('Conditional Logic Integration', () => {
  describe('IfOwner + IfVisitor Mutual Exclusivity', () => {
    it('should maintain mutual exclusivity across complex layouts', () => {
      const ownerData = createMockResidentData({
        viewer: { id: 'owner123' },
        owner: { 
          id: 'owner123', 
          handle: 'owner', 
          displayName: 'Profile Owner',
          avatarUrl: '/owner.jpg'
        }
      });

      const { container } = renderWithTemplateContext(
        <div className="mutual-exclusivity-test">
          <GridLayout columns={2} gapSize="lg">
            <div className="split-layout">
              <IfOwner>
                <div data-testid="owner-section-1">
                  <h2>Owner Section 1</h2>
                  <DisplayName />
                  <Bio />
                </div>
              </IfOwner>
              <IfVisitor>
                <div data-testid="visitor-section-1">
                  <h2>Visitor Section 1</h2>
                  <p>Welcome visitor!</p>
                </div>
              </IfVisitor>
            </div>

            <FlexContainer direction="column" gapSize="sm">
              <IfOwner>
                <div className="gradient-box">
                  <div data-testid="owner-section-2">
                    <h3>Owner Dashboard</h3>
                    <BlogPosts />
                    <WebsiteDisplay />
                  </div>
                </div>
              </IfOwner>
              <IfVisitor>
                <CenteredBox containerMaxWidth="md" containerPadding="lg">
                  <div data-testid="visitor-section-2">
                    <h3>Public Profile</h3>
                    <p>Limited public view</p>
                  </div>
                </CenteredBox>
              </IfVisitor>
            </FlexContainer>
          </GridLayout>
        </div>,
        { residentData: ownerData }
      );

      // As owner: should see owner sections, not visitor sections
      expect(screen.getByTestId('owner-section-1')).toBeInTheDocument();
      expect(screen.getByTestId('owner-section-2')).toBeInTheDocument();
      expect(screen.queryByTestId('visitor-section-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('visitor-section-2')).not.toBeInTheDocument();

      expect(screen.getByText('Owner Section 1')).toBeInTheDocument();
      expect(screen.getByText('Owner Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Welcome visitor!')).not.toBeInTheDocument();
      expect(screen.queryByText('Limited public view')).not.toBeInTheDocument();

      // Layout structure should remain intact
      expect(container.querySelector('.grid')).toBeInTheDocument(); // GridLayout
    });

    it('should switch correctly when viewer changes', () => {
      const visitorData = createMockResidentData({
        viewer: { id: 'visitor456' },
        owner: { 
          id: 'owner123', 
          handle: 'owner', 
          displayName: 'Profile Owner',
          avatarUrl: '/owner.jpg'
        }
      });

      renderWithTemplateContext(
        <div className="viewer-switch-test">
          <GridLayout columns={1} gapSize="md">
            <IfOwner>
              <div data-testid="owner-content">
                <h2>Owner Content</h2>
                <DisplayName />
                <ProfileBadges />
              </div>
            </IfOwner>
            <IfVisitor>
              <div data-testid="visitor-content">
                <h2>Visitor Content</h2>
                <DisplayName />
                <p>Public information only</p>
              </div>
            </IfVisitor>
          </GridLayout>
        </div>,
        { residentData: visitorData }
      );

      // As visitor: should see visitor sections, not owner sections
      expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('visitor-content')).toBeInTheDocument();
      expect(screen.getByText('Visitor Content')).toBeInTheDocument();
      expect(screen.getByText('Public information only')).toBeInTheDocument();
      expect(screen.queryByText('Owner Content')).not.toBeInTheDocument();

      // DisplayName should still render (accessible to both)
      expect(screen.getByText('Profile Owner')).toBeInTheDocument();
    });
  });

  describe('Conditional Components with Layout Wrappers', () => {
    it('should preserve layout integrity with conditional content', () => {
      const ownerData = createMockResidentData({
        viewer: { id: 'owner123' },
        owner: { 
          id: 'owner123', 
          handle: 'layoutowner', 
          displayName: 'Layout Test Owner'
        },
        posts: [
          {
            id: 'post1',
            bodyHtml: '<p>Owner post</p>',
            createdAt: new Date().toISOString()
          }
        ]
      });

      const { container } = renderWithTemplateContext(
        <div className="layout-conditional-test">
          <GridLayout columns={3} gapSize="md">
            <IfOwner>
              <div className="split-layout">
                <div className="gradient-box">
                  <DisplayName />
                </div>
                <FlexContainer direction="column" gapSize="xs">
                  <Bio />
                  <ProfilePhoto />
                </FlexContainer>
              </div>
            </IfOwner>

            <IfVisitor>
              <CenteredBox containerMaxWidth="sm" containerPadding="lg">
                <DisplayName />
                <p>Visitor view</p>
              </CenteredBox>
            </IfVisitor>

            <div className="always-visible">
              <h3>Always Visible</h3>
              <IfOwner>
                <BlogPosts />
              </IfOwner>
              <IfVisitor>
                <p>Limited content for visitors</p>
              </IfVisitor>
            </div>

                          <div data-testid="posts-section">
                <h3>Posts Available</h3>
                <IfOwner>
                  <div data-testid="owner-posts-full">
                    <BlogPosts />
                    <p>Full access to your posts</p>
                  </div>
                </IfOwner>
                <IfVisitor>
                  <div data-testid="visitor-posts-limited">
                    <p>Limited post preview</p>
                  </div>
                </IfVisitor>
              </div>
                      </GridLayout>
        </div>,
        { residentData: ownerData }
      );

      // Layout structure tests simplified to focus on core functionality
      
      // Layout structure should be preserved - check for any grid class
      expect(container.querySelector('.grid')).toBeInTheDocument(); // GridLayout
      expect(container.querySelector('.flex.flex-col')).toBeInTheDocument(); // FlexContainer

      // Owner content should be visible
      expect(screen.getByText('Layout Test Owner')).toBeInTheDocument();
      expect(screen.getByText('Always Visible')).toBeInTheDocument();
      expect(screen.getByTestId('posts-section')).toBeInTheDocument();
      expect(screen.getByTestId('owner-posts-full')).toBeInTheDocument();
      expect(screen.queryByTestId('visitor-posts-limited')).not.toBeInTheDocument();

      // Visitor elements should not be present
      expect(screen.queryByText('Visitor view')).not.toBeInTheDocument();
      expect(screen.queryByText('Limited content for visitors')).not.toBeInTheDocument();
    });

    it('should maintain responsive behavior with conditionals', () => {
      const visitorData = createMockResidentData({
        viewer: { id: 'visitor456' },
        owner: { 
          id: 'owner123', 
          handle: 'responsive', 
          displayName: 'Responsive Test User'
        }
      });

      const { container } = renderWithTemplateContext(
        <div className="responsive-conditional-test">
          <GridLayout columns={1} gapSize="lg">
            <IfOwner>
              <div data-testid="owner-responsive">
                <div className="split-layout">
                  <DisplayName />
                  <Bio />
                </div>
              </div>
            </IfOwner>

            <IfVisitor>
              <div data-testid="visitor-responsive">
                <FlexContainer direction="column" gapSize="sm">
                  <DisplayName />
                  <p>Public profile</p>
                </FlexContainer>
              </div>
            </IfVisitor>

            <div className="universal-section">
                              <div className="gradient-box">
                  <h2>Profile Information</h2>
                  <DisplayName />
                </div>
                          </div>
          </GridLayout>
        </div>,
        { residentData: visitorData }
      );

      // Should render visitor version
      expect(screen.queryByTestId('owner-responsive')).not.toBeInTheDocument();
      expect(screen.getByTestId('visitor-responsive')).toBeInTheDocument();

      // Responsive classes should be preserved in layout components - check for basic classes
      expect(container.querySelector('.grid')).toBeInTheDocument();
      expect(container.querySelector('.flex')).toBeInTheDocument();

      expect(screen.getAllByText('Responsive Test User').length).toBeGreaterThan(0); // Multiple DisplayName components
      expect(screen.getByText('Public profile')).toBeInTheDocument();
    });
  });
});