export const PIXEL_PETALS_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Nunito:wght@400;600;700;800&display=swap');

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
  background-color: #fff8fa !important;
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
  color: #53384a !important;
  font-family: 'Nunito', sans-serif !important;
}

/* ---- header: flat blossom pink, hard pixel edge ---- */
.site-header {
  background: #ffd4e8 !important;
  border-bottom: 3px dotted #ff8fb8 !important;
  box-shadow: 0 3px 0 rgba(255, 143, 184, 0.35) !important;
  backdrop-filter: none !important;
}

.site-title {
  font-family: 'Silkscreen', monospace !important;
  font-weight: 700 !important;
  font-size: 1.35rem !important;
  letter-spacing: 0.5px !important;
  color: #c2477d !important;
  text-shadow: 2px 2px 0 #ffffff !important;
}

/* one of only two emoji in the whole sheet */
.site-title::after {
  content: ' 🌸' !important;
  font-size: 0.9em !important;
  display: inline-block !important;
  animation: petal-bob 4s ease-in-out infinite !important;
}

.site-tagline {
  font-family: 'Nunito', sans-serif !important;
  font-weight: 600 !important;
  font-style: normal !important;
  color: #a04e74 !important;
  letter-spacing: 0.3px !important;
}

.site-navigation {
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
}

.nav-link {
  font-family: 'Nunito', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.9rem !important;
  color: #c2477d !important;
  background: #fff8fa !important;
  border: 2px solid #ff8fb8 !important;
  border-radius: 3px !important;
  padding: 0.3rem 0.8rem !important;
  box-shadow: 2px 2px 0 #ff8fb8 !important;
  text-decoration: none !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.nav-link:hover {
  background: #ffffff !important;
  color: #c2477d !important;
  transform: translate(1px, 1px) !important;
  box-shadow: 1px 1px 0 #ff8fb8 !important;
  text-decoration: none !important;
}

/* ---- mobile menu: same garden, smaller pot ---- */
#mobile-menu {
  background: #fff8fa !important;
  border: 2px solid #ff8fb8 !important;
  border-radius: 3px 12px 3px 12px !important;
  box-shadow: 3px 3px 0 #ffd4e8 !important;
  padding: 0.75rem !important;
}

#mobile-menu .nav-link {
  display: block !important;
  margin: 0.4rem 0 !important;
  text-align: center !important;
}

/* ---- footer: cream with an awning-stripe hem ---- */
.site-footer {
  background: #fff8fa !important;
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 212, 232, 0.4) 0px,
    rgba(255, 212, 232, 0.4) 8px,
    transparent 8px,
    transparent 16px
  ) !important;
  border-top: 3px dotted #ff8fb8 !important;
  color: #a04e74 !important;
}

.footer-tagline {
  font-family: 'Silkscreen', monospace !important;
  font-size: 0.8rem !important;
  color: #c2477d !important;
}

/* the second (and last) emoji in the sheet */
.footer-tagline::after {
  content: ' ✿' !important;
  color: #ff8fb8 !important;
}

.footer-copyright {
  font-family: 'Nunito', sans-serif !important;
  font-weight: 600 !important;
  font-size: 0.8rem !important;
  color: #a04e74 !important;
}

/* ---- generic content modules ---- */
.thread-module {
  background: #ffffff !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 10px !important;
  box-shadow: 3px 3px 0 #ffd4e8 !important;
  color: #53384a !important;
}

/* ---- profile: the shrine centerpiece ---- */
.ts-profile-container {
  background: #ffffff !important;
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
  font-family: 'Silkscreen', monospace !important;
  font-weight: 700 !important;
  font-size: 1.9rem !important;
  color: #c2477d !important;
  text-shadow: 2px 2px 0 #ffffff, 4px 4px 0 #ffd4e8 !important;
  letter-spacing: 0.5px !important;
}

.ts-profile-status {
  display: inline-block !important;
  font-family: 'Nunito', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.8rem !important;
  color: #c2477d !important;
  background: #fff8fa !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 999px !important;
  padding: 0.15rem 0.75rem !important;
}

.ts-profile-bio {
  background: #fff8fa !important;
  border: 2px solid #ffd4e8 !important;
  border-radius: 4px !important;
  padding: 1.1rem 1.25rem !important;
  color: #53384a !important;
  font-family: 'Nunito', sans-serif !important;
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
  font-family: 'Nunito', sans-serif !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  color: #c2477d !important;
  background: #ffffff !important;
  border: 2px solid #c2477d !important;
  border-radius: 3px !important;
  padding: 0.4rem 1rem !important;
  box-shadow: 2px 2px 0 #ff8fb8 !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.ts-profile-button:hover {
  background: #ffd4e8 !important;
  color: #c2477d !important;
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
  background: #ffffff !important;
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
  background: #ffffff !important;
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
  font-family: 'Silkscreen', monospace !important;
  font-weight: 700 !important;
  font-size: 1.05rem !important;
  color: #c2477d !important;
  letter-spacing: 0.3px !important;
}

.blog-post-title a {
  color: #c2477d !important;
  text-decoration: none !important;
}

.blog-post-title a:hover {
  text-decoration: underline dotted #ff8fb8 !important;
}

.blog-post-date {
  font-family: 'Nunito', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.75rem !important;
  text-transform: lowercase !important;
  letter-spacing: 0.5px !important;
  color: #a04e74 !important;
  background: #fff8fa !important;
  border: 1px solid #ffd4e8 !important;
  border-radius: 999px !important;
  padding: 0.1rem 0.6rem !important;
}

.blog-post-content {
  font-family: 'Nunito', sans-serif !important;
  font-weight: 500 !important;
  color: #53384a !important;
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
  background: #ffffff !important;
  border: 2px solid #ffd4e8 !important;
  border-top: none !important;
  border-radius: 0 0 10px 10px !important;
  padding: 1.25rem !important;
  color: #53384a !important;
}

/* ---- the one gentle animation ---- */
@keyframes petal-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
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

  .site-title {
    font-size: 1.1rem !important;
  }

  .blog-post-card {
    padding: 1rem !important;
  }

  .blog-post-title {
    font-size: 0.95rem !important;
  }

  .nav-link,
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
  background: #fff8fa !important;
  color: #b06a8a !important;
  border-right: 1px dotted #ffb8d4 !important;
  font-family: 'Nunito', sans-serif !important;
  font-weight: 700 !important;
}

.profile-tab-button:hover {
  background: #ffeef5 !important;
  color: #c2477d !important;
}

.profile-tab-button.active {
  background: #ffd4e8 !important;
  color: #8f2f5a !important;
  box-shadow: inset 0 -3px 0 #c2477d !important;
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
  font-family: 'Nunito', sans-serif !important;
}

.blog-post-actions {
  border-top: 1px dotted #ffb8d4 !important;
  color: #b06a8a !important;
}`;
