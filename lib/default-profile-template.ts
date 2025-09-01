/**
 * Default Profile Template Generator
 * 
 * Generates the default profile template using Islands Architecture components.
 * This replaces the old default/enhanced/advanced mode system with a unified approach.
 */

export interface DefaultProfileTemplateOptions {
  includeGuestbook?: boolean;
  includeFriends?: boolean;
  includeMedia?: boolean;
  includeBadges?: boolean;
  blogPostLimit?: number;
  customCSS?: string;
  cssMode?: 'inherit' | 'override' | 'disable';
}

/**
 * Generate the default profile template HTML using Islands components
 */
export function generateDefaultProfileTemplate(options: DefaultProfileTemplateOptions = {}): {
  template: string;
  css: string;
  cssMode: 'inherit' | 'override' | 'disable';
} {
  const {
    includeGuestbook = true,
    includeFriends = true,
    includeMedia = true,
    includeBadges = true,
    blogPostLimit = 5,
    customCSS = '',
    cssMode = 'inherit'
  } = options;

  // For CSS disabled mode, include NavigationBar to provide site navigation
  const navigationHeader = cssMode === 'disable' ? '<NavigationBar />\n\n' : '';
  
  const template = `${navigationHeader}<RetroCard>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
</RetroCard>

<Tabs>
  <Tab title="Blog">
    <BlogPosts limit="${blogPostLimit}" />
  </Tab>
  
  ${includeMedia ? `<Tab title="Media">
    <MediaGrid />
  </Tab>` : ''}
  
  ${includeFriends ? `<Tab title="Friends / Websites">
    <FriendDisplay />
    <WebsiteDisplay />
  </Tab>` : ''}
  
  ${includeBadges ? `<Tab title="Badges">
    <ProfileBadges showTitle="false" layout="grid" />
  </Tab>` : ''}
  
  ${includeGuestbook ? `<Tab title="Guestbook">
    <Guestbook />
  </Tab>` : ''}
</Tabs>`;

  let css = '';
  
  switch (cssMode) {
    case 'inherit':
      css = `/* Site-wide CSS will be inherited */
/* Add your custom CSS below to extend the site styles */

${customCSS}`;
      break;
    case 'override': 
      css = `/* Site-wide CSS will be loaded, but you can override it */
/* Your CSS will take precedence over site styles */

${customCSS}`;
      break;
    case 'disable':
      css = `/* Site-wide CSS is disabled - complete control */
/* You must style everything from scratch */

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #333333;
}

${customCSS}`;
      break;
  }

  return { template, css, cssMode };
}

/**
 * Get the minimal starter template for new users
 */
export function getMinimalProfileTemplate(): { template: string; css: string; cssMode: 'inherit' | 'override' | 'disable' } {
  return generateDefaultProfileTemplate({
    includeGuestbook: true,
    includeFriends: false,
    includeMedia: false,
    includeBadges: false,
    blogPostLimit: 3
  });
}

/**
 * Get the full-featured default template
 */
export function getFullProfileTemplate(): { template: string; css: string; cssMode: 'inherit' | 'override' | 'disable' } {
  return generateDefaultProfileTemplate({
    includeGuestbook: true,
    includeFriends: true,
    includeMedia: true,
    includeBadges: true,
    blogPostLimit: 5
  });
}

/**
 * Convert legacy profile data to new unified template
 */
export function migrateLegacyProfile(templateMode: string, customCSS?: string): { template: string; css: string; cssMode: 'inherit' | 'override' | 'disable' } {
  switch (templateMode) {
    case 'default':
      return getFullProfileTemplate(); // Use full template to match original exactly
    case 'enhanced':
      return generateDefaultProfileTemplate({ customCSS, cssMode: 'override' });
    case 'advanced':
      return getFullProfileTemplate();
    default:
      return getFullProfileTemplate(); // Use full template to match original exactly
  }
}

/**
 * Template examples for user education
 */
