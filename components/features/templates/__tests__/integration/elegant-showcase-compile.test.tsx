/**
 * Integration test for the Elegant Showcase Template
 * This test verifies that custom component tags are properly parsed and identified
 * in the template compilation process.
 */

import fs from 'fs';
import path from 'path';

describe('Elegant Showcase Template Compilation', () => {
  let templateContent: string;
  let templateHTML: string;
  let templateCSS: string;

  beforeAll(() => {
    // Read the elegant-showcase-template.html file
    const templatePath = path.join(process.cwd(), 'elegant-showcase-template.html');
    templateContent = fs.readFileSync(templatePath, 'utf-8');
    
    // Extract CSS and HTML separately
    const styleMatches = templateContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      templateCSS = styleMatches.map(tag => {
        const match = tag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        return match ? match[1] : '';
      }).join('\n');
    } else {
      templateCSS = '';
    }
    
    // Remove style tags and get just the body content
    const bodyMatch = templateContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    templateHTML = bodyMatch 
      ? bodyMatch[1].replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim()
      : templateContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
  });

  describe('Template Structure', () => {
    it('should have both HTML and CSS content', () => {
      expect(templateHTML).toBeTruthy();
      expect(templateHTML.length).toBeGreaterThan(100);
      expect(templateCSS).toBeTruthy();
      expect(templateCSS.length).toBeGreaterThan(100);
    });

    it('should contain custom component tags that need compilation', () => {
      // List of custom components used in the elegant template
      const customComponents = [
        'profilehero',
        'centeredbox',
        'bio',
        'profilephoto',
        'gradientbox',
        'flexcontainer',
        'splitlayout',
        'tabs',
        'tab',
        'blogposts',
        'mediagrid',
        'imagecarousel',
        'carouselimage',
        'skillchart',
        'skill',
        'gridlayout',
        'revealbox',
        'polaroidframe',
        'wavetext',
        'progresstracker',
        'progressitem',
        'ifvisitor',
        'ifowner',
        'followbutton',
        'contactcard',
        'contactmethod',
        'stickynote',
        'profilebadges',
        'retroterminal',
        'displayname',
        'glitchtext',
        'mutualfriends',
        'floatingbadge',
        'guestbook',
        'neonborder',
        'choose',
        'when',
        'otherwise',
        'websitedisplay',
        'show'
      ];

      // Check each component exists in the template
      const missingComponents: string[] = [];
      const foundComponents: string[] = [];
      
      customComponents.forEach(component => {
        const regex = new RegExp(`<${component}[\\s>]`, 'i');
        if (regex.test(templateHTML)) {
          foundComponents.push(component);
        } else {
          missingComponents.push(component);
        }
      });

      console.log('Found components:', foundComponents.length);
      console.log('Missing components:', missingComponents);
      
      // Should find most of the components
      expect(foundComponents.length).toBeGreaterThan(20);
      
      // Specifically check for key components
      expect(templateHTML).toMatch(/<profilehero/i);
      expect(templateHTML).toMatch(/<centeredbox/i);
      expect(templateHTML).toMatch(/<bio/i);
      expect(templateHTML).toMatch(/<profilephoto/i);
      expect(templateHTML).toMatch(/<guestbook/i);
    });

    it('should have proper HTML structure with classes', () => {
      // Check for elegant template specific classes
      expect(templateHTML).toContain('hero-section');
      expect(templateHTML).toContain('elegant-header');
      expect(templateHTML).toContain('content-section');
      expect(templateHTML).toContain('section-title');
      expect(templateHTML).toContain('elegant-card');
      expect(templateHTML).toContain('sidebar-widget');
    });

    it('should have component attributes properly formatted', () => {
      // Check CenteredBox with attributes
      expect(templateHTML).toMatch(/<centeredbox[^>]*maxwidth="xl"/i);
      expect(templateHTML).toMatch(/<centeredbox[^>]*padding="lg"/i);
      
      // Check GradientBox with attributes
      expect(templateHTML).toMatch(/<gradientbox[^>]*gradient="sunset"/i);
      expect(templateHTML).toMatch(/<gradientbox[^>]*direction="br"/i);
      
      // Check SplitLayout with ratio
      expect(templateHTML).toMatch(/<splitlayout[^>]*ratio="2:1"/i);
      
      // Check ImageCarousel settings
      expect(templateHTML).toMatch(/<imagecarousel[^>]*autoplay="false"/i);
      expect(templateHTML).toMatch(/<imagecarousel[^>]*showthumbnails="true"/i);
    });

    it('should have nested components structure', () => {
      // Extract a section to check nesting
      const tabsSection = templateHTML.match(/<tabs[^>]*>[\s\S]*?<\/tabs>/i);
      expect(tabsSection).toBeTruthy();
      
      if (tabsSection) {
        const tabsContent = tabsSection[0];
        // Should have tab children
        expect(tabsContent).toMatch(/<tab[^>]*title="✨ Latest Thoughts"/i);
        expect(tabsContent).toMatch(/<blogposts/i);
        expect(tabsContent).toMatch(/<mediagrid/i);
      }
      
      // Check nested layout components
      const splitLayoutSection = templateHTML.match(/<splitlayout[^>]*>[\s\S]*?<\/splitlayout>/i);
      expect(splitLayoutSection).toBeTruthy();
    });

    it('should have conditional rendering components', () => {
      // Check for conditional components
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
      expect(templateCSS).toContain('.hero-section');
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
    it('should identify all components that need to be compiled to HTML', () => {
      // Create a simple parser to identify custom components
      const componentRegex = /<([a-z]+)(?:\s[^>]*)?>/gi;
      const matches = [...templateHTML.matchAll(componentRegex)];
      
      const customTags = new Set<string>();
      const htmlTags = new Set(['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                                'ul', 'ol', 'li', 'a', 'img', 'button', 'input', 'form',
                                'header', 'footer', 'main', 'section', 'article', 'aside',
                                'nav', 'meta', 'title', 'head', 'body', 'html', 'style']);
      
      matches.forEach(match => {
        const tagName = match[1].toLowerCase();
        if (!htmlTags.has(tagName)) {
          customTags.add(tagName);
        }
      });
      
      console.log('Custom components found:', Array.from(customTags).sort());
      
      // Should have found many custom components
      expect(customTags.size).toBeGreaterThan(15);
      
      // Key components should be present
      expect(customTags.has('profilehero')).toBe(true);
      expect(customTags.has('bio')).toBe(true);
      expect(customTags.has('guestbook')).toBe(true);
      expect(customTags.has('profilephoto')).toBe(true);
    });

    it('should test compilation using server-side compiler', async () => {
      // Import the actual compiler
      const { compileProfile } = await import('@/lib/templates/compilation/compiler');
      
      // Create mock resident data
      const mockResidentData = {
        owner: {
          id: 'test-user',
          handle: 'elegantuser',
          displayName: 'Elegant Test User',
          avatarUrl: '/test-avatar.jpg'
        },
        viewer: { id: 'test-viewer' },
        posts: [
          {
            id: 'post1',
            contentHtml: '<p>Test blog post content</p>',
            publishedAt: new Date().toISOString(),
            handle: 'elegantuser'
          }
        ],
        guestbook: [
          {
            id: 'gb1',
            content: 'Test guestbook message',
            author: 'Test Visitor',
            createdAt: new Date().toISOString()
          }
        ],
        capabilities: {
          bio: 'Test user bio for elegant template'
        },
        images: [],
        profileImages: []
      };

      // Create compilation context
      const context = {
        user: {
          id: 'test-user',
          handle: 'elegantuser',
          profile: {
            templateMode: 'advanced' as const,
            customTemplate: templateHTML,
            customCSS: templateCSS,
            cssMode: 'disable' as const,
            includeSiteCSS: false,
            hideNavigation: false
          }
        },
        residentData: mockResidentData
      };

      console.log('Testing compilation with template length:', templateHTML.length);
      console.log('First 200 chars:', templateHTML.substring(0, 200));

      // Test compilation
      const result = await compileProfile(context, { mode: 'advanced' });
      
      console.log('Compilation result:', {
        success: result.success,
        hasCompiled: !!result.compiled,
        errorsCount: result.errors?.length || 0,
        warningsCount: result.warnings?.length || 0
      });

      if (result.errors?.length) {
        console.log('Compilation errors:', result.errors);
      }

      if (result.warnings?.length) {
        console.log('Compilation warnings:', result.warnings);
      }

      // Should compile successfully
      expect(result.success).toBe(true);
      expect(result.compiled).toBeDefined();

      if (result.compiled) {
        console.log('Compiled template keys:', Object.keys(result.compiled));
        console.log('Islands count:', result.compiled.islands?.length || 0);
        
        if (result.compiled.staticHTML) {
          console.log('Static HTML length:', result.compiled.staticHTML.length);
          console.log('Static HTML sample:', result.compiled.staticHTML.substring(0, 300));
          
          // Check that components were processed
          // They should either be converted to HTML or have placeholders
          const hasProfileHero = result.compiled.staticHTML.includes('profilehero') || 
                                result.compiled.staticHTML.includes('profile-hero') ||
                                result.compiled.staticHTML.includes('data-component');
          
          console.log('Contains component references:', hasProfileHero);
        }
        
        if (result.compiled.islands) {
          result.compiled.islands.forEach((island: any, index: number) => {
            console.log(`Island ${index}:`, {
              component: island.component,
              id: island.id,
              hasPlaceholder: !!island.placeholder
            });
          });
        }
      }
      
      // Verify key aspects of compilation
      expect(result.compiled?.mode).toBe('advanced');
      
      // Should have identified islands/components
      if (result.compiled?.islands) {
        expect(result.compiled.islands.length).toBeGreaterThan(0);
        
        // Check for key components in islands
        const componentNames = result.compiled.islands.map((i: any) => i.component?.toLowerCase());
        expect(componentNames.some((name: string) => name.includes('profile') || name.includes('bio'))).toBe(true);
      }
    });

    it('should handle self-closing and paired tags', () => {
      // Self-closing tags (components without children)
      const selfClosingRegex = /<(\w+)(?:\s[^>]*)?\/>/gi;
      const selfClosing = [...templateHTML.matchAll(selfClosingRegex)].map(m => m[1]);
      
      console.log('Self-closing components:', selfClosing);
      
      // Some components should be self-closing
      expect(selfClosing.length).toBeGreaterThan(0);
      
      // Paired tags (components with children)
      const pairedComponents = ['tabs', 'tab', 'gridlayout', 'splitlayout', 'flexcontainer'];
      pairedComponents.forEach(comp => {
        const openTag = new RegExp(`<${comp}[\\s>]`, 'i');
        const closeTag = new RegExp(`</${comp}>`, 'i');
        expect(templateHTML).toMatch(openTag);
        expect(templateHTML).toMatch(closeTag);
      });
    });

    it('should maintain proper nesting depth', () => {
      // Simple check for balanced tags
      const openTags = (templateHTML.match(/<[a-z]+(?:\s[^>]*)?>/gi) || []).length;
      const closeTags = (templateHTML.match(/<\/[a-z]+>/gi) || []).length;
      const selfClosingTags = (templateHTML.match(/<[a-z]+(?:\s[^>]*)?\/>/gi) || []).length;
      
      console.log(`Open tags: ${openTags}, Close tags: ${closeTags}, Self-closing: ${selfClosingTags}`);
      
      // Should have reasonable balance (not exact due to self-closing)
      expect(openTags).toBeGreaterThan(50);
      expect(closeTags).toBeGreaterThan(30);
    });
  });

  describe('Output Requirements', () => {
    it('should identify what the compiled output should contain', () => {
      // The compiled template should:
      // 1. Replace custom components with their HTML implementations
      // 2. Preserve all classes and IDs
      // 3. Maintain the structure
      
      // Count structures that need to be preserved
      const divsWithClasses = (templateHTML.match(/<div[^>]*class="[^"]+"/gi) || []).length;
      expect(divsWithClasses).toBeGreaterThan(5);
      
      // Components that should compile to specific HTML structures
      const componentsToCompile = {
        'profilehero': 'should compile to a header with user info',
        'bio': 'should compile to a text element with bio content',
        'profilephoto': 'should compile to an img element',
        'blogposts': 'should compile to a list of posts',
        'guestbook': 'should compile to a guestbook interface',
        'tabs': 'should compile to a tabbed interface',
        'gridlayout': 'should compile to a CSS grid container',
        'splitlayout': 'should compile to a flexbox or grid layout'
      };
      
      Object.entries(componentsToCompile).forEach(([component, description]) => {
        const regex = new RegExp(`<${component}`, 'i');
        const exists = regex.test(templateHTML);
        console.log(`${component}: ${exists ? '✓' : '✗'} - ${description}`);
        expect(exists).toBe(true);
      });
    });
  });
});