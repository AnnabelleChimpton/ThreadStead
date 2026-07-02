/**
 * Integration test for the Elegant Showcase Template compilation flow.
 *
 * The original elegant-showcase-template.html fixture file was removed from
 * the repo root ("Post truncation and general cleanup"), so the template is
 * inlined below. The unified/rehype parsing pipeline is stubbed out globally
 * in jest.setup.js (the real packages are ESM-only), so the compilation tests
 * focus on the parts of the compiler that run for real in this environment:
 * mode validation, mode dispatch, fallback generation and CSS injection.
 */

// The compiler pulls in the component registry, which transitively imports the
// DID client, whose @noble/ed25519 dependency is ESM-only and breaks jest.
jest.mock('@/lib/api/did/did-client', () => ({}));

import { createMockResidentData } from '../test-utils';

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

.sidebar-widget {
  border-left: 4px solid var(--sage-green);
  padding: 1.5rem;
}

@keyframes gentle-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .content-section {
    padding: 1.5rem;
  }
}
`;

const templateHTML = `
<div class="hero-section">
  <div class="elegant-header">
    <ProfileHero variant="plain" />
    <div class="subtitle">Welcome to my digital sanctuary</div>
  </div>
</div>

<CenteredBox maxWidth="xl" padding="lg">
  <div class="content-section">
    <GradientBox gradient="sunset" direction="br" padding="lg" rounded="true">
      <FlexContainer direction="row" align="center" justify="between" gap="lg">
        <div>
          <h2 class="section-title">About Me</h2>
          <Bio />
        </div>
        <ProfilePhoto size="lg" shape="circle" />
      </FlexContainer>
    </GradientBox>
  </div>

  <SplitLayout ratio="2:1" gap="xl">
    <div>
      <div class="content-section">
        <Tabs>
          <Tab title="Latest Thoughts">
            <div class="section-title">Recent Musings</div>
            <BlogPosts limit="5" />
          </Tab>
          <Tab title="Visual Stories">
            <MediaGrid />
            <Show when="photos" exists="true">
              <ImageCarousel autoplay="false" showThumbnails="true">
                <CarouselImage src="#" alt="Gallery image 1" caption="A moment in time" />
                <CarouselImage src="#" alt="Gallery image 2" caption="Beauty in simplicity" />
              </ImageCarousel>
            </Show>
          </Tab>
          <Tab title="Skills">
            <SkillChart title="Creative Pursuits" display="bars">
              <Skill name="Writing" level="85" category="Creative" />
              <Skill name="Design" level="82" category="Visual" />
            </SkillChart>
          </Tab>
        </Tabs>
      </div>

      <div class="content-section">
        <GridLayout columns="2" gap="lg">
          <div class="elegant-card">
            <RevealBox buttonText="Discover Hidden Thoughts">
              <PolaroidFrame caption="A secret moment" rotation="3">
                <WaveText text="Hidden Beauty" speed="medium" />
              </PolaroidFrame>
            </RevealBox>
          </div>
          <div class="elegant-card">
            <ProgressTracker title="Current Projects" display="circles">
              <ProgressItem label="Novel Writing" value="65" max="100" />
              <ProgressItem label="Digital Garden" value="85" max="100" />
            </ProgressTracker>
          </div>
        </GridLayout>
      </div>
    </div>

    <aside>
      <div class="sidebar-widget">
        <IfVisitor>
          <FollowButton />
          <ContactCard expanded="false">
            <ContactMethod type="email" value="connect@example.com" />
            <ContactMethod type="website" value="portfolio.example.com" />
          </ContactCard>
        </IfVisitor>
        <IfOwner>
          <StickyNote color="yellow" size="md" rotation="-2">
            <p>Welcome back!</p>
          </StickyNote>
        </IfOwner>
      </div>

      <div class="sidebar-widget">
        <ProfileBadges showTitle="false" layout="grid" />
      </div>

      <div class="sidebar-widget">
        <RetroTerminal variant="green">
          <DisplayName as="span" />
          <GlitchText text="CREATING..." intensity="low" />
        </RetroTerminal>
      </div>

      <div class="sidebar-widget">
        <MutualFriends />
      </div>

      <FloatingBadge color="yellow" size="sm">
        <span>Sparkle</span>
      </FloatingBadge>
    </aside>
  </SplitLayout>

  <div class="content-section">
    <NeonBorder color="purple" intensity="soft">
      <h2 class="section-title">Leave Your Mark</h2>
      <Guestbook />
    </NeonBorder>
  </div>

  <footer class="content-section">
    <Choose>
      <When data="owner.website" exists="true">
        <WebsiteDisplay />
      </When>
      <Otherwise>
        <p>Every visit plants a seed of inspiration.</p>
      </Otherwise>
    </Choose>
  </footer>
