// Default CSS template with scaffolding for user customization
export const DEFAULT_CSS_TEMPLATE = `/* ===========================================
   🌟 CLASSIC 90s WEB DESIGN TEMPLATE
   =========================================== */

/* Relive the golden age of the internet with this nostalgic design
   inspired by the wild creativity of 1990s websites! */

@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Courier+New&display=swap');

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

/* Retro navigation bar */
.site-header {
  background: linear-gradient(90deg, #ff6b35, #f7931e, #ffd100);
  border: 3px solid #000;
  border-bottom: 5px solid #000;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.3);
  padding: 1rem 0;
}

.site-title {
  color: #000;
  font-weight: bold;
  font-size: 1.8rem;
  text-shadow: 2px 2px 0px #fff, 4px 4px 0px rgba(0,0,0,0.2);
  transform: rotate(-1deg);
  display: inline-block;
}

.site-tagline {
  color: #8B0000;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
}

.nav-link {
  background: linear-gradient(45deg, #ff1493, #8a2be2);
  color: white !important;
  padding: 8px 16px;
  border: 2px solid #000;
  margin: 0 5px;
  font-weight: bold;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 12px;
  box-shadow: 3px 3px 0px #000;
  transition: all 0.1s ease;
}

.nav-link:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px #000;
  background: linear-gradient(45deg, #8a2be2, #ff1493);
}

/* Funky footer */
.site-footer {
  background: linear-gradient(90deg, #32cd32, #00ced1);
  border: 3px solid #000;
  border-top: 5px solid #000;
  color: #000;
  font-weight: bold;
  text-align: center;
  padding: 1rem;
}

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
  content: '✨ WELCOME TO MY CYBERSPACE ✨';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff1493;
  color: #fff;
  padding: 5px 20px;
  border: 2px solid #000;
  font-weight: bold;
  font-size: 10px;
  letter-spacing: 1px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.7; }
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
  animation: wiggle 2s ease-in-out infinite;
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
  content: '🔗 MY WEBRING 🔗';
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
  content: '📖 SIGN MY GUESTBOOK! 📖';
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
   🎭 NAVIGATION TABS - WEB 1.0 STYLE
   =========================================== */

.profile-tabs {
  border: 3px solid #000;
  margin: 2rem 0;
  background: #dcdcdc;
}

.profile-tab-button {
  background: linear-gradient(45deg, #87ceeb, #4169e1);
  color: #fff !important;
  border: 2px solid #000;
  border-bottom: none;
  padding: 12px 20px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 11px;
  margin-right: 2px;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.3);
  transition: all 0.1s ease;
}

.profile-tab-button:hover {
  background: linear-gradient(45deg, #4169e1, #87ceeb);
  transform: translateY(-2px);
}

.profile-tab-button.active {
  background: #fff;
  color: #000 !important;
  box-shadow: inset 0 -5px 0 #fff;
  border-bottom: 3px solid #fff;
  margin-bottom: -3px;
}

.profile-tab-panel {
  background: #fff;
  border-top: 3px solid #000;
  padding: 2rem;
}

/* ===========================================
   🎪 INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: linear-gradient(45deg, #ff6347, #ff1493);
  color: #fff;
  border: 2px solid #000;
  padding: 10px 20px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 11px;
  box-shadow: 4px 4px 0px #000;
  transition: all 0.1s ease;
  cursor: pointer;
}

.profile-button:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px #000;
  background: linear-gradient(45deg, #ff1493, #ff6347);
}

.website-link {
  background: linear-gradient(45deg, #00ced1, #20b2aa);
  color: #fff !important;
  padding: 8px 16px;
  border: 2px solid #000;
  text-decoration: none;
  font-weight: bold;
  display: inline-block;
  margin: 5px;
  box-shadow: 3px 3px 0px #000;
  transition: all 0.1s ease;
  text-transform: uppercase;
  font-size: 10px;
}

.website-link:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px #000;
  background: linear-gradient(45deg, #20b2aa, #00ced1);
  color: #fff !important;
}

/* ===========================================
   📱 MOBILE RESPONSIVENESS (90s STYLE!)
   =========================================== */

@media (max-width: 768px) {
  .profile-display-name {
    font-size: 2rem;
  }
  
  .site-header {
    padding: 0.5rem 0;
  }
  
  .nav-link {
    display: block;
    margin: 2px 0;
    text-align: center;
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

export const MINIMAL_CSS_TEMPLATE = `/* ===========================================
   🏠 PERSONAL HOMEPAGE TEMPLATE
   =========================================== */

/* Simple but charming design inspired by early personal websites
   Perfect for your first homepage! */

@import url('https://fonts.googleapis.com/css2?family=Trebuchet+MS&family=Georgia:wght@400;700&display=swap');

/* ===========================================
   🌟 HOMEPAGE BASICS - SIMPLE & CLEAN
   =========================================== */

