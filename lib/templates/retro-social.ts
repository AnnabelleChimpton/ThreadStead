import { PRESET_CHROME_CSS } from './preset-chrome';

export const RETRO_SOCIAL_TEMPLATE = `/* ===========================================
   RETRO SOCIAL
   A 2005 profile page: blue bars, peach headings,
   small Verdana, thin borders.
   blue #1c3f95, dark blue #16327a, peach #ffcc99,
   page #e9edf6, borders #7d8db3
   =========================================== */

/* Your page's main colours and fonts. Change a value here and the
   whole theme follows (the Appearance settings write these too). */
:root {
  --ts-ground: #e9edf6;
  --ts-card: #ffffff;
  --ts-ink: #222222;
  --ts-accent: #1c3f95;
  --ts-on-accent: #ffffff;
  --ts-font-head: Verdana, Tahoma, Geneva, sans-serif;
  --ts-font-body: Verdana, Tahoma, Geneva, sans-serif;
}

/* ---------- Page background ---------- */

.thread-surface {
  background-color: var(--ts-ground) !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
}

/* ---------- Boxes: white with a thin blue-grey border ---------- */

.thread-module {
  background: var(--ts-card) !important;
  border: 1px solid #7d8db3 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0.75rem !important;
  font-family: var(--ts-font-body) !important;
  font-size: 0.8rem !important;
  color: var(--ts-ink) !important;
}

/* Section headings ("Right now", Guestbook…) are peach bars. One class
   more than the shared block at the end, so these win. */
.ts-profile-container .thread-headline {
  display: block !important;
  background: #ffcc99 !important;
  color: #16327a !important;
  font-family: var(--ts-font-head) !important;
  font-size: 0.9rem !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  padding: 0.25rem 0.5rem !important;
  margin: 0 0 0.6rem 0 !important;
}

/* ---------- Profile ---------- */

.ts-profile-container {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  font-family: var(--ts-font-body) !important;
  color: var(--ts-ink) !important;
  max-width: 52rem !important;
}

.ts-profile-header {
  background: var(--ts-card) !important;
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

/* Photo on the left, everything else beside it */
.ts-profile-header-layout {
  gap: 1rem !important;
}

/* The name sits in a solid blue bar (it's a .thread-headline too: this
   comes after the peach bars, at the same weight, so it wins) */
.ts-profile-container .ts-profile-display-name {
  display: block !important;
  background: var(--ts-accent) !important;
  color: #ffffff !important;
  font-family: var(--ts-font-head) !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  text-shadow: none !important;
  padding: 0.35rem 0.6rem !important;
  margin-bottom: 0.4rem !important;
}

.ts-profile-status {
  font-family: var(--ts-font-body) !important;
  font-size: 0.75rem !important;
  font-weight: 400 !important;
  font-style: italic !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  color: #16327a !important;
  background: transparent !important;
  border: none !important;
  padding: 0 0.6rem !important;
}

.ts-profile-bio {
  font-family: var(--ts-font-body) !important;
  font-size: 0.8rem !important;
  line-height: 1.6 !important;
  color: #333333 !important;
  background: transparent !important;
  border: 1px solid #7d8db3 !important;
  border-radius: 0 !important;
  padding: 0.6rem !important;
}

.ts-profile-actions {
  display: flex !important;
  gap: 0.4rem !important;
  flex-wrap: wrap !important;
}

.ts-profile-actions .ts-profile-button {
  font-family: var(--ts-font-body) !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  color: #ffffff !important;
  background: var(--ts-accent) !important;
  border: 1px solid #16327a !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0.3rem 0.8rem !important;
}

.ts-profile-actions .ts-profile-button:hover {
  background: #16327a !important;
  color: #ffffff !important;
}

/* ---------- Photo ---------- */

.profile-photo-wrapper {
  padding: 0 !important;
  background: transparent !important;
}

.profile-photo-frame {
  background: var(--ts-card) !important;
  border: 1px solid #7d8db3 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 3px !important;
}

.profile-photo-image {
  border: none !important;
  border-radius: 0 !important;
  display: block !important;
}

/* ---------- Tabs: a peach bar of blue links ---------- */

.profile-tab-list {
  background: #ffcc99 !important;
  border: 1px solid #7d8db3 !important;
  border-bottom: none !important;
  border-radius: 0 !important;
  padding: 0.25rem 0.25rem 0 0.25rem !important;
  gap: 2px !important;
}

.profile-tab-button {
  background: transparent !important;
  color: #16327a !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  font-family: var(--ts-font-body) !important;
  font-size: 0.78rem !important;
  font-weight: 700 !important;
  text-transform: none !important;
  text-decoration: underline !important;
  padding: 0.3rem 0.6rem !important;
}

.profile-tab-button:hover {
  background: #ffe0c2 !important;
}

.profile-tab-button.active {
  background: var(--ts-card) !important;
  color: var(--ts-ink) !important;
  text-decoration: none !important;
}

.profile-tab-panel {
  background: var(--ts-card) !important;
  border: 1px solid #7d8db3 !important;
  border-top: none !important;
  border-radius: 0 !important;
  padding: 0.75rem !important;
  font-family: var(--ts-font-body) !important;
}

/* ---------- Posts: each one a box with a light blue header strip ---------- */

.blog-tab-content {
  background: transparent !important;
}

.blog-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.75rem !important;
}

.post-item {
  background: var(--ts-card) !important;
  border: 1px solid #7d8db3 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  margin-bottom: 0 !important;
  padding: 0.75rem !important;
}

.blog-post-header {
  background: #dbe3f4 !important;
  border-bottom: 1px solid #7d8db3 !important;
  margin: -0.75rem -0.75rem 0.6rem -0.75rem !important;
  padding: 0.4rem 0.75rem !important;
}

.blog-post-title {
  font-family: var(--ts-font-body) !important;
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  color: var(--ts-accent) !important;
}

.blog-post-date {
  font-family: var(--ts-font-body) !important;
  font-size: 0.7rem !important;
  color: #47557a !important;
  font-style: italic !important;
}

.blog-post-content {
  font-family: var(--ts-font-body) !important;
  font-size: 0.8rem !important;
  line-height: 1.65 !important;
  color: #222222 !important;
}

.blog-post-content a {
  color: var(--ts-accent) !important;
  font-weight: 700 !important;
  text-decoration: underline !important;
}

.blog-post-actions {
  color: #47557a !important;
}

/* ---------- Phones ---------- */

@media (max-width: 767px) {
  .ts-profile-container .ts-profile-display-name {
    font-size: 1rem !important;
  }

  .ts-profile-actions {
    gap: 0.35rem !important;
  }
}
${PRESET_CHROME_CSS}`;
