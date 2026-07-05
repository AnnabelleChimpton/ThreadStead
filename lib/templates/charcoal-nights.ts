export const CHARCOAL_NIGHTS_TEMPLATE = `/* ==============================================
   CHARCOAL NIGHTS — ink & ember
   charcoal #1a1816 / #232019 · text #ece7df
   ember #e8853d · hairline #3a352e
   ============================================== */

@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');

/* ---------- page ground ---------- */

.thread-surface {
  background: #1a1816 !important;
  color: #ece7df !important;
  font-family: 'Inter', system-ui, sans-serif !important;
}

/* ---------- header & navigation ---------- */

.site-header {
  background: #1a1816 !important;
  border-bottom: 1px solid #3a352e !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}

.site-navigation {
  background: transparent !important;
  border: none !important;
}

.site-title {
  font-family: 'Fraunces', Georgia, serif !important;
  font-weight: 600 !important;
  color: #ece7df !important;
  letter-spacing: 0.01em !important;
  text-shadow: none !important;
}

.site-tagline {
  color: #a89e8f !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 0.8rem !important;
  font-style: italic !important;
  letter-spacing: 0.02em !important;
}

.nav-link {
  color: #cfc8bc !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 0.9rem !important;
  font-weight: 500 !important;
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid transparent !important;
  border-radius: 0 !important;
  padding: 0.35rem 0.1rem !important;
  margin: 0 0.55rem !important;
  text-decoration: none !important;
  transition: color 160ms ease, border-color 160ms ease !important;
}

.nav-link:hover {
  color: #e8853d !important;
  background: transparent !important;
  border-bottom-color: #e8853d !important;
  box-shadow: none !important;
  text-decoration: none !important;
}

.nav-link[aria-current="page"],
.nav-link.active {
  color: #e8853d !important;
  border-bottom-color: #e8853d !important;
}

/* ---------- mobile menu ---------- */

#mobile-menu {
  background: #232019 !important;
  border: 1px solid #3a352e !important;
  border-top: 2px solid #e8853d !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55) !important;
  color: #ece7df !important;
}

#mobile-menu .nav-link {
  display: block !important;
  color: #ece7df !important;
  border-bottom: 1px solid #2c2822 !important;
  margin: 0 !important;
  padding: 0.85rem 1rem !important;
}

#mobile-menu .nav-link:hover {
  color: #e8853d !important;
  background: #1a1816 !important;
}

/* ---------- footer ---------- */

.site-footer {
  background: #14120f !important;
  border-top: 1px solid #3a352e !important;
  color: #a89e8f !important;
  padding: 2.5rem 1.25rem !important;
}

.footer-tagline {
  color: #cfc8bc !important;
  font-family: 'Fraunces', Georgia, serif !important;
  font-style: italic !important;
  font-size: 0.95rem !important;
  letter-spacing: 0.01em !important;
}

.footer-copyright {
  color: #7c7365 !important;
  font-size: 0.78rem !important;
  letter-spacing: 0.04em !important;
}

/* ---------- generic modules ---------- */

.thread-module {
  background: #232019 !important;
  border: 1px solid #3a352e !important;
  border-radius: 6px !important;
  box-shadow: none !important;
  color: #ece7df !important;
}

/* ---------- profile ---------- */

.ts-profile-container {
  background: #232019 !important;
  border: 1px solid #3a352e !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  color: #ece7df !important;
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
  font-family: 'Fraunces', Georgia, serif !important;
  font-weight: 600 !important;
  font-size: 2.1rem !important;
  line-height: 1.15 !important;
  color: #ece7df !important;
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
  border-left: 2px solid #e8853d !important;
  border-radius: 0 !important;
  padding: 0.25rem 0 0.25rem 1rem !important;
  margin-top: 0.9rem !important;
  color: #cfc8bc !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 0.95rem !important;
  line-height: 1.7 !important;
}

.ts-profile-actions {
  display: flex !important;
  gap: 0.6rem !important;
  margin-top: 1.4rem !important;
}

.ts-profile-button {
  background: #1a1816 !important;
  color: #ece7df !important;
  border: 1px solid #3a352e !important;
  border-radius: 4px !important;
  padding: 0.5rem 1.1rem !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 0.85rem !important;
  font-weight: 500 !important;
  letter-spacing: 0.02em !important;
  box-shadow: none !important;
  transition: border-color 160ms ease, color 160ms ease !important;
}

.ts-profile-button:hover {
  border-color: #e8853d !important;
  color: #e8853d !important;
  background: #1a1816 !important;
}

/* ---------- profile photo ---------- */

.profile-photo-wrapper {
  background: transparent !important;
  padding: 0 !important;
}

.profile-photo-frame {
  background: #1a1816 !important;
  border: 1px solid #3a352e !important;
  border-radius: 6px !important;
  padding: 4px !important;
  box-shadow: none !important;
  transition: border-color 200ms ease, box-shadow 200ms ease !important;
}

.profile-photo-frame:hover {
  border-color: #e8853d !important;
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
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 0.88rem !important;
  font-weight: 500 !important;
  padding: 0.6rem 0.9rem !important;
  transition: color 160ms ease, border-color 160ms ease !important;
}

.profile-tab-list button:hover,
.profile-tab-list [role="tab"]:hover {
  color: #ece7df !important;
  background: transparent !important;
}

.profile-tab-list button[aria-selected="true"],
.profile-tab-list [role="tab"][aria-selected="true"] {
  color: #e8853d !important;
  border-bottom-color: #e8853d !important;
  background: transparent !important;
  font-weight: 600 !important;
}

.profile-tab-panel {
  background: transparent !important;
  border: none !important;
  color: #ece7df !important;
  padding-top: 1.5rem !important;
}

/* ---------- blog posts ---------- */

.blog-post-card {
  background: #232019 !important;
  border: 1px solid #3a352e !important;
  border-radius: 6px !important;
  box-shadow: none !important;
  color: #ece7df !important;
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
  font-family: 'Fraunces', Georgia, serif !important;
  font-weight: 600 !important;
  font-size: 1.35rem !important;
  line-height: 1.3 !important;
  color: #ece7df !important;
  letter-spacing: 0.005em !important;
}

.blog-post-title a {
  color: inherit !important;
  text-decoration: none !important;
  transition: color 160ms ease !important;
}

.blog-post-title a:hover {
  color: #e8853d !important;
}

.blog-post-date {
  color: #7c7365 !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 0.75rem !important;
  font-variant-numeric: tabular-nums !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

.blog-post-content {
  color: #cfc8bc !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 0.95rem !important;
  line-height: 1.75 !important;
}

.blog-post-content a {
  color: #e8853d !important;
  text-decoration: underline !important;
  text-decoration-color: rgba(232, 133, 61, 0.4) !important;
  text-underline-offset: 3px !important;
}

.blog-post-content a:hover {
  text-decoration-color: #e8853d !important;
}

.blog-post-content blockquote {
  border-left: 2px solid #e8853d !important;
  color: #a89e8f !important;
  font-style: italic !important;
  padding-left: 1rem !important;
  margin: 1.1rem 0 !important;
}

.blog-post-content code {
  background: #1a1816 !important;
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

  .site-footer {
    padding: 1.75rem 1rem !important;
  }
}`;