/* Classic web background */
.site-layout {
  background: #e0e0e0;
  background-image: 
    linear-gradient(45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(-45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d0d0d0 75%),
    linear-gradient(-45deg, transparent 75%, #d0d0d0 75%);
  background-size: 20px 20px;
  font-family: 'Trebuchet MS', sans-serif;
}

/* Simple navigation */
.site-header {
  background: #4a4a4a;
  border-bottom: 4px solid #333;
  padding: 1rem 0;
}

.site-title {
  color: #fff;
  font-family: 'Georgia', serif;
  font-size: 1.5rem;
  font-weight: bold;
}

.site-tagline {
  color: #ccc;
  font-size: 12px;
}

.nav-link {
  color: #fff !important;
  background: #666;
  padding: 6px 12px;
  border: 1px solid #888;
  margin: 0 2px;
  text-decoration: none;
  font-size: 12px;
}

.nav-link:hover {
  background: #888;
  color: #fff !important;
}

/* Simple footer */
.site-footer {
  background: #4a4a4a;
  border-top: 2px solid #333;
  color: #ccc;
  text-align: center;
  padding: 1rem;
  font-size: 11px;
}

.site-main {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

/* ===========================================
   📄 PERSONAL HOMEPAGE STYLE
   =========================================== */

.profile-container {
  background: #fff;
  border: 2px solid #666;
  box-shadow: 4px 4px 8px rgba(0,0,0,0.2);
  padding: 0;
  margin: 1rem 0;
}

/* Welcome banner */
.profile-header {
  background: linear-gradient(135deg, #87CEEB, #4682B4);
  border-bottom: 2px solid #333;
  padding: 2rem;
  text-align: center;
  position: relative;
}

.profile-header::before {
  content: '🏠 Welcome to My Homepage 🏠';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #FFD700;
  color: #000;
  padding: 4px 12px;
  border: 1px solid #000;
  font-size: 11px;
  font-weight: bold;
}

.profile-display-name {
  color: #000080;
  font-family: 'Georgia', serif;
  font-size: 2.2rem;
  font-weight: bold;
  margin: 1rem 0 0.5rem 0;
  text-shadow: 1px 1px 0px #fff;
}

.profile-bio {
  background: #FFFACD;
  border: 1px dashed #DDA0DD;
  padding: 1rem;
  margin: 1rem auto;
  max-width: 500px;
  font-style: italic;
  color: #333;
  text-align: center;
}

/* ===========================================
   📝 SIMPLE BLOG POSTS
   =========================================== */

.blog-post-card {
  background: #f9f9f9;
  border: 1px solid #ccc;
  margin: 1.5rem 0;
  padding: 1.5rem;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.blog-post-header {
  border-bottom: 1px solid #ddd;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.blog-post-date {
  color: #666;
  font-size: 11px;
  text-transform: uppercase;
}

.blog-post-content {
  color: #333;
  line-height: 1.6;
  font-family: 'Georgia', serif;
}

/* ===========================================
   👥 FRIENDS & LINKS
   =========================================== */

.featured-friends {
  background: #F0F8FF;
  border: 2px solid #4682B4;
  padding: 1rem;
  margin: 1rem 0;
}

.featured-friends h4 {
  color: #000080;
  font-family: 'Georgia', serif;
  font-size: 1.2rem;
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 1px solid #4682B4;
  padding-bottom: 0.5rem;
}

.friend-card {
  background: #fff;
  border: 1px solid #ccc;
  padding: 0.75rem;
  margin: 0.5rem;
  font-size: 13px;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

.friend-card:hover {
  border-color: #4682B4;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.website-link {
  background: #E6E6FA;
  color: #000080 !important;
  padding: 4px 8px;
  border: 1px solid #9370DB;
  text-decoration: underline;
  font-size: 12px;
  margin: 2px;
  display: inline-block;
}

.website-link:hover {
  background: #9370DB;
  color: #fff !important;
  text-decoration: none;
}

/* ===========================================
   💌 GUESTBOOK SECTION
   =========================================== */

.guestbook-section {
  background: #FFF8DC;
  border: 2px solid #DAA520;
  padding: 1.5rem;
  margin: 2rem 0;
}

.guestbook-section h3 {
  color: #8B4513;
  font-family: 'Georgia', serif;
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.guestbook-entry {
  background: #fff;
  border: 1px solid #DDD;
  padding: 1rem;
  margin: 1rem 0;
  border-left: 4px solid #DAA520;
}

/* ===========================================
   🎭 SIMPLE TABS
   =========================================== */

.profile-tabs {
  border: 2px solid #666;
  margin: 1rem 0;
  background: #f0f0f0;
}

.profile-tab-button {
  background: #ddd;
  color: #333;
  border: 1px solid #999;
  border-bottom: none;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: bold;
  margin-right: 1px;
}

.profile-tab-button:hover {
  background: #ccc;
}

.profile-tab-button.active {
  background: #fff;
  color: #000;
  border-bottom: 1px solid #fff;
}

.profile-tab-panel {
  background: #fff;
  border-top: 2px solid #666;
  padding: 1.5rem;
}

/* ===========================================
   🎪 SIMPLE INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: #4682B4;
  color: #fff;
  border: 1px solid #333;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

.profile-button:hover {
  background: #5a9fd4;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

/* ===========================================
   📱 MOBILE FRIENDLY
   =========================================== */

@media (max-width: 768px) {
  .site-main {
    padding: 1rem;
  }
  
  .profile-display-name {
    font-size: 1.8rem;
  }
  
  .nav-link {
    display: block;
    margin: 1px 0;
    text-align: center;
  }
}

/* ===========================================
   ✨ FINISHING TOUCHES
   =========================================== */

/* Subtle hover effects */
.profile-container:hover {
  box-shadow: 6px 6px 12px rgba(0,0,0,0.25);
}

/* Simple fade-in animation */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.profile-container {
  animation: fadeIn 0.8s ease-in;
}

/* ===========================================
   🎉 YOUR PERSONAL HOMEPAGE IS READY!
   =========================================== */`;

export const ADVANCED_LAYOUT_TEMPLATE = `/* ===========================================
   🚀 WEB 2.0 SOCIAL NETWORK THEME
   =========================================== */

/* Relive the golden age of social media with this MySpace/Friendster
   inspired design featuring glossy buttons, reflections, and Web 2.0 magic! */

@import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&family=Verdana:wght@400;700&display=swap');

/* ===========================================
   🌈 WEB 2.0 MAGIC - GLOSSY EVERYTHING
   =========================================== */

/* Web 2.0 gradient paradise */
.site-layout {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
  font-family: 'Arial', sans-serif;
  position: relative;
}

/* Glassy Web 2.0 navigation */
.site-header {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.9) 0%, 
    rgba(255,255,255,0.7) 50%, 
    rgba(255,255,255,0.9) 100%);
  backdrop-filter: blur(15px);
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.3);
  box-shadow: 
    0 8px 32px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8);
  padding: 1.5rem 0;
  position: relative;
}

.site-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(102,126,234,0.5), 
    rgba(118,75,162,0.5), 
    transparent);
}

.site-title {
  color: #333;
  font-size: 2rem;
  font-weight: bold;
  text-shadow: 
    0 1px 0 rgba(255,255,255,0.8),
    0 2px 4px rgba(0,0,0,0.1);
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.site-tagline {
  color: #666;
  font-size: 12px;
  text-shadow: 0 1px 0 rgba(255,255,255,0.8);
}

.nav-link {
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.8) 0%, 
    rgba(118,75,162,0.8) 100%);
  color: #fff !important;
  padding: 8px 20px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  margin: 0 4px;
  font-size: 13px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.3),
    inset 0 -1px 0 rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255,255,255,0.4), 
    transparent);
  transition: left 0.5s ease;
}

.nav-link:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.4),
    inset 0 -1px 0 rgba(0,0,0,0.1);
  color: #fff !important;
}

.nav-link:hover::before {
  left: 100%;
}

/* Glossy footer */
.site-footer {
  background: linear-gradient(135deg, 
    rgba(0,0,0,0.8) 0%, 
    rgba(0,0,0,0.9) 100%);
  border-top: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}

