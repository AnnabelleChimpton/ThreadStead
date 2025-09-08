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
  glassMorphism: {
    name: "Glass Morphism",
    description: "Modern frosted glass design with floating elements",
    template: `<GradientBox colors="blue-purple" opacity="20">
  <CenteredBox maxWidth="800" padding="lg">
    <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="lg" />
    
    <Tabs>
      <Tab title="Posts">
        <BlogPosts limit="5" />
      </Tab>
      <Tab title="Gallery">
        <MediaGrid />
      </Tab>
      <Tab title="Badges">
        <ProfileBadges />
      </Tab>
      <Tab title="Guestbook">
        <Guestbook />
      </Tab>
    </Tabs>
  </CenteredBox>
</GradientBox>`,
    css: `/* Glass Morphism Styling */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  font-family: 'Inter', system-ui, sans-serif;
}

.thread-module {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(16px);
  border-radius: 20px !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08) !important;
}

.thread-module:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12) !important;
}

h1, h2, h3 {
  color: rgba(255, 255, 255, 0.95) !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

a {
  color: rgba(255, 255, 255, 0.9) !important;
}

a:hover {
  color: #ffffff !important;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}`,
    cssMode: 'inherit' as const
  },
  
  neonCyberspace: {
    name: "Neon Cyberspace",
    description: "Cyberpunk terminal interface with glowing neon accents",
    template: `<RetroTerminal color="green" padding="lg">
  <GlitchText text=">>> NEURAL_INTERFACE_ACTIVE" />
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
</RetroTerminal>

<Tabs>
  <Tab title="Data_Streams">
    <BlogPosts limit="5" />
  </Tab>
  <Tab title="Media_Archive">
    <MediaGrid />
  </Tab>
  <Tab title="Achievement_Tokens">
    <ProfileBadges />
  </Tab>
  <Tab title="Network">
    <FriendDisplay />
    <WebsiteDisplay />
  </Tab>
  <Tab title="Message_Buffer">
    <Guestbook />
  </Tab>
</Tabs>`,
    css: `/* Neon Cyberspace Styling */
body {
  background: radial-gradient(ellipse at center, #0a0a0a 0%, #000 70%) !important;
  color: #00ff00 !important;
  font-family: 'Courier New', monospace !important;
}

.thread-module {
  background: #001100 !important;
  border: 2px solid #00ff00 !important;
  box-shadow: 0 0 20px #00ff00 !important;
  color: #00ff00 !important;
}

.profile-tab-button {
  background: #000 !important;
  color: #00ff00 !important;
  border: 1px solid #00ff00 !important;
  text-shadow: 0 0 10px #00ff00;
  font-family: 'Courier New', monospace !important;
}

.profile-tab-button.active {
  background: #003300 !important;
  color: #00ffff !important;
  text-shadow: 0 0 15px #00ffff;
}

h1, h2, h3 {
  color: #00ffff !important;
  text-shadow: 0 0 15px #00ffff;
  font-weight: bold !important;
  animation: pulse-glow 3s ease-in-out infinite alternate;
}

@keyframes pulse-glow {
  0% { text-shadow: 0 0 15px #00ffff; }
  100% { text-shadow: 0 0 25px #00ffff, 0 0 35px #00ffff; }
}

a {
  color: #ff00ff !important;
  text-shadow: 0 0 8px #ff00ff;
}

a:hover {
  color: #00ffff !important;
  text-shadow: 0 0 15px #00ffff;
}`,
    cssMode: 'inherit' as const
  },
  
  retroMemories: {
    name: "Retro Memories", 
    description: "90s nostalgia with polaroids, sticky notes, and animated text",
    template: `<WaveText text="Welcome to my totally rad page!" />

<PolaroidFrame>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="lg" />
</PolaroidFrame>

<Tabs>
  <Tab title="📝 Blog">
    <BlogPosts limit="4" />
  </Tab>
  <Tab title="📷 Photos">
    <PolaroidFrame>
      <MediaGrid />
    </PolaroidFrame>
  </Tab>
  <Tab title="🏆 Badges">
    <StickyNote color="pink" size="md">
      <ProfileBadges />
    </StickyNote>
  </Tab>
  <Tab title="🔗 Links">
    <StickyNote color="yellow" size="lg">
      <FriendDisplay />
      <WebsiteDisplay />
    </StickyNote>
  </Tab>
  <Tab title="💬 Guestbook">
    <StickyNote color="green" size="md">
      <Guestbook />
    </StickyNote>
  </Tab>
</Tabs>`,
    css: `/* Retro Memories Styling */
body {
  background: linear-gradient(45deg, #ffd700, #ff69b4, #00bfff, #90ee90) !important;
  background-size: 400% 400% !important;
  animation: gradient-wave 15s ease infinite;
  font-family: 'Comic Sans MS', cursive, sans-serif !important;
}

@keyframes gradient-wave {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.thread-module {
  transform: rotate(1deg) !important;
  transition: transform 0.3s ease !important;
}

.thread-module:hover {
  transform: rotate(0deg) scale(1.02) !important;
}

h1, h2, h3, h4 {
  color: #8b0000 !important;
  font-weight: bold !important;
  text-shadow: 2px 2px 0px #ffffff, 4px 4px 0px #ff1493;
  animation: rainbow-blink 3s linear infinite;
}

@keyframes rainbow-blink {
  0% { color: #ff0000; }
  16% { color: #ff8000; }
  33% { color: #ffff00; }
  50% { color: #00ff00; }
  66% { color: #0080ff; }
  83% { color: #8000ff; }
  100% { color: #ff0000; }
}

a {
  color: #0000ff !important;
  text-decoration: underline !important;
}

a:visited {
  color: #800080 !important;
}

a:hover {
  color: #ff1493 !important;
  background: #ffff00 !important;
  padding: 2px;
}`,
    cssMode: 'inherit' as const
  },
  
  minimalistZen: {
    name: "Minimalist Zen",
    description: "Clean, peaceful design focused on content and readability",
    template: `<CenteredBox maxWidth="700" padding="lg">
  <ProfileHeader showPhoto="true" showBio="true" showActions="false" photoSize="lg" />

  <Tabs>
    <Tab title="Writings">
      <BlogPosts limit="6" />
    </Tab>
    <Tab title="Gallery">
      <MediaGrid />
    </Tab>
    <Tab title="Achievements">
      <ProfileBadges />
    </Tab>
    <Tab title="Thoughts">
      <Guestbook />
    </Tab>
  </Tabs>
</CenteredBox>`,
    css: `/* Minimalist Zen Styling */
body {
  background: linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%) !important;
  font-family: 'Georgia', 'Times New Roman', serif !important;
  line-height: 1.8 !important;
  color: #2c3e50 !important;
}

.thread-module {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 2px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
  border-left: 3px solid #3498db !important;
  animation: gentle-fade 0.8s ease-out;
}

@keyframes gentle-fade {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h1, h2, h3 {
  color: #2c3e50 !important;
  font-weight: 300 !important;
  letter-spacing: -0.5px;
}

a {
  color: #3498db !important;
  text-decoration: none !important;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease;
}

a:hover {
  border-bottom-color: #3498db !important;
}`,
    cssMode: 'inherit' as const
  },
  
  creativePortfolio: {
    name: "Creative Portfolio", 
    description: "Artist-focused design showcasing visual work and creativity",
    template: `<CenteredBox maxWidth="900" padding="lg">
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="xl" />

  <Tabs>
    <Tab title="✦ Journal">
      <BlogPosts limit="4" />
    </Tab>
    <Tab title="🎨 Gallery">
      <div className="frame-collection">
        <MediaGrid />
      </div>
    </Tab>
    <Tab title="🏆 Recognition">
      <ProfileBadges />
    </Tab>
    <Tab title="🌐 Network">
      <FriendDisplay />
      <WebsiteDisplay />
    </Tab>
    <Tab title="💌 Guestbook">
      <Guestbook />
    </Tab>
  </Tabs>
</CenteredBox>`,
    css: `/* Creative Portfolio Styling */
body {
  background: linear-gradient(45deg, #f7f3f0, #ede7e0, #f2ebe4) !important;
  background-size: 300% 300% !important;
  animation: subtle-shift 20s ease-in-out infinite;
  font-family: 'Georgia', serif !important;
  color: #3d3d3d !important;
}

@keyframes subtle-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.frame-collection {
  border: 5px solid #8b7d6f !important;
  border-radius: 8px !important;
  padding: 1rem !important;
  background: rgba(255, 255, 255, 0.8) !important;
  box-shadow: inset 0 0 10px rgba(139, 125, 111, 0.1) !important;
}

.thread-module {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(139, 125, 111, 0.2) !important;
  box-shadow: 0 4px 15px rgba(139, 125, 111, 0.1) !important;
}

h1, h2, h3 {
  color: #6b5b73 !important;
  font-weight: 300 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

a {
  color: #9c8b7a !important;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

a:hover {
  color: #6b5b73 !important;
  border-bottom-color: #6b5b73 !important;
}`,
    cssMode: 'inherit' as const
  }
};