export const TEMPLATE_EXAMPLES = {
  minimal: {
    name: "Minimal Profile",
    description: "Clean and simple profile with just the essentials",
    ...generateDefaultProfileTemplate({
      includeGuestbook: true,
      includeFriends: false,
      includeMedia: false,
      includeBadges: false,
      blogPostLimit: 3
    })
  },
  
  standard: {
    name: "Standard Profile", 
    description: "Full-featured profile with all sections (matches original default)",
    ...getFullProfileTemplate()
  },
  
  blogFocused: {
    name: "Blog-Focused Profile",
    description: "Perfect for writers and content creators",
    ...generateDefaultProfileTemplate({
      includeGuestbook: false,
      includeFriends: false,
      includeMedia: false,
      includeBadges: false,
      blogPostLimit: 10
    })
  },
  
  social: {
    name: "Social Profile",
    description: "Emphasizes connections and community",
    ...generateDefaultProfileTemplate({
      includeGuestbook: true,
      includeFriends: true,
      includeMedia: true,
      includeBadges: true,
      blogPostLimit: 3
    })
  },
  
  // Modern islands-based templates (replacements for legacy HTML templates)
  modernMinimal: {
    name: "Modern Minimal (Islands)",
    description: "Clean glassmorphism design using component architecture",
    template: `<NavigationBar />

<GradientBox colors="blue-purple" opacity="10">
  <CenteredBox maxWidth="800">
    <ProfileHeader showPhoto="true" showBio="true" showActions="false" photoSize="md" />
    
    <FlexContainer direction="column" gap="4" className="mt-8">
      <Choose>
        <When data="posts">
          <GradientBox colors="white" opacity="90" className="backdrop-blur-md rounded-xl">
            <BlogPosts limit="5" />
          </GradientBox>
        </When>
        <Otherwise>
          <GradientBox colors="white" opacity="80" className="backdrop-blur-md rounded-xl p-8 text-center">
            <IfOwner>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Welcome to your new profile!</h3>
              <p className="text-gray-600">Start by adding some posts or customizing your page to make it uniquely yours.</p>
            </IfOwner>
            <IfVisitor>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">This profile is just getting started</h3>
              <p className="text-gray-600">Check back soon for updates and new content!</p>
            </IfVisitor>
          </GradientBox>
        </Otherwise>
      </Choose>
      
      <IfVisitor>
        <FlexContainer direction="row" gap="4" className="justify-center">
          <FollowButton />
          <MutualFriends />
        </FlexContainer>
        
        <GradientBox colors="white" opacity="90" className="backdrop-blur-md rounded-xl">
          <Guestbook />
        </GradientBox>
      </IfVisitor>
    </FlexContainer>
  </CenteredBox>
</GradientBox>`,
    css: `/* Modern Minimal Styling */
body {
  background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
  font-family: system-ui, sans-serif;
}

h1, h2, h3 { 
  color: #2d3748; 
  font-weight: 600; 
}

a { 
  color: #667eea; 
  transition: color 0.2s; 
}

a:hover { 
  color: #764ba2; 
}`,
    cssMode: 'override' as const
  },
  
  cyberpunkSocial: {
    name: "Cyberpunk Social (Islands)",
    description: "Futuristic neon theme with component-based layout",
    template: `<NavigationBar />

<div class="cyber-container">
  <GridLayout columns="1" gap="6" className="lg:grid-cols-3">
    <div class="lg:col-span-2">
      <NeonBorder color="cyan" className="mb-6">
        <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
      </NeonBorder>
      
      <NeonBorder color="purple" className="mb-6">
        <Choose>
          <When data="posts">
            <BlogPosts limit="5" />
          </When>
          <Otherwise>
            <div class="text-center p-8">
              <IfOwner>
                <h3 class="text-xl font-bold text-cyan-400 mb-4">SYSTEM INITIALIZED</h3>
                <p class="text-purple-300">Upload data streams to activate your digital presence</p>
              </IfOwner>
              <IfVisitor>
                <h3 class="text-xl font-bold text-cyan-400 mb-4">DATA LOADING...</h3>
                <p class="text-purple-300">Neural pathways establishing connection</p>
              </IfVisitor>
            </div>
          </Otherwise>
        </Choose>
      </NeonBorder>
    </div>
    
    <div class="space-y-4">
      <IfVisitor>
        <NeonBorder color="green">
          <FlexContainer direction="column" gap="3">
            <FollowButton />
            <MutualFriends />
          </FlexContainer>
        </NeonBorder>
      </IfVisitor>
      
      <NeonBorder color="blue">
        <MediaGrid />
      </NeonBorder>
      
      <NeonBorder color="cyan">
        <Guestbook />
      </NeonBorder>
    </div>
  </GridLayout>
</div>`,
    css: `/* Cyberpunk Social Styling */
body {
  background: linear-gradient(135deg, #0a0a0a, #1a0033, #000a1a);
  color: #00ffff;
}

.cyber-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1, h2, h3 {
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff;
  font-weight: 700;
}

a {
  color: #ff00ff;
  text-shadow: 0 0 5px #ff00ff;
  transition: all 0.3s;
}

a:hover {
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff;
}

h1 {
  animation: glitch 2s infinite;
}

@keyframes glitch {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-2px); }
  40%, 80% { transform: translateX(2px); }
}`,
    cssMode: 'override' as const
  },
  
  vintageWeb: {
    name: "Vintage Web (Islands)", 
    description: "Authentic 90s homepage with modern components",
    template: `<NavigationBar />

<CenteredBox maxWidth="900">
  <div className="vintage-header">
    <WaveText text="Welcome to My Homepage!" />
    <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
  </div>
  
  <PolaroidFrame className="my-8">
    <Choose>
      <When data="posts">
        <BlogPosts limit="3" />
      </When>
      <Otherwise>
        <div className="welcome-90s">
          <IfOwner>
            <marquee>🌟 Under Construction! Please Excuse Our Mess! 🌟</marquee>
            <p>Welcome to your totally rad new homepage! Start posting to fill this space!</p>
          </IfOwner>
          <IfVisitor>
            <marquee>🎉 You Are Visitor Number 1337! 🎉</marquee>
            <p>Thanks for stopping by this groovy corner of cyberspace!</p>
          </IfVisitor>
        </div>
      </Otherwise>
    </Choose>
  </PolaroidFrame>
  
  <SplitLayout>
    <div>
      <StickyNote color="yellow">
        <h3>Cool Links</h3>
        <FriendDisplay />
        <WebsiteDisplay />
      </StickyNote>
    </div>
    
    <div>
      <IfVisitor>
        <StickyNote color="pink">
          <FollowButton />
          <MutualFriends />
        </StickyNote>
      </IfVisitor>
      
      <StickyNote color="green">
        <Guestbook />
      </StickyNote>
    </div>
  </SplitLayout>
</CenteredBox>`,
    css: `/* Vintage Web Styling */
body {
  background: #c0c0c0;
  font-family: "Times New Roman", serif;
  color: #000080;
}

.vintage-header {
  text-align: center;
  background: linear-gradient(45deg, #ff00ff, #00ffff);
  padding: 2rem;
  border: 3px ridge #808080;
  margin-bottom: 2rem;
}

.welcome-90s {
  text-align: center;
  font-family: "Comic Sans MS", cursive;
}

h1, h2, h3 {
  color: #ff0000;
  text-shadow: 2px 2px #000000;
  font-weight: bold;
}

marquee {
  background: #ffff00;
  padding: 0.5rem;
  border: 2px solid #000000;
  margin: 1rem 0;
}

a { color: #0000ff; }
a:visited { color: #800080; }

h1 { animation: blink 1s infinite; }

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}`,
    cssMode: 'override' as const
  }
};