/* Main content with subtle shadow */
.site-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Profile container with Web 2.0 styling */
.profile-container {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.95) 0%, 
    rgba(255,255,255,0.85) 50%, 
    rgba(255,255,255,0.95) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 15px;
  box-shadow: 
    0 20px 60px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8),
    inset 0 -1px 0 rgba(0,0,0,0.05);
  margin: 2rem 0;
  overflow: hidden;
  position: relative;
}

/* Web 2.0 Social Profile Header */
.profile-header {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.9) 0%, 
    rgba(240,240,240,0.9) 100%);
  backdrop-filter: blur(20px);
  border: none;
  border-radius: 15px 15px 0 0;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  padding: 3rem 2rem;
  position: relative;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}

.profile-display-name {
  color: #333;
  font-size: 2.8rem;
  font-weight: bold;
  text-shadow: 
    0 1px 0 rgba(255,255,255,0.8),
    0 3px 8px rgba(0,0,0,0.1);
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
}

.profile-bio {
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(102,126,234,0.3);
  border-radius: 10px;
  padding: 1.5rem;
  margin: 1rem 0;
  color: #555;
  font-size: 1.1rem;
  line-height: 1.6;
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.05),
    inset 0 1px 0 rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
}

/* ===========================================
   🎭 WEB 2.0 TABS INTERFACE
   =========================================== */

.profile-tabs {
  background: rgba(255,255,255,0.6);
  border-radius: 15px;
  padding: 0.5rem;
  margin: 2rem 0;
  backdrop-filter: blur(15px);
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

.profile-tab-button {
  background: transparent;
  color: #666 !important;
  border: none;
  padding: 12px 24px;
  font-weight: bold;
  border-radius: 10px;
  margin: 0 2px;
  transition: all 0.3s ease;
  font-size: 13px;
  position: relative;
  overflow: hidden;
}

.profile-tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.3), 
    rgba(118,75,162,0.3));
  transition: left 0.3s ease;
}

.profile-tab-button:hover {
  color: #333 !important;
  transform: translateY(-1px);
}

.profile-tab-button:hover::before {
  left: 0;
}

.profile-tab-button.active {
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.8), 
    rgba(118,75,162,0.8));
  color: #fff !important;
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.3);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.profile-tab-panel {
  background: rgba(255,255,255,0.9);
  border-radius: 15px;
  padding: 2rem;
  backdrop-filter: blur(20px);
  box-shadow: 
    0 10px 40px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

/* ===========================================
   📝 GLOSSY BLOG POSTS - MYSPACE STYLE
   =========================================== */

.blog-post-card {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.9) 0%, 
    rgba(240,240,240,0.9) 100%);
  border: 1px solid rgba(102,126,234,0.2);
  border-radius: 15px;
  padding: 2rem;
  margin: 2rem 0;
  backdrop-filter: blur(15px);
  box-shadow: 
    0 15px 35px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8),
    inset 0 -1px 0 rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.blog-post-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.blog-post-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    0 20px 50px rgba(0,0,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

.blog-post-header {
  border-bottom: 1px solid rgba(0,0,0,0.1);
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.blog-post-date {
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 1px;
}

.blog-post-content {
  color: #444;
  line-height: 1.7;
  font-size: 14px;
}

/* ===========================================
   👥 SOCIAL NETWORK FRIENDS - WEB 2.0 CARDS
   =========================================== */

.featured-friends {
  background: rgba(255,255,255,0.8);
  border: 1px solid rgba(102,126,234,0.2);
  border-radius: 15px;
  padding: 1.5rem;
  margin: 1rem 0;
  backdrop-filter: blur(15px);
  box-shadow: 
    0 10px 30px rgba(0,0,0,0.08),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

.friend-card {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.9), 
    rgba(248,248,248,0.9));
  border: 1px solid rgba(102,126,234,0.2);
  border-radius: 12px;
  padding: 1rem;
  margin: 0.5rem;
  box-shadow: 
    0 6px 20px rgba(0,0,0,0.08),
    inset 0 1px 0 rgba(255,255,255,0.6);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.friend-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(102,126,234,0.1), 
    transparent);
  transition: left 0.5s ease;
}

.friend-card:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 
    0 12px 35px rgba(0,0,0,0.12),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

.friend-card:hover::before {
  left: 100%;
}

.website-link {
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.8), 
    rgba(118,75,162,0.8));
  color: #fff !important;
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  text-decoration: none;
  font-size: 12px;
  font-weight: bold;
  display: inline-block;
  margin: 4px;
  box-shadow: 
    0 4px 12px rgba(0,0,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.3);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.website-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.2);
  transition: left 0.4s ease;
}

.website-link:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 20px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.4);
  color: #fff !important;
}

.website-link:hover::before {
  left: 100%;
}

/* ===========================================
   💌 WEB 2.0 GUESTBOOK - TESTIMONIALS STYLE
   =========================================== */

.guestbook-section {
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(102,126,234,0.2);
  border-radius: 15px;
  padding: 2rem;
  margin: 2rem 0;
  backdrop-filter: blur(20px);
  box-shadow: 
    0 15px 40px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8);
  position: relative;
}

.guestbook-entry {
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(102,126,234,0.15);
  border-left: 4px solid rgba(102,126,234,0.6);
  border-radius: 10px;
  padding: 1.5rem;
  margin: 1rem 0;
  backdrop-filter: blur(10px);
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.05),
    inset 0 1px 0 rgba(255,255,255,0.6);
  transition: all 0.3s ease;
}

.guestbook-entry:hover {
  border-left-color: rgba(118,75,162,0.8);
  transform: translateX(5px);
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.08),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

/* ===========================================
   🎪 INTERACTIVE BUTTONS - WEB 2.0 GLOSSY
   =========================================== */

.profile-button {
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.8), 
    rgba(118,75,162,0.8));
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  padding: 10px 20px;
  font-weight: bold;
  font-size: 13px;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.3),
    inset 0 -1px 0 rgba(0,0,0,0.1);
  transition: all 0.3s ease;
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
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255,255,255,0.4), 
    transparent);
  transition: left 0.5s ease;
}

.profile-button:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.4),
    inset 0 -1px 0 rgba(0,0,0,0.1);
}

.profile-button:hover::before {
  left: 100%;
}

/* ===========================================
   📱 MOBILE WEB 2.0 RESPONSIVE
   =========================================== */

@media (max-width: 768px) {
  .profile-display-name {
    font-size: 2.2rem;
  }
  
  .site-main {
    padding: 1rem;
  }
  
  .nav-link {
    display: block;
    margin: 3px 0;
    text-align: center;
  }
  
  .profile-tabs {
    padding: 0.5rem;
  }
  
  .profile-tab-button {
    display: block;
    margin: 2px 0;
    text-align: center;
  }
}

