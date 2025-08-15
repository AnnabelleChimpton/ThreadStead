export const RETRO_GAMING_TEMPLATE = `/* ===========================================
   RETRO GAMING THEME
   =========================================== */

/* 8-bit inspired design with pixelated elements */

@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

/* ===========================================
   GLOBAL TERMINAL STYLE
   =========================================== */

/* Transform entire site into terminal */
.site-layout {
  background: #0f0f0f;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  line-height: 1.6;
  image-rendering: pixelated;
}

/* ===========================================
   🛡️ BACKGROUND & FOOTER STYLING
   =========================================== */

/* Terminal-style footer */
.site-footer {
  background: #1a1a1a !important;
  border-top: 2px solid #00ff00 !important;
  color: #00ff00 !important;
}

/* 🚨 NAVIGATION FUNCTIONALITY PROTECTION 🚨
   DO NOT modify positioning, z-index, or layout properties of navigation.
   Stick to colors, fonts, and basic styling only! */

/* ===========================================
   🎨 NAVIGATION BAR STYLING (SAFE ZONE)
   =========================================== */

/* 8-bit terminal navigation */
.site-header {
  background: #1a1a1a !important;
  border-bottom: 2px solid #00ff00 !important;
  color: #00ff00 !important;
  font-family: 'Press Start 2P', monospace !important;
}

.site-title {
  color: #ffff00 !important;
  font-size: 16px !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
  animation: blink 1s infinite !important;
}

.site-tagline {
  color: #00ffff !important;
  font-size: 10px !important;
}

.nav-link {
  background: #2a2a2a !important;
  color: #00ff00 !important;
  padding: 8px 15px !important;
  border: 1px solid #00ff00 !important;
  margin: 0 5px !important;
  transition: all 0.1s ease !important;
  text-transform: uppercase !important;
  font-size: 10px !important;
}

.nav-link:hover {
  background: #00ff00 !important;
  color: #000 !important;
}

/* ===========================================
   🎮 CREATIVE HEADER - RETRO ARCADE
   =========================================== */

.site-creative-header {
  background: #0a0a0a;
  padding: 3rem 2rem;
  text-align: center;
  border-bottom: 2px solid #00ff00;
  position: relative;
  font-family: 'Press Start 2P', monospace;
}

.site-creative-header::before {
  content: 'PLAYER 1 START';
  display: block;
  font-size: 1.5rem;
  color: #ffff00;
  margin-bottom: 1rem;
  animation: blink 2s infinite;
}

.site-creative-header::after {
  content: 'INSERT COIN TO CONTINUE';
  display: block;
  font-size: 0.8rem;
  color: #00ffff;
  animation: blink 1.5s infinite;
}

.footer-tagline, .footer-copyright {
  color: #00ffff;
  font-size: 10px;
}

/* Main content terminal style */
.site-main {
  padding: 20px;
  background: #0f0f0f;
}

/* Global pixel art style */
.profile-container {
  background: transparent; /* Use global background */
  border: 2px solid #00ff00;
  border-radius: 0;
  padding: 0;
  margin: 20px;
  position: relative;
}

/* Terminal window header */
.profile-header {
  background: #1a1a1a;
  border: none;
  border-bottom: 2px solid #00ff00;
  padding: 15px 0;
  text-align: center;
  position: relative;
}

.profile-header::before {
  content: '[STATUS: ONLINE]';
  position: absolute;
  top: 5px;
  right: 10px;
  color: #00ff00;
  font-size: 8px;
  border: 1px solid #00ff00;
  padding: 2px 5px;
}

.profile-display-name {
  color: #ffff00;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-shadow: none;
  margin: 0;
  animation: blink 2s infinite;
}

.profile-bio {
  background: rgba(0, 255, 0, 0.1);
  border: 1px dashed #00ff00;
  color: #00ff00;
  padding: 15px;
  margin: 15px;
  font-size: 10px;
  border-radius: 0;
}

.profile-bio::before {
  content: '> LOADING USER DATA...';
  display: block;
  color: #00ffff;
  margin-bottom: 10px;
  font-size: 8px;
}

/* Blog posts as console output */
.blog-post-card {
  background: #111;
  border: 1px solid #00ff00;
  border-radius: 0;
  margin: 15px;
  padding: 15px;
  position: relative;
}

.blog-post-card::before {
  content: '[NEW]';
  position: absolute;
  top: -10px;
  right: -5px;
  background: #ff0080;
  color: white;
  padding: 2px 5px;
  font-size: 8px;
  border-radius: 0;
}

.blog-post-header {
  border-bottom: 1px solid #00ff00;
  padding-bottom: 10px;
  margin-bottom: 10px;
  color: #ffff00;
}

.blog-post-content {
  color: #00ff00;
  font-size: 10px;
  line-height: 1.4;
}

/* Friends as party members */
.featured-friends {
  background: #0a0a0a;
  border: 2px solid #00ffff;
  border-radius: 0;
  padding: 15px;
  margin: 20px;
}

.featured-friends::before {
  content: '[PARTY MEMBERS]';
  display: block;
  color: #00ffff;
  font-size: 10px;
  margin-bottom: 10px;
  text-align: center;
  border-bottom: 1px solid #00ffff;
  padding-bottom: 5px;
}

.friend-card {
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #00ffff;
  border-radius: 0;
  padding: 10px;
  margin: 10px 0;
  position: relative;
  transition: all 0.1s ease;
}

.friend-card:hover {
  background: rgba(0, 255, 255, 0.2);
  transform: none; /* Remove rotation */
}

.friend-card::before {
  content: 'LVL 99';
  position: absolute;
  top: -10px;
  right: -5px;
  background: #ff0080;
  color: white;
  padding: 2px 5px;
  font-size: 8px;
  border-radius: 0;
}

/* Guestbook as chat log */
.guestbook-section {
  background: #111;
  border: 2px solid #00ff00;
  border-radius: 0;
  padding: 15px;
  margin: 20px;
}

.guestbook-entry {
  background: rgba(0, 255, 0, 0.1);
  border-left: 3px solid #00ff00;
  border-radius: 0;
  padding: 10px;
  margin: 10px 0;
  position: relative;
}

.guestbook-entry::before {
  content: '> ';
  color: #00ff00;
  font-weight: bold;
}

/* Website links as menu items */
.website-link {
  background: none;
  color: #00ffff;
  text-decoration: none;
  border: 1px solid #00ffff;
  padding: 8px 12px;
  display: inline-block;
  margin: 5px;
  transition: all 0.1s ease;
}

.website-link:hover {
  background: #00ffff;
  color: #000;
  text-decoration: none;
}

/* Health bar style progress indicators */
.progress-bar {
  width: 200px;
  height: 20px;
  background: #333;
  border: 2px solid #00ff00;
  position: relative;
  margin: 10px 0;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 75%; /* Adjust as needed */
  background: linear-gradient(90deg, #00ff00, #ffff00, #ff0000);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .site-main {
    padding: 1rem;
  }
  
  .profile-tabs {
    padding: 0.5rem;
  }
  
  .profile-tab-button {
    display: block;
    width: 100%;
    margin: 2px 0;
    text-align: center;
  }
}

/* Buttons as game controls */
.profile-button {
  background: #2a2a2a;
  color: #00ff00;
  border: 2px solid #00ff00;
  padding: 8px 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s ease;
  border-radius: 0;
}

.profile-button:hover {
  background: #00ff00;
  color: #000;
}

.profile-tab-button {
  background: #333;
  color: #00ffff;
  border: 1px solid #00ffff;
  padding: 8px 12px;
  margin: 2px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s ease;
  border-radius: 0;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: #00ffff;
  color: #000;
}

.profile-tab-panel {
  background: #0f0f0f;
  border: 2px solid #00ff00;
  border-top: none;
  padding: 15px;
  border-radius: 0;
}

/* Section headings as terminal commands */
.section-heading {
  color: #ffff00;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 20px 0 10px 0;
  padding: 5px 0;
  border-bottom: 1px solid #ffff00;
}

.section-heading::before {
  content: '> ';
  color: #00ff00;
}

/* Blink animation for retro effect */
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

/* Scanline effect overlay */
.profile-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 0, 0.03) 2px,
    rgba(0, 255, 0, 0.03) 4px
  );
  pointer-events: none;
}`;