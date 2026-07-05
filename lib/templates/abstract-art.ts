export const ABSTRACT_ART_TEMPLATE = `/* ==============================================
   ABSTRACT ART — GALLERY WALL
   Warm white #faf8f4 · Charcoal #22211f
   Vermilion #e0432f · Cobalt #2857c4 · Mustard #e3a92c
   Flat Bauhaus geometry: hard shadows, no gradients.
   ============================================== */

@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap');

/* ---------- The wall ---------- */

.thread-surface {
  background-color: #faf8f4 !important;
  background-image: none !important;
  color: #22211f !important;
  font-family: 'Archivo', sans-serif !important;
}

/* ---------- Header: the gallery lintel ---------- */

.site-header {
  background: #faf8f4 !important;
  border-bottom: 3px solid #22211f !important;
  box-shadow: none !important;
  position: relative !important;
}

/* Flat color-block tabs under the lintel: vermilion, cobalt, mustard */
.site-header::after {
  content: '' !important;
  position: absolute !important;
  bottom: -11px !important;
  left: 2rem !important;
  width: 96px !important;
  height: 8px !important;
  background: #e0432f !important;
  box-shadow: 96px 0 0 #2857c4, 192px 0 0 #e3a92c !important;
  pointer-events: none !important;
}

.site-navigation {
  background: transparent !important;
  border: none !important;
}

.site-title {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 900 !important;
  font-size: 1.9rem !important;
  letter-spacing: -0.04em !important;
  text-transform: uppercase !important;
  color: #22211f !important;
  background: none !important;
  -webkit-text-fill-color: #22211f !important;
  text-shadow: none !important;
}

.site-tagline {
  font-family: 'Space Mono', monospace !important;
  font-size: 0.72rem !important;
  font-weight: 400 !important;
  font-style: normal !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
  color: #2857c4 !important;
}

.nav-link {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.82rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  color: #22211f !important;
  background: transparent !important;
  border: 2px solid transparent !important;
  border-radius: 0 !important;
  padding: 0.35rem 0.7rem !important;
  text-decoration: none !important;
  transition: background 0.12s linear, color 0.12s linear !important;
}

.nav-link:hover {
  color: #faf8f4 !important;
  background: #e0432f !important;
  border-color: #22211f !important;
  text-decoration: none !important;
  transform: none !important;
}

#mobile-menu {
  background: #faf8f4 !important;
  border: 3px solid #22211f !important;
  border-radius: 0 !important;
  box-shadow: 6px 6px 0 #e3a92c !important;
  padding: 0.5rem !important;
}

#mobile-menu .nav-link {
  display: block !important;
  border-bottom: 1px solid #22211f !important;
  padding: 0.65rem 0.7rem !important;
}

/* ---------- Generic module: a mounted print ---------- */

.thread-module {
  background: #ffffff !important;
  border: 3px solid #22211f !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0 #22211f !important;
  padding: 1.5rem !important;
  color: #22211f !important;
}

/* ---------- Profile: the artist's plinth ---------- */

.ts-profile-container {
  background: #ffffff !important;
  border: 3px solid #22211f !important;
  border-radius: 0 !important;
  box-shadow: 8px 8px 0 #2857c4 !important;
  overflow: visible !important;
  position: relative !important;
}

.ts-profile-header {
  background: #ffffff !important;
  border-bottom: 3px solid #22211f !important;
  padding: 2rem 1.75rem 1.5rem !important;
  position: relative !important;
}

.ts-profile-display-name {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 900 !important;
  font-size: 2.4rem !important;
  line-height: 1.05 !important;
  letter-spacing: -0.045em !important;
  text-transform: uppercase !important;
  color: #22211f !important;
  background: none !important;
  -webkit-text-fill-color: #22211f !important;
}

/* The single rotated accent on the page */
.ts-profile-status {
  display: inline-block !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  color: #faf8f4 !important;
  background: #e0432f !important;
  border: 2px solid #22211f !important;
  border-radius: 0 !important;
  padding: 0.2rem 0.6rem !important;
  transform: rotate(-2deg) !important;
  animation: stamp 0.35s steps(3, end) both !important;
}

@keyframes stamp {
  0%   { transform: rotate(-2deg) scale(1.6); opacity: 0; }
  100% { transform: rotate(-2deg) scale(1); opacity: 1; }
}

.ts-profile-bio {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 400 !important;
  font-size: 1rem !important;
  line-height: 1.65 !important;
  color: #22211f !important;
  background: #faf8f4 !important;
  border: 2px solid #22211f !important;
  border-left: 10px solid #e3a92c !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 1rem 1.25rem !important;
  margin: 1rem 0 !important;
}

.ts-profile-actions {
  display: flex !important;
  gap: 0.75rem !important;
  flex-wrap: wrap !important;
  margin-top: 1.25rem !important;
}

.ts-profile-button {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.8rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  color: #22211f !important;
  background: #ffffff !important;
  border: 2px solid #22211f !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0 #22211f !important;
  padding: 0.5rem 1.1rem !important;
  cursor: pointer !important;
  transition: transform 0.1s linear, box-shadow 0.1s linear, background 0.1s linear !important;
}

.ts-profile-button:hover {
  background: #e3a92c !important;
  color: #22211f !important;
  transform: translate(2px, 2px) !important;
  box-shadow: 2px 2px 0 #22211f !important;
}

/* ---------- Photo: framed like a print ---------- */

.profile-photo-wrapper {
  display: inline-block !important;
  position: relative !important;
}

.profile-photo-frame {
  background: #ffffff !important;
  border: 3px solid #22211f !important;
  border-radius: 0 !important;
  box-shadow: 6px 6px 0 #e0432f !important;
  padding: 6px !important;
  overflow: hidden !important;
}

.profile-photo-image {
  display: block !important;
  border: none !important;
  border-radius: 0 !important;
  filter: none !important;
}

/* ---------- Tabs: gallery wayfinding ---------- */

.profile-tab-list {
  display: flex !important;
  gap: 0 !important;
  background: #22211f !important;
  border: 3px solid #22211f !important;
  border-radius: 0 !important;
  padding: 0 !important;
  overflow-x: auto !important;
}

.profile-tab-list button,
.profile-tab-list [role="tab"] {
  font-family: 'Space Mono', monospace !important;
  font-size: 0.78rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  color: #faf8f4 !important;
  background: #22211f !important;
  border: none !important;
  border-right: 1px solid #faf8f4 !important;
  border-radius: 0 !important;
  padding: 0.6rem 1.1rem !important;
  white-space: nowrap !important;
}

.profile-tab-list button[aria-selected="true"],
.profile-tab-list [role="tab"][aria-selected="true"] {
  color: #22211f !important;
  background: #e3a92c !important;
}

.profile-tab-panel {
  background: #ffffff !important;
  border: 3px solid #22211f !important;
  border-top: none !important;
  border-radius: 0 !important;
  padding: 1.5rem !important;
  color: #22211f !important;
}

/* ---------- Posts: numbered exhibits ---------- */

.blog-post-card {
  background: #ffffff !important;
  border: 3px solid #22211f !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0 #22211f !important;
  padding: 1.5rem 1.75rem !important;
  margin-bottom: 2.25rem !important;
  margin-right: 8px !important;
  position: relative !important;
  transition: box-shadow 0.12s linear, transform 0.12s linear !important;
}

.blog-post-card:hover {
  transform: translate(-2px, -2px) !important;
  box-shadow: 8px 8px 0 #2857c4 !important;
}

.blog-post-header {
  border-bottom: 3px solid #22211f !important;
  padding-bottom: 0.75rem !important;
  margin-bottom: 1rem !important;
  background: transparent !important;
}

.blog-post-title {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 900 !important;
  font-size: 1.45rem !important;
  line-height: 1.15 !important;
  letter-spacing: -0.03em !important;
  color: #22211f !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 0 0.35rem !important;
}

.blog-post-title a {
  color: inherit !important;
  text-decoration: none !important;
}

.blog-post-date {
  font-family: 'Space Mono', monospace !important;
  font-size: 0.72rem !important;
  font-weight: 400 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  color: #faf8f4 !important;
  background: #2857c4 !important;
  border-radius: 0 !important;
  padding: 0.15rem 0.5rem !important;
  display: inline-block !important;
}

.blog-post-content {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 400 !important;
  font-size: 1rem !important;
  line-height: 1.7 !important;
  color: #22211f !important;
}

.blog-post-content a {
  color: #2857c4 !important;
  text-decoration: underline !important;
}

/* ---------- Footer: the colophon ---------- */

.site-footer {
  background: #22211f !important;
  border-top: 8px solid #e0432f !important;
  border-radius: 0 !important;
  padding-top: 1.75rem !important;
  padding-bottom: 1.75rem !important;
}

.footer-tagline {
  font-family: 'Archivo', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.9rem !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  color: #faf8f4 !important;
  text-shadow: none !important;
}

.footer-copyright {
  font-family: 'Space Mono', monospace !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.1em !important;
  color: #e3a92c !important;
}

/* ---------- Mobile: tighter matting ---------- */

@media (max-width: 767px) {
  .site-title {
    font-size: 1.4rem !important;
  }

  .ts-profile-display-name {
    font-size: 1.7rem !important;
  }

  .ts-profile-container {
    box-shadow: 5px 5px 0 #2857c4 !important;
  }

  .thread-module,
  .profile-tab-panel,
  .blog-post-card {
    padding: 1.1rem 1.15rem !important;
  }

  .blog-post-title {
    font-size: 1.2rem !important;
  }

  .site-header::after {
    left: 1rem !important;
    width: 56px !important;
    box-shadow: 56px 0 0 #2857c4, 112px 0 0 #e3a92c !important;
  }
}`;