/* ===========================================
   ✨ WEB 2.0 SPECIAL EFFECTS
   =========================================== */

/* Subtle shine animation */
@keyframes shine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.profile-container:hover {
  animation: none;
}

.profile-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(102,126,234,0.8), 
    transparent);
  animation: shine 3s ease-in-out infinite;
}

/* Floating animation for elements */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.friend-card:nth-child(odd) {
  animation: float 6s ease-in-out infinite;
}

.friend-card:nth-child(even) {
  animation: float 6s ease-in-out infinite reverse;
}

/* ===========================================
   🎉 WELCOME TO WEB 2.0 SOCIAL NETWORKING!
   =========================================== */`;

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

/* Terminal-style navigation */
.site-header {
  background: #1a1a1a;
  border: none;
  border-bottom: 2px solid #00ff00;
  padding: 15px 0;
}

.site-title {
  color: #ffff00;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: blink 1s infinite;
}

.site-tagline {
  color: #00ffff;
  font-size: 10px;
}

.nav-link {
  background: #2a2a2a;
  color: #00ff00 !important;
  padding: 8px 15px;
  border: 1px solid #00ff00;
  margin: 0 5px;
  transition: all 0.1s ease;
  text-transform: uppercase;
  font-size: 10px;
}

.nav-link:hover {
  background: #00ff00;
  color: #000 !important;
}

/* Footer terminal style */
.site-footer {
  background: #1a1a1a;
  border-top: 2px solid #00ff00;
  color: #00ff00;
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
  color: #00ff00;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  line-height: 1.6;
  image-rendering: pixelated;
  min-height: 100vh;
}

/* Scanlines effect */
.profile-container::before {
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
    rgba(0, 255, 0, 0.03) 2px,
    rgba(0, 255, 0, 0.03) 4px
  );
  pointer-events: none;
  z-index: 1000;
}

/* Terminal-style header */
.profile-header {
  background: #1a1a1a;
  border: 2px solid #00ff00;
  border-radius: 0;
  padding: 20px;
  margin: 20px;
  position: relative;
}

.profile-header::before {
  content: '> LOADING USER PROFILE...';
  position: absolute;
  top: -25px;
  left: 10px;
  background: #1a1a1a;
  color: #00ff00;
  padding: 0 10px;
  font-size: 10px;
}

/* 8-bit style display name */
.profile-display-name {
  color: #ffff00;
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: blink 1s infinite;
  font-size: 16px;
  margin-bottom: 10px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

/* Console-style bio */
.profile-bio {
  color: #00ffff;
  border-left: 3px solid #00ff00;
  padding-left: 15px;
  margin: 15px 0;
  background: rgba(0, 255, 0, 0.05);
}

/* Pixelated blog posts */
.blog-post-card {
  background: #2a2a2a;
  border: 2px solid #00ff00;
  border-radius: 0;
  padding: 15px;
  margin: 15px 0;
  position: relative;
  box-shadow: 
    inset 0 0 0 1px #004400,
    0 0 0 2px #002200;
}

.blog-post-card::before {
  content: '[POST #' attr(data-post-id, '001') ']';
  position: absolute;
  top: -12px;
  left: 10px;
  background: #2a2a2a;
  color: #00ff00;
  padding: 0 5px;
  font-size: 10px;
}

/* Game-style buttons */
.profile-button,
.thread-button {
  background: #ff0080;
  color: white;
  border: 2px solid #ff00ff;
  border-radius: 0;
  padding: 10px 15px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s ease;
  box-shadow: 
    0 4px 0 #cc0066,
    0 6px 8px rgba(0, 0, 0, 0.3);
}

.profile-button:hover,
.thread-button:hover {
  transform: translateY(2px);
  box-shadow: 
    0 2px 0 #cc0066,
    0 4px 6px rgba(0, 0, 0, 0.3);
}

.profile-button:active,
.thread-button:active {
  transform: translateY(4px);
  box-shadow: none;
}

/* Friend cards as character sprites */
.friend-card {
  background: #333;
  border: 2px solid #00ffff;
  border-radius: 0;
  padding: 10px;
  margin: 5px;
  display: inline-block;
  position: relative;
  transform: none;
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
  .profile-container {
    font-size: 10px;
  }
  
  .profile-display-name {
    font-size: 14px;
  }
}

`;

