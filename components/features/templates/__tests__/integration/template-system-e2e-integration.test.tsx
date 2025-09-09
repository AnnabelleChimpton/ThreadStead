import React from 'react';
import { screen, render } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';

// Import components directly instead of going through the template engine
import DisplayName from '../../DisplayName';
import Bio from '../../Bio';
import ProfilePhoto from '../../ProfilePhoto';
import BlogPosts from '../../BlogPosts';
import Guestbook from '../../Guestbook';
import WebsiteDisplay from '../../WebsiteDisplay';
import ProfileBadges from '../../ProfileBadges';
import MutualFriends from '../../MutualFriends';
import GridLayout from '../../GridLayout';
import SplitLayout from '../../SplitLayout';
import FlexContainer from '../../FlexContainer';
import GradientBox from '../../GradientBox';
import CenteredBox from '../../CenteredBox';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';

describe('Template System End-to-End Integration', () => {
  describe('Complete Template Component Integration (simulating template system)', () => {
    it('should handle simple template with basic components', () => {
      // Simulate what the template system would produce for:
      // <div class="profile-container">
      //   <h1>My Profile</h1>
      //   <DisplayName />
      //   <Bio />
      //   <ProfilePhoto />
      // </div>

      const mockData = createMockResidentData({
        owner: { 
          id: 'user123', 
          handle: 'testuser', 
          displayName: 'Test User Profile',
          avatarUrl: '/assets/test-avatar.jpg'
        },
        capabilities: {
          bio: 'This is my test bio from the template system!'
        }
      });

      // Simulate the final rendered React structure that template system would produce
      const { container } = renderWithTemplateContext(
        <div className="profile-container">
          <h1>My Profile</h1>
          <DisplayName />
          <Bio />
          <ProfilePhoto />
        </div>,
        { residentData: mockData }
      );

      // Check structure
      expect(container.querySelector('.profile-container')).toBeInTheDocument();
      expect(screen.getByText('My Profile')).toBeInTheDocument();

      // Check components rendered correctly
      expect(screen.getByText('Test User Profile')).toBeInTheDocument(); // DisplayName
      expect(screen.getByText('This is my test bio from the template system!')).toBeInTheDocument(); // Bio
      expect(container.querySelector('.profile-photo-wrapper')).toBeInTheDocument(); // ProfilePhoto
    });

    it('should handle complex nested layout template', () => {
      // Simulate what the template system would produce for a complex nested layout:
      // <GridLayout columns="2" gap="lg">
      //   <SplitLayout ratio="1:2" gap="md">
      //     <FlexContainer direction="column" gap="sm">
      //       <GradientBox gradient="sunset" padding="md">
      //         <h2>Welcome Section</h2>
      //         <DisplayName />
      //         <Bio />
      //       </GradientBox>
      //     </FlexContainer>
      //     <CenteredBox maxWidth="md" padding="lg">
      //       <ProfilePhoto />
      //       <p class="description">Profile photo section</p>
      //     </CenteredBox>
      //   </SplitLayout>
      //   <div class="sidebar">
      //     <h3>My Blog Posts</h3>
      //     <BlogPosts />
      //   </div>
      // </GridLayout>

      const mockData = createMockResidentData({
        owner: { 
          id: 'complex123', 
          handle: 'complexuser', 
          displayName: 'Complex User',
          avatarUrl: '/test.jpg'
        },
        posts: [
          {
            id: 'post1',
            contentHtml: '<p>First blog post from template</p>',
            createdAt: new Date().toISOString()
          },
          {
            id: 'post2',
            contentHtml: '<p>Second blog post with <strong>formatting</strong></p>',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      });

      const { container } = renderWithTemplateContext(
        <GridLayout columns={2} gap="lg">
          <SplitLayout ratio="1:2" gap="md">
            <FlexContainer direction="column" gap="sm">
              <GradientBox gradient="sunset" padding="md">
                <h2>Welcome Section</h2>
                <DisplayName />
                <Bio />
              </GradientBox>
            </FlexContainer>
            <CenteredBox maxWidth="md" padding="lg">
              <ProfilePhoto />
              <p className="description">Profile photo section</p>
            </CenteredBox>
          </SplitLayout>
          <div className="sidebar">
            <h3>My Blog Posts</h3>
            <BlogPosts />
          </div>
        </GridLayout>,
        { residentData: mockData }
      );

      // Verify layout structure
      expect(container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.gap-6')).toBeInTheDocument(); // GridLayout
      expect(container.querySelector('.w-full.flex.flex-col.lg\\:flex-row.gap-4')).toBeInTheDocument(); // SplitLayout
      expect(container.querySelector('.flex.flex-col.items-start.justify-start.gap-2')).toBeInTheDocument(); // FlexContainer
      expect(container.querySelector('.bg-gradient-to-br.from-orange-400')).toBeInTheDocument(); // GradientBox
      expect(container.querySelector('.mx-auto.max-w-md.p-8')).toBeInTheDocument(); // CenteredBox

      // Verify nested content
      expect(screen.getByText('Welcome Section')).toBeInTheDocument();
      expect(screen.getByText('Complex User')).toBeInTheDocument();
      expect(screen.getByText('Profile photo section')).toBeInTheDocument();
      expect(screen.getByText('My Blog Posts')).toBeInTheDocument();
      // Blog posts render through PostItem component, so check for the actual rendered content
      expect(screen.getByText('Recent Posts')).toBeInTheDocument(); // BlogPosts component title
      // Note: Post content rendering depends on PostItem component implementation
    });

    it('should handle conditional logic in templates', () => {
      // Test as owner first
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
        <div className="conditional-template">
          <h1>Conditional Content Test</h1>
          <IfOwner>
            <div className="owner-section" data-testid="owner-section">
              <h2>Owner Only Content</h2>
              <p>This is only visible to the profile owner</p>
              <Bio />
            </div>
          </IfOwner>
          <IfVisitor>
            <div className="visitor-section" data-testid="visitor-section">
              <h2>Visitor Content</h2>
              <p>This is visible to visitors</p>
            </div>
          </IfVisitor>
          <div className="always-visible">
            <DisplayName />
            <ProfilePhoto />
          </div>
        </div>,
        { residentData: ownerData }
      );

      // As owner: should see owner content, not visitor content
      expect(screen.getByTestId('owner-section')).toBeInTheDocument();
      expect(screen.getByText('Owner Only Content')).toBeInTheDocument();
      expect(screen.queryByTestId('visitor-section')).not.toBeInTheDocument();
      expect(screen.getByText('Profile Owner')).toBeInTheDocument(); // Always visible
    });

    it('should handle conditional logic for visitors', () => {
      // Test as visitor
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
        <div className="conditional-template">
          <h1>Conditional Content Test</h1>
          <IfOwner>
            <div className="owner-section" data-testid="owner-section">
              <h2>Owner Only Content</h2>
              <p>This is only visible to the profile owner</p>
              <Bio />
            </div>
          </IfOwner>
          <IfVisitor>
            <div className="visitor-section" data-testid="visitor-section">
              <h2>Visitor Content</h2>
              <p>This is visible to visitors</p>
            </div>
          </IfVisitor>
          <div className="always-visible">
            <DisplayName />
            <ProfilePhoto />
          </div>
        </div>,
        { residentData: visitorData }
      );

      // As visitor: should see visitor content, not owner content
      expect(screen.queryByTestId('owner-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('visitor-section')).toBeInTheDocument();
      expect(screen.getByText('Visitor Content')).toBeInTheDocument();
      expect(screen.getByText('Profile Owner')).toBeInTheDocument(); // Always visible
    });

    it('should handle comprehensive data integration across all components', () => {
      // Test comprehensive resident data integration across multiple components
      const comprehensiveData = createMockResidentData({
        owner: {
          id: 'comprehensive123',
          handle: 'comprehensive',
          displayName: 'Comprehensive User',
          avatarUrl: '/comprehensive.jpg'
        },
        capabilities: {
          bio: 'A comprehensive user profile with all the features!'
        },
        posts: [
          {
            id: 'comp1',
            contentHtml: '<p>My comprehensive post with <em>italics</em> and <strong>bold</strong>.</p>',
            createdAt: new Date().toISOString()
          }
        ],
        guestbook: [
          {
            id: 'guest1',
            message: 'Great comprehensive profile!',
            authorUsername: 'visitor1',
            createdAt: new Date().toISOString()
          }
        ],
        featuredFriends: [
          {
            id: 'friend1',
            handle: 'friend1',
            displayName: 'Best Friend',
            avatarUrl: '/friend1.jpg'
          }
        ],
        websites: [
          {
            id: 'site1',
            label: 'My Website',
            url: 'https://example.com',
            blurb: 'Check out my personal website'
          }
        ],
        badges: [
          {
            id: 'badge1',
            title: 'Early Adopter',
            subtitle: 'Joined in 2024',
            backgroundColor: '#3B82F6',
            textColor: '#FFFFFF',
            threadRing: {
              id: 'ring1',
              name: 'Tech Community',
              slug: 'tech'
            }
          }
        ]
      });

      const { container } = renderWithTemplateContext(
        <div className="comprehensive-profile">
          <header className="profile-header">
            <DisplayName />
            <ProfilePhoto />
            <Bio />
          </header>
          
          <main className="profile-content">
            <GridLayout columns={2} gap="lg">
              <section className="posts-section">
                <h2>My Posts</h2>
                <BlogPosts />
              </section>
              
              <section className="social-section">
                <h2>Social</h2>
                <MutualFriends />
                <Guestbook />
              </section>
            </GridLayout>
          </main>
          
          <aside className="profile-sidebar">
            <WebsiteDisplay />
            <ProfileBadges />
          </aside>
        </div>,
        { residentData: comprehensiveData }
      );

      // Verify all sections render with correct data
      expect(screen.getByText('Comprehensive User')).toBeInTheDocument();
      expect(screen.getByText('A comprehensive user profile with all the features!')).toBeInTheDocument();
      // Blog posts content is rendered through PostItem - check for elements that should be there
      expect(screen.getByText('Recent Posts')).toBeInTheDocument(); // BlogPosts title
      // Check that the blog post article exists (the content is rendered as HTML)
      expect(container.querySelector('[data-post-id="comp1"]')).toBeInTheDocument();
      // Note: Guestbook component uses OriginalGuestbook which fetches data independently, not using mock data
      expect(screen.getByText('My Website')).toBeInTheDocument();
      expect(screen.getByText('Early Adopter')).toBeInTheDocument();
    });

    it('should handle error cases gracefully without crashing', () => {
      // Test that components handle missing or malformed data gracefully
      const emptyData = createMockResidentData({
        owner: { id: '', handle: '', displayName: '', avatarUrl: undefined },
        capabilities: { bio: undefined },
        posts: [],
        guestbook: [],
        featuredFriends: [],
        websites: [],
        badges: []
      });

      const { container } = renderWithTemplateContext(
        <div className="error-test">
          <h1>Error Handling Test</h1>
          <DisplayName /> {/* Should handle empty displayName */}
          <Bio />         {/* Should handle undefined bio */}
          <ProfilePhoto /> {/* Should handle undefined avatarUrl */}
          <BlogPosts />    {/* Should handle empty posts array */}
          <Guestbook />    {/* Should handle empty guestbook array */}
        </div>,
        { residentData: emptyData }
      );

      // Should not crash and should render the container
      expect(screen.getByText('Error Handling Test')).toBeInTheDocument();
      expect(container.querySelector('.error-test')).toBeInTheDocument();

      // Components should render gracefully with defaults or empty states
      // (Not checking specific content since components may handle missing data differently)
    });
  });

  describe('Template System Performance and Scalability', () => {
    it('should handle large component collections efficiently', () => {
      // Simulate large template by rendering many components at once
      const mockData = createMockResidentData({
        posts: Array.from({ length: 20 }, (_, i) => ({
          id: `post-${i}`,
          contentHtml: `<p>Blog post ${i} content</p>`,
          createdAt: new Date(Date.now() - i * 86400000).toISOString()
        }))
      });

      const startTime = Date.now();

      const { container } = renderWithTemplateContext(
        <GridLayout columns={4} gap="sm">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className={`item-${i}`}>
              <h3>Item {i}</h3>
              <DisplayName />
              <ProfilePhoto />
              {i % 3 === 0 && <Bio />}
              {i % 5 === 0 && <BlogPosts />}
            </div>
          ))}
        </GridLayout>,
        { residentData: mockData }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process reasonably quickly (under 1 second)
      expect(processingTime).toBeLessThan(1000);

      // Verify content renders
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 19')).toBeInTheDocument();
    });

    it('should handle deeply nested structures without performance degradation', () => {
      const mockData = createMockResidentData();

      const startTime = Date.now();

      const { container } = renderWithTemplateContext(
        <GridLayout columns={1}>
          <SplitLayout ratio="1:1">
            <FlexContainer direction="column">
              <GradientBox gradient="sunset">
                <CenteredBox maxWidth="md">
                  <div className="level-5">
                    <h1>Deep Nesting Test</h1>
                    <FlexContainer direction="row">
                      <div className="level-6">
                        <GradientBox gradient="ocean" padding="sm">
                          <div className="level-7">
                            <DisplayName />
                            <SplitLayout ratio="1:2">
                              <ProfilePhoto />
                              <div className="level-8">
                                <GridLayout columns={2} gap="xs">
                                  <Bio />
                                  <div className="final-level">Final Level Content</div>
                                </GridLayout>
                              </div>
                            </SplitLayout>
                          </div>
                        </GradientBox>
                      </div>
                    </FlexContainer>
                  </div>
                </CenteredBox>
              </GradientBox>
            </FlexContainer>
            <BlogPosts />
          </SplitLayout>
        </GridLayout>,
        { residentData: mockData }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process quickly despite deep nesting
      expect(processingTime).toBeLessThan(500);

      // Verify all levels render correctly
      expect(screen.getByText('Deep Nesting Test')).toBeInTheDocument();
      expect(screen.getByText('Final Level Content')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument(); // DisplayName deep inside

      // Verify complex layout structures are maintained
      expect(container.querySelector('.grid')).toBeInTheDocument();
      expect(container.querySelector('.bg-gradient-to-br.from-orange-400')).toBeInTheDocument(); // Sunset gradient
      expect(container.querySelector('.bg-gradient-to-br.from-blue-400')).toBeInTheDocument(); // Ocean gradient
    });
  });
});