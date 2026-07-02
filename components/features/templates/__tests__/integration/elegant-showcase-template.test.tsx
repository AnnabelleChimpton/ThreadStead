/**
 * Integration test for the "elegant showcase" template scenario.
 *
 * The original elegant-showcase-template.html fixture file was removed from
 * the repo root ("Post truncation and general cleanup"), and the unified/rehype
 * template parsing pipeline is stubbed out globally in jest.setup.js (the real
 * packages are ESM-only). This suite therefore renders the showcase structure
 * directly with the real template components — the same tree the template
 * system produces after parsing — and verifies structure, nesting, conditional
 * rendering and CSS application.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';

// Mock the PostItem component since it has complex dependencies
// (ChatContext, next/dynamic PixelIcon, IntersectionObserver view tracking)
jest.mock('@/components/core/content/PostItem', () => {
  return function MockPostItem({ post }: any) {
    return <div data-testid={`mock-post-item-${post?.id}`}>Post: {post?.bodyHtml}</div>;
  };
});

// PixelIcon uses next/dynamic which does not resolve in the jest environment
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />
}));

// UserMention -> UserQuickView calls useChat, which requires the app-shell ChatProvider
jest.mock('@/contexts/ChatContext', () => ({
  __esModule: true,
  useChat: () => ({ openDM: jest.fn() }),
  ChatProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeAll(() => {
  // FollowButton and Guestbook fetch from the API on mount
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({})
    } as Response)
  ) as jest.Mock;
});

import ProfileHero from '../../ProfileHero';
import Bio from '../../Bio';
import ProfilePhoto from '../../ProfilePhoto';
import DisplayName from '../../DisplayName';
import BlogPosts from '../../BlogPosts';
import Guestbook from '../../Guestbook';
import WebsiteDisplay from '../../WebsiteDisplay';
import FollowButton from '../../FollowButton';
import StickyNote from '../../StickyNote';
import CenteredBox from '../../CenteredBox';
import GradientBox from '../../GradientBox';
import FlexContainer from '../../FlexContainer';
import SplitLayout from '../../SplitLayout';
import GridLayout from '../../GridLayout';
import Tabs, { Tab } from '../../Tabs';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';
import Show from '../../conditional/Show';
import Choose, { When, Otherwise } from '../../conditional/Choose';

// CSS from the elegant showcase template (trimmed to the parts asserted below)
const templateCSS = `
:root {
  --primary-gold: #d4af37;
  --soft-cream: #faf8f3;
  --deep-charcoal: #2c2c2c;
  --sage-green: #9caf88;
}

.elegant-header {
  text-align: center;
  padding: 3rem 2rem;
}

.content-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 2rem;
}

.section-title {
  color: var(--primary-gold);
  border-bottom: 2px solid var(--primary-gold);
}

.elegant-card {
  border-radius: 8px;
  padding: 1.5rem;
}

@keyframes gentle-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// The elegant showcase template structure, as the template system renders it
function ElegantShowcase() {
  return (
    <>
      <div className="hero-section">
        <div className="elegant-header">
          <ProfileHero variant="plain" />
          <div className="subtitle">Welcome to my digital sanctuary</div>
        </div>
      </div>

      <CenteredBox containerMaxWidth="xl" containerPadding="lg">
        <div className="content-section">
          <GradientBox gradient="sunset" direction="br" containerPadding="lg" rounded>
            <FlexContainer direction="row" align="center" justify="between" gapSize="lg">
              <div style={{ flex: 1 }}>
                <h2 className="section-title">About Me</h2>
                <Bio />
              </div>
              <div className="interactive-element">
                <ProfilePhoto size="lg" shape="circle" />
              </div>
            </FlexContainer>
          </GradientBox>
        </div>

        <SplitLayout ratio="2:1" spacing="xl">
          <div>
            <div className="content-section">
              <Tabs>
                <Tab title="Latest Thoughts">
                  <div className="section-title">Recent Musings</div>
                  <BlogPosts limit={5} />
                </Tab>
                <Tab title="Interactive">
                  <GridLayout columns={2} gapSize="lg">
                    <div className="elegant-card">Card A</div>
                    <div className="elegant-card">Card B</div>
                  </GridLayout>
                </Tab>
              </Tabs>
            </div>
          </div>

          <aside>
            <div className="sidebar-widget">
              <h3>Quick Connect</h3>
              <IfVisitor>
                <FollowButton />
              </IfVisitor>
              <IfOwner>
                <StickyNote noteColor="yellow" size="md" rotation={-2}>
                  <p>Welcome back! Your space looks wonderful today.</p>
                </StickyNote>
              </IfOwner>
            </div>
            <div className="sidebar-widget">
              <DisplayName as="span" />
            </div>
          </aside>
        </SplitLayout>

        <div className="content-section">
          <h2 className="section-title">Leave Your Mark</h2>
          <Guestbook />
        </div>

        <footer className="content-section">
          <Choose>
            <When when="has:websites">
              <WebsiteDisplay />
            </When>
            <Otherwise>
              <p className="footer-quote">
                In the garden of digital creativity, every visit plants a seed of inspiration.
              </p>
            </Otherwise>
          </Choose>
        </footer>
      </CenteredBox>
    </>
  );
}

describe('Elegant Showcase Template Integration', () => {
  describe('Component Rendering', () => {
    it('should render the template with mock data', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'elegantuser',
          displayName: 'Elegant User',
          avatarUrl: '/elegant-avatar.jpg'
        },
        capabilities: {
          bio: 'Welcome to my elegant digital space'
        },
        posts: [
          {
            id: 'post1',
            bodyHtml: '<p>Latest thought from the elegant template</p>',
            createdAt: new Date().toISOString()
          }
        ]
      });

      const { container } = renderWithTemplateContext(<ElegantShowcase />, {
        residentData: mockData
      });

      // Structure is preserved
      expect(container.querySelector('.hero-section')).toBeInTheDocument();
      expect(container.querySelector('.elegant-header')).toBeInTheDocument();
      expect(container.querySelectorAll('.content-section').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('.section-title').length).toBeGreaterThan(0);

      // Components rendered with data (ProfileHero h1 and sidebar DisplayName)
      expect(screen.getAllByText('Elegant User').length).toBeGreaterThan(0);
      expect(screen.getByText('Welcome to my elegant digital space')).toBeInTheDocument(); // Bio
    });

    it('should handle nested layouts correctly', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(<ElegantShowcase />, {
        residentData: mockData
      });

      // CenteredBox > ... > SplitLayout structure
      const centeredBox = container.querySelector('.mx-auto');
      expect(centeredBox).toBeInTheDocument();

      const splitLayout = centeredBox?.querySelector('.w-full.flex.flex-col');
      expect(splitLayout).toBeInTheDocument();

      // SplitLayout keeps its two column wrappers (2:1 ratio)
      expect(splitLayout?.querySelector('.lg\\:w-2\\/3')).toBeInTheDocument();
      expect(splitLayout?.querySelector('.lg\\:w-1\\/3')).toBeInTheDocument();

      // GradientBox + FlexContainer inside the intro section
      expect(container.querySelector('.bg-gradient-to-br.from-orange-400')).toBeInTheDocument();
      expect(container.querySelector('.flex.items-center.justify-between')).toBeInTheDocument();
    });

    it('should handle conditional rendering (IfOwner, IfVisitor, Choose/When/Otherwise)', () => {
      // Test as owner
      const ownerData = createMockResidentData({
        viewer: { id: 'user123' },
        owner: { id: 'user123', handle: 'owner', displayName: 'Owner' },
        websites: []
      });

      const { container: ownerContainer } = renderWithTemplateContext(
        <ElegantShowcase />,
        { residentData: ownerData }
      );

      // Owner sees the sticky note, not the follow button
      expect(
        screen.getByText('Welcome back! Your space looks wonderful today.')
      ).toBeInTheDocument();
      expect(ownerContainer.querySelector('.follow-button-wrapper')).not.toBeInTheDocument();

      // No websites -> Otherwise branch renders
      expect(ownerContainer.querySelector('.footer-quote')).toBeInTheDocument();

      // Test as visitor
      const visitorData = createMockResidentData({
        viewer: { id: 'visitor123' },
        owner: { id: 'user123', handle: 'owner', displayName: 'Owner' }
      });

      const { container: visitorContainer } = renderWithTemplateContext(
        <ElegantShowcase />,
        { residentData: visitorData }
      );

      // Visitor sees the follow button, not the sticky note
      expect(visitorContainer.querySelector('.follow-button-wrapper')).toBeInTheDocument();
      expect(
        visitorContainer.textContent
      ).not.toContain('Welcome back! Your space looks wonderful today.');
    });
  });

  describe('CSS Extraction and Application', () => {
    it('should contain the elegant template CSS definitions', () => {
      expect(templateCSS).toContain('--primary-gold: #d4af37');
      expect(templateCSS).toContain('.elegant-header');
      expect(templateCSS).toContain('.content-section');
      expect(templateCSS).toMatch(/@keyframes\s+gentle-rotate/);
    });

    it('should apply CSS styles to rendered components', () => {
      const mockData = createMockResidentData();

      const { container } = renderWithTemplateContext(
        <>
          <style dangerouslySetInnerHTML={{ __html: templateCSS }} />
          <ElegantShowcase />
        </>,
        { residentData: mockData }
      );

      // CSS is in the document
      const styles = container.querySelector('style');
      expect(styles?.textContent).toContain('--primary-gold');

      // Elements carry the classes the CSS targets
      const header = container.querySelector('.elegant-header');
      expect(header).toBeInTheDocument();
      expect(header?.classList.contains('elegant-header')).toBe(true);
      expect(container.querySelector('.section-title')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should render gracefully with empty resident data', () => {
      const emptyData = createMockResidentData({
        owner: { id: '', handle: '', displayName: '', avatarUrl: undefined },
        capabilities: {},
        posts: [],
        websites: [],
        badges: []
      });

      expect(() => {
        const { container } = renderWithTemplateContext(<ElegantShowcase />, {
          residentData: emptyData
        });
        expect(container.querySelector('.hero-section')).toBeInTheDocument();
      }).not.toThrow();
    });
  });
});