export const NEWSPAPER_TEMPLATE = `/* ===========================================
   📰 EARLY WEB NEWSPAPER EDITION 
   =========================================== */

/* Classic early internet newspaper with that authentic 1990s charm
   Complete with web rings, banner ads, and visitor counters! */

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

/* Authentic early web masthead */
.site-header {
  background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%);
  border: 4px double #000;
  border-bottom: 6px double #000;
  border-top: 6px double #000;
  padding: 2rem 0;
  text-align: center;
  position: relative;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.site-header::before {
  content: '🗞️ THE EARLY WEB GAZETTE 🗞️';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  font-size: 28px;
  letter-spacing: 4px;
  color: #000;
  text-shadow: 2px 2px 0px #ccc;
}

.site-header::after {
  content: '"All The Web That\\'s Fit To Print" • Est. 1995 • Volume XXIX No. 42';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-style: italic;
  font-size: 11px;
  color: #666;
  border: 1px solid #000;
  padding: 2px 8px;
  background: #fff;
}

.site-title {
  color: #000;
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  font-size: 2.2rem;
  border-bottom: 3px solid #000;
  display: inline-block;
  padding-bottom: 0.5rem;
  margin-top: 1.5rem;
  text-shadow: 1px 1px 0px #ccc;
}

.site-tagline {
  font-style: italic;
  font-size: 13px;
  margin-top: 0.5rem;
  color: #444;
}

.nav-link {
  background: linear-gradient(135deg, #e0e0e0, #f0f0f0);
  color: #000 !important;
  text-decoration: none;
  font-weight: bold;
  padding: 6px 12px;
  margin: 0 3px;
  border: 2px outset #e0e0e0;
  font-size: 11px;
  text-transform: uppercase;
  transition: all 0.1s ease;
  font-family: 'Times New Roman', serif;
}

.nav-link:hover {
  background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
  border: 2px inset #e0e0e0;
  color: #000 !important;
}

/* Classic early web footer */
.site-footer {
  background: linear-gradient(180deg, #f0f0f0, #e0e0e0);
  border-top: 4px double #000;
  color: #000;
  font-family: 'Times New Roman', serif;
  text-align: center;
  padding: 1rem;
  position: relative;
}

.site-footer::before {
  content: '📊 You are visitor #1,337,420 📊 • Last updated: Today';
  display: block;
  font-size: 10px;
  color: #666;
  margin-bottom: 5px;
  font-family: 'Courier New', monospace;
}

/* Main content in newspaper columns - centered layout */
.site-main {
  padding: 1rem 2rem;
  background: #ffffff;
  margin: 0 auto;
  max-width: 1000px;
  border-left: 3px solid #000;
  border-right: 3px solid #000;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
}

/* ===========================================
   📄 EARLY WEB PERSONAL PAGE SECTION
   =========================================== */

.profile-container {
  background: transparent;
  font-family: 'Times New Roman', serif;
  line-height: 1.5;
  color: #1a1a1a;
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

/* Classic early web "personal page" header */
.profile-header {
  background: linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%);
  border: 4px double #000;
  padding: 2rem;
  margin: 1rem;
  text-align: center;
  position: relative;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}

.profile-header::before {
  content: '🏠 PERSONAL HOME PAGE 🏠';
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  padding: 5px 20px;
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  font-size: 14px;
  letter-spacing: 2px;
  border: 2px solid #000;
  color: #000;
}

.profile-header::after {
  content: '✨ "Welcome to my corner of the World Wide Web!" ✨';
  position: absolute;
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffff99;
  padding: 4px 16px;
  font-size: 11px;
  font-style: italic;
  border: 1px solid #000;
  color: #000;
}

/* Early web headline style */
.profile-display-name {
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  font-size: 3.2rem;
  color: #000;
  text-align: center;
  border-bottom: 4px solid #000;
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
  letter-spacing: 3px;
  text-shadow: 3px 3px 0px #ccc;
  position: relative;
}

.profile-display-name::before {
  content: '★';
  position: absolute;
  left: -30px;
  color: #ff0000;
  animation: starTwinkle 2s infinite;
}

.profile-display-name::after {
  content: '★';
  position: absolute;
  right: -30px;
  color: #ff0000;
  animation: starTwinkle 2s infinite reverse;
}

@keyframes starTwinkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
}

/* Classic web bio section */
.profile-bio {
  background: #ffffcc;
  border: 2px dashed #000;
  font-style: italic;
  text-align: center;
  font-size: 1.1rem;
  margin: 1.5rem auto;
  padding: 1rem;
  max-width: 600px;
  position: relative;
}

.profile-bio::before {
  content: '💭 About Me 💭';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffcc;
  padding: 2px 12px;
  font-weight: bold;
  font-size: 12px;
  border: 1px solid #000;
}

/* ===========================================
   📰 EARLY WEB ARTICLE COLUMNS
   =========================================== */

/* Classic newspaper-style layout */
.profile-content {
  column-count: 2;
  column-gap: 2rem;
  column-rule: 3px double #000;
  margin: 1rem auto;
  max-width: 800px;
  background: #ffffff;
  padding: 1.5rem;
  border: 3px solid #000;
  box-shadow: 3px 3px 8px rgba(0,0,0,0.2);
}

/* Early web "breaking news" style posts */
.blog-post-card {
  background: linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%);
  border: 3px solid #000;
  padding: 1.5rem;
  margin: 1.5rem 0;
  break-inside: avoid;
  page-break-inside: avoid;
  position: relative;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.blog-post-card::before {
  content: '🔥 HOT OFF THE PRESS! 🔥';
  position: absolute;
  top: -15px;
  left: 20px;
  background: #ff0000;
  color: #ffffff;
  padding: 6px 16px;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1px;
  border: 2px solid #000;
  animation: flashNews 2s infinite;
  font-family: 'Playfair Display', serif;
  text-shadow: 1px 1px 0px #000;
}

@keyframes flashNews {
  0%, 50% { background: #ff0000; }
  51%, 100% { background: #cc0000; }
}

.blog-post-card::after {
  content: '📰';
  position: absolute;
  top: -8px;
  right: 15px;
  font-size: 20px;
  background: #ffffff;
  border: 2px solid #000;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Classic newspaper headers */
.blog-post-card h1,
.blog-post-card h2,
.blog-post-card h3 {
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  border-bottom: 2px solid #000;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Traditional newspaper paragraphs */
.blog-post-card p {
  text-align: justify;
  text-indent: 1.5rem;
  margin-bottom: 1rem;
  font-family: 'Times New Roman', serif;
  color: #1a1a1a;
}

/* Classic drop cap styling */
.blog-post-card p:first-of-type::first-letter {
  float: left;
  font-size: 4.5rem;
  line-height: 3.5rem;
  padding-right: 12px;
  padding-top: 8px;
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  color: #000;
  border: 2px solid #000;
  background: #f0f0f0;
  text-align: center;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===========================================
   📋 EARLY WEB CLASSIFIEDS - FRIENDS SECTION
   =========================================== */

.featured-friends {
  background: linear-gradient(135deg, #ffffcc 0%, #ffffe0 100%);
  border: 3px dashed #000;
  padding: 1.5rem;
  margin: 2rem auto;
  max-width: 800px;
  position: relative;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}

.featured-friends::before {
  content: '🤝 MY COOL WEB FRIENDS 🤝';
  display: block;
  text-align: center;
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  font-size: 1.3rem;
  border: 2px solid #000;
  background: #ffffff;
  padding: 8px 20px;
  margin: -30px auto 20px auto;
  color: #000;
  text-shadow: 1px 1px 0px #ccc;
  width: fit-content;
}

.featured-friends::after {
  content: 'Check out these awesome sites! Link exchange available!';
  display: block;
  text-align: center;
  font-size: 11px;
  font-style: italic;
  margin-top: 10px;
  color: #666;
}

.friend-card {
  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
  border: 2px outset #e0e0e0;
  padding: 8px;
  margin: 6px;
  display: inline-block;
  width: calc(50% - 20px);
  vertical-align: top;
  font-size: 12px;
  position: relative;
  font-family: 'Times New Roman', serif;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
}

.friend-card::before {
  content: '👤';
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ffff99;
  border: 1px solid #000;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.friend-card:hover {
  border: 2px inset #e0e0e0;
  background: linear-gradient(135deg, #f0f0f0 0%, #ffffff 100%);
}

/* ===========================================
   🔗 EARLY WEB LINKS - WEBSITE DIRECTORY
   =========================================== */

.website-link {
  background: linear-gradient(135deg, #e0e0ff 0%, #f0f0ff 100%);
  color: #0000ee !important;
  text-decoration: underline;
  font-weight: bold;
  padding: 4px 8px;
  margin: 3px;
  border: 1px outset #e0e0e0;
  font-size: 12px;
  font-family: 'Times New Roman', serif;
  display: inline-block;
  transition: all 0.1s ease;
}

.website-link:hover {
  background: linear-gradient(135deg, #ffff99 0%, #ffffcc 100%);
  border: 1px inset #e0e0e0;
  color: #800080 !important;
  text-decoration: none;
}

.website-link::before {
  content: '🌐 ';
  color: #008000;
}

/* ===========================================
   💌 EARLY WEB GUESTBOOK - VISITOR MESSAGES
   =========================================== */

.guestbook-section {
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
  border: 4px double #000;
  padding: 2rem;
  margin: 2rem auto;
  max-width: 800px;
  position: relative;
  box-shadow: 3px 3px 8px rgba(0,0,0,0.2);
}

.guestbook-section::before {
  content: '📖 PLEASE SIGN MY GUESTBOOK! 📖';
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%);
  color: #ffffff;
  padding: 8px 20px;
  font-family: 'Playfair Display', serif;
  font-weight: bold;
  font-size: 14px;
  border: 2px solid #000;
  text-shadow: 1px 1px 0px #000;
  animation: guestbookBlink 3s infinite;
}

@keyframes guestbookBlink {
  0%, 90% { opacity: 1; }
  95% { opacity: 0.7; }
  100% { opacity: 1; }
}

.guestbook-section::after {
  content: 'Thank you for visiting my homepage! Come back soon! 😊';
  display: block;
  text-align: center;
  font-style: italic;
  font-size: 12px;
  margin-top: 15px;
  color: #666;
  border-top: 1px dotted #000;
  padding-top: 10px;
}

.guestbook-entry {
  background: linear-gradient(135deg, #ffffff 0%, #fffffe 100%);
  border: 2px inset #e0e0e0;
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
  font-style: italic;
  font-family: 'Times New Roman', serif;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.1);
}

.guestbook-entry::before {
  content: '"';
  font-size: 4rem;
  position: absolute;
  top: -20px;
  left: 5px;
  color: #ddd;
  font-family: 'Playfair Display', serif;
}

.guestbook-entry::after {
  content: '"';
  font-size: 4rem;
  position: absolute;
  bottom: -40px;
  right: 5px;
  color: #ddd;
  font-family: 'Playfair Display', serif;
}

/* ===========================================
   🎭 EARLY WEB TABS - CONTENT SECTIONS
   =========================================== */

.profile-tabs {
  border: 3px solid #000;
  margin: 2rem auto;
  max-width: 800px;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}

.profile-tab-button {
  background: linear-gradient(135deg, #e0e0e0 0%, #f0f0f0 100%);
  color: #000 !important;
  border: 2px outset #e0e0e0;
  border-bottom: none;
  padding: 10px 16px;
  font-family: 'Times New Roman', serif;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  margin-right: 2px;
  transition: all 0.1s ease;
}

.profile-tab-button:hover {
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  border: 2px inset #e0e0e0;
}

.profile-tab-button.active {
  background: #ffffff;
  color: #000 !important;
  border: 2px inset #ffffff;
  border-bottom: 2px solid #ffffff;
  margin-bottom: -2px;
}

.profile-tab-panel {
  background: #ffffff;
  border-top: 3px solid #000;
  padding: 2rem;
  font-family: 'Times New Roman', serif;
}

/* ===========================================
   🎪 EARLY WEB BUTTONS - INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: linear-gradient(135deg, #e0e0e0 0%, #f0f0f0 100%);
  color: #000;
  border: 2px outset #e0e0e0;
  padding: 8px 16px;
  font-family: 'Times New Roman', serif;
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.1s ease;
  text-transform: uppercase;
}

.profile-button:hover {
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  border: 2px inset #e0e0e0;
}

.profile-button:active {
  background: #d0d0d0;
  border: 2px inset #d0d0d0;
}

/* ===========================================
   📱 MOBILE FRIENDLY EARLY WEB
   =========================================== */

@media (max-width: 768px) {
  .site-header::before {
    font-size: 18px;
    letter-spacing: 1px;
  }
  
  .site-header::after {
    font-size: 9px;
    padding: 1px 4px;
  }
  
  .profile-content {
    column-count: 1;
    column-gap: 0;
    column-rule: none;
    margin: 0.5rem;
    padding: 1rem;
  }
  
  .profile-display-name {
    font-size: 2.2rem;
    letter-spacing: 1px;
  }
  
  .profile-display-name::before,
  .profile-display-name::after {
    display: none; /* Hide stars on mobile */
  }
  
  .friend-card {
    width: calc(100% - 20px);
    margin: 8px 0;
  }
  
  .site-main {
    margin: 0 auto;
    max-width: 95%;
    padding: 1rem;
  }
  
  .nav-link {
    display: block;
    margin: 2px 0;
    text-align: center;
    font-size: 10px;
  }
  
  .guestbook-section::before {
    font-size: 12px;
    padding: 6px 12px;
  }
  
  .blog-post-card::before {
    font-size: 9px;
    padding: 4px 12px;
  }
}

/* ===========================================
   ✨ EARLY WEB SPECIAL EFFECTS & FLOURISHES
   =========================================== */

/* Add some nostalgic "under construction" flair */
@keyframes construction {
  0% { transform: translateX(-20px); }
  50% { transform: translateX(20px); }
  100% { transform: translateX(-20px); }
}

.under-construction {
  animation: construction 3s ease-in-out infinite;
  background: linear-gradient(45deg, #ffff00, #ff8000);
  color: #000;
  font-weight: bold;
  padding: 4px 8px;
  border: 1px solid #000;
  font-size: 10px;
  text-transform: uppercase;
}

/* Classic "new" badge effect */
@keyframes newBadge {
  0%, 100% { transform: rotate(-5deg) scale(1); }
  50% { transform: rotate(5deg) scale(1.1); }
}

.new-badge {
  animation: newBadge 2s ease-in-out infinite;
  background: #ff0000;
  color: #ffffff;
  font-weight: bold;
  padding: 2px 6px;
  font-size: 8px;
  text-transform: uppercase;
  border: 1px solid #000;
  text-shadow: 1px 1px 0px #000;
}

/* Retro loading animation */
@keyframes loading {
  0% { content: 'Loading'; }
  25% { content: 'Loading.'; }
  50% { content: 'Loading..'; }
  75% { content: 'Loading...'; }
  100% { content: 'Loading'; }
}

.loading::after {
  animation: loading 2s infinite;
}

/* ===========================================
   🎉 WELCOME TO THE EARLY WEB EXPERIENCE!
   Your newspaper template is ready to transport 
   visitors back to the golden age of the internet!
   =========================================== */`;

