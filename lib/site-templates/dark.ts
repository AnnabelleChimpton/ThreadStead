export const DARK_SITE_TEMPLATE = `/* ===========================================
   🌙 MODERN DARK MODE THEME
   =========================================== */

/* A sleek, modern dark theme for the entire site
   Transform your retro social site into a contemporary dark experience */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ===========================================
   🎨 CSS VARIABLES - EASY CUSTOMIZATION
   =========================================== */

:root {
  /* Dark theme color palette */
  --dark-bg: #0d1117;
  --dark-surface: #161b22;
  --dark-surface-elevated: #21262d;
  --dark-border: #30363d;
  --dark-border-muted: #21262d;
  
  /* Text colors */
  --dark-text-primary: #f0f6fc;
  --dark-text-secondary: #8b949e;
  --dark-text-muted: #6e7681;
  
  /* Accent colors */
  --dark-accent: #58a6ff;
  --dark-accent-hover: #79c0ff;
  --dark-success: #3fb950;
  --dark-warning: #d29922;
  --dark-danger: #f85149;
  
  /* Special colors */
  --dark-purple: #a5a5ff;
  --dark-pink: #ff7eb6;
  --dark-orange: #ff9500;
  
  /* Shadows */
  --dark-shadow: 0 16px 32px rgba(1, 4, 9, 0.85);
  --dark-shadow-sm: 0 1px 3px rgba(1, 4, 9, 0.12);
  --dark-shadow-lg: 0 25px 50px rgba(1, 4, 9, 0.75);
}

/* ===========================================
   🌑 GLOBAL SITE TRANSFORMATION
   =========================================== */

/* Transform entire site to dark mode */
.site-layout {
  background: var(--dark-bg) !important;
  color: var(--dark-text-primary) !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  min-height: 100vh;
}

/* Smooth transitions for all elements */
* {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease !important;
}

/* ===========================================
   🧭 NAVIGATION - MODERN DARK HEADER
   =========================================== */

.site-header {
  background: rgba(22, 27, 34, 0.95) !important;
  backdrop-filter: blur(12px) !important;
  border-bottom: 1px solid var(--dark-border) !important;
  box-shadow: var(--dark-shadow-sm) !important;
}

.site-navigation {
  max-width: 1200px !important;
}

.site-title {
  color: var(--dark-text-primary) !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 700 !important;
  font-size: 1.5rem !important;
  background: linear-gradient(135deg, var(--dark-accent), var(--dark-purple)) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

.site-tagline {
  color: var(--dark-text-secondary) !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
}

.nav-link {
  color: var(--dark-text-secondary) !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
  border: 1px solid transparent !important;
}

.nav-link:hover {
  color: var(--dark-accent) !important;
  background: var(--dark-surface) !important;
  border-color: var(--dark-border) !important;
  transform: translateY(-1px) !important;
}

/* ===========================================
   🎪 MAIN CONTENT AREAS
   =========================================== */

.site-main {
  background: var(--dark-bg) !important;
  padding: 2rem !important;
}

/* Card/Module styling */
.thread-module,
.retro-card {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 12px !important;
  box-shadow: var(--dark-shadow-sm) !important;
  padding: 1.5rem !important;
  margin-bottom: 1.5rem !important;
}

.thread-module:hover,
.retro-card:hover {
  border-color: var(--dark-accent) !important;
  box-shadow: var(--dark-shadow) !important;
  transform: translateY(-2px) !important;
}

/* Headers and text */
.thread-headline,
h1, h2, h3, h4, h5, h6 {
  color: var(--dark-text-primary) !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 600 !important;
}

h1 { font-size: 2rem !important; }
h2 { font-size: 1.5rem !important; }
h3 { font-size: 1.25rem !important; }

.thread-label {
  color: var(--dark-text-muted) !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.75rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  font-weight: 500 !important;
}

p, .thread-content {
  color: var(--dark-text-secondary) !important;
  line-height: 1.6 !important;
}

/* ===========================================
   🎯 FEED & POSTS
   =========================================== */

.feed-container {
  max-width: 800px !important;
  margin: 0 auto !important;
}

.feed-post,
.post-item {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 12px !important;
  padding: 1.5rem !important;
  margin-bottom: 1rem !important;
  box-shadow: var(--dark-shadow-sm) !important;
  transition: all 0.2s ease !important;
}

.feed-post:hover,
.post-item:hover {
  border-color: var(--dark-accent) !important;
  box-shadow: var(--dark-shadow) !important;
}

.post-header {
  border-bottom: 1px solid var(--dark-border-muted) !important;
  padding-bottom: 0.75rem !important;
  margin-bottom: 1rem !important;
}

.post-author {
  color: var(--dark-accent) !important;
  font-weight: 600 !important;
  text-decoration: none !important;
}

.post-timestamp {
  color: var(--dark-text-muted) !important;
  font-size: 0.875rem !important;
  font-family: 'JetBrains Mono', monospace !important;
}

.post-content {
  color: var(--dark-text-secondary) !important;
  line-height: 1.6 !important;
}

/* ===========================================
   💬 COMMENTS SYSTEM
   =========================================== */

.comment-container {
  background: var(--dark-surface-elevated) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 8px !important;
  padding: 1rem !important;
  margin: 0.75rem 0 !important;
  border-left: 3px solid var(--dark-accent) !important;
}

.comment-header {
  border-bottom: 1px solid var(--dark-border-muted) !important;
  padding-bottom: 0.5rem !important;
  margin-bottom: 0.75rem !important;
}

.comment-author-name {
  color: var(--dark-accent) !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
}

.comment-timestamp {
  color: var(--dark-text-muted) !important;
  font-size: 0.75rem !important;
  font-family: 'JetBrains Mono', monospace !important;
}

.comment-content {
  color: var(--dark-text-secondary) !important;
  line-height: 1.5 !important;
}

.comment-thread {
  margin-left: 1.5rem !important;
  border-left: 2px solid var(--dark-border-muted) !important;
  padding-left: 1rem !important;
}

/* ===========================================
   🎛️ FORMS & INPUTS
   =========================================== */

input[type="text"],
input[type="email"],
input[type="password"],
input[type="search"],
input[type="url"],
textarea,
select {
  background: var(--dark-surface-elevated) !important;
  color: var(--dark-text-primary) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 6px !important;
  padding: 0.75rem !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 0.875rem !important;
}

input:focus,
textarea:focus,
select:focus {
  outline: none !important;
  border-color: var(--dark-accent) !important;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1) !important;
}

input::placeholder,
textarea::placeholder {
  color: var(--dark-text-muted) !important;
}

/* ===========================================
   🔘 BUTTONS & INTERACTIVE ELEMENTS
   =========================================== */

.thread-button,
button,
.btn {
  background: var(--dark-accent) !important;
  color: white !important;
  border: 1px solid var(--dark-accent) !important;
  border-radius: 6px !important;
  padding: 0.75rem 1.5rem !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.thread-button:hover,
button:hover,
.btn:hover {
  background: var(--dark-accent-hover) !important;
  border-color: var(--dark-accent-hover) !important;
  transform: translateY(-1px) !important;
  box-shadow: var(--dark-shadow-sm) !important;
}

.thread-button-secondary {
  background: var(--dark-surface) !important;
  color: var(--dark-text-primary) !important;
  border: 1px solid var(--dark-border) !important;
}

.thread-button-secondary:hover {
  background: var(--dark-surface-elevated) !important;
  border-color: var(--dark-accent) !important;
}

/* ===========================================
   📑 TABS SYSTEM
   =========================================== */

.tabs-container {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
}

.tab-list {
  background: var(--dark-surface-elevated) !important;
  border-bottom: 1px solid var(--dark-border) !important;
  display: flex !important;
  padding: 0 !important;
}

.tab-button {
  background: transparent !important;
  color: var(--dark-text-secondary) !important;
  border: none !important;
  padding: 1rem 1.5rem !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  border-bottom: 2px solid transparent !important;
}

.tab-button:hover {
  color: var(--dark-text-primary) !important;
  background: var(--dark-surface) !important;
}

.tab-button[aria-selected="true"],
.tab-button.active {
  color: var(--dark-accent) !important;
  border-bottom-color: var(--dark-accent) !important;
  background: var(--dark-surface) !important;
}

.tab-panel {
  padding: 1.5rem !important;
}

/* ===========================================
   👤 PROFILE STYLING
   =========================================== */

.profile-container {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 12px !important;
  box-shadow: var(--dark-shadow) !important;
}

.profile-header {
  background: linear-gradient(135deg, var(--dark-surface-elevated), var(--dark-surface)) !important;
  border-bottom: 1px solid var(--dark-border) !important;
  border-radius: 12px 12px 0 0 !important;
  padding: 2rem !important;
}

.profile-photo-frame {
  border: 3px solid var(--dark-accent) !important;
  border-radius: 50% !important;
  box-shadow: var(--dark-shadow-sm) !important;
}

.profile-display-name {
  color: var(--dark-text-primary) !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 700 !important;
  font-size: 2rem !important;
  margin-bottom: 0.5rem !important;
}

.profile-status {
  color: var(--dark-text-muted) !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.875rem !important;
}

.profile-bio {
  background: var(--dark-surface-elevated) !important;
  border: 1px solid var(--dark-border) !important;
  border-left: 3px solid var(--dark-accent) !important;
  color: var(--dark-text-secondary) !important;
  padding: 1rem !important;
  border-radius: 6px !important;
  margin: 1rem 0 !important;
}

/* ===========================================
   🎨 LINKS & TYPOGRAPHY
   =========================================== */

a {
  color: var(--dark-accent) !important;
  text-decoration: none !important;
  transition: color 0.2s ease !important;
}

a:hover {
  color: var(--dark-accent-hover) !important;
  text-decoration: underline !important;
}

code {
  background: var(--dark-surface-elevated) !important;
  color: var(--dark-pink) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 4px !important;
  padding: 0.25rem 0.5rem !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.875rem !important;
}

pre {
  background: var(--dark-surface-elevated) !important;
  color: var(--dark-text-secondary) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: 8px !important;
  padding: 1rem !important;
  overflow-x: auto !important;
  font-family: 'JetBrains Mono', monospace !important;
  line-height: 1.5 !important;
}

blockquote {
  background: var(--dark-surface-elevated) !important;
  border-left: 4px solid var(--dark-accent) !important;
  color: var(--dark-text-secondary) !important;
  padding: 1rem !important;
  margin: 1rem 0 !important;
  border-radius: 0 6px 6px 0 !important;
  font-style: italic !important;
}

/* ===========================================
   🌐 FOOTER
   =========================================== */

.site-footer {
  background: var(--dark-surface) !important;
  border-top: 1px solid var(--dark-border) !important;
  color: var(--dark-text-secondary) !important;
  padding: 2rem !important;
  margin-top: 4rem !important;
}

.footer-content {
  max-width: 1200px !important;
  text-align: center !important;
}

.footer-tagline {
  color: var(--dark-text-muted) !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.875rem !important;
}

.footer-copyright {
  color: var(--dark-text-muted) !important;
  font-size: 0.75rem !important;
  margin-top: 0.5rem !important;
}

/* ===========================================
   ✨ SPECIAL EFFECTS & ANIMATIONS
   =========================================== */

/* Text selection */
::selection {
  background: rgba(88, 166, 255, 0.3) !important;
  color: var(--dark-text-primary) !important;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

::-webkit-scrollbar-track {
  background: var(--dark-surface) !important;
}

::-webkit-scrollbar-thumb {
  background: var(--dark-border) !important;
  border-radius: 4px !important;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--dark-accent) !important;
}

/* Focus styles for accessibility */
*:focus-visible {
  outline: 2px solid var(--dark-accent) !important;
  outline-offset: 2px !important;
}

/* Smooth hover animations */
.thread-module,
.retro-card,
.feed-post,
.post-item,
.comment-container {
  will-change: transform !important;
}

/* ===========================================
   📱 RESPONSIVE DESIGN
   =========================================== */

@media (max-width: 768px) {
  .site-main {
    padding: 1rem !important;
  }
  
  .profile-display-name {
    font-size: 1.5rem !important;
  }
  
  .site-title {
    font-size: 1.25rem !important;
  }
  
  .thread-module,
  .retro-card {
    padding: 1rem !important;
  }
  
  .profile-header {
    padding: 1.5rem !important;
  }
}

/* ===========================================
   🎯 UTILITY CLASSES
   =========================================== */

/* Success states */
.success {
  color: var(--dark-success) !important;
  border-color: var(--dark-success) !important;
}

/* Warning states */
.warning {
  color: var(--dark-warning) !important;
  border-color: var(--dark-warning) !important;
}

/* Error states */
.error,
.danger {
  color: var(--dark-danger) !important;
  border-color: var(--dark-danger) !important;
}

/* Muted text */
.muted {
  color: var(--dark-text-muted) !important;
}

/* Subtle backgrounds */
.bg-subtle {
  background: var(--dark-surface-elevated) !important;
}

/* ===========================================
   🎨 THEME TOGGLE INDICATOR
   =========================================== */

/* Add a small indicator that dark mode is active */
.site-header::after {
  content: "🌙 Dark Mode Active";
  position: absolute;
  top: 100%;
  right: 2rem;
  background: var(--dark-accent);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0 0 6px 6px;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  z-index: 1000;
  box-shadow: var(--dark-shadow-sm);
}`;