import { presetFontFaces } from './preset-fonts';
import { PRESET_CHROME_CSS } from './preset-chrome';

export const PIXEL_PETALS_TEMPLATE = `/* ==============================================
   PIXEL PETALS
   cream page #fff8fa, light pink #ffd4e8,
   pink #ff8fb8, rose #c2477d, ink #53384a
   Silkscreen for headings, Nunito for text
   ============================================== */

/* Fonts come from this site (lib/templates/preset-fonts.ts), not Google */
${presetFontFaces(['Silkscreen', 'Nunito'])}

/* Your page's main colours and fonts. Change a value here and the
   whole theme follows (the Appearance settings write these too). */
:root {
  --ts-ground: #fff8fa;
  --ts-card: #ffffff;
  --ts-ink: #53384a;
  --ts-accent: #c2477d;
  --ts-on-accent: #ffffff;
  --ts-font-head: 'Silkscreen', monospace;
  --ts-font-body: 'Nunito', sans-serif;
}

/* ---------- Page background: cream with a faint check ---------- */

.thread-surface {
  background-color: var(--ts-ground) !important;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(255, 143, 184, 0.06) 0px,
      rgba(255, 143, 184, 0.06) 2px,
      transparent 2px,
      transparent 24px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(255, 143, 184, 0.06) 0px,
      rgba(255, 143, 184, 0.06) 2px,
      transparent 2px,
      transparent 24px
    ) !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
}

/* ---------- Boxes: white, light pink edge, small pink shadow ---------- */

.thread-module {
  background: var(--ts-card) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 8px !important;
  box-shadow: 3px 3px 0 #ffd4e8 !important;
  color: var(--ts-ink) !important;
}

/* ---------- Profile ---------- */

.ts-profile-container {
  background: var(--ts-card) !important;
  border: 2px solid #ff8fb8 !important;
  border-radius: 8px !important;
  box-shadow: 4px 4px 0 #ffd4e8 !important;
  padding: 1rem !important;
}

.ts-profile-header {
  background: #ffe4ef !important;
  border: none !important;
  border-bottom: 2px solid #ff8fb8 !important;
  border-radius: 8px 8px 0 0 !important;
  padding: 1.75rem 1.5rem !important;
  margin-bottom: 1.25rem !important;
}

.ts-profile-display-name {
  font-family: var(--ts-font-head) !important;
  font-weight: 700 !important;
  font-size: 1.9rem !important;
  color: var(--ts-accent) !important;
  text-shadow: 2px 2px 0 #ffffff !important;
  letter-spacing: 0.5px !important;
}

.ts-profile-status {
  display: inline-block !important;
  font-family: var(--ts-font-body) !important;
  font-weight: 700 !important;
  font-size: 0.8rem !important;
  color: #a83a6c !important; /* the rose, darkened: small text on white */
  background: var(--ts-ground) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 999px !important;
  padding: 0.15rem 0.75rem !important;
}

.ts-profile-bio {
  background: var(--ts-ground) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 8px !important;
  padding: 1.1rem 1.25rem !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
  font-weight: 600 !important;
  line-height: 1.7 !important;
  box-shadow: none !important;
}

.ts-profile-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.6rem !important;
  margin-top: 0.75rem !important;
}

.ts-profile-actions .ts-profile-button {
  font-family: var(--ts-font-body) !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  color: var(--ts-accent) !important;
  background: var(--ts-card) !important;
  border: 2px solid var(--ts-accent) !important;
  border-radius: 8px !important;
  padding: 0.4rem 1rem !important;
  box-shadow: 2px 2px 0 #ff8fb8 !important;
}

.ts-profile-actions .ts-profile-button:hover {
  background: #ffd4e8 !important;
  color: var(--ts-accent) !important;
}

/* ---------- Photo: a tilted polaroid ---------- */

.profile-photo-wrapper {
  display: inline-block !important;
  transform: rotate(-2deg) !important;
}

.profile-photo-frame {
  background: var(--ts-card) !important;
  border: 8px solid #ffffff !important;
  border-radius: 2px !important;
  box-shadow:
    0 0 0 2px #ff8fb8,
    4px 4px 0 #ffd4e8 !important;
}

.profile-photo-image {
  border-radius: 1px !important;
  display: block !important;
}

/* ---------- Tabs ---------- */

.profile-tab-list {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.4rem !important;
  border-bottom: 2px solid #ff8fb8 !important;
  padding-bottom: 0 !important;
  background: transparent !important;
}

.profile-tab-button {
  background: var(--ts-ground) !important;
  color: #9a4f72 !important;
  border: 2px solid #ffd4e8 !important;
  border-bottom: none !important;
  border-radius: 8px 8px 0 0 !important;
  box-shadow: none !important;
  font-family: var(--ts-font-body) !important;
  font-weight: 700 !important;
}

.profile-tab-button:hover {
  background: #ffeef5 !important;
  color: var(--ts-accent) !important;
}

.profile-tab-button.active {
  background: #ffd4e8 !important;
  color: #8f2f5a !important;
}

.profile-tab-panel {
  background: var(--ts-card) !important;
  border: 2px solid #ffd4e8 !important;
  border-top: none !important;
  border-radius: 0 0 8px 8px !important;
  padding: 1.25rem !important;
  color: var(--ts-ink) !important;
}

/* ---------- Posts ---------- */

.blog-tab-content {
  background: transparent !important;
}

.blog-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
}

.post-item {
  background: var(--ts-card) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 8px !important;
  box-shadow: 3px 3px 0 #ffd4e8 !important;
  padding: 1.4rem 1.5rem !important;
  margin-bottom: 0 !important;
}

.blog-post-header {
  border-bottom: 2px solid #ffd4e8 !important;
  padding-bottom: 0.6rem !important;
  margin-bottom: 0.9rem !important;
}

.blog-post-title {
  font-family: var(--ts-font-head) !important;
  font-weight: 700 !important;
  font-size: 1.15rem !important;
  color: var(--ts-accent) !important;
  letter-spacing: 0.3px !important;
}

.blog-post-date {
  font-family: var(--ts-font-body) !important;
  font-weight: 700 !important;
  font-size: 0.8rem !important;
  color: #a04e74 !important;
  background: var(--ts-ground) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 999px !important;
  padding: 0.05rem 0.6rem !important;
}

.blog-post-content {
  font-family: var(--ts-font-body) !important;
  font-weight: 500 !important;
  color: var(--ts-ink) !important;
  line-height: 1.75 !important;
}

.blog-post-actions {
  border-top: none !important;
  color: #9a4f72 !important;
}

/* ---------- Phones ---------- */

@media (max-width: 767px) {
  .ts-profile-container {
    padding: 0.6rem !important;
  }

  .ts-profile-header {
    padding: 1.2rem 1rem !important;
  }

  .ts-profile-display-name {
    font-size: 1.4rem !important;
  }

  .post-item {
    padding: 1rem !important;
  }

  .blog-post-title {
    font-size: 1rem !important;
  }

  .ts-profile-actions .ts-profile-button {
    padding: 0.45rem 0.9rem !important;
  }

  .profile-tab-panel {
    padding: 0.9rem !important;
  }
}
${PRESET_CHROME_CSS}`;
