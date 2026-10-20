import { presetFontFaces } from './preset-fonts';
import { PRESET_CHROME_CSS } from './preset-chrome';

export const RETRO_SOCIAL_TEMPLATE = `/* Fonts come from this site (lib/templates/preset-fonts.ts), not Google */
${presetFontFaces(['Righteous'])}

/* Your page's main colours and fonts. Change a value here and the
   whole theme follows (the Appearance settings write these too). */
:root {
  --ts-ground: #e9edf6;
  --ts-card: #ffffff;
  --ts-ink: #222222;
  --ts-accent: #1c3f95;
  --ts-on-accent: #ffffff;
  --ts-font-head: 'Righteous', Verdana, Tahoma, sans-serif;
  --ts-font-body: Verdana, Tahoma, Geneva, sans-serif;
}


/* ===========================================
   RETRO SOCIAL — mid-2000s profile-page chic
   Palette: #1c3f95 (accent blue) / #16327a (deep blue)
            #e9edf6 (page) / #ffffff (panels)
            #7d8db3 (bevel dark) / #551a8b (visited)
   =========================================== */

/* ---- Page surface: tiled subtle dot pattern ---- */
.thread-surface {
  background-color: var(--ts-ground) !important;
  background-image:
    radial-gradient(circle at 4px 4px, #d4dbec 1px, transparent 1px),
    radial-gradient(circle at 16px 16px, #dee4f1 1px, transparent 1px) !important;
  background-size: 24px 24px, 24px 24px !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
}

/* ---- Beveled module boxes (the load-bearing kitsch) ---- */
.thread-module {
  background: var(--ts-card) !important;
  border-top: 2px solid #ffffff !important;
  border-left: 2px solid #ffffff !important;
  border-right: 2px solid #7d8db3 !important;
  border-bottom: 2px solid #7d8db3 !important;
  outline: 1px solid #aeb9d6 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 1rem !important;
  font-family: var(--ts-font-body) !important;
  color: var(--ts-ink) !important;
}

/* ---- Profile container: framed like a classic profile table ---- */
.ts-profile-container {
  background: var(--ts-card) !important;
  border: 2px solid var(--ts-accent) !important;
  border-radius: 0 !important;
  box-shadow: 3px 3px 0 #aeb9d6 !important;
  font-family: var(--ts-font-body) !important;
  color: var(--ts-ink) !important;
  overflow: hidden !important;
}

.ts-profile-header {
  background: #dbe3f4 !important;
  border-bottom: 2px solid var(--ts-accent) !important;
  padding: 1rem !important;
  border-radius: 0 !important;
}

.ts-profile-display-name {
  font-family: var(--ts-font-head) !important;
  font-weight: 400 !important;
  font-size: 1.6rem !important;
  color: var(--ts-accent) !important;
  text-shadow: 1px 1px 0 #ffffff !important;
  letter-spacing: 0.5px !important;
}

.ts-profile-status {
  font-family: var(--ts-font-body) !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  color: var(--ts-accent) !important;
  background: var(--ts-card) !important;
  border: 1px solid #7d8db3 !important;
  border-radius: 3px !important;
  padding: 0.15rem 0.5rem !important;
  display: inline-block !important;
  animation: rsStatusWink 4s ease-in-out infinite !important;
}

/* One subtle blink-adjacent wink, in loving memory of <blink> */
@keyframes rsStatusWink {
  0%, 88%, 100% { opacity: 1; }
  94% { opacity: 0.55; }
}

.ts-profile-bio {
  font-family: var(--ts-font-body) !important;
  font-size: 0.85rem !important;
  line-height: 1.6 !important;
  color: #333333 !important;
  background: #f3f6fc !important;
  border-top: 1px solid #7d8db3 !important;
  border-left: 1px solid #7d8db3 !important;
  border-right: 1px solid #ffffff !important;
  border-bottom: 1px solid #ffffff !important;
  border-radius: 0 !important;
  padding: 0.75rem !important;
}

.ts-profile-actions {
  padding: 0.5rem 0 !important;
  display: flex !important;
  gap: 0.5rem !important;
  flex-wrap: wrap !important;
}

/* ---- Beveled OS-style buttons ---- */
.ts-profile-button {
  font-family: var(--ts-font-body) !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  color: var(--ts-accent) !important;
  background: #e4e9f5 !important;
  border-top: 2px solid #ffffff !important;
  border-left: 2px solid #ffffff !important;
  border-right: 2px solid #7d8db3 !important;
  border-bottom: 2px solid #7d8db3 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0.35rem 0.9rem !important;
  text-decoration: none !important;
  cursor: pointer !important;
}

.ts-profile-button:hover {
  background: #d3dcf0 !important;
  color: #16327a !important;
}

.ts-profile-button:active {
  border-top: 2px solid #7d8db3 !important;
  border-left: 2px solid #7d8db3 !important;
  border-right: 2px solid #ffffff !important;
  border-bottom: 2px solid #ffffff !important;
}

/* ---- Profile photo: the classic framed square ---- */
.profile-photo-wrapper {
  padding: 0 !important;
  background: transparent !important;
}

.profile-photo-frame {
  background: var(--ts-card) !important;
  border: 2px solid var(--ts-accent) !important;
  outline: 1px solid #aeb9d6 !important;
  border-radius: 0 !important;
  box-shadow: 3px 3px 0 #aeb9d6 !important;
  padding: 4px !important;
}

.profile-photo-image {
  border: 1px solid #7d8db3 !important;
  border-radius: 0 !important;
  display: block !important;
}

/* ---- Blog posts: bulletin-board entries ---- */
.blog-post-card {
  background: var(--ts-card) !important;
  border-top: 2px solid #ffffff !important;
  border-left: 2px solid #ffffff !important;
  border-right: 2px solid #7d8db3 !important;
  border-bottom: 2px solid #7d8db3 !important;
  outline: 1px solid #aeb9d6 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  margin-bottom: 1rem !important;
  padding: 1rem !important;
}

.blog-post-header {
  background: #dbe3f4 !important;
  border-bottom: 2px solid var(--ts-accent) !important;
  margin: -1rem -1rem 0.75rem -1rem !important;
  padding: 0.5rem 1rem !important;
}

.blog-post-title {
  font-family: var(--ts-font-body) !important;
  font-size: 1rem !important;
  font-weight: 700 !important;
  color: var(--ts-accent) !important;
  text-decoration: none !important;
}

.blog-post-title a {
  color: var(--ts-accent) !important;
  text-decoration: underline !important;
}

.blog-post-title a:visited {
  color: #551a8b !important;
}

.blog-post-date {
  font-family: var(--ts-font-body) !important;
  font-size: 0.7rem !important;
  color: #47557a !important;
  font-style: italic !important;
}

.blog-post-content {
  font-family: var(--ts-font-body) !important;
  font-size: 0.85rem !important;
  line-height: 1.65 !important;
  color: #333333 !important;
}

.blog-post-content a {
  color: var(--ts-accent) !important;
  font-weight: 700 !important;
  text-decoration: underline !important;
}

.blog-post-content a:visited {
  color: #551a8b !important;
}

/* ---- Tabs: folder tabs, table-era style ---- */
.profile-tab-list {
  background: #dbe3f4 !important;
  border-bottom: 2px solid var(--ts-accent) !important;
  border-radius: 0 !important;
  padding: 0.4rem 0.4rem 0 0.4rem !important;
  gap: 3px !important;
  font-family: var(--ts-font-body) !important;
}

.profile-tab-panel {
  background: var(--ts-card) !important;
  border-top: 0 !important;
  border-left: 2px solid #ffffff !important;
  border-right: 2px solid #7d8db3 !important;
  border-bottom: 2px solid #7d8db3 !important;
  border-radius: 0 !important;
  padding: 1rem !important;
  font-family: var(--ts-font-body) !important;
}

/* ---- Small screens: tighter chrome, same charm ---- */
@media (max-width: 767px) {
  .ts-profile-display-name {
    font-size: 1.25rem !important;
  }

  .thread-module,
  .blog-post-card,
  .profile-tab-panel {
    padding: 0.75rem !important;
  }

  .blog-post-header {
    margin: -0.75rem -0.75rem 0.6rem -0.75rem !important;
    padding: 0.4rem 0.75rem !important;
  }

  .ts-profile-actions {
    gap: 0.35rem !important;
  }

  .ts-profile-button {
    padding: 0.3rem 0.7rem !important;
    font-size: 0.7rem !important;
  }
}

/* ---------- Tabs & blog list (profile page) ---------- */

.profile-tab-button {
  background: #dfe6f5 !important;
  color: var(--ts-accent) !important;
  border-right: 2px solid !important;
  border-color: #ffffff #9aa7c7 #9aa7c7 #ffffff !important;
  font-family: Verdana, Tahoma, sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.78rem !important;
}

.profile-tab-button:hover {
  background: #eef2fb !important;
}

.profile-tab-button.active {
  background: var(--ts-card) !important;
  color: #16327a !important;
  border-color: #9aa7c7 #ffffff #ffffff #9aa7c7 !important;
}

.blog-tab-content {
  background: transparent !important;
}

.blog-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
}

.post-item {
  background: var(--ts-card) !important;
  border: 2px solid !important;
  border-color: #ffffff #9aa7c7 #9aa7c7 #ffffff !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.blog-post-content {
  color: #1f2532 !important;
  font-family: Verdana, Tahoma, sans-serif !important;
  font-size: 0.85rem !important;
}

.blog-post-actions {
  border-top: 1px solid #c6cede !important;
  color: #5a6a8c !important;
}
${PRESET_CHROME_CSS}`;
