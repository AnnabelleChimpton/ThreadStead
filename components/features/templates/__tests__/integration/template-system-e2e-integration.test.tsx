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
import ProfileHeader from '../../ProfileHeader';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';
import ProgressTracker, { ProgressItem } from '../../ProgressTracker';
import ImageCarousel, { CarouselImage } from '../../ImageCarousel';

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

  describe('New Component Integration (ProgressTracker)', () => {
    it('should integrate ProgressTracker with other template components', () => {
      const mockData = createMockResidentData({
        owner: { 
          id: 'dev123', 
          handle: 'developer', 
          displayName: 'Jane Developer',
          avatarUrl: '/assets/jane-dev.jpg'
        },
        capabilities: {
          bio: 'Full-stack developer with 5 years of experience'
        }
      });

      const { container } = renderWithTemplateContext(
        <div className="developer-profile">
          <ProfileHeader showPhoto showBio />
          
          <GridLayout columns={2} gap="lg">
            <div className="skills-section">
              <ProgressTracker title="Technical Skills" display="bars" theme="modern">
                <ProgressItem label="React" value={85} color="blue" />
                <ProgressItem label="TypeScript" value={80} color="green" />
                <ProgressItem label="Node.js" value={75} color="purple" />
                <ProgressItem label="Python" value={60} color="yellow" />
              </ProgressTracker>
            </div>
            
            <div className="ratings-section">
              <ProgressTracker title="Project Ratings" display="stars" theme="retro">
                <ProgressItem label="E-commerce Site" value={4} max={5} />
                <ProgressItem label="Mobile App" value={5} max={5} />
                <ProgressItem label="Dashboard" value={3} max={5} />
              </ProgressTracker>
            </div>
          </GridLayout>

          <FlexContainer direction="row" gap="lg">
            <GradientBox gradient="neon" padding="md">
              <ProgressTracker title="2024 Goals" display="circles" theme="neon" showValues size="sm">
                <ProgressItem label="Learning" value={75} color="pink" />
                <ProgressItem label="Projects" value={60} color="blue" />
              </ProgressTracker>
            </GradientBox>
            
            <CenteredBox maxWidth="md">
              <ProgressTracker title="Skill Levels" display="dots" layout="horizontal" theme="minimal">
                <ProgressItem label="JavaScript" value={9} max={10} />
                <ProgressItem label="CSS" value={8} max={10} />
                <ProgressItem label="Design" value={6} max={10} />
              </ProgressTracker>
            </CenteredBox>
          </FlexContainer>

          <BlogPosts />
        </div>,
        { residentData: mockData }
      );

      // Verify ProgressTracker components render
      expect(screen.getByText('Technical Skills')).toBeInTheDocument();
      expect(screen.getByText('Project Ratings')).toBeInTheDocument();
      expect(screen.getByText('2024 Goals')).toBeInTheDocument();
      expect(screen.getByText('Skill Levels')).toBeInTheDocument();

      // Verify progress items render
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Site')).toBeInTheDocument();
      expect(screen.getByText('4/5')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();

      // Verify layout integration
      expect(container.querySelector('.ts-progress-tracker')).toBeInTheDocument();
      expect(container.querySelector('.ts-progress-bar-fill')).toBeInTheDocument();
      expect(container.querySelector('.ts-progress-stars')).toBeInTheDocument();
      expect(container.querySelector('.ts-progress-circle')).toBeInTheDocument();
      expect(container.querySelector('.ts-progress-dots')).toBeInTheDocument();

      // Verify other components still work alongside ProgressTracker
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
      expect(screen.getByText('Full-stack developer with 5 years of experience')).toBeInTheDocument();
      expect(screen.getByText('Recent Posts')).toBeInTheDocument();
    });

    it('should handle ProgressTracker with conditional rendering', () => {
      const ownerData = createMockResidentData({
        owner: { id: 'owner123', handle: 'owner', displayName: 'Owner User' },
        viewer: { id: 'owner123' } // Owner viewing their own profile
      });

      renderWithTemplateContext(
        <div className="conditional-progress">
          <IfOwner>
            <ProgressTracker title="Private Skills (Owner Only)">
              <ProgressItem label="Secret Skill" value={95} />
            </ProgressTracker>
          </IfOwner>
          
          <IfVisitor>
            <ProgressTracker title="Public Skills (Visitors)">
              <ProgressItem label="Public Skill" value={75} />
            </ProgressTracker>
          </IfVisitor>
        </div>,
        { residentData: ownerData }
      );

      // Owner should see their private skills
      expect(screen.getByText('Private Skills (Owner Only)')).toBeInTheDocument();
      expect(screen.getByText('Secret Skill')).toBeInTheDocument();
      expect(screen.queryByText('Public Skills (Visitors)')).not.toBeInTheDocument();
    });

    it('should handle ProgressTracker performance with many items', () => {
      const mockData = createMockResidentData();
      
      const startTime = Date.now();

      const { container } = renderWithTemplateContext(
        <ProgressTracker title="All My Skills" display="bars" size="sm">
          {Array.from({ length: 50 }, (_, i) => (
            <ProgressItem 
              key={i}
              label={`Skill ${i + 1}`} 
              value={Math.floor(Math.random() * 100)} 
              color={['blue', 'green', 'red', 'purple', 'pink', 'yellow'][i % 6]}
            />
          ))}
        </ProgressTracker>,
        { residentData: mockData }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should handle many progress items efficiently
      expect(processingTime).toBeLessThan(500);
      expect(screen.getByText('All My Skills')).toBeInTheDocument();
      expect(screen.getByText('Skill 1')).toBeInTheDocument();
      expect(screen.getByText('Skill 50')).toBeInTheDocument();

      const progressBars = container.querySelectorAll('.ts-progress-bar-fill');
      expect(progressBars).toHaveLength(50);
    });
  });

  describe('ImageCarousel Integration', () => {
    it('should integrate ImageCarousel with resident data and other components', () => {
      const mockData = createMockResidentData({
        owner: { 
          id: 'photographer123', 
          handle: 'photographer', 
          displayName: 'Jane Photographer',
          avatarUrl: '/assets/jane-photo.jpg'
        },
        images: [
          {
            id: 'photo-1',
            url: '/gallery/landscape1.jpg',
            alt: 'Mountain landscape',
            caption: 'Sunrise over the mountains',
            createdAt: new Date().toISOString()
          },
          {
            id: 'photo-2',
            url: '/gallery/portrait1.jpg',
            alt: 'Portrait photography',
            caption: 'Professional headshot',
            createdAt: new Date().toISOString()
          },
          {
            id: 'photo-3',
            url: '/gallery/nature1.jpg',
            alt: 'Nature photography',
            caption: 'Forest in autumn',
            createdAt: new Date().toISOString()
          }
        ]
      });

      const { container } = renderWithTemplateContext(
        <div className="photographer-portfolio">
          <ProfileHeader showPhoto showBio />
          
          <GridLayout columns={1} gap="lg">
            <div className="main-gallery">
              <h2>My Photography</h2>
              <ImageCarousel height="lg" transition="fade" autoplay interval={4} />
            </div>
            
            <SplitLayout ratio="2:1" gap="md">
              <div className="custom-gallery">
                <h3>Featured Work</h3>
                <ImageCarousel height="md" controls="dots">
                  <CarouselImage 
                    src="/featured/wedding1.jpg" 
                    alt="Wedding photography" 
                    caption="Sarah & Mike's Wedding"
                    link="https://portfolio.com/wedding1"
                  />
                  <CarouselImage 
                    src="/featured/event1.jpg" 
                    alt="Event photography" 
                    caption="Corporate Event 2024"
                  />
                </ImageCarousel>
              </div>
              
              <div className="skills-section">
                <ProgressTracker title="Photography Skills" display="bars" size="sm">
                  <ProgressItem label="Portrait" value={95} color="blue" />
                  <ProgressItem label="Landscape" value={90} color="green" />
                  <ProgressItem label="Event" value={85} color="purple" />
                </ProgressTracker>
              </div>
            </SplitLayout>
          </GridLayout>
        </div>,
        { residentData: mockData }
      );

      // Verify ImageCarousel components render
      expect(container.querySelector('.ts-image-carousel')).toBeInTheDocument();
      expect(screen.getByText('My Photography')).toBeInTheDocument();
      expect(screen.getByText('Featured Work')).toBeInTheDocument();

      // Verify resident data images are used in main carousel
      expect(screen.getByAltText('Mountain landscape')).toBeInTheDocument();
      expect(screen.getByText('Sunrise over the mountains')).toBeInTheDocument();

      // Verify custom images are used in featured carousel
      expect(screen.getByAltText('Wedding photography')).toBeInTheDocument();
      expect(screen.getByText("Sarah & Mike's Wedding")).toBeInTheDocument();

      // Verify carousel controls
      expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
      expect(screen.getByLabelText('Next image')).toBeInTheDocument();
      expect(screen.getByLabelText('Pause slideshow')).toBeInTheDocument(); // Autoplay enabled

      // Verify integration with other components
      expect(screen.getByText('Jane Photographer')).toBeInTheDocument();
      expect(screen.getByText('Photography Skills')).toBeInTheDocument();
      expect(screen.getByText('Portrait')).toBeInTheDocument();

      // Verify layout integration
      const gridLayout = container.querySelector('.grid');
      const splitLayout = container.querySelector('.ts-split-layout');
      expect(gridLayout).toBeInTheDocument();
      expect(splitLayout).toBeInTheDocument();
    });

    it('should handle ImageCarousel with empty image data gracefully', () => {
      const mockData = createMockResidentData({
        images: [] // No images
      });

      renderWithTemplateContext(
        <div className="empty-gallery">
          <h2>My Gallery</h2>
          <ImageCarousel />
          <p>Other content should still render</p>
        </div>,
        { residentData: mockData }
      );

      expect(screen.getByText('My Gallery')).toBeInTheDocument();
      expect(screen.getByText('No images to display')).toBeInTheDocument();
      expect(screen.getByText('Upload some images to create a carousel')).toBeInTheDocument();
      expect(screen.getByText('Other content should still render')).toBeInTheDocument();
    });

    it('should handle ImageCarousel with conditional rendering', () => {
      const ownerData = createMockResidentData({
        owner: { id: 'owner123', handle: 'owner', displayName: 'Gallery Owner' },
        viewer: { id: 'owner123' }, // Owner viewing their own profile
        images: [
          {
            id: 'private-1',
            url: '/private/personal.jpg',
            alt: 'Personal photo',
            caption: 'Private gallery',
            createdAt: new Date().toISOString()
          }
        ]
      });

      renderWithTemplateContext(
        <div className="conditional-gallery">
          <IfOwner>
            <h3>Private Gallery (Owner Only)</h3>
            <ImageCarousel height="sm" controls="arrows" />
          </IfOwner>
          
          <IfVisitor>
            <h3>Public Gallery</h3>
            <ImageCarousel>
              <CarouselImage src="/public/demo.jpg" alt="Public demo" />
            </ImageCarousel>
          </IfVisitor>
        </div>,
        { residentData: ownerData }
      );

      // Owner should see their private gallery
      expect(screen.getByText('Private Gallery (Owner Only)')).toBeInTheDocument();
      expect(screen.getByAltText('Personal photo')).toBeInTheDocument();
      expect(screen.queryByText('Public Gallery')).not.toBeInTheDocument();
    });

    it('should handle multiple ImageCarousels with different configurations', () => {
      const mockData = createMockResidentData({
        images: [
          {
            id: 'img1',
            url: '/test1.jpg',
            alt: 'Test image 1',
            caption: 'First image',
            createdAt: new Date().toISOString()
          },
          {
            id: 'img2',
            url: '/test2.jpg',
            alt: 'Test image 2',
            caption: 'Second image',
            createdAt: new Date().toISOString()
          }
        ]
      });

      const { container } = renderWithTemplateContext(
        <FlexContainer direction="column" gap="lg">
          <div className="carousel-1">
            <ImageCarousel height="lg" transition="slide" showThumbnails loop />
          </div>
          
          <div className="carousel-2">
            <ImageCarousel height="sm" transition="fade" controls="dots" showThumbnails={false} />
          </div>
          
          <div className="carousel-3">
            <ImageCarousel height="md" controls="arrows" autoplay={false}>
              <CarouselImage src="/override1.jpg" alt="Override 1" />
              <CarouselImage src="/override2.jpg" alt="Override 2" />
            </ImageCarousel>
          </div>
        </FlexContainer>,
        { residentData: mockData }
      );

      const carousels = container.querySelectorAll('.ts-image-carousel');
      expect(carousels).toHaveLength(3);

      // First carousel uses resident data
      expect(screen.getByAltText('Test image 1')).toBeInTheDocument();
      
      // Third carousel uses custom images
      expect(screen.getByAltText('Override 1')).toBeInTheDocument();
      expect(screen.getByAltText('Override 2')).toBeInTheDocument();

      // Verify different height configurations
      const mainAreas = container.querySelectorAll('.ts-carousel-main');
      expect(mainAreas[0]).toHaveClass('h-96'); // lg
      expect(mainAreas[1]).toHaveClass('h-48'); // sm
      expect(mainAreas[2]).toHaveClass('h-64'); // md
    });
  });
});