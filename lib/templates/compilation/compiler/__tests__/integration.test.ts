// Integration tests for the complete template compilation pipeline
import { TemplateCompiler, compileProfile } from '../compiler';
import type { ProfileRenderContext, CompilationOptions } from '../types';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';

describe('Template Compiler Integration', () => {
  // Mock resident data
  const mockResidentData: ResidentData = {
    owner: {
      id: 'user123',
      handle: 'testuser',
      displayName: 'Test User',
      avatarUrl: '/assets/default-avatar.gif'
    },
    viewer: { id: null },
    posts: [
      {
        id: 'post1',
        contentHtml: '<p>First post</p>',
        createdAt: new Date().toISOString()
      },
      {
        id: 'post2',
        contentHtml: '<p>Second post</p>',
        createdAt: new Date().toISOString()
      }
    ],
    guestbook: [
      {
        id: 'gb1',
        message: 'Welcome!',
        authorUsername: 'friend1',
        createdAt: new Date().toISOString()
      }
    ],
    capabilities: {
      bio: 'I love building web applications and sharing knowledge.'
    },
    images: [
      {
        id: 'img1',
        url: 'https://example.com/photo1.jpg',
        alt: 'Sample photo',
        caption: 'My latest project',
        createdAt: new Date().toISOString()
      }
    ],
    profileImages: []
  };

  function createContext(
    mode: 'default' | 'enhanced' | 'advanced' = 'default',
    customCSS?: string,
    customTemplate?: string
  ): ProfileRenderContext {
    return {
      user: {
        id: 'user123',
        handle: 'testuser',
        profile: {
          templateMode: mode,
          customCSS,
          customTemplate,
          customTemplateAst: null,
          includeSiteCSS: true,
          hideNavigation: false
        }
      },
      residentData: mockResidentData
    };
  }

  describe('End-to-End Compilation', () => {
    it('should compile a complete advanced template with multiple components', async () => {
      const advancedTemplate = `
        <div className="modern-profile">
          <style>
            .modern-profile {
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 20px;
              color: white;
            }
            .profile-header {
              text-align: center;
              margin-bottom: 2rem;
            }
            .content-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2rem;
              margin-top: 2rem;
            }
            @media (max-width: 768px) {
              .content-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
          
          <div className="profile-header">
            <ProfilePhoto size="xl" shape="circle" />
            <DisplayName as="h1" />
            <Bio />
          </div>

          <FlexContainer direction="column" gap="lg">
            <RevealBox buttonText="View Recent Posts" variant="fade">
              <BlogPosts limit="3" />
            </RevealBox>
            
            <div className="content-grid">
              <GradientBox gradient="ocean" padding="lg">
                <h3>Featured Content</h3>
                <Show when="images">
                  <p>Check out my latest photos!</p>
                </Show>
              </GradientBox>
              
              <NeonBorder color="cyan" intensity="medium">
                <Guestbook />
              </NeonBorder>
            </div>

            <IfVisitor>
              <CenteredBox maxWidth="md">
                <FollowButton />
                <MutualFriends />
              </CenteredBox>
            </IfVisitor>
          </FlexContainer>
        </div>
      `;

      const context = createContext('advanced', undefined, advancedTemplate);
      const result = await compileProfile(context);

      expect(result.success).toBe(true);
      expect(result.compiled).toBeDefined();
      
      if (result.compiled) {
        expect(result.compiled.mode).toBe('advanced');
        expect(result.compiled.islands.length).toBeGreaterThan(0);
        expect(result.compiled.staticHTML).toBeDefined();
        expect(result.compiled.fallback).toBeDefined();
        expect(result.compiled.fallback?.mode).toBe('enhanced');

        // Check that islands were created for all components
        const componentNames = result.compiled.islands.map(i => i.component);
        expect(componentNames).toContain('ProfilePhoto');
        expect(componentNames).toContain('DisplayName');
        expect(componentNames).toContain('Bio');
        expect(componentNames).toContain('BlogPosts');
        expect(componentNames).toContain('Guestbook');
        expect(componentNames).toContain('FollowButton');

        // Verify island props are correctly parsed
        const profilePhoto = result.compiled.islands.find(i => i.component === 'ProfilePhoto');
        expect(profilePhoto?.props.size).toBe('xl');
        expect(profilePhoto?.props.shape).toBe('circle');

        const blogPosts = result.compiled.islands.find(i => i.component === 'BlogPosts');
        expect(blogPosts?.props.limit).toBe(3);

        // Check that CSS is preserved in static HTML
        expect(result.compiled.staticHTML).toContain('.modern-profile');
        expect(result.compiled.staticHTML).toContain('linear-gradient');
        expect(result.compiled.staticHTML).toContain('@media (max-width: 768px)');
      }
    });

    it('should handle template with conditional rendering', async () => {
      const conditionalTemplate = `
        <div>
          <ProfilePhoto size="lg" />
          <DisplayName as="h1" />
          
          <Choose>
            <When data="posts" exists="true">
              <h2>My Recent Posts</h2>
              <BlogPosts limit="5" />
            </When>
            <Otherwise>
              <p>No posts yet, but stay tuned!</p>
            </Otherwise>
          </Choose>
          
          <Show when="guestbook">
            <h2>What people are saying</h2>
            <Guestbook />
          </Show>
          
          <IfOwner>
            <p>Welcome back! You can edit your profile anytime.</p>
          </IfOwner>
          
          <IfVisitor>
            <FollowButton />
          </IfVisitor>
        </div>
      `;

      const context = createContext('advanced', undefined, conditionalTemplate);
      const result = await compileProfile(context);

      expect(result.success).toBe(true);
      
      if (result.compiled) {
        const componentNames = result.compiled.islands.map(i => i.component);
        
        // Should include conditional components
        expect(componentNames).toContain('Choose');
        expect(componentNames).toContain('When');
        expect(componentNames).toContain('Otherwise');
        expect(componentNames).toContain('Show');
        expect(componentNames).toContain('IfOwner');
        expect(componentNames).toContain('IfVisitor');
        
        // Should include content components
        expect(componentNames).toContain('ProfilePhoto');
        expect(componentNames).toContain('BlogPosts');
        expect(componentNames).toContain('Guestbook');
        expect(componentNames).toContain('FollowButton');
      }
    });

    it('should handle template with layout components', async () => {
      const layoutTemplate = `
        <FlexContainer direction="column" gap="xl" align="center">
          <ProfilePhoto size="xl" shape="circle" />
          
          <SplitLayout ratio="2:1" gap="lg">
            <div>
              <DisplayName as="h1" />
              <Bio />
              <BlogPosts limit="3" />
            </div>
            
            <div>
              <GradientBox gradient="sunset" rounded="true">
                <h3>Quick Stats</h3>
                <p>Posts: {posts.length}</p>
                <p>Guestbook entries: {guestbook.length}</p>
              </GradientBox>
              
              <RetroTerminal variant="green" showHeader="true">
                <p>$ whoami</p>
                <p>{owner.handle}</p>
                <p>$ ls posts/</p>
                <BlogPosts limit="2" />
              </RetroTerminal>
            </div>
          </SplitLayout>
          
          <GridLayout columns="3" gap="md">
            <PolaroidFrame caption="Memories" rotation="5">
              <Show when="images">
                <p>Photo gallery coming soon!</p>
              </Show>
            </PolaroidFrame>
            
            <NeonBorder color="pink" intensity="bright">
              <Guestbook />
            </NeonBorder>
            
            <FloatingBadge color="green" animation="pulse">
              <FollowButton />
            </FloatingBadge>
          </GridLayout>
        </FlexContainer>
      `;

      const context = createContext('advanced', undefined, layoutTemplate);
      const result = await compileProfile(context);

      expect(result.success).toBe(true);
      
      if (result.compiled) {
        const componentNames = result.compiled.islands.map(i => i.component);
        
        // Layout components
        expect(componentNames).toContain('FlexContainer');
        expect(componentNames).toContain('SplitLayout');
        expect(componentNames).toContain('GridLayout');
        
        // Visual components
        expect(componentNames).toContain('GradientBox');
        expect(componentNames).toContain('RetroTerminal');
        expect(componentNames).toContain('PolaroidFrame');
        expect(componentNames).toContain('NeonBorder');
        expect(componentNames).toContain('FloatingBadge');
        
        // Verify complex prop structures
        const splitLayout = result.compiled.islands.find(i => i.component === 'SplitLayout');
        expect(splitLayout?.props.ratio).toBe('2:1');
        
        const gridLayout = result.compiled.islands.find(i => i.component === 'GridLayout');
        expect(gridLayout?.props.columns).toBe('3');
        
        const polaroidFrame = result.compiled.islands.find(i => i.component === 'PolaroidFrame');
        expect(polaroidFrame?.props.rotation).toBe(5);
      }
    });
  });

  describe('Performance and Limits', () => {
    it('should handle templates at the node limit', async () => {
      // Create a template with many nested elements (close to the 200 node limit)
      let nestedDivs = '<div>';
      for (let i = 0; i < 50; i++) {
        nestedDivs += `<div class="level-${i}">`;
      }
      nestedDivs += '<ProfilePhoto size="md" />';
      for (let i = 0; i < 50; i++) {
        nestedDivs += '</div>';
      }
      nestedDivs += '</div>';

      const context = createContext('advanced', undefined, nestedDivs);
      const result = await compileProfile(context);

      // Should either succeed or fail gracefully
      if (result.success) {
        expect(result.compiled?.islands).toBeDefined();
      } else {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle templates with many components', async () => {
      let manyComponents = '<div>';
      const componentTypes = ['ProfilePhoto', 'DisplayName', 'Bio', 'BlogPosts', 'Guestbook'];
      
      for (let i = 0; i < 10; i++) {
        const component = componentTypes[i % componentTypes.length];
        manyComponents += `<${component} />`;
      }
      manyComponents += '</div>';

      const context = createContext('advanced', undefined, manyComponents);
      const result = await compileProfile(context);

      expect(result.success).toBe(true);
      if (result.compiled) {
        expect(result.compiled.islands.length).toBe(10);
      }
    });
  });

  describe('Compiler Options', () => {
    it('should respect compilation options', async () => {
      const template = '<div><ProfilePhoto size="lg" /></div>';
      const context = createContext('advanced', undefined, template);
      
      const options: CompilationOptions = {
        mode: 'advanced',
        enableOptimization: true,
        enableSEOMetadata: true,
        maxIslands: 5
      };

      const compiler = new TemplateCompiler(options);
      const result = await compiler.compile(context);

      expect(result.success).toBe(true);
      if (result.compiled) {
        expect(result.compiled.mode).toBe('advanced');
      }
    });

    it('should handle batch compilation', async () => {
      const contexts = [
        createContext('default'),
        createContext('enhanced', '.custom { color: red; }'),
        createContext('advanced', undefined, '<div><ProfilePhoto /></div>')
      ];

      const compiler = new TemplateCompiler();
      const results = await compiler.compileBatch(contexts);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);

      expect(results[0].compiled?.mode).toBe('default');
      expect(results[1].compiled?.mode).toBe('enhanced');
      expect(results[2].compiled?.mode).toBe('advanced');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from invalid template syntax', async () => {
      const invalidTemplate = '<div><ProfilePhoto size="invalid" /><unclosed>';
      const context = createContext('advanced', undefined, invalidTemplate);
      const result = await compileProfile(context);

      // Should either succeed with warnings or fail with proper fallback
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle missing required props gracefully', async () => {
      const template = '<div><WaveText /></div>'; // WaveText requires 'text' prop
      const context = createContext('advanced', undefined, template);
      const result = await compileProfile(context);

      // Should handle missing required props
      expect(result.success).toBe(true);
      if (result.compiled) {
        const waveText = result.compiled.islands.find(i => i.component === 'WaveText');
        expect(waveText).toBeDefined();
        // Should have default or empty text prop
      }
    });
  });
});