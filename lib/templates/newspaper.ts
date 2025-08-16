export const NEWSPAPER_TEMPLATE = `/* ===========================================
   📰 EARLY WEB NEWSPAPER EDITION 
   =========================================== */

/* Classic early internet newspaper with that authentic 1990s charm
   Complete with web rings, banner ads, and visitor counters! 
   
   Note: This template works on a clean canvas - no site-wide CSS
   interference on profile pages. Complete creative freedom! */

@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Times+New+Roman:ital,wght@0,400;1,400;0,700&display=swap');

/* ===========================================
   📺 VINTAGE WEB NEWSPAPER STYLING
   =========================================== */

/* Complete early web newspaper background */
.site-layout {
  background: #fffef7;
  background-image: 
    radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0);
  background-size: 15px 15px;
  font-family: 'Times New Roman', serif;
  line-height: 1.5;
  color: #1a1a1a;
  position: relative;
}

/* Add that classic "web safe" texture */
.site-layout::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 50px,
      rgba(0,0,0,0.02) 50px,
      rgba(0,0,0,0.02) 52px
    );
  pointer-events: none;
  z-index: -1;
}

/* ===========================================
   🛡️ BACKGROUND & FOOTER STYLING
   =========================================== */

/* Classic early web footer */
.profile-container .site-footer,
.site-footer {
  background: linear-gradient(180deg, #f0f0f0, #e0e0e0) !important;
  border-top: 4px double #000 !important;
  color: #000 !important;
  font-family: 'Times New Roman', serif !important;
  text-align: center !important;
  padding: 1rem !important;
  position: relative !important;
}

.site-footer::before {
  content: '📊 You are visitor #1,337,420 📊 • Last updated: Today';
  display: block;
  font-size: 10px;
  margin-bottom: 5px;
  color: #666;
  border: 1px solid #999;
  background: #fff;
  padding: 2px 8px;
  display: inline-block;
}

/* ===========================================
   🎨 NAVIGATION BAR STYLING (SAFE ZONE)
   =========================================== */

/* Classic newspaper navigation */
.profile-container .site-header,
.site-header {
  background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%) !important;
  border-bottom: 4px double #000 !important;
  color: #000 !important;
  font-family: 'Times New Roman', serif !important;
}

.profile-container .site-title,
.site-title {
  color: #000 !important;
  font-family: 'Playfair Display', serif !important;
  font-weight: bold !important;
  text-shadow: 1px 1px 0px #ccc !important;
}

.profile-container .site-tagline,
.site-tagline {
  color: #444 !important;
  font-style: italic !important;
}

.profile-container .nav-link,
.nav-link {
  background: linear-gradient(135deg, #e0e0e0, #f0f0f0) !important;
  color: #000 !important;
  text-decoration: none !important;
  font-weight: bold !important;
  padding: 6px 12px !important;
  margin: 0 3px !important;
  border: 2px outset #e0e0e0 !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  transition: all 0.1s ease !important;
  font-family: 'Times New Roman', serif !important;
}

.profile-container .nav-link:hover,
.nav-link:hover {
  background: linear-gradient(135deg, #f0f0f0, #e0e0e0) !important;
  border: 2px inset #e0e0e0 !important;
  color: #000 !important;
}

/* ===========================================
   📰 CREATIVE HEADER - NEWSPAPER MASTHEAD
   =========================================== */

.profile-container .site-creative-header,
.site-creative-header {
  background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%) !important;
  border: 4px double #000 !important;
  border-bottom: 6px double #000 !important;
  border-top: 6px double #000 !important;
  padding: 2rem 0 !important;
  text-align: center !important;
  position: relative !important;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
}

.site-creative-header::before {
  content: 'THE THREADSTEAD TIMES';
  display: block;
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  font-size: 2.5rem;
  letter-spacing: 4px;
  color: #000;
  text-shadow: 2px 2px 0px #ccc;
  margin-bottom: 0.5rem;
}

.site-creative-header::after {
  content: '"All The Web That\'s Fit To Print" • Est. 1995 • Volume XXIX No. 42';
  display: block;
  font-style: italic;
  font-size: 11px;
  color: #666;
  border: 1px solid #000;
  padding: 2px 8px;
  background: #fff;
  display: inline-block;
}

/* 🚨 NAVIGATION FUNCTIONALITY PROTECTION 🚨
   DO NOT modify positioning, z-index, or layout properties of navigation.
   Stick to colors, fonts, and basic styling only! */

.site-main {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
}

/* ===========================================
   📄 NEWSPAPER LAYOUT
   =========================================== */

.profile-container {
  background: #fff;
  border: 3px solid #000;
  box-shadow: 5px 5px 0px #ccc;
  padding: 0;
  margin: 2rem 0;
  position: relative;
}

/* Front page header */
.profile-header {
  background: linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%);
  border-bottom: 3px solid #000;
  padding: 2rem;
  text-align: center;
  position: relative;
}

.profile-header::before {
  content: 'BREAKING NEWS';
  position: absolute;
  top: 10px;
  left: 20px;
  background: #000;
  color: #fff;
  padding: 5px 15px;
  font-weight: bold;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.profile-header::after {
  content: 'EXTRA! EXTRA!';
  position: absolute;
  top: 10px;
  right: 20px;
  background: #ff0000;
  color: #fff;
  padding: 5px 15px;
  font-weight: bold;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: flash 2s infinite;
}

@keyframes flash {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.profile-display-name {
  color: #000;
  font-size: 3rem;
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-shadow: 2px 2px 0px #ddd;
  margin-bottom: 1rem;
  border-bottom: 3px solid #000;
  display: inline-block;
  padding-bottom: 0.5rem;
}

.profile-bio {
  background: #f9f9f9;
  border: 2px solid #000;
  padding: 1.5rem;
  margin: 1.5rem;
  font-style: italic;
  color: #333;
  position: relative;
  column-count: 2;
  column-gap: 2rem;
  column-rule: 1px solid #ccc;
}

.profile-bio::before {
  content: 'EDITORIAL';
  position: absolute;
  top: -12px;
  left: 20px;
  background: #fff;
  color: #000;
  padding: 2px 10px;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  font-style: normal;
}

/* ===========================================
   📰 ARTICLES (BLOG POSTS)
   =========================================== */

.blog-post-card {
  background: #fff;
  border: 2px solid #000;
  margin: 2rem 0;
  padding: 2rem;
  position: relative;
  box-shadow: 3px 3px 0px #ddd;
}

.blog-post-card::before {
  content: 'LATEST STORY';
  position: absolute;
  top: -12px;
  left: 20px;
  background: #000;
  color: #fff;
  padding: 4px 12px;
  font-weight: bold;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.blog-post-header {
  border-bottom: 2px solid #000;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.blog-post-content {
  column-count: 2;
  column-gap: 2rem;
  column-rule: 1px solid #ddd;
  text-align: justify;
  line-height: 1.6;
  color: #222;
}

/* ===========================================
   📊 CLASSIFIED ADS (FRIENDS)
   =========================================== */

.featured-friends {
  background: #f5f5f5;
  border: 3px solid #000;
  padding: 1.5rem;
  margin: 2rem 0;
  position: relative;
}

.featured-friends::before {
  content: 'CLASSIFIED ADS';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  padding: 4px 15px;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.friend-card {
  background: #fff;
  border: 1px solid #000;
  padding: 1rem;
  margin: 1rem;
  box-shadow: 2px 2px 0px #ccc;
  transition: all 0.2s ease;
  position: relative;
}

.friend-card::before {
  content: 'AD';
  position: absolute;
  top: 5px;
  right: 5px;
  background: #000;
  color: #fff;
  padding: 2px 6px;
  font-size: 8px;
  font-weight: bold;
}

.friend-card:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0px #ccc;
}

/* ===========================================
   💌 LETTERS TO THE EDITOR (GUESTBOOK)
   =========================================== */

.guestbook-section {
  background: #fafafa;
  border: 2px solid #000;
  padding: 2rem;
  margin: 2rem 0;
  position: relative;
}

.guestbook-section::before {
  content: 'LETTERS TO THE EDITOR';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  padding: 4px 15px;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.guestbook-entry {
  background: #fff;
  border-left: 4px solid #000;
  padding: 1.5rem;
  margin: 1rem 0;
  position: relative;
  font-style: italic;
}

.guestbook-entry::before {
  content: 'LETTER';
  position: absolute;
  top: 10px;
  right: 10px;
  background: #f0f0f0;
  color: #000;
  padding: 2px 8px;
  font-size: 8px;
  font-weight: bold;
  font-style: normal;
  border: 1px solid #ccc;
}

/* ===========================================
   🎛️ INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: linear-gradient(135deg, #e0e0e0, #f0f0f0);
  color: #000;
  border: 2px outset #e0e0e0;
  padding: 8px 16px;
  font-family: 'Times New Roman', serif;
  font-weight: bold;
  font-size: 11px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s ease;
}

.profile-button:hover {
  background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
  border: 2px inset #e0e0e0;
}

.profile-tab-button {
  background: linear-gradient(135deg, #e0e0e0, #f0f0f0);
  color: #000;
  border: 2px outset #e0e0e0;
  padding: 8px 16px;
  margin: 2px;
  font-family: 'Times New Roman', serif;
  font-weight: bold;
  font-size: 10px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s ease;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: linear-gradient(135deg, #d0d0d0, #e0e0e0);
  border: 2px inset #e0e0e0;
}

.profile-tab-panel {
  background: #fff;
  border: 2px solid #000;
  border-top: none;
  padding: 2rem;
}

/* ===========================================
   📱 MOBILE RESPONSIVENESS
   =========================================== */

@media (max-width: 768px) {
  .profile-display-name {
    font-size: 2rem;
  }
  
  .profile-bio,
  .blog-post-content {
    column-count: 1;
  }
  
  .site-main {
    padding: 1rem;
  }
}

/* ===========================================
   🎨 NEWSPAPER TYPOGRAPHY
   =========================================== */

/* Headlines */
h1, h2, h3 {
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 1px;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.2rem; }

/* Bylines and dates */
.byline {
  font-style: italic;
  font-size: 0.9rem;
  color: #666;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

/* Drop caps for articles */
.blog-post-content::first-letter {
  float: left;
  font-family: 'Playfair Display', serif;
  font-size: 4rem;
  line-height: 3rem;
  padding-right: 8px;
  padding-top: 4px;
  font-weight: bold;
  color: #000;
}

/* Quote styling */
blockquote {
  border-left: 4px solid #000;
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  background: #f9f9f9;
  padding: 1rem;
}

blockquote::before {
  content: '"';
  font-size: 3rem;
  color: #ccc;
  float: left;
  line-height: 1;
  margin-right: 0.5rem;
}`;