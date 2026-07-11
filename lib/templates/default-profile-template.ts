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
 * Template examples for user education.
 *
 * `kind` groups the gallery: 'profile' redesigns (default when absent),
 * 'scripted' pages that show the template language doing real work.
 */
export const TEMPLATE_EXAMPLES = {
  nightWindow: {
    name: "The Night Window",
    description: "A lamp you can switch, kudos that persist — the scripting language, cozy",
    kind: 'scripted' as const,
    template: `<div class="night-room">
  <Var name="lampOn" type="boolean" initial="true" persist="true" />
  <Var name="kudos" type="number" initial="0" persist="true" />

  <div class="room-header">
    <h1 class="room-title"><DisplayName as="span" /></h1>
    <p class="room-sub">open late — come in quietly</p>
    <Button className="lamp-switch">
      <OnClick>
        <Toggle var="lampOn" />
      </OnClick>
      flick the lamp
    </Button>
  </div>

  <If data="$vars.lampOn">
    <div class="scene scene-lamp">
      <h2>the lamp is on</h2>
      <p>Warm light spills across the desk. Stay a while.</p>
      <Bio />
    </div>
  </If>
  <If not="$vars.lampOn">
    <div class="scene scene-moon">
      <h2>lights out</h2>
      <p>Just the moon through the window now. The desk keeps its secrets.</p>
    </div>
  </If>

  <div class="kudos-row">
    <Button className="kudos-button">
      <OnClick>
        <Increment var="kudos" />
        <ShowToast message="thank you, night visitor" type="success" />
      </OnClick>
      ☾ leave a kudo
    </Button>
    <span class="kudos-count">you've left <ShowVar name="kudos" /> on this sill</span>
  </div>

  <IfOwner>
    <p class="aside-note">psst — this is your room. every word of it is editable.</p>
  </IfOwner>
  <IfVisitor>
    <p class="aside-note">you're a guest here. the book below is for signing.</p>
  </IfVisitor>

  <div class="night-card">
    <h2>pages from the notebook</h2>
    <BlogPosts limit="3" />
  </div>

  <div class="night-card">
    <h2>the guest book</h2>
    <Guestbook />
  </div>
</div>`,
    css: `/* The Night Window — a small room, late at night */

body {
  background: #0d1226;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: linear-gradient(180deg, #0d1226 0%, #131a35 100%);
  color: #cfd6f2;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  min-height: 100vh;
  padding: 3rem 1.25rem 4rem;
}

.night-room {
  max-width: 620px;
  margin: 0 auto;
}

.room-header {
  text-align: center;
  margin-bottom: 2rem;
}

.room-title {
  font-size: 2.4rem;
  font-weight: 400;
  color: #f5e9c9;
  margin-bottom: 0.25rem;
}

.room-sub {
  color: #8a93bf;
  font-style: italic;
}

.lamp-switch,
.kudos-button {
  background: transparent;
  border: 1px solid #f5c96a;
  border-radius: 999px;
  color: #f5c96a;
  padding: 0.5rem 1.25rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-top: 0.75rem;
}

.lamp-switch:hover,
.kudos-button:hover {
  background: rgba(245, 201, 106, 0.15);
  box-shadow: 0 0 24px rgba(245, 201, 106, 0.25);
}

/* The two states of the room */
.scene {
  border-radius: 14px;
  padding: 1.75rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

.scene h2 {
  font-size: 1.15rem;
  font-style: italic;
  font-weight: 400;
  margin-bottom: 0.5rem;
}

.scene-lamp {
  background: radial-gradient(420px 260px at 50% 0%, rgba(245, 201, 106, 0.22), transparent 70%), #1a2142;
  border: 1px solid rgba(245, 201, 106, 0.35);
  color: #efe6cd;
}

.scene-lamp h2 { color: #f5c96a; }

.scene-moon {
  background: radial-gradient(420px 260px at 80% 0%, rgba(160, 190, 255, 0.14), transparent 70%), #10152e;
  border: 1px solid rgba(160, 190, 255, 0.25);
  color: #a9b4d8;
}

.scene-moon h2 { color: #b9cdf7; }

.kudos-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.kudos-count {
  color: #8a93bf;
  font-style: italic;
}

.aside-note {
  color: #6f79a8;
  font-size: 0.9rem;
  font-style: italic;
  margin-bottom: 1.5rem;
}

.night-card {
  background: #161d3d;
  border: 1px solid #2a335e;
  border-radius: 14px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.night-card h2 {
  color: #f5e9c9;
  font-size: 1.1rem;
  font-style: italic;
  font-weight: 400;
  margin-bottom: 0.75rem;
}

.blog-post-card,
.guestbook-entry,
.post-item {
  background: #10152e;
  border: 1px solid #2a335e;
  border-radius: 10px;
  color: #cfd6f2;
}

.post-item h3, .post-item h4, .post-item p, .post-item span {
  color: #cfd6f2;
}

a {
  color: #f5c96a;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}`,
    cssMode: 'inherit' as const
  },

  fortuneBooth: {
    name: "Fortune Booth",
    description: "Draw a card, watch the state change — If/Else chains as a boardwalk toy",
    kind: 'scripted' as const,
    template: `<div class="booth">
  <Var name="card" type="number" initial="0" />
  <Var name="draws" type="number" initial="0" persist="true" />

  <div class="booth-canopy"></div>
  <h1 class="booth-title">Fortune Booth</h1>
  <p class="booth-sub"><DisplayName as="span" /> reads the cards tonight</p>

  <div class="booth-window">
    <If data="$vars.card" equals="0">
      <div class="fortune-card card-empty">
        <p>The cards are face down.</p>
        <p class="card-hint">Draw one, if you dare.</p>
      </div>
    </If>
    <If data="$vars.card" equals="1">
      <div class="fortune-card">
        <span class="card-number">I</span>
        <p>A stranger will sign your guestbook and become a friend.</p>
      </div>
    </If>
    <If data="$vars.card" equals="2">
      <div class="fortune-card">
        <span class="card-number">II</span>
        <p>The page you have been meaning to redesign will redesign itself. (It will not. Do it tonight.)</p>
      </div>
    </If>
    <If data="$vars.card" equals="3">
      <div class="fortune-card">
        <span class="card-number">III</span>
        <p>Good news arrives in a small envelope — or a notification. Same thing now.</p>
      </div>
    </If>
    <If data="$vars.card" equals="4">
      <div class="fortune-card">
        <span class="card-number">IV</span>
        <p>You will find exactly the CSS property you were missing.</p>
      </div>
    </If>
    <If data="$vars.card" equals="5">
      <div class="fortune-card">
        <span class="card-number">V</span>
        <p>An old bookmark resurfaces. It still works. Nothing gold stays — but some things do.</p>
      </div>
    </If>
  </div>

  <Button className="draw-button">
    <OnClick>
      <If data="$vars.card" greater-than-or-equal="5">
        <Set var="card" value="1" />
      </If>
      <Else>
        <Increment var="card" />
      </Else>
      <Increment var="draws" />
    </OnClick>
    draw a card
  </Button>

  <p class="draws-line">you've drawn <ShowVar name="draws" /> cards at this booth</p>

  <div class="booth-guestbook">
    <h2>leave a prophecy of your own</h2>
    <Guestbook />
  </div>
</div>`,
    css: `/* Fortune Booth — boardwalk dusk, plum and gold */

body {
  background: #241432;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: linear-gradient(180deg, #241432 0%, #31174a 100%);
  color: #ead9f5;
  font-family: Georgia, 'Times New Roman', serif;
  min-height: 100vh;
  padding: 0 1.25rem 4rem;
}

.booth {
  max-width: 560px;
  margin: 0 auto;
  text-align: center;
}

/* Striped canopy along the top */
.booth-canopy {
  height: 26px;
  margin: 0 -1.25rem 2.5rem;
  background: repeating-linear-gradient(
    90deg,
    #d4a445 0 36px,
    #31174a 36px 72px
  );
  border-bottom: 3px solid #d4a445;
}

.booth-title {
  font-size: 2.6rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: #f0c75e;
  text-shadow: 0 0 24px rgba(240, 199, 94, 0.35);
  margin-bottom: 0.25rem;
}

.booth-sub {
  color: #b79bd1;
  font-style: italic;
  margin-bottom: 2rem;
}

.booth-window {
  margin-bottom: 1.5rem;
}

/* Ticket-stub fortune cards */
.fortune-card {
  background: #f7ecd7;
  color: #4a3050;
  border: 2px dashed #b0894a;
  border-radius: 10px;
  padding: 2rem 1.75rem;
  font-size: 1.15rem;
  line-height: 1.6;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
}

.card-empty {
  background: #2c1b42;
  color: #b79bd1;
  border-color: #6a4d85;
  font-style: italic;
}

.card-hint {
  font-size: 0.9rem;
  color: #8a6ba8;
}

.card-number {
  display: block;
  font-size: 1.5rem;
  color: #b0894a;
  letter-spacing: 0.3em;
  margin-bottom: 0.5rem;
}

.draw-button {
  background: #f0c75e;
  border: none;
  border-radius: 999px;
  color: #31174a;
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: bold;
  letter-spacing: 0.04em;
  padding: 0.75rem 2.25rem;
  cursor: pointer;
  box-shadow: 0 6px 0 #a87f2c;
  transition: all 0.15s ease;
}

.draw-button:hover {
  transform: translateY(2px);
  box-shadow: 0 4px 0 #a87f2c;
}

.draws-line {
  color: #8a6ba8;
  font-style: italic;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.booth-guestbook {
  margin-top: 3rem;
  text-align: left;
}

.booth-guestbook h2 {
  color: #f0c75e;
  font-size: 1.15rem;
  font-weight: 400;
  font-style: italic;
  text-align: center;
  margin-bottom: 1rem;
}

.guestbook-entry,
.post-item {
  background: #2c1b42;
  border: 1px solid #6a4d85;
  border-radius: 10px;
  color: #ead9f5;
}

a {
  color: #f0c75e;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}`,
    cssMode: 'inherit' as const
  },

  glassMorphism: {
    name: "Evening Glass",
    description: "Frosted glass cards floating on a deep dusk gradient",
    template: `<ProfileHero variant="plain" />

<SplitLayout ratio="1:2" gap="lg">
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
</SplitLayout>

<RetroCard>
  <Heading level="2" content="Gallery" />
  <MediaGrid />
</RetroCard>

<RetroCard>
  <Heading level="2" content="Guestbook" />
  <Guestbook />
</RetroCard>`,
    css: `/* Evening Glass — frosted panels over a dusk sky */

body {
  background: #0f2027;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background:
    radial-gradient(1100px 600px at 85% -10%, rgba(94, 234, 212, 0.25), transparent 60%),
    radial-gradient(900px 700px at -10% 110%, rgba(56, 189, 248, 0.2), transparent 55%),
    linear-gradient(160deg, #0f2027 0%, #16303c 55%, #1b4552 100%);
  color: rgba(255, 255, 255, 0.92);
  font-family: 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
  min-height: 100vh;
  padding: 3rem 1.25rem 4rem;
}

.profile-template-root > * {
  max-width: 860px;
  margin: 0 auto 1.5rem;
}

/* The glass itself: blur, a lit top edge, deep soft shadow */
.thread-module,
.ts-profile-hero {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-top-color: rgba(255, 255, 255, 0.38);
  border-radius: 18px;
  box-shadow: 0 20px 45px rgba(4, 20, 28, 0.35);
  color: rgba(255, 255, 255, 0.92);
}

.ts-profile-hero h1 {
  color: #ffffff;
}

.ts-profile-hero p {
  color: rgba(255, 255, 255, 0.75);
}

h1, h2, h3,
.ts-profile-display-name,
.blog-posts-title {
  color: #ffffff;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.ts-profile-bio {
  color: rgba(255, 255, 255, 0.78);
}

.blog-post-card,
.guestbook-entry,
.post-item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.post-item h3, .post-item h4, .post-item p, .post-item span {
  color: rgba(255, 255, 255, 0.9);
}

a {
  color: #7dd3fc;
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: #ffffff;
  text-decoration: underline;
}

.thread-button,
.thread-button-outline {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  color: #ffffff;
}

.thread-button:hover,
.thread-button-outline:hover {
  background: rgba(255, 255, 255, 0.22);
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
    css: `/* Neon Cyberspace — a terminal you'd actually want to read */

body {
  background: #05070d;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: linear-gradient(180deg, #05070d 0%, #0a1020 100%);
  color: #b6c8bf;
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Courier New', monospace;
  min-height: 100vh;
  padding: 2.5rem 1.25rem 4rem;
  position: relative;
}

/* Faint scanlines over everything */
.profile-template-root::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.02) 0 1px,
    transparent 1px 3px
  );
}