export const DARK_THEME_TEMPLATE = `/* ===========================================
   🖥️ HACKER TERMINAL THEME
   =========================================== */

/* Enter the Matrix with this authentic hacker aesthetic
   Inspired by 90s cyberpunk and terminal culture */

@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

/* ===========================================
   💚 MATRIX CODE RAIN - FULL IMMERSION
   =========================================== */

/* Authentic terminal background */
.site-layout {
  background: #000000;
  color: #00ff41;
  font-family: 'Source Code Pro', monospace;
  font-size: 13px;
  line-height: 1.4;
  position: relative;
  overflow: hidden;
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
  z-index: 1000;
}

/* ===========================================
   🔐 HACKER NAVIGATION - SYSTEM ACCESS
   =========================================== */

.site-header {
  background: rgba(0, 20, 0, 0.95);
  border: none;
  border-top: 2px solid #00ff41;
  border-bottom: 2px solid #00ff41;
  padding: 1rem 0;
  backdrop-filter: blur(5px);
  position: relative;
}

.site-header::before {
  content: '[SYSTEM_ONLINE] - UNAUTHORIZED ACCESS DETECTED';
  position: absolute;
  top: -15px;
  left: 20px;
  background: #ff0000;
  color: #000;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: bold;
  animation: hackAlert 2s infinite;
}

@keyframes hackAlert {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.site-title {
  color: #00ff41;
  font-family: 'Orbitron', monospace;
  font-size: 1.8rem;
  font-weight: 900;
  text-shadow: 
    0 0 5px #00ff41,
    0 0 10px #00ff41,
    0 0 15px #00ff41;
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: terminalGlow 3s ease-in-out infinite alternate;
}

@keyframes terminalGlow {
  from { text-shadow: 0 0 5px #00ff41, 0 0 10px #00ff41, 0 0 15px #00ff41; }
  to { text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41; }
}

.site-tagline {
  color: #008f11;
  font-family: 'Source Code Pro', monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 1px;
}

.nav-link {
  background: transparent;
  color: #00ff41 !important;
  padding: 8px 16px;
  border: 1px solid #00ff41;
  margin: 0 4px;
  font-family: 'Source Code Pro', monospace;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: bold;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,255,65,0.2), transparent);
  transition: left 0.5s ease;
}

.nav-link:hover {
  background: rgba(0,255,65,0.1);
  color: #ffffff !important;
  box-shadow: 
    0 0 10px #00ff41,
    inset 0 0 10px rgba(0,255,65,0.2);
  text-shadow: 0 0 5px #00ff41;
}

.nav-link:hover::before {
  left: 100%;
}

/* Terminal footer */
.site-footer {
  background: rgba(0, 20, 0, 0.95);
  border-top: 2px solid #00ff41;
  color: #00ff41;
  font-family: 'Source Code Pro', monospace;
  text-align: center;
  padding: 1rem;
  font-size: 11px;
  position: relative;
}

.site-footer::before {
  content: '[SYSTEM_STATUS] ONLINE | [SECURITY_LEVEL] MAXIMUM | [UPTIME] 31337 DAYS';
  display: block;
  color: #008f11;
  font-size: 9px;
  margin-bottom: 5px;
}

.site-main {
  padding: 2rem;
  position: relative;
  z-index: 10;
}

/* ===========================================
   💀 CYBERPUNK PROFILE - HACKER DOSSIER
   =========================================== */

.profile-container {
  background: rgba(0, 30, 0, 0.95);
  border: 2px solid #00ff41;
  box-shadow: 
    0 0 20px rgba(0,255,65,0.3),
    inset 0 0 20px rgba(0,255,65,0.05);
  margin: 1rem 0;
  position: relative;
  backdrop-filter: blur(10px);
}

.profile-container::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  background: linear-gradient(45deg, #00ff41, #008f11, #00ff41);
  z-index: -1;
  animation: borderGlow 3s linear infinite;
}

@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

/* Hacker profile header */
.profile-header {
  background: linear-gradient(135deg, rgba(0,50,0,0.9), rgba(0,100,0,0.7));
  border-bottom: 2px solid #00ff41;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.profile-header::before {
  content: '[ACCESSING_USER_DATA] - DECRYPTION_IN_PROGRESS...';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: #00ff41;
  padding: 4px 12px;
  border: 1px solid #00ff41;
  font-family: 'Source Code Pro', monospace;
  font-size: 9px;
  font-weight: bold;
  animation: dataLoad 4s ease-in-out infinite;
}

@keyframes dataLoad {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.profile-display-name {
  color: #ffffff;
  font-family: 'Orbitron', monospace;
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 
    0 0 10px #00ff41,
    0 0 20px #00ff41,
    0 0 30px #00ff41;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 1rem;
  position: relative;
}

.profile-display-name::before {
  content: '> ';
  color: #00ff41;
  animation: cursor 1s infinite;
}

@keyframes cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.profile-bio {
  background: rgba(0,0,0,0.7);
  border: 1px solid #008f11;
  border-left: 4px solid #00ff41;
  padding: 1rem;
  margin: 1rem 0;
  font-family: 'Source Code Pro', monospace;
  color: #00ff41;
  position: relative;
}

.profile-bio::before {
  content: '[BIO_DATA] ';
  color: #ffffff;
  font-weight: bold;
  font-size: 11px;
}

/* ===========================================
   🗂️ DATA LOGS - BLOG POSTS
   =========================================== */

.blog-post-card {
  background: rgba(0,40,0,0.8);
  border: 1px solid #008f11;
  border-left: 4px solid #00ff41;
  margin: 2rem 0;
  padding: 1.5rem;
  box-shadow: 
    0 0 15px rgba(0,255,65,0.1),
    inset 0 0 15px rgba(0,255,65,0.05);
  position: relative;
  font-family: 'Source Code Pro', monospace;
}

.blog-post-card::before {
  content: '[LOG_ENTRY]';
  position: absolute;
  top: -12px;
  right: 20px;
  background: rgba(0,0,0,0.9);
  color: #00ff41;
  padding: 4px 12px;
  border: 1px solid #00ff41;
  font-size: 10px;
  font-weight: bold;
}

.blog-post-header {
  border-bottom: 1px solid #008f11;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.blog-post-date {
  color: #008f11;
  font-size: 10px;
  text-transform: uppercase;
  font-family: 'Source Code Pro', monospace;
}

.blog-post-date::before {
  content: '[TIMESTAMP] ';
  color: #00ff41;
}

.blog-post-content {
  color: #ffffff;
  line-height: 1.6;
  font-family: 'Source Code Pro', monospace;
}

/* ===========================================
   🌐 NETWORK CONNECTIONS - FRIENDS & LINKS
   =========================================== */

.featured-friends {
  background: rgba(0,30,0,0.8);
  border: 2px solid #008f11;
  border-top: 2px solid #00ff41;
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
}

.featured-friends::before {
  content: '[NETWORK_NODES] SECURE_CONNECTIONS';
  position: absolute;
  top: -12px;
  left: 20px;
  background: rgba(0,0,0,0.9);
  color: #00ff41;
  padding: 4px 12px;
  border: 1px solid #00ff41;
  font-size: 10px;
  font-weight: bold;
  font-family: 'Source Code Pro', monospace;
}

.friend-card {
  background: rgba(0,0,0,0.7);
  border: 1px solid #008f11;
  color: #00ff41;
  padding: 0.75rem;
  margin: 0.5rem;
  font-family: 'Source Code Pro', monospace;
  font-size: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.friend-card::before {
  content: '> ';
  color: #ffffff;
}

.friend-card:hover {
  border-color: #00ff41;
  background: rgba(0,255,65,0.1);
  box-shadow: 0 0 10px rgba(0,255,65,0.3);
  transform: translateX(5px);
}

.website-link {
  background: transparent;
  color: #00ff41 !important;
  padding: 6px 12px;
  border: 1px solid #008f11;
  font-family: 'Source Code Pro', monospace;
  font-size: 11px;
  text-decoration: none;
  margin: 3px;
  display: inline-block;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.website-link::before {
  content: '[LINK] ';
  color: #ffffff;
}

.website-link:hover {
  border-color: #00ff41;
  background: rgba(0,255,65,0.1);
  color: #ffffff !important;
  box-shadow: 0 0 5px rgba(0,255,65,0.5);
}

/* ===========================================
   📡 SECURE CHANNEL - GUESTBOOK
   =========================================== */

.guestbook-section {
  background: rgba(0,30,0,0.9);
  border: 2px solid #00ff41;
  padding: 2rem;
  margin: 2rem 0;
  position: relative;
  box-shadow: 0 0 20px rgba(0,255,65,0.2);
}

.guestbook-section::before {
  content: '[SECURE_CHANNEL] MESSAGE_BUFFER';
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.9);
  color: #00ff41;
  padding: 6px 16px;
  border: 1px solid #00ff41;
  font-family: 'Source Code Pro', monospace;
  font-size: 11px;
  font-weight: bold;
}

.guestbook-entry {
  background: rgba(0,0,0,0.8);
  border: 1px solid #008f11;
  border-left: 3px solid #00ff41;
  padding: 1rem;
  margin: 1rem 0;
  font-family: 'Source Code Pro', monospace;
  color: #ffffff;
  position: relative;
}

.guestbook-entry::before {
  content: '[MSG] ';
  color: #00ff41;
  font-weight: bold;
}

/* ===========================================
   🔧 SYSTEM INTERFACE - TABS
   =========================================== */

.profile-tabs {
  border: 2px solid #00ff41;
  margin: 2rem 0;
  background: rgba(0,0,0,0.8);
}

.profile-tab-button {
  background: rgba(0,40,0,0.8);
  color: #00ff41;
  border: 1px solid #008f11;
  border-bottom: none;
  padding: 12px 20px;
  font-family: 'Source Code Pro', monospace;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  margin-right: 2px;
  transition: all 0.2s ease;
}

.profile-tab-button::before {
  content: '[';
  color: #ffffff;
}

.profile-tab-button::after {
  content: ']';
  color: #ffffff;
}

.profile-tab-button:hover {
  background: rgba(0,255,65,0.1);
  box-shadow: 0 0 10px rgba(0,255,65,0.3);
}

.profile-tab-button.active {
  background: rgba(0,255,65,0.2);
  color: #ffffff;
  border-bottom: 2px solid #00ff41;
  box-shadow: 0 0 15px rgba(0,255,65,0.5);
}

.profile-tab-panel {
  background: rgba(0,30,0,0.9);
  border-top: 2px solid #00ff41;
  padding: 2rem;
  color: #ffffff;
  font-family: 'Source Code Pro', monospace;
}

/* ===========================================
   ⚡ SYSTEM CONTROLS - INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: transparent;
  color: #00ff41;
  border: 2px solid #00ff41;
  padding: 10px 20px;
  font-family: 'Source Code Pro', monospace;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
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
  background: linear-gradient(90deg, transparent, rgba(0,255,65,0.4), transparent);
  transition: left 0.5s ease;
}

.profile-button:hover {
  background: rgba(0,255,65,0.1);
  color: #ffffff;
  box-shadow: 
    0 0 20px rgba(0,255,65,0.5),
    inset 0 0 20px rgba(0,255,65,0.1);
  text-shadow: 0 0 10px #00ff41;
}

.profile-button:hover::before {
  left: 100%;
}

/* ===========================================
   📱 MOBILE TERMINAL ACCESS
   =========================================== */

@media (max-width: 768px) {
  .site-main {
    padding: 1rem;
  }
  
  .profile-display-name {
    font-size: 2rem;
  }
  
  .nav-link {
    display: block;
    margin: 2px 0;
    text-align: center;
  }
  
  .site-layout {
    font-size: 11px;
  }
}

/* ===========================================
   🔥 SPECIAL HACKER EFFECTS
   =========================================== */

/* Screen glitch effect */
@keyframes glitch {
  0% { transform: translateX(0); }
  20% { transform: translateX(-2px); }
  40% { transform: translateX(2px); }
  60% { transform: translateX(-1px); }
  80% { transform: translateX(1px); }
  100% { transform: translateX(0); }
}

.profile-display-name:hover {
  animation: glitch 0.3s ease-in-out;
}

/* Terminal prompt animation */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

.terminal-text {
  overflow: hidden;
  white-space: nowrap;
  animation: typewriter 2s steps(30) forwards;
}

/* ===========================================
   🎯 ACCESS GRANTED - WELCOME TO THE MATRIX
   =========================================== */`;

export function getDefaultTemplate(type: 'full' | 'minimal' | 'dark' | 'advanced' | 'gaming' | 'newspaper' = 'full'): string {
  switch (type) {
    case 'minimal':
      return MINIMAL_CSS_TEMPLATE;
    case 'dark':
      return DARK_THEME_TEMPLATE;
    case 'advanced':
      return ADVANCED_LAYOUT_TEMPLATE;
    case 'gaming':
      return RETRO_GAMING_TEMPLATE;
    case 'newspaper':
      return NEWSPAPER_TEMPLATE;
    case 'full':
    default:
      return DEFAULT_CSS_TEMPLATE;
  }
}