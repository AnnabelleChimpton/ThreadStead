import { presetFontFaces } from './preset-fonts';
import { PRESET_CHROME_CSS } from './preset-chrome';

export const CHARCOAL_NIGHTS_TEMPLATE = `/* ==============================================
   CHARCOAL NIGHTS — ink & ember
   charcoal #1a1816 / #232019 · text #ece7df
   ember #e8853d · hairline #3a352e
   ============================================== */

/* Fonts come from this site (lib/templates/preset-fonts.ts), not Google */
${presetFontFaces(['Fraunces', 'Inter'])}

/* Your page's main colours and fonts. Change a value here and the
   whole theme follows (the Appearance settings write these too). */
:root {
  --ts-ground: #1a1816;
  --ts-card: #232019;
  --ts-ink: #ece7df;
  --ts-accent: #e8853d;
  --ts-on-accent: #1a1816;
  --ts-font-head: 'Fraunces', Georgia, serif;
  --ts-font-body: 'Inter', system-ui, sans-serif;
}


/* ---------- page ground ---------- */

.thread-surface {
  background: var(--ts-ground) !important;
  color: var(--ts-ink) !important;
  font-family: var(--ts-font-body) !important;
}

/* ---------- generic modules ---------- */

.thread-module {
  background: var(--ts-card) !important;
  border: 1px solid #3a352e !important;
  border-radius: 6px !important;
  box-shadow: none !important;
  color: var(--ts-ink) !important;
}

/* ---------- profile ---------- */

.ts-profile-container {
  background: var(--ts-card) !important;
  border: 1px solid #3a352e !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  color: var(--ts-ink) !important;
  animation: cn-settle 420ms ease-out both !important;
}

.ts-profile-header {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #3a352e !important;
  border-radius: 0 !important;
  padding: 2.25rem 1.75rem 1.5rem !important;
  margin-bottom: 1.25rem !important;
}

.ts-profile-display-name {
  font-family: var(--ts-font-head) !important;
  font-weight: 600 !important;
  font-size: 2.1rem !important;
  line-height: 1.15 !important;
  color: var(--ts-ink) !important;
  letter-spacing: 0.005em !important;
  text-shadow: none !important;
  animation: none !important;
}

.ts-profile-status {
  color: #a89e8f !important;
  font-size: 0.85rem !important;
  font-style: italic !important;
  letter-spacing: 0.02em !important;
}

.ts-profile-bio {
  background: transparent !important;
  border: none !important;
  border-left: 2px solid var(--ts-accent) !important;
  border-radius: 0 !important;
  padding: 0.25rem 0 0.25rem 1rem !important;
  margin-top: 0.9rem !important;
  color: #cfc8bc !important;
  font-family: var(--ts-font-body) !important;
  font-size: 0.95rem !important;
  line-height: 1.7 !important;
}

.ts-profile-actions {
  display: flex !important;
  gap: 0.6rem !important;
  margin-top: 1.4rem !important;
}

.ts-profile-button {
  background: var(--ts-ground) !important;
  color: var(--ts-ink) !important;
  border: 1px solid #3a352e !important;
  border-radius: 4px !important;
  padding: 0.5rem 1.1rem !important;
  font-family: var(--ts-font-body) !important;
  font-size: 0.85rem !important;
  font-weight: 500 !important;
  letter-spacing: 0.02em !important;
  box-shadow: none !important;
  transition: border-color 160ms ease, color 160ms ease !important;
}

.ts-profile-button:hover {
  border-color: var(--ts-accent) !important;
  color: var(--ts-accent) !important;
  background: var(--ts-ground) !important;
}

/* ---------- profile photo ---------- */

.profile-photo-wrapper {
  background: transparent !important;
  padding: 0 !important;
}

.profile-photo-frame {
  background: var(--ts-ground) !important;
  border: 1px solid #3a352e !important;
  border-radius: 6px !important;
  padding: 4px !important;
  box-shadow: none !important;
  transition: border-color 200ms ease, box-shadow 200ms ease !important;
}

.profile-photo-frame:hover {
  border-color: var(--ts-accent) !important;
  /* the one permitted glow: a faint ember halo */
  box-shadow: 0 0 18px rgba(232, 133, 61, 0.18) !important;
}

.profile-photo-image {
  border-radius: 4px !important;
  border: none !important;
  filter: none !important;
  display: block !important;
}

/* ---------- tabs ---------- */

.profile-tab-list {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #3a352e !important;
  border-radius: 0 !important;
  gap: 0.25rem !important;
  padding: 0 0.5rem !important;
}

.profile-tab-list button,
.profile-tab-list [role="tab"] {
  background: transparent !important;
  color: #a89e8f !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  font-family: var(--ts-font-body) !important;
  font-size: 0.88rem !important;
  font-weight: 500 !important;
  padding: 0.6rem 0.9rem !important;
  transition: color 160ms ease, border-color 160ms ease !important;
}

.profile-tab-list button:hover,
.profile-tab-list [role="tab"]:hover {
  color: var(--ts-ink) !important;
  background: transparent !important;
}

.profile-tab-list button[aria-selected="true"],
.profile-tab-list [role="tab"][aria-selected="true"] {
  color: var(--ts-accent) !important;
  border-bottom-color: var(--ts-accent) !important;
  background: transparent !important;
  font-weight: 600 !important;
}

.profile-tab-panel {
  background: transparent !important;
  border: none !important;
  color: var(--ts-ink) !important;
  padding-top: 1.5rem !important;
}

/* ---------- blog posts ---------- */

.blog-post-card {
  background: var(--ts-card) !important;
  border: 1px solid #3a352e !important;
  border-radius: 6px !important;
  box-shadow: none !important;
  color: var(--ts-ink) !important;
  padding: 1.6rem 1.75rem !important;
  margin-bottom: 1.4rem !important;
  transition: border-color 180ms ease !important;
}

.blog-post-card:hover {
  border-color: #57503f !important;
}

.blog-post-header {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #2c2822 !important;
  padding: 0 0 0.75rem 0 !important;
  margin-bottom: 1rem !important;
}

.blog-post-title {
  font-family: var(--ts-font-head) !important;
  font-weight: 600 !important;
  font-size: 1.35rem !important;
  line-height: 1.3 !important;
  color: var(--ts-ink) !important;
  letter-spacing: 0.005em !important;
}

.blog-post-title a {
  color: inherit !important;
  text-decoration: none !important;
  transition: color 160ms ease !important;
}

.blog-post-title a:hover {
  color: var(--ts-accent) !important;
}

.blog-post-date {
  color: #9a9182 !important;
  font-family: var(--ts-font-body) !important;
  font-size: 0.75rem !important;
  font-variant-numeric: tabular-nums !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

.blog-post-content {
  color: #cfc8bc !important;
  font-family: var(--ts-font-body) !important;
  font-size: 0.95rem !important;
  line-height: 1.75 !important;
}

.blog-post-content a {
  color: var(--ts-accent) !important;
  text-decoration: underline !important;
  text-decoration-color: rgba(232, 133, 61, 0.4) !important;
  text-underline-offset: 3px !important;
}

.blog-post-content a:hover {
  text-decoration-color: var(--ts-accent) !important;
}

.blog-post-content blockquote {
  border-left: 2px solid var(--ts-accent) !important;
  color: #a89e8f !important;
  font-style: italic !important;
  padding-left: 1rem !important;
  margin: 1.1rem 0 !important;
}

.blog-post-content code {
  background: var(--ts-ground) !important;
  border: 1px solid #2c2822 !important;
  border-radius: 3px !important;
  color: #ddb892 !important;
  padding: 0.1em 0.35em !important;
  font-size: 0.85em !important;
}

/* ---------- motion ---------- */

@keyframes cn-settle {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---------- phones ---------- */

@media (max-width: 767px) {
  .ts-profile-header {
    padding: 1.5rem 1.1rem 1.1rem !important;
  }

  .ts-profile-display-name {
    font-size: 1.6rem !important;
  }

  .ts-profile-actions {
    flex-wrap: wrap !important;
  }

  .blog-post-card {
    padding: 1.15rem 1rem !important;
    margin-bottom: 1rem !important;
  }

  .blog-post-title {
    font-size: 1.15rem !important;
  }

  .profile-tab-list {
    overflow-x: auto !important;
    padding: 0 0.25rem !important;
  }
}

/* ---------- Tabs & blog list (profile page) ---------- */

.profile-tab-button {
  background: var(--ts-ground) !important;
  color: #8f887c !important;
  border-right: 1px solid #3a352e !important;
  font-family: 'Inter', sans-serif !important;
  letter-spacing: 0.02em !important;
}

.profile-tab-button:hover {
  background: var(--ts-card) !important;
  color: var(--ts-ink) !important;
}

.profile-tab-button.active {
  background: var(--ts-card) !important;
  color: var(--ts-ink) !important;
  box-shadow: inset 0 -2px 0 var(--ts-accent) !important;
}

.blog-tab-content {
  background: transparent !important;
}

.blog-posts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 1px !important;
}

.post-item {
  background: #201d19 !important;
  border: 1px solid #3a352e !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.post-item:hover {
  border-color: #55503f !important;
}

.blog-post-content {
  color: #d9d2c7 !important;
}

.blog-post-actions {
  border-top: 1px solid #3a352e !important;
  color: #8f887c !important;
}
${PRESET_CHROME_CSS}`;
