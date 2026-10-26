/**
 * One of the profile starters the HTML editor's gallery used to offer (until
 * 2026-10), kept as a test fixture: a busy page of many components, which
 * now also checks that retired ones strip cleanly. The gallery now uses
 * lib/templates/starters; the rest of the old ones were dropped 2026-10-26.
 */
/**
 * The examples (formerly lib/templates/default-profile-template.ts).
 *
 * `kind` groups the gallery: 'profile' redesigns (default when absent),
 * 'scripted' pages that show the template language doing real work.
 */
export const TEMPLATE_EXAMPLES = {
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
}
/* ThreadStead component chrome (guestbook, labels, dividers) on-theme */
.thread-headline {
  color: #ffb3e6;
  text-shadow: none;
  font-family: inherit;
}

.thread-label {
  color: #b9a8d6;
}

.thread-divider {
  border-top-color: rgba(255, 110, 199, 0.4);
}

.profile-template-root textarea,
.profile-template-root input,
.profile-template-root select {
  background: #221d45;
  border: 1px solid rgba(255, 110, 199, 0.5);
  border-radius: 8px;
  color: #ffe8f7;
}

.profile-template-root ::placeholder {
  color: #8d7fb3;
}
`,
    cssMode: 'inherit' as const
  }

};