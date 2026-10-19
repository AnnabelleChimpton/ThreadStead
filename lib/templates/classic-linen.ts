import { presetFontFaces } from './preset-fonts';
import { PRESET_CHROME_CSS } from './preset-chrome';

export const CLASSIC_LINEN_TEMPLATE = `/* ==============================================
   CLASSIC LINEN — quiet, typographic, timeless
   linen #f4efe6 · ink #2b2925 · olive #6b6a45
   hairline #d8d0c0 · faded ink #6e675c
   ============================================== */

/* Fonts come from this site (lib/templates/preset-fonts.ts), not Google */
${presetFontFaces(['Source Serif 4', 'Inter'])}

/* Your page's main colours and fonts. Change a value here and the
   whole theme follows (the Appearance settings write these too). */
:root {
  --ts-ground: #f4efe6;
  --ts-card: transparent;
  --ts-ink: #2b2925;
  --ts-accent: #6b6a45;
  --ts-on-accent: #f4efe6;
  --ts-font-head: 'Source Serif 4', Georgia, serif;
  --ts-font-body: 'Source Serif 4', Georgia, serif;
}


/* ---------- Surface: linen with woven texture ---------- */

.thread-surface {
  background-color: var(--ts-ground) !important;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(43, 41, 37, 0.03) 0px,
      rgba(43, 41, 37, 0.03) 1px,
      transparent 1px,
      transparent 3px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(43, 41, 37, 0.03) 0px,
      rgba(43, 41, 37, 0.03) 1px,
      transparent 1px,
      transparent 3px
    ) !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
  line-height: 1.75 !important;
}

/* ---------- Modules: rules, not boxes ---------- */

.thread-module {
  background: transparent !important;
  border: none !important;
  border-top: 1px solid #d8d0c0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 2rem 0 !important;
  margin-bottom: 1.5rem !important;
}

/* ---------- Profile ---------- */

.ts-profile-container {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 2.5rem 1.5rem !important;
  max-width: 44rem !important;
  margin-left: auto !important;
  margin-right: auto !important;
  animation: linen-fade 0.5s ease-out both !important;
}

.ts-profile-header {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #d8d0c0 !important;
  box-shadow: none !important;
  padding: 0 0 2rem 0 !important;
  margin-bottom: 2rem !important;
  text-align: center !important;
}

.ts-profile-display-name {
  font-family: var(--ts-font-head) !important;
  font-weight: 600 !important;
  font-size: 2.1rem !important;
  line-height: 1.25 !important;
  letter-spacing: 0.005em !important;
  color: var(--ts-ink) !important;
  text-shadow: none !important;
}

.ts-profile-status {
  font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
  font-size: 0.7rem !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.18em !important;
  color: var(--ts-accent) !important;
  background: transparent !important;
  border: none !important;
  margin-top: 0.5rem !important;
}

.ts-profile-bio {
  font-family: var(--ts-font-body) !important;
  font-size: 1.05rem !important;
  font-weight: 400 !important;
  line-height: 1.85 !important;
  color: var(--ts-ink) !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 1.25rem 0 !important;
  max-width: 38rem !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.ts-profile-actions {
  display: flex !important;
  justify-content: center !important;
  gap: 0.75rem !important;
  padding: 0.75rem 0 0 0 !important;
  background: transparent !important;
  border: none !important;
}

.ts-profile-button {
  font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
  font-size: 0.72rem !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.14em !important;
  color: var(--ts-ink) !important;
  background: transparent !important;
  border: 1px solid #d8d0c0 !important;
  border-radius: 2px !important;
  box-shadow: none !important;
  padding: 0.55rem 1.4rem !important;
  transition: border-color 0.2s ease, color 0.2s ease !important;
}

.ts-profile-button:hover,
.ts-profile-button:focus {
  color: var(--ts-accent) !important;
  border-color: var(--ts-accent) !important;
  background: transparent !important;
  box-shadow: none !important;
  transform: none !important;
}

/* ---------- Portrait ---------- */

.profile-photo-wrapper {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.profile-photo-frame {
  background: var(--ts-ground) !important;
  border: 1px solid #d8d0c0 !important;
  border-radius: 2px !important;
  box-shadow: 0 1px 2px rgba(43, 41, 37, 0.08) !important;
  padding: 5px !important;
}

.profile-photo-image {
  border: none !important;
  border-radius: 1px !important;
  box-shadow: none !important;
  filter: none !important;
  display: block !important;
}

/* ---------- Tabs ---------- */

.profile-tab-list {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #d8d0c0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  gap: 1.5rem !important;
  padding: 0 !important;
  font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
  font-size: 0.72rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.14em !important;
}

.profile-tab-panel {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 2rem 0 !important;
}

/* ---------- Blog posts: entries in a journal ---------- */

.blog-post-card {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #d8d0c0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 2rem 0 !important;
  margin-bottom: 0 !important;
}

.blog-post-header {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  margin-bottom: 0.75rem !important;
}

.blog-post-title {
  font-family: var(--ts-font-head) !important;
  font-weight: 600 !important;
  font-size: 1.35rem !important;
  line-height: 1.35 !important;
  letter-spacing: 0.005em !important;
  color: var(--ts-ink) !important;
}

.blog-post-title a {
  color: var(--ts-ink) !important;
  text-decoration: none !important;
}

.blog-post-title a:hover {
  color: var(--ts-accent) !important;
  text-decoration: underline !important;
  text-underline-offset: 3px !important;
  text-decoration-thickness: 1px !important;
}

.blog-post-date {
  font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
  font-size: 0.68rem !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.18em !important;
  color: #6e675c !important;
}

.blog-post-content {
  font-family: var(--ts-font-body) !important;
  font-size: 1rem !important;
  line-height: 1.85 !important;
  color: var(--ts-ink) !important;
}

.blog-post-content a {
  color: var(--ts-accent) !important;
  text-decoration: underline !important;
  text-underline-offset: 3px !important;
  text-decoration-thickness: 1px !important;
}

/* ---------- Motion: a fade at most ---------- */

@keyframes linen-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---------- Small screens ---------- */

@media (max-width: 767px) {
  .ts-profile-container {
    padding: 1.75rem 1rem !important;
  }

  .ts-profile-display-name {
    font-size: 1.7rem !important;
  }

  .ts-profile-bio {
    font-size: 1rem !important;
    padding: 1rem 0 !important;
  }

  .ts-profile-actions {
    flex-wrap: wrap !important;
  }

  .profile-tab-list {
    gap: 1rem !important;
    overflow-x: auto !important;
  }

  .blog-post-card {
    padding: 1.5rem 0 !important;
  }

  .blog-post-title {
    font-size: 1.2rem !important;
  }
}

/* ---------- Tabs & blog list (profile page) ---------- */

.profile-tab-button {
  background: transparent !important;
  color: #6e675c !important;
  border-right: none !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 0.78rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.12em !important;
}

.profile-tab-button:hover {
  color: var(--ts-ink) !important;
}

.profile-tab-button.active {
  background: transparent !important;
  color: var(--ts-ink) !important;
  box-shadow: inset 0 -1px 0 var(--ts-accent) !important;
}

.blog-tab-content {
  background: transparent !important;
}

.blog-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
}

.post-item {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #d8d0c0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding-top: 1.25rem !important;
  padding-bottom: 1.25rem !important;
}

.blog-post-content {
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
  line-height: 1.7 !important;
}

.blog-post-actions {
  border-top: none !important;
  color: #6e675c !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 0.78rem !important;
  letter-spacing: 0.06em !important;
}
${PRESET_CHROME_CSS}`;