</CenteredBox>
`;

describe('Elegant Showcase Template Compilation', () => {
  describe('Template Structure', () => {
    it('should have both HTML and CSS content', () => {
      expect(templateHTML.trim().length).toBeGreaterThan(100);
      expect(templateCSS.trim().length).toBeGreaterThan(100);
    });

    it('should contain custom component tags that need compilation', () => {
      const customComponents = [
        'profilehero', 'centeredbox', 'bio', 'profilephoto', 'gradientbox',
        'flexcontainer', 'splitlayout', 'tabs', 'tab', 'blogposts', 'mediagrid',
        'imagecarousel', 'carouselimage', 'skillchart', 'skill', 'gridlayout',
        'revealbox', 'polaroidframe', 'wavetext', 'progresstracker',
        'progressitem', 'ifvisitor', 'ifowner', 'followbutton', 'contactcard',
        'contactmethod', 'stickynote', 'profilebadges', 'retroterminal',
        'displayname', 'glitchtext', 'mutualfriends', 'floatingbadge',
        'guestbook', 'neonborder', 'choose', 'when', 'otherwise',
        'websitedisplay', 'show'
      ];

      const missingComponents: string[] = [];
      customComponents.forEach(component => {
        const regex = new RegExp(`<${component}[\\s>]`, 'i');
        if (!regex.test(templateHTML)) {
          missingComponents.push(component);
        }
      });

      expect(missingComponents).toEqual([]);
    });

    it('should have proper HTML structure with classes', () => {
      expect(templateHTML).toContain('hero-section');
      expect(templateHTML).toContain('elegant-header');
      expect(templateHTML).toContain('content-section');
      expect(templateHTML).toContain('section-title');
      expect(templateHTML).toContain('elegant-card');
      expect(templateHTML).toContain('sidebar-widget');
    });

    it('should have component attributes properly formatted', () => {
      expect(templateHTML).toMatch(/<centeredbox[^>]*maxwidth="xl"/i);
      expect(templateHTML).toMatch(/<gradientbox[^>]*gradient="sunset"/i);
      expect(templateHTML).toMatch(/<splitlayout[^>]*ratio="2:1"/i);
      expect(templateHTML).toMatch(/<imagecarousel[^>]*autoplay="false"/i);
      expect(templateHTML).toMatch(/<imagecarousel[^>]*showthumbnails="true"/i);
    });

    it('should have nested components structure', () => {
      const tabsSection = templateHTML.match(/<tabs[^>]*>[\s\S]*?<\/tabs>/i);
      expect(tabsSection).toBeTruthy();

      if (tabsSection) {
        const tabsContent = tabsSection[0];
        expect(tabsContent).toMatch(/<tab[^>]*title="Latest Thoughts"/i);
        expect(tabsContent).toMatch(/<blogposts/i);
        expect(tabsContent).toMatch(/<mediagrid/i);
      }

      expect(templateHTML).toMatch(/<splitlayout[^>]*>[\s\S]*?<\/splitlayout>/i);
    });

    it('should have conditional rendering components', () => {
      expect(templateHTML).toMatch(/<ifvisitor/i);
      expect(templateHTML).toMatch(/<ifowner/i);
      expect(templateHTML).toMatch(/<show[^>]*when=/i);
      expect(templateHTML).toMatch(/<choose/i);
      expect(templateHTML).toMatch(/<when[^>]*data=/i);
      expect(templateHTML).toMatch(/<otherwise/i);
    });
  });

  describe('CSS Extraction', () => {
    it('should extract all CSS variables', () => {
      expect(templateCSS).toContain('--primary-gold: #d4af37');
      expect(templateCSS).toContain('--soft-cream: #faf8f3');
      expect(templateCSS).toContain('--deep-charcoal: #2c2c2c');
      expect(templateCSS).toContain('--sage-green: #9caf88');
    });

    it('should extract all CSS classes', () => {
      expect(templateCSS).toContain('.elegant-header');
      expect(templateCSS).toContain('.content-section');
      expect(templateCSS).toContain('.section-title');
      expect(templateCSS).toContain('.elegant-card');
      expect(templateCSS).toContain('.sidebar-widget');
    });

    it('should extract animations', () => {
      expect(templateCSS).toMatch(/@keyframes\s+gentle-rotate/);
    });

    it('should extract media queries', () => {
      expect(templateCSS).toMatch(/@media\s+\(max-width:\s*768px\)/);
    });
  });

  describe('Template Compilation Requirements', () => {
    it('should validate advanced mode compatibility', async () => {
      const { validateProfileTemplate } = await import('@/lib/templates/compilation/compiler');

      // The showcase template is valid for advanced mode
      const valid = validateProfileTemplate(templateHTML, 'advanced');
      expect(valid.isValid).toBe(true);
      expect(valid.errors).toEqual([]);

      // Advanced mode without a template is invalid
      const invalid = validateProfileTemplate('', 'advanced');
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThan(0);
    });

    it('should compile using the server-side compiler with an enhanced fallback', async () => {
      const { compileProfile } = await import('@/lib/templates/compilation/compiler');

      const mockResidentData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'elegantuser',
          displayName: 'Elegant Test User',
          avatarUrl: '/test-avatar.jpg'
        },
        capabilities: {
          bio: 'Test user bio for elegant template'
        }
      });

      const context = {
        user: {
          id: 'test-user',
          handle: 'elegantuser',
          profile: {
            templateMode: 'advanced' as const,
            customTemplate: templateHTML,
            customCSS: templateCSS,
            includeSiteCSS: false,
            hideNavigation: false
          }
        },
        residentData: mockResidentData
      };

      const result = await compileProfile(context, { mode: 'advanced' });

      // NOTE: jest.setup.js stubs the unified/rehype parser, so island
      // detection sees an empty AST here. We assert the parts of the compiler
      // that run for real: success, mode dispatch and fallback generation.
      expect(result.success).toBe(true);
      expect(result.compiled).toBeDefined();
      expect(result.compiled?.mode).toBe('advanced');
      expect(Array.isArray(result.compiled?.islands)).toBe(true);

      // Advanced compilations carry an enhanced-mode fallback
      const fallback = result.compiled?.fallback;
      expect(fallback).toBeDefined();
      expect(fallback?.mode).toBe('enhanced');

      // The enhanced fallback injects the (sanitized) user CSS
      expect(fallback?.staticHTML).toContain('<style type="text/css">');
      expect(fallback?.staticHTML).toContain('--primary-gold');

      // ...and renders the default profile HTML with resident data
      expect(fallback?.staticHTML).toContain('Elegant Test User');
      expect(fallback?.staticHTML).toContain('Test user bio for elegant template');
    });

    it('should handle self-closing and paired tags', () => {
      const selfClosingRegex = /<(\w+)(?:\s[^>]*)?\/>/gi;
      const selfClosing = [...templateHTML.matchAll(selfClosingRegex)].map(m => m[1]);
      expect(selfClosing.length).toBeGreaterThan(0);

      const pairedComponents = ['tabs', 'tab', 'gridlayout', 'splitlayout', 'flexcontainer'];
      pairedComponents.forEach(comp => {
        expect(templateHTML).toMatch(new RegExp(`<${comp}[\\s>]`, 'i'));
        expect(templateHTML).toMatch(new RegExp(`</${comp}>`, 'i'));
      });
    });

    it('should maintain proper nesting depth', () => {
      const openTags = (templateHTML.match(/<[a-z]+(?:\s[^>]*)?>/gi) || []).length;
      const closeTags = (templateHTML.match(/<\/[a-z]+>/gi) || []).length;
      const selfClosingTags = (templateHTML.match(/<[a-z]+(?:\s[^>]*)?\/>/gi) || []).length;

      // Every non-self-closing open tag has a matching close tag
      expect(openTags - selfClosingTags).toBe(closeTags);
    });
  });
});
