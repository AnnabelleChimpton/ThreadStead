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
    description: "Modern frosted glass design with hero banner and split layout",
    template: `<ProfileHero variant="plain" />

<SplitLayout ratio="1:2" gap="md">
  <RetroCard>
    <ProfilePhoto size="lg" />
    <DisplayName as="h3" />
    <Bio />
    <ProfileBadges layout="list" />
  </RetroCard>

  <RetroCard>
    <Heading level="2" content="Latest Posts" />
    <BlogPosts limit="3" />
  </RetroCard>

  <RetroCard>
    <Heading level="2" content="Gallery" />
    <MediaGrid />
  </RetroCard>
</SplitLayout>`,
    css: `/* Glass Morphism Styling */
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #667eea;
  --global-bg-gradient-end: #764ba2;
  --global-font-family: 'Inter', system-ui, sans-serif;
  --global-text-color: rgba(255, 255, 255, 0.95);
}

body {
  background: #667eea;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Inter', system-ui, sans-serif;
  color: rgba(255, 255, 255, 0.95);
  min-height: 100vh;
}

/* Center and constrain content width */
.profile-template-root > * {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}

/* Glass morphism effect on cards and modules */
[class*="card"],
[class*="module"],
.profile-tabs,
[class*="tab-"],
.ts-profile-hero {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

[class*="card"]:hover,
[class*="module"]:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}

h1, h2, h3 {
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

a {
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

a:hover {
  color: #ffffff;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}`,
    cssMode: 'inherit' as const
  },
  
  neonCyberspace: {
    name: "Neon Cyberspace",
    description: "Cyberpunk terminal interface with vertical flex layout",
    template: `<FlexContainer direction="column" gap="md" align="stretch">
  <RetroCard>
    <Heading level="2" content=">>> NEURAL_INTERFACE_ACTIVE" className="terminal-header" />
    <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
  </RetroCard>

  <RetroCard>
    <Heading level="3" content="> Data_Streams" />
    <BlogPosts limit="10" />
  </RetroCard>

  <FlexContainer direction="row" gap="md" wrap="true">
    <RetroCard className="flex-1">
      <Heading level="3" content="> Network_Map" />
      <FriendDisplay />
      <WebsiteDisplay />
    </RetroCard>

    <RetroCard className="flex-1">
      <Heading level="3" content="> Achievement_Log" />
      <ProfileBadges layout="list" />
    </RetroCard>
  </FlexContainer>

  <RetroCard>
    <Heading level="3" content="> Msg_Buffer" />
    <Guestbook />
  </RetroCard>
</FlexContainer>`,
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

body {
  background: #000;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: radial-gradient(ellipse at center, #0a0a0a 0%, #000 70%);
  color: #00ff00;
  font-family: 'Courier New', monospace;
  min-height: 100vh;
}

/* Center and constrain content width */
.profile-template-root > * {
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}

/* Terminal styling on cards */
[class*="card"],
[class*="module"] {
  background: #001100;
  border: 2px solid #00ff00;
  box-shadow: 0 0 20px #00ff00;
  color: #00ff00;
}

/* Terminal header glitch effect */
.terminal-header {
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
  font-weight: bold;
  animation: pulse-glow 3s ease-in-out infinite alternate;
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
}

@keyframes pulse-glow {
  0% { text-shadow: 0 0 15px #00ffff; }
  100% { text-shadow: 0 0 25px #00ffff, 0 0 35px #00ffff; }
}

/* Tab styling */
[role="tab"],
[class*="tab-"] {
  background: #000;
  color: #00ff00;
  border: 1px solid #00ff00;
  text-shadow: 0 0 10px #00ff00;
}

[role="tab"][aria-selected="true"],
[class*="tab-"].active {
  background: #003300;
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
}

h1, h2, h3 {
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
  font-weight: bold;
}

a {
  color: #ff00ff;
  text-shadow: 0 0 8px #ff00ff;
  transition: all 0.3s ease;
}

a:hover {
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
}`,
    cssMode: 'inherit' as const
  },
  
  retroMemories: {
    name: "Retro Memories",
    description: "90s nostalgia with CSS Grid layout and named areas",
    template: `<Heading level="1" content="Welcome to my totally rad page!" className="wave-header" />

<Grid gridTemplateColumns="minmax(250px, 300px) 1fr" gap="1rem">
  <div>
    <RetroCard>
      <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="lg" />
    </RetroCard>
  </div>

  <div>
    <RetroCard>
      <Heading level="3" content="📝 Latest Posts" />
      <BlogPosts limit="4" />
    </RetroCard>

    <RetroCard>
      <Heading level="3" content="💬 Guestbook" />
      <Guestbook />
    </RetroCard>
  </div>

  <div>
    <RetroCard>
      <Heading level="3" content="📷 Photos" />
      <MediaGrid />
    </RetroCard>

    <RetroCard>
      <Heading level="3" content="🔗 Cool Links" />
      <FriendDisplay />
      <WebsiteDisplay />
    </RetroCard>
  </div>
</Grid>`,
    css: `/* Retro Memories Styling */
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #ffd700;
  --global-font-family: 'Comic Sans MS', cursive, sans-serif;
  --global-text-color: #8b0000;
  --global-accent-color: #ff1493;
}

body {
  background: #ffd700;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: linear-gradient(45deg, #ffd700, #ff69b4, #00bfff, #90ee90);
  background-size: 400% 400%;
  animation: gradient-wave 15s ease infinite;
  font-family: 'Comic Sans MS', cursive, sans-serif;
  color: #8b0000;
  min-height: 100vh;
}

@keyframes gradient-wave {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Center and constrain content */
.profile-template-root > * {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}

/* Polaroid-style cards with slight rotation */
[class*="card"],
[class*="module"] {
  transform: rotate(1deg);
  transition: transform 0.3s ease;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

[class*="card"]:hover,
[class*="module"]:hover {
  transform: rotate(0deg) scale(1.02);
}

/* Wave header */
.wave-header {
  font-size: 2rem;
  text-align: center;
  animation: rainbow-blink 3s linear infinite;
  text-shadow: 2px 2px 0px #ffffff, 4px 4px 0px #ff1493;
  margin-bottom: 1rem;
}

h1, h2, h3, h4 {
  color: #8b0000;
  font-weight: bold;
  text-shadow: 2px 2px 0px #ffffff, 4px 4px 0px #ff1493;
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
  color: #0000ff;
  text-decoration: underline;
}

a:visited {
  color: #800080;
}

a:hover {
  color: #ff1493;
  background: #ffff00;
  padding: 2px;
}`,
    cssMode: 'inherit' as const
  },
  
  minimalistZen: {
    name: "Minimalist Zen",
    description: "Clean single-column flow focused on content and readability",
    template: `<ProfileHeader showPhoto="true" showBio="true" showActions="false" photoSize="md" />

<Heading level="2" content="Recent Essays" />
<BlogPosts limit="8" />

<Heading level="2" content="Visual Journal" />
<MediaGrid />

<Heading level="2" content="Visitor Thoughts" />
<Guestbook />`,
    css: `/* Minimalist Zen Styling */
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #fafafa;
  --global-font-family: 'Georgia', 'Times New Roman', serif;
  --global-text-color: #2c3e50;
  --global-accent-color: #3498db;
}

body {
  background: #fafafa;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%);
  font-family: 'Georgia', 'Times New Roman', serif;
  line-height: 1.8;
  color: #2c3e50;
  min-height: 100vh;
}

/* Center and constrain content width */
.profile-template-root > * {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}

/* Clean minimal cards with subtle accent */
[class*="card"],
[class*="module"] {
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

h1, h2, h3 {
  color: #2c3e50;
  font-weight: 300;
  letter-spacing: -0.5px;
}

a {
  color: #3498db;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease;
}

a:hover {
  border-bottom-color: #3498db;
}`,
    cssMode: 'inherit' as const
  },
  
  creativePortfolio: {
    name: "Creative Portfolio",
    description: "Artist portfolio with retro tape hero and grid showcase",
    template: `<ProfileHero variant="tape" />

<RetroCard>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="xl" />
</RetroCard>

<Heading level="2" content="🎨 Featured Work" />
<GridLayout columns="2" gap="lg">
  <RetroCard>
    <MediaGrid />
  </RetroCard>

  <RetroCard>
    <Heading level="3" content="✦ Recent Journal" />
    <BlogPosts limit="4" />
  </RetroCard>

  <RetroCard>
    <Heading level="3" content="🏆 Recognition" />
    <ProfileBadges />
  </RetroCard>

  <RetroCard>
    <Heading level="3" content="💌 Connect" />
    <FriendDisplay />
    <WebsiteDisplay />
  </RetroCard>
</GridLayout>

<RetroCard>
  <Heading level="2" content="Visitor Messages" />
  <Guestbook />
</RetroCard>`,
    css: `/* Creative Portfolio Styling */
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #f7f3f0;
  --global-font-family: 'Georgia', serif;
  --global-text-color: #3d3d3d;
  --global-accent-color: #6b5b73;
  --global-earth-tone: #8b7d6f;
}

body {
  background: #f7f3f0;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: linear-gradient(45deg, #f7f3f0, #ede7e0, #f2ebe4);
  background-size: 300% 300%;
  animation: subtle-shift 20s ease-in-out infinite;
  font-family: 'Georgia', serif;
  color: #3d3d3d;
  min-height: 100vh;
}

@keyframes subtle-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Center and constrain content width */
.profile-template-root > * {
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}

/* Earthy, artistic card styling */
[class*="card"],
[class*="module"] {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(139, 125, 111, 0.2);
  box-shadow: 0 4px 15px rgba(139, 125, 111, 0.1);
}

h1, h2, h3 {
  color: #6b5b73;
  font-weight: 300;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

a {
  color: #9c8b7a;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
  text-decoration: none;
}

a:hover {
  color: #6b5b73;
  border-bottom-color: #6b5b73;
}`,
    cssMode: 'inherit' as const
  }
};