export const DEFAULT_CSS_TEMPLATE = `/* ===========================================
   🌟 CLASSIC GEOCITIES PERSONAL HOMEPAGE
   =========================================== */

/* Welcome to my personal homepage! This design captures the 
   authentic spirit of 1990s web creativity - complete with 
   animated GIFs, rainbow gradients, and Comic Sans! 
   
   Note: Navigation styling is now customizable while maintaining
   functionality. Creative header is your playground! */

@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Trebuchet+MS:wght@400;700&display=swap');

/* ===========================================
   🌈 EARLY INTERNET VIBES - FULL SITE
   =========================================== */

/* Bring back those awesome tiled backgrounds! */
.site-layout {
  background: #008080; /* Classic teal */
  background-image: 
    radial-gradient(circle at 20px 20px, #ffffff 2px, transparent 2px),
    radial-gradient(circle at 60px 60px, #ff69b4 1px, transparent 1px);
  background-size: 80px 80px;
  font-family: 'Comic Neue', cursive;
  animation: subtlePulse 3s ease-in-out infinite alternate;
}

@keyframes subtlePulse {
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(10deg); }
}

/* ===========================================
   🛡️ BACKGROUND & FOOTER STYLING
   =========================================== */

/* You can style the footer to match your theme */
.site-footer {
  background: linear-gradient(90deg, #32cd32, #00ced1) !important;
  border: 3px solid #000 !important;
  border-top: 5px solid #000 !important;
  color: #000 !important;
  font-weight: bold !important;
  text-align: center !important;
  padding: 1rem !important;
  position: relative !important;
}

.site-footer::before {
  content: 'You are visitor #001337 to this homepage!';
  display: block;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 12px;
  margin-bottom: 8px;
  padding: 4px 8px;
  background: #000;
  color: #00ff00;
  border: 2px inset #666;
  display: inline-block;
}

/* ===========================================
   🎨 NAVIGATION BAR STYLING (SAFE ZONE)
   =========================================== */

/* You can safely style these basic nav properties */
.site-header {
  background: linear-gradient(90deg, #ff69b4, #00ced1) !important;
  color: #000 !important;
  font-family: 'Comic Neue', cursive !important;
}

.site-title {
  color: #fff !important;
  text-shadow: 2px 2px 0px #000 !important;
}

.site-tagline {
  color: #ffff00 !important;
  text-shadow: 1px 1px 0px #000 !important;
}

.nav-link {
  color: #fff !important;
  background: rgba(0,0,0,0.3) !important;
  padding: 4px 8px !important;
  border-radius: 4px !important;
  font-weight: bold !important;
}

.nav-link:hover {
  background: rgba(255,255,255,0.3) !important;
  color: #000 !important;
}

/* ===========================================
   🎪 CREATIVE HEADER - GO WILD!
   =========================================== */

/* This is your creative playground! */
.site-creative-header {
  background: linear-gradient(45deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff);
  background-size: 400% 400%;
  animation: rainbowWave 3s ease-in-out infinite;
  padding: 3rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-bottom: 5px solid #000;
}

@keyframes rainbowWave {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.site-creative-header::before {
  content: '🌟 WELCOME TO MY AWESOME HOMEPAGE! 🌟';
  display: block;
  font-family: 'Comic Neue', cursive;
  font-size: 2.5rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 
    3px 3px 0px #000,
    6px 6px 0px #ff69b4;
  animation: bounce 2s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.site-creative-header::after {
  content: '✨ Under Construction Since 1995! ✨';
  display: block;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 1.2rem;
  color: #ffff00;
  text-shadow: 2px 2px 0px #000;
  animation: blink 1s infinite;
}

/* 🚨 NAVIGATION FUNCTIONALITY PROTECTION 🚨
   DO NOT modify positioning, z-index, or layout properties of navigation.
   Stick to colors, fonts, and basic styling only! */

.site-main {
  padding: 2rem;
}

/* ===========================================
   🎨 PROFILE AREA - GEOCITIES INSPIRED
   =========================================== */

.profile-container {
  background: #ffffff;
  border: 5px solid #000;
  box-shadow: 10px 10px 0px #ff69b4;
  margin: 1rem;
  padding: 0;
}

/* Under construction banner style header */
.profile-header {
  background: linear-gradient(45deg, #ffff00, #ff8c00);
  border-bottom: 3px solid #000;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.profile-header::before {
  content: '🏠 Welcome to my homepage! 🏠';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff69b4;
  color: #ffffff;
  padding: 8px 24px;
  border: 3px ridge #ffffff;
  font-weight: bold;
  font-size: 11px;
  letter-spacing: 1px;
  animation: marqueeFlash 2s ease-in-out infinite;
  font-family: 'Trebuchet MS', sans-serif;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.7; }
}

@keyframes marqueeFlash {
  0%, 100% { 
    background: #ff69b4;
    transform: translateX(-50%) scale(1); 
  }
  50% { 
    background: #ff1493;
    transform: translateX(-50%) scale(1.05); 
  }
}

.profile-display-name {
  color: #8B0000;
  font-size: 2.5rem;
  font-weight: bold;
  text-shadow: 
    3px 3px 0px #fff,
    6px 6px 0px #000;
  transform: rotate(-2deg);
  display: inline-block;
  margin-bottom: 1rem;
  animation: wiggle 4s ease-in-out infinite;
}

@keyframes wiggle {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

.profile-bio {
  background: #ffffe0;
  border: 2px dashed #ff69b4;
  padding: 1rem;
  margin: 1rem 0;
  font-family: 'Comic Neue', cursive;
  font-size: 1.1rem;
  color: #000080;
  font-weight: bold;
  position: relative;
}

.profile-bio::before {
  content: '💭';
  position: absolute;
  top: -10px;
  left: -10px;
  background: #ff69b4;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 2px solid #000;
}

/* ===========================================
   📝 BLOG POSTS - CLASSIC WEB STYLE
   =========================================== */

.blog-post-card {
  background: linear-gradient(135deg, #f0f8ff, #e6e6fa);
  border: 3px solid #000;
  margin: 2rem 0;
  padding: 1.5rem;
  box-shadow: 8px 8px 0px #dda0dd;
  position: relative;
}

.blog-post-card::before {
  content: 'NEW POST!';
  position: absolute;
  top: -15px;
  right: 20px;
  background: #ff0000;
  color: #fff;
  padding: 5px 15px;
  border: 2px solid #000;
  font-weight: bold;
  font-size: 10px;
  transform: rotate(15deg);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: rotate(15deg) scale(1); }
  50% { transform: rotate(15deg) scale(1.1); }
}

.blog-post-header {
  border-bottom: 3px dotted #ff69b4;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.blog-post-content {
  font-family: 'Comic Neue', cursive;
  color: #000080;
  line-height: 1.6;
}

/* ===========================================
   👥 FRIENDS SECTION - WEBRINGS STYLE
   =========================================== */

.featured-friends {
  background: #98fb98;
  border: 3px solid #000;
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
}

.featured-friends::before {
  content: 'MY WEBRING';
  position: absolute;
  top: -15px;
  left: 20px;
  background: #9370db;
  color: #fff;
  padding: 5px 15px;
  border: 2px solid #000;
  font-weight: bold;
  font-size: 10px;
}

.friend-card {
  background: #ffb6c1;
  border: 2px solid #000;
  padding: 0.5rem;
  margin: 0.5rem;
  box-shadow: 4px 4px 0px #ff69b4;
  transition: all 0.2s ease;
}

.friend-card:hover {
  transform: rotate(-2deg);
  box-shadow: 6px 6px 0px #ff69b4;
}

/* ===========================================
   💌 GUESTBOOK - VINTAGE STYLE
   =========================================== */

.guestbook-section {
  background: #fffacd;
  border: 3px solid #000;
  padding: 2rem;
  margin: 2rem 0;
  position: relative;
}

.guestbook-section::before {
  content: 'SIGN MY GUESTBOOK!';
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff4500;
  color: #fff;
  padding: 8px 20px;
  border: 2px solid #000;
  font-weight: bold;
  font-size: 12px;
}

.guestbook-entry {
  background: #f0fff0;
  border: 2px dashed #32cd32;
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
}

.guestbook-entry::before {
  content: '💬';
  position: absolute;
  top: -8px;
  left: -8px;
  background: #32cd32;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #000;
}

/* ===========================================
   🎛️ INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: linear-gradient(135deg, #ff69b4, #ff1493);
  color: #fff;
  border: 3px solid #000;
  padding: 8px 16px;
  font-family: 'Comic Neue', cursive;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 4px 4px 0px #000;
  transition: all 0.2s ease;
}

.profile-button:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px #000;
  background: linear-gradient(135deg, #ff1493, #ff69b4);
}

.profile-tab-button {
  background: linear-gradient(135deg, #00ced1, #48d1cc);
  color: #000;
  border: 2px solid #000;
  padding: 6px 12px;
  margin: 2px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 10px;
  cursor: pointer;
  box-shadow: 2px 2px 0px #000;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: linear-gradient(135deg, #ffff00, #ffd700);
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px #000;
}

/* ===========================================
   📱 MOBILE RESPONSIVENESS (90s STYLE!)
   =========================================== */

@media (max-width: 768px) {
  .profile-display-name {
    font-size: 2rem;
  }
  
  .blog-post-card::before {
    right: 10px;
    font-size: 8px;
  }
}

/* ===========================================
   ✨ SPECIAL EFFECTS
   =========================================== */

/* Scrolling text effect */
@keyframes scroll {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.scrolling-text {
  animation: scroll 15s linear infinite;
  white-space: nowrap;
}

/* Rainbow text effect */
@keyframes rainbow {
  0% { color: #ff0000; }
  17% { color: #ff8800; }
  33% { color: #ffff00; }
  50% { color: #00ff00; }
  67% { color: #0088ff; }
  83% { color: #8800ff; }
  100% { color: #ff0088; }
}

.rainbow-text {
  animation: rainbow 2s linear infinite;
  font-weight: bold;
}

/* ===========================================
   🎉 CONGRATULATIONS! YOU'VE ACHIEVED PEAK 90s WEB DESIGN!
   =========================================== */`;