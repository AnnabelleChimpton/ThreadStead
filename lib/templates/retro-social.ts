export const RETRO_SOCIAL_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');

/* ===========================================
   RETRO SOCIAL — mid-2000s profile-page chic
   Palette: #1c3f95 (header blue) / #16327a (deep blue)
            #e9edf6 (page) / #ffffff (panels)
            #7d8db3 (bevel dark) / #551a8b (visited)
   =========================================== */

/* ---- Page surface: tiled subtle dot pattern ---- */
.thread-surface {
  background-color: #e9edf6 !important;
  background-image:
    radial-gradient(circle at 4px 4px, #d4dbec 1px, transparent 1px),
    radial-gradient(circle at 16px 16px, #dee4f1 1px, transparent 1px) !important;
  background-size: 24px 24px, 24px 24px !important;
  color: #222222 !important;
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
}

/* ---- Two-tone header bar ---- */
.site-header {
  background: #1c3f95 !important;
  border-bottom: 4px solid #16327a !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.site-navigation {
  background: #16327a !important;
  border-top: 1px solid #4a67b5 !important;
  border-bottom: 1px solid #0d2158 !important;
  padding: 0.25rem 1rem !important;
}

.site-title {
  font-family: 'Righteous', Verdana, Tahoma, sans-serif !important;
  font-weight: 400 !important;
  font-size: 1.75rem !important;
  letter-spacing: 0.5px !important;
  color: #ffffff !important;
  text-shadow: 1px 1px 0 #0d2158 !important;
  text-decoration: none !important;
}

.site-tagline {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.7rem !important;
  color: #c7d3f0 !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
}

/* ---- Chunky classic nav links ---- */
.nav-link {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.8rem !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  text-decoration: underline !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 0 !important;
  padding: 0.25rem 0.6rem !important;
  box-shadow: none !important;
}

.nav-link:hover {
  color: #ffffff !important;
  background: #2a52b8 !important;
  border-top: 1px solid #5d7cc9 !important;
  border-left: 1px solid #5d7cc9 !important;
  border-right: 1px solid #0d2158 !important;
  border-bottom: 1px solid #0d2158 !important;
  text-decoration: underline !important;
}

/* ---- Footer: same family as the header ---- */
.site-footer {
  background: #1c3f95 !important;
  border-top: 4px solid #16327a !important;
  color: #ffffff !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.footer-tagline {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.8rem !important;
  font-weight: 700 !important;
  color: #ffffff !important;
}

.footer-copyright {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.7rem !important;
  color: #c7d3f0 !important;
}

/* ---- Beveled module boxes (the load-bearing kitsch) ---- */
.thread-module {
  background: #ffffff !important;
  border-top: 2px solid #ffffff !important;
  border-left: 2px solid #ffffff !important;
  border-right: 2px solid #7d8db3 !important;
  border-bottom: 2px solid #7d8db3 !important;
  outline: 1px solid #aeb9d6 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 1rem !important;
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  color: #222222 !important;
}

/* ---- Profile container: framed like a classic profile table ---- */
.ts-profile-container {
  background: #ffffff !important;
  border: 2px solid #1c3f95 !important;
  border-radius: 0 !important;
  box-shadow: 3px 3px 0 #aeb9d6 !important;
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  color: #222222 !important;
  overflow: hidden !important;
}

.ts-profile-header {
  background: #dbe3f4 !important;
  border-bottom: 2px solid #1c3f95 !important;
  padding: 1rem !important;
  border-radius: 0 !important;
}

.ts-profile-display-name {
  font-family: 'Righteous', Verdana, Tahoma, sans-serif !important;
  font-weight: 400 !important;
  font-size: 1.6rem !important;
  color: #1c3f95 !important;
  text-shadow: 1px 1px 0 #ffffff !important;
  letter-spacing: 0.5px !important;
}

.ts-profile-status {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  color: #1c3f95 !important;
  background: #ffffff !important;
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
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
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
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  color: #1c3f95 !important;
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
  background: #ffffff !important;
  border: 2px solid #1c3f95 !important;
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
  background: #ffffff !important;
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
  border-bottom: 2px solid #1c3f95 !important;
  margin: -1rem -1rem 0.75rem -1rem !important;
  padding: 0.5rem 1rem !important;
}

.blog-post-title {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 1rem !important;
  font-weight: 700 !important;
  color: #1c3f95 !important;
  text-decoration: none !important;
}

.blog-post-title a {
  color: #1c3f95 !important;
  text-decoration: underline !important;
}

.blog-post-title a:visited {
  color: #551a8b !important;
}

.blog-post-date {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.7rem !important;
  color: #5a6a8f !important;
  font-style: italic !important;
}

.blog-post-content {
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
  font-size: 0.85rem !important;
  line-height: 1.65 !important;
  color: #333333 !important;
}

.blog-post-content a {
  color: #1c3f95 !important;
  font-weight: 700 !important;
  text-decoration: underline !important;
}

.blog-post-content a:visited {
  color: #551a8b !important;
}

/* ---- Tabs: folder tabs, table-era style ---- */
.profile-tab-list {
  background: #dbe3f4 !important;
  border-bottom: 2px solid #1c3f95 !important;
  border-radius: 0 !important;
  padding: 0.4rem 0.4rem 0 0.4rem !important;
  gap: 3px !important;
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
}

.profile-tab-panel {
  background: #ffffff !important;
  border-top: 0 !important;
  border-left: 2px solid #ffffff !important;
  border-right: 2px solid #7d8db3 !important;
  border-bottom: 2px solid #7d8db3 !important;
  border-radius: 0 !important;
  padding: 1rem !important;
  font-family: Verdana, Tahoma, Geneva, sans-serif !important;
}

/* ---- Mobile menu: solid header blue, no bleed-through ---- */
#mobile-menu {
  background: #1c3f95 !important;
  border-top: 1px solid #4a67b5 !important;
  border-bottom: 3px solid #16327a !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

#mobile-menu .nav-link {
  display: block !important;
  color: #ffffff !important;
  border-bottom: 1px solid #2a52b8 !important;
  padding: 0.6rem 1rem !important;
}

/* ---- Small screens: tighter chrome, same charm ---- */
@media (max-width: 767px) {
  .site-title {
    font-size: 1.35rem !important;
  }

  .site-tagline {
    font-size: 0.6rem !important;
  }

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
  color: #1c3f95 !important;
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
  background: #ffffff !important;
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
  background: #ffffff !important;
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
}`;