.profile-template-root > * {
  max-width: 880px;
  margin: 0 auto 1.25rem;
}

/* Dark panels with a phosphor edge */
.thread-module {
  background: #0a1420;
  border: 1px solid rgba(74, 222, 128, 0.35);
  border-radius: 6px;
  box-shadow:
    inset 0 0 30px rgba(34, 197, 94, 0.05),
    0 0 14px rgba(34, 197, 94, 0.12);
  color: #b6c8bf;
}

h1, h2, h3,
.ts-profile-display-name,
.blog-posts-title {
  color: #4ade80;
  text-shadow: 0 0 12px rgba(74, 222, 128, 0.4);
  letter-spacing: 0.08em;
  font-weight: 700;
}

.terminal-header {
  color: #22d3ee;
  text-shadow: 0 0 14px rgba(34, 211, 238, 0.5);
  letter-spacing: 0.14em;
}

.ts-profile-bio {
  color: #8fa89d;
}

.blog-post-card,
.guestbook-entry,
.post-item {
  background: #081018;
  border: 1px solid rgba(74, 222, 128, 0.22);
  border-radius: 4px;
}

.post-item h3, .post-item h4, .post-item p, .post-item span {
  color: #b6c8bf;
}

/* Cursor prompt before post titles */
.blog-post-card h3::before,
.blog-post-card h4::before {
  content: '> ';
  color: #22d3ee;
}

