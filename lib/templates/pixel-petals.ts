import { presetFontFaces } from './preset-fonts';
import { PRESET_CHROME_CSS } from './preset-chrome';

export const PIXEL_PETALS_TEMPLATE = `/* Fonts come from this site (lib/templates/preset-fonts.ts), not Google */
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


/* ==============================================
   PIXEL PETALS — a tidy little kawaii garden
   ----------------------------------------------
   palette:
     cream page ......... #fff8fa
     blossom light ...... #ffd4e8
     blossom mid ........ #ff8fb8
     deep rose (text) ... #c2477d
     ink (body text) .... #53384a
   fonts: Silkscreen (pixel headings), Nunito (body)
   ============================================== */

/* ---- page ground: flat cream with a faint
        picnic-check texture, no gradient fades ---- */
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

/* ---- generic content modules ---- */
.thread-module {
  background: var(--ts-card) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 10px !important;
  box-shadow: 3px 3px 0 #ffd4e8 !important;
  color: var(--ts-ink) !important;
}

/* ---- profile: the shrine centerpiece ---- */
.ts-profile-container {
  background: var(--ts-card) !important;
  border: 3px dashed #ff8fb8 !important;
  border-radius: 14px 4px 14px 4px !important;
  box-shadow:
    4px 4px 0 #ffd4e8,
    0 0 0 6px #fff8fa !important;
  padding: 1rem !important;
}

/* the single allowed gradient: a whisper of pink,
   scallop-dotted along its bottom edge */
.ts-profile-header {
  background: linear-gradient(180deg, #fff0f6 0%, #ffd4e8 100%) !important;
  border: none !important;
  border-bottom: 3px dotted #ff8fb8 !important;
  border-radius: 10px 10px 2px 2px !important;
  padding: 1.75rem 1.5rem !important;
  margin-bottom: 1.25rem !important;
}

.ts-profile-display-name {
  font-family: var(--ts-font-head) !important;
  font-weight: 700 !important;
  font-size: 1.9rem !important;
  color: var(--ts-accent) !important;
  text-shadow: 2px 2px 0 #ffffff, 4px 4px 0 #ffd4e8 !important;
  letter-spacing: 0.5px !important;
}

.ts-profile-status {
  display: inline-block !important;
  font-family: var(--ts-font-body) !important;
  font-weight: 700 !important;
  font-size: 0.8rem !important;
  color: var(--ts-accent) !important;
  background: var(--ts-ground) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 999px !important;
  padding: 0.15rem 0.75rem !important;
}

.ts-profile-bio {
  background: var(--ts-ground) !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 4px !important;
  padding: 1.1rem 1.25rem !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
  font-weight: 600 !important;
  line-height: 1.7 !important;
  box-shadow: 2px 2px 0 #ffd4e8 !important;
}

.ts-profile-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.6rem !important;
  margin-top: 0.75rem !important;
}

.ts-profile-button {
  font-family: var(--ts-font-body) !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  color: var(--ts-accent) !important;
  background: var(--ts-card) !important;
  border: 2px solid var(--ts-accent) !important;
  border-radius: 3px !important;
  padding: 0.4rem 1rem !important;
  box-shadow: 2px 2px 0 #ff8fb8 !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.ts-profile-button:hover {
  background: #ffd4e8 !important;
  color: var(--ts-accent) !important;
  transform: translate(1px, 1px) !important;
  box-shadow: 1px 1px 0 #ff8fb8 !important;
}

/* ---- photo: a sticker-sheet polaroid ---- */
.profile-photo-wrapper {
  display: inline-block !important;
  transform: rotate(-2deg) !important;
  transition: transform 0.25s ease !important;
}

.profile-photo-wrapper:hover {
  transform: rotate(1deg) !important;
}

.profile-photo-frame {
  background: var(--ts-card) !important;
  border: 8px solid #ffffff !important;
  border-radius: 2px !important;
  box-shadow:
    0 0 0 2px #ff8fb8,
    5px 5px 0 #ffd4e8 !important;
}

.profile-photo-image {
  border-radius: 1px !important;
  image-rendering: pixelated !important;
  display: block !important;
}

/* ---- blog posts: pressed-flower diary pages ---- */
.blog-post-card {
  background: var(--ts-card) !important;
  border: 2px dotted #ff8fb8 !important;
  border-radius: 4px 16px 4px 16px !important;
  box-shadow: 3px 3px 0 #ffd4e8 !important;
  padding: 1.4rem 1.5rem !important;
  margin-bottom: 1.25rem !important;
}

.blog-post-header {
  border-bottom: 2px dotted #ffd4e8 !important;
  padding-bottom: 0.6rem !important;
  margin-bottom: 0.9rem !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: baseline !important;
  gap: 0.5rem 1rem !important;
}

.blog-post-title {
  font-family: var(--ts-font-head) !important;
  font-weight: 700 !important;
  font-size: 1.05rem !important;
  color: var(--ts-accent) !important;
  letter-spacing: 0.3px !important;
}

.blog-post-title a {
  color: var(--ts-accent) !important;
  text-decoration: none !important;
}

.blog-post-title a:hover {
  text-decoration: underline dotted #ff8fb8 !important;
}

.blog-post-date {
  font-family: var(--ts-font-body) !important;
  font-weight: 700 !important;
  font-size: 0.75rem !important;
  text-transform: lowercase !important;
  letter-spacing: 0.5px !important;
  color: #a04e74 !important;
  background: var(--ts-ground) !important;
  border: 1px solid #ffd4e8 !important;
  border-radius: 999px !important;
  padding: 0.1rem 0.6rem !important;
}

.blog-post-content {
  font-family: var(--ts-font-body) !important;
  font-weight: 500 !important;
  color: var(--ts-ink) !important;
  line-height: 1.75 !important;
}

/* ---- tabs: little seed-packet labels ---- */
.profile-tab-list {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.4rem !important;
  border-bottom: 3px dotted #ff8fb8 !important;
  padding-bottom: 0 !important;
  background: transparent !important;
}

.profile-tab-panel {
  background: var(--ts-card) !important;
  border: 2px solid #ffd4e8 !important;
  border-top: none !important;
  border-radius: 0 0 10px 10px !important;
  padding: 1.25rem !important;
  color: var(--ts-ink) !important;
}

/* ---- phones: looser thumbs, tighter padding ---- */
@media (max-width: 767px) {
  .ts-profile-container {
    padding: 0.6rem !important;
    border-radius: 10px 3px 10px 3px !important;
  }

  .ts-profile-header {
    padding: 1.2rem 1rem !important;
  }

  .ts-profile-display-name {
    font-size: 1.4rem !important;
    text-shadow: 2px 2px 0 #ffffff !important;
  }

  .blog-post-card {
    padding: 1rem !important;
  }

  .blog-post-title {
    font-size: 0.95rem !important;
  }

  .ts-profile-button {
    padding: 0.45rem 0.9rem !important;
    font-size: 0.85rem !important;
  }

  .profile-tab-panel {
    padding: 0.9rem !important;
  }
}

/* ---------- Tabs & blog list (profile page) ---------- */

.profile-tab-button {
  background: var(--ts-ground) !important;
  color: #b06a8a !important;
  border-right: 1px dotted #ffb8d4 !important;
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
  box-shadow: inset 0 -3px 0 var(--ts-accent) !important;
}

.blog-tab-content {
  background: transparent !important;
}

.blog-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
}

.post-item {
  background: #fffdfe !important;
  border: 2px solid #ffb8d4 !important;
  border-radius: 4px 14px 4px 14px !important;
  box-shadow: 3px 3px 0 #ffd4e8 !important;
}

.blog-post-content {
  color: #4a3540 !important;
  font-family: var(--ts-font-body) !important;
}

.blog-post-actions {
  border-top: 1px dotted #ffb8d4 !important;
  color: #b06a8a !important;
}
${PRESET_CHROME_CSS}`;
