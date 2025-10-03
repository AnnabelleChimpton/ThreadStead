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
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #667eea;
  --global-bg-gradient-end: #764ba2;
  --global-font-family: 'Inter', system-ui, sans-serif;
  --global-text-color: rgba(255, 255, 255, 0.95);
}

.vb-theme-glass-morphism {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  color: var(--global-text-color);
}

body.vb-pattern-glass-morphism {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Inter', system-ui, sans-serif;
}

.vb-theme-glass-morphism [class*="card"],
.vb-theme-glass-morphism [class*="module"],
.vb-theme-glass-morphism [class*="container"]:not(.pure-absolute-container) {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.vb-theme-glass-morphism [class*="card"]:hover,
.vb-theme-glass-morphism [class*="module"]:hover,
.vb-theme-glass-morphism [class*="container"]:not(.pure-absolute-container):hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}

.vb-theme-glass-morphism h1,
.vb-theme-glass-morphism h2,
.vb-theme-glass-morphism h3 {
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.vb-theme-glass-morphism a {
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.vb-theme-glass-morphism a:hover {
  color: #ffffff;
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
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #0a0a0a;
  --global-font-family: 'Courier New', monospace;
  --global-text-color: #00ff00;
  --global-accent-color: #00ffff;
  --global-neon-green: #00ff00;
  --global-neon-cyan: #00ffff;
  --global-neon-magenta: #ff00ff;
}

.vb-theme-neon-cyberspace {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  color: var(--global-text-color);
}

body.vb-pattern-neon-cyberspace {
  background: radial-gradient(ellipse at center, #0a0a0a 0%, #000 70%);
  color: #00ff00;
  font-family: 'Courier New', monospace;
}

.vb-theme-neon-cyberspace [class*="card"],
.vb-theme-neon-cyberspace [class*="module"],
.vb-theme-neon-cyberspace [class*="container"]:not(.pure-absolute-container) {
  background: #001100;
  border: 2px solid #00ff00;
  box-shadow: 0 0 20px #00ff00;
  color: #00ff00;
}

.vb-theme-neon-cyberspace [role="tab"],
.vb-theme-neon-cyberspace [class*="tab"] {
  background: #000;
  color: #00ff00;
  border: 1px solid #00ff00;
  text-shadow: 0 0 10px #00ff00;
  font-family: 'Courier New', monospace;
}

.vb-theme-neon-cyberspace [role="tab"][aria-selected="true"],
.vb-theme-neon-cyberspace [class*="tab"].active {
  background: #003300;
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
}

.vb-theme-neon-cyberspace h1,
.vb-theme-neon-cyberspace h2,
.vb-theme-neon-cyberspace h3 {
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
  font-weight: bold;
  animation: pulse-glow 3s ease-in-out infinite alternate;
}

@keyframes pulse-glow {
  0% { text-shadow: 0 0 15px #00ffff; }
  100% { text-shadow: 0 0 25px #00ffff, 0 0 35px #00ffff; }
}

.vb-theme-neon-cyberspace a {
  color: #ff00ff;
  text-shadow: 0 0 8px #ff00ff;
  transition: all 0.3s ease;
}

.vb-theme-neon-cyberspace a:hover {
  color: #00ffff;
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
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #ffd700;
  --global-font-family: 'Comic Sans MS', cursive, sans-serif;
  --global-text-color: #8b0000;
  --global-accent-color: #ff1493;
}

.vb-theme-retro-memories {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  color: var(--global-text-color);
}

body.vb-pattern-retro-memories {
  background: linear-gradient(45deg, #ffd700, #ff69b4, #00bfff, #90ee90);
  background-size: 400% 400%;
  animation: gradient-wave 15s ease infinite;
  font-family: 'Comic Sans MS', cursive, sans-serif;
}

@keyframes gradient-wave {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.vb-theme-retro-memories [class*="card"],
.vb-theme-retro-memories [class*="module"],
.vb-theme-retro-memories [class*="container"]:not(.pure-absolute-container) {
  transform: rotate(1deg);
  transition: transform 0.3s ease;
}

.vb-theme-retro-memories [class*="card"]:hover,
.vb-theme-retro-memories [class*="module"]:hover,
.vb-theme-retro-memories [class*="container"]:not(.pure-absolute-container):hover {
  transform: rotate(0deg) scale(1.02);
}

.vb-theme-retro-memories h1,
.vb-theme-retro-memories h2,
.vb-theme-retro-memories h3,
.vb-theme-retro-memories h4 {
  color: #8b0000;
  font-weight: bold;
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

.vb-theme-retro-memories a {
  color: #0000ff;
  text-decoration: underline;
}

.vb-theme-retro-memories a:visited {
  color: #800080;
}

.vb-theme-retro-memories a:hover {
  color: #ff1493;
  background: #ffff00;
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
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #fafafa;
  --global-font-family: 'Georgia', 'Times New Roman', serif;
  --global-text-color: #2c3e50;
  --global-accent-color: #3498db;
}

.vb-theme-minimalist-zen {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  color: var(--global-text-color);
  line-height: 1.8;
}

body.vb-pattern-minimalist-zen {
  background: linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%);
  font-family: 'Georgia', 'Times New Roman', serif;
  line-height: 1.8;
  color: #2c3e50;
}

.vb-theme-minimalist-zen [class*="card"],
.vb-theme-minimalist-zen [class*="module"],
.vb-theme-minimalist-zen [class*="container"]:not(.pure-absolute-container) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border-left: 3px solid #3498db;
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

.vb-theme-minimalist-zen h1,
.vb-theme-minimalist-zen h2,
.vb-theme-minimalist-zen h3 {
  color: #2c3e50;
  font-weight: 300;
  letter-spacing: -0.5px;
}

.vb-theme-minimalist-zen a {
  color: #3498db;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease;
}

.vb-theme-minimalist-zen a:hover {
  border-bottom-color: #3498db;
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
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #f7f3f0;
  --global-font-family: 'Georgia', serif;
  --global-text-color: #3d3d3d;
  --global-accent-color: #6b5b73;
  --global-earth-tone: #8b7d6f;
}

.vb-theme-creative-portfolio {
  background-color: var(--global-bg-color);
  font-family: var(--global-font-family);
  color: var(--global-text-color);
}

body.vb-pattern-creative-portfolio {
  background: linear-gradient(45deg, #f7f3f0, #ede7e0, #f2ebe4);
  background-size: 300% 300%;
  animation: subtle-shift 20s ease-in-out infinite;
  font-family: 'Georgia', serif;
  color: #3d3d3d;
}

@keyframes subtle-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.vb-theme-creative-portfolio .frame-collection {
  border: 5px solid #8b7d6f;
  border-radius: 8px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 10px rgba(139, 125, 111, 0.1);
}

.vb-theme-creative-portfolio [class*="card"],
.vb-theme-creative-portfolio [class*="module"],
.vb-theme-creative-portfolio [class*="container"]:not(.pure-absolute-container) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(139, 125, 111, 0.2);
  box-shadow: 0 4px 15px rgba(139, 125, 111, 0.1);
}

.vb-theme-creative-portfolio h1,
.vb-theme-creative-portfolio h2,
.vb-theme-creative-portfolio h3 {
  color: #6b5b73;
  font-weight: 300;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.vb-theme-creative-portfolio a {
  color: #9c8b7a;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
  text-decoration: none;
}

.vb-theme-creative-portfolio a:hover {
  color: #6b5b73;
  border-bottom-color: #6b5b73;
}`,
    cssMode: 'inherit' as const
  }
};