a {
  color: #f472b6;
  text-decoration: none;
}

a:hover {
  color: #22d3ee;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
}

.thread-button,
.thread-button-outline {
  background: transparent;
  border: 1px solid #4ade80;
  border-radius: 3px;
  color: #4ade80;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.thread-button:hover,
.thread-button-outline:hover {
  background: rgba(74, 222, 128, 0.12);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
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
    css: `/* Retro Memories — a sunny scrapbook, not a strobe light */

body {
  background: #fdf3d9;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background-color: #fdf3d9;
  background-image:
    linear-gradient(rgba(214, 93, 77, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(214, 93, 77, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  font-family: 'Trebuchet MS', Verdana, sans-serif;
  color: #4a3b2f;
  min-height: 100vh;
  padding: 2.5rem 1.25rem 4rem;
}

.profile-template-root > * {
  max-width: 860px;
  margin: 0 auto 1.5rem;
}

/* Sticker cards: chunky ink border, butter-yellow drop */
.thread-module {
  background: #fffdf7;
  border: 3px solid #2f2a25;
  border-radius: 6px;
  box-shadow: 6px 6px 0 #e8b64c;
  transform: rotate(-0.4deg);
  transition: transform 0.2s ease;
}

.thread-module:nth-of-type(even) {
  transform: rotate(0.5deg);
}

.thread-module:hover {
  transform: rotate(0deg);
}

.wave-header {
  font-size: 2rem;
  text-align: center;
  color: #d65d4d;
  text-shadow: 2px 2px 0 #ffe28a;
  border-bottom: 4px dashed #d65d4d;
  padding-bottom: 0.75rem;
}

h1, h2, h3, h4,
.ts-profile-display-name,
.blog-posts-title {
  color: #2f2a25;
  font-weight: bold;
}

h3 {
  color: #d65d4d;
}

.blog-post-card,
.guestbook-entry,
.post-item {
  background: #fff8e7;
  border: 2px solid #2f2a25;
  border-radius: 4px;
  box-shadow: 3px 3px 0 #7fb9a8;
}

/* The classic old-web link contract, kept on purpose */
a {
  color: #1d4ed8;
  text-decoration: underline;
}

a:visited {
  color: #7c3aed;
}

a:hover {
  color: #2f2a25;
  background: #ffe28a;
}

.thread-button,
.thread-button-outline {
  background: #7fb9a8;
  border: 2px solid #2f2a25;
  border-radius: 4px;
  box-shadow: 3px 3px 0 #2f2a25;
  color: #2f2a25;
  font-weight: bold;
}

.thread-button:hover,
.thread-button-outline:hover {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 #2f2a25;
}`,
    cssMode: 'inherit' as const
  },
  
  retroToybox: {
    name: "Retro Toybox",
    description: "Neon sign, polaroids, sticky notes, a VHS tape, and tabs — the fun stuff",
    template: `<NeonSign text="welcome to my corner" color="pink" animation="pulse" fontSize="large" />

<RetroCard>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
</RetroCard>

<SplitLayout ratio="1:2" gap="lg">
  <div>
    <PolaroidFrame caption="me, basically" rotation="-4">
      <ProfilePhoto size="lg" />
    </PolaroidFrame>

    <StickyNote color="pink" rotation="3">
      <p>Sign the guestbook before you go — it's in the tabs!</p>
    </StickyNote>

    <VHSTape title="MY LIFE SO FAR" year="2026" genre="Comedy" duration="forever" labelStyle="homemade" />

    <CRTMonitor content="> now playing: my little corner of the web" screenColor="green" />
  </div>

  <div>
    <Tabs>
      <Tab title="Blog">
        <BlogPosts limit="5" />
      </Tab>
      <Tab title="Photos">
        <MediaGrid />
      </Tab>
      <Tab title="Friends">
        <FriendDisplay />
        <WebsiteDisplay />
      </Tab>
      <Tab title="Guestbook">
        <Guestbook />
      </Tab>
    </Tabs>
  </div>
</SplitLayout>

<RetroTerminal variant="amber">
  <p>thanks for stopping by. take a badge, leave a note, come back soon.</p>
</RetroTerminal>`,
    css: `/* Retro Toybox Styling */
/* Visual Builder Generated CSS - VB_GENERATED_CSS */

:root {
  --global-bg-color: #1e1b3a;
  --global-font-family: 'Trebuchet MS', 'Comic Sans MS', sans-serif;
  --global-text-color: #ffe8f7;
  --global-accent-color: #ff6ec7;
}

body {
  background: #1e1b3a;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background:
    radial-gradient(circle at 20% 10%, rgba(255, 110, 199, 0.15), transparent 40%),
    radial-gradient(circle at 80% 90%, rgba(80, 200, 255, 0.12), transparent 40%),
    #1e1b3a;
  font-family: 'Trebuchet MS', 'Comic Sans MS', sans-serif;
  color: #ffe8f7;
  min-height: 100vh;
}

/* Center and constrain content width */
.profile-template-root > * {
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}

/* Toybox cards: chunky borders, soft glow */
.thread-module {
  background: #2a2550;
  border: 2px solid #ff6ec7;
  border-radius: 12px;
  box-shadow: 0 0 18px rgba(255, 110, 199, 0.25);
  color: #ffe8f7;
}

/* Tab styling to match */
.profile-tab-button {
  background: transparent;
  color: #ffe8f7;
  border-bottom: 2px solid transparent;
}

.profile-tab-button:hover {
  color: #ff6ec7;
}

.profile-tab-button.active {
  color: #ff6ec7;
  border-bottom-color: #ff6ec7;
  font-weight: bold;
}

.blog-post-card,
.guestbook-entry,
.post-item {
  background: #221d45;
  border: 1px solid rgba(255, 110, 199, 0.4);
  border-radius: 8px;
}

.post-item h3, .post-item h4, .post-item p, .post-item span {
  color: #ffe8f7;
}

h1, h2, h3,
.ts-profile-display-name,
.blog-posts-title {
  color: #ffb3e6;
  text-shadow: 0 0 12px rgba(255, 110, 199, 0.5);
}

.ts-profile-bio {
  color: #d9c8ec;
}

a {
  color: #7fd7ff;
  transition: all 0.2s ease;
}

a:hover {
  color: #ffffff;
  text-shadow: 0 0 8px rgba(127, 215, 255, 0.8);
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
    css: `/* Minimalist Zen — quiet paper, ink, and one warm accent */

body {
  background: #faf8f3;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: #faf8f3;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  line-height: 1.75;
  color: #26221c;
  min-height: 100vh;
  padding: 4rem 1.25rem 5rem;
}

.profile-template-root > * {
  max-width: 640px;
  margin: 0 auto 2.5rem;
}

/* No cards — just breathing room and a hairline between sections */
.thread-module {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  border-top: 1px solid #ddd5c4;
  padding-top: 2rem;
}

h1,
.ts-profile-display-name {
  font-size: 2.1rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: #26221c;
}

h2,
.blog-posts-title {
  font-style: italic;
  font-weight: 400;
  font-size: 1.25rem;
  color: #8a7f6a;
}

.ts-profile-bio {
  color: #4c443a;
}

.blog-post-card,
.guestbook-entry,
.post-item {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  border-bottom: 1px dashed #ddd5c4;
  padding-left: 0;
  padding-right: 0;
}

a {
  color: #26221c;
  text-decoration: underline;
  text-decoration-color: #c9beab;
  text-underline-offset: 3px;
  transition: all 0.2s ease;
}

a:hover {
  color: #b3591f;
  text-decoration-color: #b3591f;
}

.thread-button,
.thread-button-outline {
  background: transparent;
  border: 1px solid #26221c;
  border-radius: 0;
  color: #26221c;
  font-family: inherit;
}

.thread-button:hover,
.thread-button-outline:hover {
  background: #26221c;
  color: #faf8f3;
}`,
    cssMode: 'inherit' as const
  },
  
  creativePortfolio: {
    name: "Creative Portfolio",
    description: "White-wall gallery with ink borders and a Klein blue accent",
    template: `<ProfileHero variant="plain" />

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
    css: `/* Creative Portfolio — white walls, ink lines, one loud blue */

body {
  background: #f4f1ec;
  margin: 0;
  padding: 0;
}

.profile-template-root {
  background: #f4f1ec;
  font-family: 'Futura', 'Avenir Next', 'Century Gothic', sans-serif;
  color: #141414;
  min-height: 100vh;
  padding: 3rem 1.25rem 4rem;
}

.profile-template-root > * {
  max-width: 900px;
  margin: 0 auto 2rem;
}

/* Riso-print cards: flat white, hard ink border, blue offset */
.thread-module,
.ts-profile-hero {
  background: #fffefb;
  border: 2px solid #141414;
  border-radius: 0;
  box-shadow: 8px 8px 0 #002fa7;
}

.ts-profile-hero h1 {
  color: #141414;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.ts-profile-hero p {
  color: #3d3a35;
}

h1, h2, h3,
.blog-posts-title {
  color: #141414;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
}

h2 { font-size: 1.1rem; }
h3 { font-size: 0.95rem; }

.ts-profile-display-name {
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.ts-profile-bio {
  color: #3d3a35;
}

.blog-post-card,
.guestbook-entry,
.post-item {
  background: #fffefb;
  border: 1px solid #141414;
  border-radius: 0;
  box-shadow: none;
}

a {
  color: #002fa7;
  text-decoration: none;
  border-bottom: 2px solid #002fa7;
  transition: all 0.15s ease;
}

a:hover {
  background: #002fa7;
  color: #fffefb;
}

.thread-button,
.thread-button-outline {
  background: #fffefb;
  border: 2px solid #141414;
  border-radius: 0;
  color: #141414;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
}

.thread-button:hover,
.thread-button-outline:hover {
  background: #002fa7;
  border-color: #002fa7;
  color: #fffefb;
}`,
    cssMode: 'inherit' as const
  }
};