import { PRESET_CHROME_CSS } from './preset-chrome';

export const WEB1_STARFIELD_TEMPLATE = `/* ==============================================
   STARFIELD
   A 1999 homepage: tiled stars, Times New Roman,
   yellow headings, bright links, one narrow column.
   black #05050f, text #e8e8e8, yellow #ffff66,
   links #66ccff (visited #cc99ff), lime #66ff66
   ============================================== */

/* Your page's main colours and fonts. Change a value here and the
   whole theme follows (the Appearance settings write these too). */
:root {
  --ts-ground: #05050f;
  --ts-card: #0b0b1e;
  --ts-ink: #e8e8e8;
  --ts-accent: #ffff66;
  --ts-on-accent: #05050f;
  --ts-font-head: 'Times New Roman', Times, serif;
  --ts-font-body: 'Times New Roman', Times, serif;
}

/* ---------- Page background: stars ---------- */

.thread-surface {
  background-color: var(--ts-ground) !important;
  background-image: url('/assets/stars-bg.gif') !important;
  background-repeat: repeat !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
}

/* Links the way they used to be */
.ts-profile-container a {
  color: #66ccff !important;
}

.ts-profile-container a:visited {
  color: #cc99ff !important;
}

/* ---------- Sections: no boxes, a groove line under each ---------- */

.thread-module {
  background: transparent !important;
  border: none !important;
  border-bottom: 3px groove #8888aa !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 1.5rem 0 !important;
  margin-bottom: 0.5rem !important;
  color: var(--ts-ink) !important;
}

/* Headings in yellow. One class more than the shared block at the end, so
   these win. */
.ts-profile-container .thread-headline {
  color: var(--ts-accent) !important;
  font-family: var(--ts-font-head) !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  text-shadow: none !important;
}

/* ---------- Profile: one centred column ---------- */

.ts-profile-container {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  max-width: 40rem !important;
  margin-left: auto !important;
  margin-right: auto !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
}

.ts-profile-header {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  text-align: center !important;
}

.ts-profile-header-layout {
  align-items: center !important;
}

.ts-profile-display-name {
  font-family: var(--ts-font-head) !important;
  font-size: 2.4rem !important;
  font-weight: 700 !important;
  color: var(--ts-accent) !important;
  letter-spacing: 0 !important;
  text-shadow: none !important;
}

.ts-profile-status {
  font-family: var(--ts-font-body) !important;
  font-size: 1rem !important;
  font-style: italic !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  color: #66ff66 !important;
  background: transparent !important;
  border: none !important;
}

.ts-profile-bio {
  font-family: var(--ts-font-body) !important;
  font-size: 1.1rem !important;
  line-height: 1.6 !important;
  color: var(--ts-ink) !important;
  background: transparent !important;
  border: none !important;
  padding: 0.5rem 0 !important;
}

.ts-profile-actions {
  justify-content: center !important;
  gap: 0.5rem !important;
}

/* Grey buttons with a raised edge */
.ts-profile-actions .ts-profile-button {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 0.85rem !important;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  color: #000000 !important;
  background: #c0c0c0 !important;
  border: 2px outset #dfdfdf !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0.2rem 0.8rem !important;
}

.ts-profile-actions .ts-profile-button:active {
  border-style: inset !important;
}

/* ---------- Photo ---------- */

.profile-photo-frame {
  background: transparent !important;
  border: 2px ridge #8888aa !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 2px !important;
}

.profile-photo-image {
  border-radius: 0 !important;
  display: block !important;
}

/* ---------- Tabs: words in brackets ---------- */

.profile-tab-list {
  background: transparent !important;
  border: none !important;
  border-bottom: 3px groove #8888aa !important;
  border-radius: 0 !important;
  justify-content: center !important;
  gap: 0.25rem !important;
}

.profile-tab-button {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: #66ccff !important;
  font-family: var(--ts-font-body) !important;
  font-size: 1rem !important;
  text-decoration: underline !important;
  text-transform: none !important;
}

.profile-tab-button::before {
  content: '[' !important;
  color: var(--ts-ink) !important;
}

.profile-tab-button::after {
  content: ']' !important;
  color: var(--ts-ink) !important;
}

.profile-tab-button.active {
  color: var(--ts-accent) !important;
  text-decoration: none !important;
}

.profile-tab-panel {
  background: transparent !important;
  border: none !important;
  padding: 1rem 0 !important;
}

/* ---------- Posts: plain text, a groove line between ---------- */

.blog-tab-content {
  background: transparent !important;
}

.post-item {
  background: transparent !important;
  border: none !important;
  border-bottom: 3px groove #8888aa !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 1.25rem 0 !important;
  margin-bottom: 0 !important;
}

.blog-post-title {
  font-family: var(--ts-font-head) !important;
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  color: var(--ts-accent) !important;
}

.blog-post-date {
  font-family: var(--ts-font-body) !important;
  font-style: italic !important;
  color: #66ff66 !important;
}

.blog-post-content {
  font-family: var(--ts-font-body) !important;
  font-size: 1.1rem !important;
  line-height: 1.6 !important;
  color: var(--ts-ink) !important;
}

/* ---------- Phones ---------- */

@media (max-width: 767px) {
  .ts-profile-display-name {
    font-size: 1.8rem !important;
  }

  .profile-tab-list {
    flex-wrap: wrap !important;
  }
}
${PRESET_CHROME_CSS}`;
