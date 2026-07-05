export const CLASSIC_LINEN_TEMPLATE = `/* ==============================================
   CLASSIC LINEN — quiet, typographic, timeless
   linen #f4efe6 · ink #2b2925 · olive #6b6a45
   hairline #d8d0c0 · faded ink #6e675c
   ============================================== */

@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Inter:wght@400;500&display=swap');

/* ---------- Surface: linen with woven texture ---------- */

.thread-surface {
  background-color: #f4efe6 !important;
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
  color: #2b2925 !important;
  font-family: 'Source Serif 4', Georgia, serif !important;
  line-height: 1.75 !important;
}

/* ---------- Header ---------- */

.site-header {
  background: transparent !important;
  border-bottom: 1px solid #d8d0c0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  padding-top: 1.25rem !important;
  padding-bottom: 1.25rem !important;
}

.site-navigation {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.site-title {
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-weight: 600 !important;
  font-size: 1.4rem !important;
  letter-spacing: 0.01em !important;
  color: #2b2925 !important;
  text-shadow: none !important;
}

.site-tagline {
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-style: italic !important;
  font-weight: 400 !important;
  font-size: 0.95rem !important;
  color: #6e675c !important;
  letter-spacing: 0.01em !important;
}

.nav-link {
  font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
  font-weight: 500 !important;
  font-size: 0.75rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.14em !important;
  color: #6e675c !important;
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid transparent !important;
  border-radius: 0 !important;
  padding: 0.25rem 0 !important;
  box-shadow: none !important;
  text-decoration: none !important;
  transition: color 0.2s ease, border-color 0.2s ease !important;
}

.nav-link:hover,
.nav-link:focus {
  color: #6b6a45 !important;
  border-bottom-color: #6b6a45 !important;
  background: transparent !important;
  text-decoration: none !important;
}

#mobile-menu {
  background: #f4efe6 !important;
  border: none !important;
  border-top: 1px solid #d8d0c0 !important;
  border-bottom: 1px solid #d8d0c0 !important;
  border-radius: 0 !important;
  box-shadow: 0 1px 2px rgba(43, 41, 37, 0.06) !important;
  padding: 1rem 1.25rem !important;
}

#mobile-menu .nav-link {
  display: block !important;
  padding: 0.6rem 0 !important;
  border-bottom: 1px solid #e6dfd2 !important;
}

/* ---------- Footer: the colophon ---------- */

.site-footer {
  background: transparent !important;
  border-top: 1px solid #d8d0c0 !important;
  box-shadow: none !important;
  padding-top: 2rem !important;
  padding-bottom: 2.5rem !important;
  text-align: center !important;
}

.footer-tagline {
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-style: italic !important;
  font-size: 0.95rem !important;
  color: #6e675c !important;
  letter-spacing: 0.01em !important;
}

.footer-copyright {
  font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
  font-size: 0.7rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.16em !important;
  color: #6e675c !important;
  margin-top: 0.5rem !important;
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
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-weight: 600 !important;
  font-size: 2.1rem !important;
  line-height: 1.25 !important;
  letter-spacing: 0.005em !important;
  color: #2b2925 !important;
  text-shadow: none !important;
}

.ts-profile-status {
  font-family: 'Inter', 'Helvetica Neue', sans-serif !important;
  font-size: 0.7rem !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.18em !important;
  color: #6b6a45 !important;
  background: transparent !important;
  border: none !important;
  margin-top: 0.5rem !important;
}

.ts-profile-bio {
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-size: 1.05rem !important;
  font-weight: 400 !important;
  line-height: 1.85 !important;
  color: #2b2925 !important;
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
  color: #2b2925 !important;
  background: transparent !important;
  border: 1px solid #d8d0c0 !important;
  border-radius: 2px !important;
  box-shadow: none !important;
  padding: 0.55rem 1.4rem !important;
  transition: border-color 0.2s ease, color 0.2s ease !important;
}

.ts-profile-button:hover,
.ts-profile-button:focus {
  color: #6b6a45 !important;
  border-color: #6b6a45 !important;
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
  background: #f4efe6 !important;
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
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-weight: 600 !important;
  font-size: 1.35rem !important;
  line-height: 1.35 !important;
  letter-spacing: 0.005em !important;
  color: #2b2925 !important;
}

.blog-post-title a {
  color: #2b2925 !important;
  text-decoration: none !important;
}

.blog-post-title a:hover {
  color: #6b6a45 !important;
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
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-size: 1rem !important;
  line-height: 1.85 !important;
  color: #2b2925 !important;
}

.blog-post-content a {
  color: #6b6a45 !important;
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

  .site-title {
    font-size: 1.2rem !important;
  }
}`;
