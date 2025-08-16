export const DARK_THEME_TEMPLATE = `/* ===========================================
   🖥️ HACKER TERMINAL THEME
   =========================================== */

/* Enter the Matrix with this authentic hacker aesthetic
   Inspired by 90s cyberpunk and terminal culture 
   
   Note: This template is resilient against site-wide CSS
   by using higher specificity and strategic !important declarations. */

@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

/* ===========================================
   💚 MATRIX CODE RAIN - FULL IMMERSION
   =========================================== */

/* Authentic terminal background */
.profile-container .site-layout,
.site-layout {
  background: #000000 !important;
  color: #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Matrix rain effect */
.site-layout::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(90deg, transparent 98%, #00ff41 100%),
    linear-gradient(180deg, transparent 70%, rgba(0,255,65,0.03) 100%);
  background-size: 3px 3px, 100% 100%;
  animation: matrix 2s linear infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes matrix {
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 0 20px, 0 0; }
}

/* Terminal scanlines */
.site-layout::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,255,65,0.02) 2px,
    rgba(0,255,65,0.02) 4px
  );
  pointer-events: none;
  z-index: 10;
}

/* ===========================================
   🛡️ BACKGROUND & FOOTER STYLING
   =========================================== */

/* Terminal-style footer */
.site-footer {
  background: rgba(0, 20, 0, 0.95) !important;
  border-top: 2px solid #00ff41 !important;
  color: #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
  text-align: center !important;
  padding: 1rem !important;
}

/* ===========================================
   🎨 NAVIGATION BAR STYLING (SAFE ZONE)
   =========================================== */

/* Matrix terminal navigation */
.site-header {
  background: rgba(0, 20, 0, 0.95) !important;
  border-bottom: 2px solid #00ff41 !important;
  color: #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
  backdrop-filter: blur(5px) !important;
}

.site-title {
  color: #00ff41 !important;
  font-family: 'Orbitron', monospace !important;
  font-weight: 700 !important;
  text-shadow: 0 0 10px #00ff41 !important;
  animation: glow 2s ease-in-out infinite alternate !important;
}

@keyframes glow {
  from { text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41; }
  to { text-shadow: 0 0 20px #00ff41, 0 0 30px #00ff41; }
}

.site-tagline {
  color: #00ffff !important;
  font-family: 'Source Code Pro', monospace !important;
}

.nav-link {
  background: rgba(0, 255, 65, 0.1) !important;
  color: #00ff41 !important;
  padding: 8px 15px !important;
  border: 1px solid #00ff41 !important;
  margin: 0 5px !important;
  transition: all 0.2s ease !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
  font-family: 'Source Code Pro', monospace !important;
  font-weight: 600 !important;
}

.nav-link:hover {
  background: #00ff41 !important;
  color: #000 !important;
  box-shadow: 0 0 15px #00ff41 !important;
}

/* ===========================================
   🔱 CREATIVE HEADER - MATRIX SYSTEM
   =========================================== */

.site-creative-header {
  background: rgba(0, 0, 0, 0.9);
  padding: 3rem 2rem;
  text-align: center;
  border-bottom: 2px solid #00ff41;
  position: relative;
  font-family: 'Source Code Pro', monospace;
  overflow: hidden;
}

.site-creative-header::before {
  content: 'SYSTEM ACCESSED';
  display: block;
  font-family: 'Orbitron', monospace;
  font-size: 2rem;
  color: #00ff41;
  text-shadow: 0 0 20px #00ff41;
  margin-bottom: 1rem;
  animation: flicker 3s infinite;
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
  75% { opacity: 0.9; }
}

.site-creative-header::after {
  content: 'Welcome to the Matrix... Follow the white rabbit.';
  display: block;
  font-size: 1rem;
  color: #00ffff;
  animation: typewriter 4s steps(50) 1s both;
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid #00ffff;
}

@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

/* 🚨 NAVIGATION FUNCTIONALITY PROTECTION 🚨
   DO NOT modify positioning, z-index, or layout properties of navigation.
   Stick to colors, fonts, and basic styling only! */

.site-main {
  padding: 2rem;
  position: relative;
  z-index: 20;
}

/* ===========================================
   🔐 TERMINAL WINDOW STYLING
   =========================================== */

.profile-container {
  background: rgba(0, 20, 0, 0.9);
  border: 2px solid #00ff41;
  border-radius: 8px;
  padding: 0;
  margin: 2rem 0;
  position: relative;
  box-shadow: 
    0 0 30px rgba(0,255,65,0.3),
    inset 0 0 30px rgba(0,255,65,0.05);
  backdrop-filter: blur(10px);
}

/* Terminal window header */
.profile-header {
  background: rgba(0, 40, 0, 0.8);
  border-bottom: 1px solid #00ff41;
  padding: 2rem;
  text-align: center;
  position: relative;
  border-radius: 6px 6px 0 0;
}

.profile-header::before {
  content: '[AUTHENTICATED]';
  position: absolute;
  top: 10px;
  right: 15px;
  color: #00ff41;
  font-size: 10px;
  border: 1px solid #00ff41;
  padding: 2px 8px;
  border-radius: 3px;
  background: rgba(0,255,65,0.1);
}

.profile-header::after {
  content: 'root@matrix:~#';
  position: absolute;
  top: 10px;
  left: 15px;
  color: #00ffff;
  font-size: 10px;
  font-family: 'Source Code Pro', monospace;
}

.profile-display-name {
  color: #00ff41;
  font-size: 2.5rem;
  font-family: 'Orbitron', monospace;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-shadow: 
    0 0 10px #00ff41,
    0 0 20px #00ff41,
    0 0 30px #00ff41;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { 
    text-shadow: 
      0 0 10px #00ff41,
      0 0 20px #00ff41,
      0 0 30px #00ff41;
  }
  50% { 
    text-shadow: 
      0 0 20px #00ff41,
      0 0 30px #00ff41,
      0 0 40px #00ff41;
  }
}

.profile-bio {
  background: rgba(0, 255, 65, 0.05);
  border: 1px solid #00ff41;
  border-left: 4px solid #00ff41;
  color: #00ff41;
  padding: 1.5rem;
  margin: 1.5rem;
  font-family: 'Source Code Pro', monospace;
  border-radius: 4px;
  position: relative;
}

.profile-bio::before {
  content: '> cat user_profile.txt';
  display: block;
  color: #00ffff;
  margin-bottom: 1rem;
  font-size: 12px;
  border-bottom: 1px solid rgba(0,255,65,0.3);
  padding-bottom: 0.5rem;
}

/* Form styling for better readability */
input[type="text"], input[type="email"], input[type="password"], input[type="search"], textarea, select {
  background: #001100 !important;
  color: #00ff41 !important;
  border: 1px solid #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
  padding: 8px 12px !important;
  border-radius: 4px !important;
}

input[type="text"]:focus, input[type="email"]:focus, input[type="password"]:focus, input[type="search"]:focus, textarea:focus, select:focus {
  outline: none !important;
  border-color: #00ffff !important;
  box-shadow: 0 0 10px rgba(0,255,255,0.5) !important;
}

/* ===========================================
   💾 BLOG POSTS - TERMINAL OUTPUT
   =========================================== */

.blog-post-card {
  background: rgba(0, 20, 0, 0.8);
  border: 1px solid #00ff41;
  border-left: 4px solid #00ff41;
  margin: 2rem 0;
  padding: 1.5rem;
  border-radius: 4px;
  position: relative;
  box-shadow: 0 0 15px rgba(0,255,65,0.2);
}

.blog-post-card::before {
  content: '[NEW_FILE]';
  position: absolute;
  top: -8px;
  right: 10px;
  background: #00ff41;
  color: #000;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: bold;
  border-radius: 3px;
}

.blog-post-header {
  border-bottom: 1px solid rgba(0,255,65,0.3);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  color: #00ffff;
}

.blog-post-content {
  color: #00ff41;
  font-family: 'Source Code Pro', monospace;
  line-height: 1.6;
  font-size: 13px;
}

/* ===========================================
   👥 NETWORK CONNECTIONS (FRIENDS)
   =========================================== */

.featured-friends {
  background: rgba(0, 20, 0, 0.8);
  border: 2px solid #00ffff;
  border-radius: 6px;
  padding: 1.5rem;
  margin: 2rem 0;
  position: relative;
}

.featured-friends::before {
  content: '[NETWORK_CONNECTIONS]';
  display: block;
  color: #00ffff;
  font-size: 12px;
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 1px solid #00ffff;
  padding-bottom: 0.5rem;
  font-family: 'Source Code Pro', monospace;
}

.friend-card {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid #00ffff;
  border-radius: 4px;
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
  transition: all 0.3s ease;
}

.friend-card:hover {
  background: rgba(0, 255, 255, 0.1);
  box-shadow: 0 0 15px rgba(0,255,255,0.3);
  transform: translateX(5px);
}

.friend-card::before {
  content: 'ONLINE';
  position: absolute;
  top: 5px;
  right: 5px;
  background: #00ff41;
  color: #000;
  padding: 1px 5px;
  font-size: 8px;
  font-weight: bold;
  border-radius: 2px;
}

/* ===========================================
   💬 TERMINAL CHAT (GUESTBOOK)
   =========================================== */

.guestbook-section {
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #00ff41;
  border-radius: 6px;
  padding: 1.5rem;
  margin: 2rem 0;
}

.guestbook-section::before {
  content: '> chat_log.txt';
  display: block;
  color: #00ffff;
  font-size: 12px;
  margin-bottom: 1rem;
  font-family: 'Source Code Pro', monospace;
  border-bottom: 1px solid rgba(0,255,65,0.3);
  padding-bottom: 0.5rem;
}

.guestbook-entry {
  background: rgba(0, 255, 65, 0.05);
  border-left: 3px solid #00ff41;
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
  border-radius: 0 4px 4px 0;
}

.guestbook-entry::before {
  content: '> ';
  color: #00ff41;
  font-weight: bold;
  font-family: 'Source Code Pro', monospace;
}

/* ===========================================
   🎛️ INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: rgba(0, 255, 65, 0.1);
  color: #00ff41;
  border: 2px solid #00ff41;
  padding: 10px 20px;
  font-family: 'Source Code Pro', monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.profile-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,255,65,0.2), transparent);
  transition: left 0.5s ease;
}

.profile-button:hover {
  background: #00ff41;
  color: #000;
  box-shadow: 
    0 0 20px rgba(0,255,65,0.5),
    inset 0 0 20px rgba(0,255,65,0.1);
}

.profile-button:hover::before {
  left: 100%;
}

.profile-tab-button {
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  border: 1px solid #00ffff;
  padding: 8px 16px;
  margin: 2px;
  font-family: 'Source Code Pro', monospace;
  font-size: 10px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 4px 4px 0 0;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: #00ffff;
  color: #000;
  box-shadow: 0 0 10px rgba(0,255,255,0.5);
}

.profile-tab-panel {
  background: rgba(0, 20, 0, 0.9);
  border: 2px solid #00ff41;
  border-top: none;
  padding: 2rem;
  border-radius: 0 0 6px 6px;
}

/* ===========================================
   📱 MOBILE RESPONSIVENESS
   =========================================== */

@media (max-width: 768px) {
  .profile-display-name {
    font-size: 2rem;
  }
  
  .site-main {
    padding: 1rem;
  }
  
  .site-creative-header::after {
    font-size: 0.8rem;
  }
}

/* ===========================================
   🔧 TERMINAL UTILITIES
   =========================================== */

/* Code blocks */
pre, code {
  background: rgba(0, 0, 0, 0.8) !important;
  color: #00ff41 !important;
  border: 1px solid #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
  border-radius: 4px !important;
}

pre {
  padding: 1rem !important;
  overflow-x: auto !important;
}

code {
  padding: 2px 6px !important;
}

/* Links */
a {
  color: #00ffff !important;
  text-decoration: none !important;
  border-bottom: 1px dotted #00ffff !important;
  transition: all 0.3s ease !important;
}

a:hover {
  color: #00ff41 !important;
  border-bottom-color: #00ff41 !important;
  text-shadow: 0 0 5px #00ff41 !important;
}

/* Selection */
::selection {
  background: rgba(0, 255, 65, 0.3) !important;
  color: #00ff41 !important;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.8);
}

::-webkit-scrollbar-thumb {
  background: #00ff41;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #00ffff;
}`;