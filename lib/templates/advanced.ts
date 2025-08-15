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

/* ===========================================
   🛡️ BACKGROUND & FOOTER STYLING
   =========================================== */

/* Glossy Web 2.0 footer */
.site-footer {
  background: linear-gradient(135deg, 
    rgba(0,0,0,0.8) 0%, 
    rgba(0,0,0,0.9) 100%) !important;
  border-top: 1px solid rgba(255,255,255,0.1) !important;
  color: rgba(255,255,255,0.8) !important;
  backdrop-filter: blur(10px) !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8) !important;
}

/* ===========================================
   🎨 NAVIGATION BAR STYLING (SAFE ZONE)
   =========================================== */

/* Glossy Web 2.0 navigation */
.site-header {
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.9) 0%, 
    rgba(118,75,162,0.9) 100%) !important;
  color: #fff !important;
  font-family: 'Arial', sans-serif !important;
  backdrop-filter: blur(10px) !important;
}

.site-title {
  color: #fff !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
}

.site-tagline {
  color: rgba(255,255,255,0.8) !important;
  text-shadow: 0 1px 1px rgba(0,0,0,0.3) !important;
}

.nav-link {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.2) 0%, 
    rgba(255,255,255,0.1) 100%) !important;
  color: #fff !important;
  padding: 8px 20px !important;
  border: 1px solid rgba(255,255,255,0.3) !important;
  border-radius: 20px !important;
  margin: 0 4px !important;
  font-size: 13px !important;
  font-weight: bold !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.3) !important;
  transition: all 0.3s ease !important;
}

.nav-link:hover {
  transform: translateY(-2px) !important;
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.4) !important;
  color: #fff !important;
}

/* ===========================================
   🚀 CREATIVE HEADER - WEB 2.0 MAGIC
   =========================================== */

.site-creative-header {
  background: linear-gradient(135deg, 
    #667eea 0%, 
    #764ba2 50%, 
    #f093fb 100%);
  padding: 4rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.site-creative-header::before {
  content: 'Welcome to Web 2.0';
  display: block;
  font-family: 'Arial', sans-serif;
  font-size: 3rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

.site-creative-header::after {
  content: 'Experience the glossy gradient revolution';
  display: block;
  font-family: 'Verdana', sans-serif;
  font-size: 1.2rem;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* 🚨 NAVIGATION FUNCTIONALITY PROTECTION 🚨
   DO NOT modify positioning, z-index, or layout properties of navigation.
   Stick to colors, fonts, and basic styling only! */

/* Main content with subtle shadow */
.site-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Profile container with Web 2.0 styling */
.profile-container {
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 15px;
  box-shadow: 
    0 8px 32px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8);
  backdrop-filter: blur(20px);
  padding: 0;
  margin: 2rem 0;
  overflow: hidden;
}

/* Glossy profile header */
.profile-header {
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.9) 0%, 
    rgba(118,75,162,0.9) 100%);
  padding: 3rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.profile-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255,255,255,0.8), 
    transparent);
}

.profile-display-name {
  color: #fff;
  font-size: 3rem;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin-bottom: 1rem;
  position: relative;
}

.profile-bio {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  padding: 1.5rem;
  margin: 1.5rem;
  color: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.2);
}

/* ===========================================
   📝 BLOG POSTS - WEB 2.0 CARDS
   =========================================== */

.blog-post-card {
  background: rgba(255,255,255,0.9);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 12px;
  margin: 2rem 0;
  padding: 2rem;
  box-shadow: 
    0 8px 32px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}

.blog-post-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    0 15px 40px rgba(0,0,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

.blog-post-header {
  border-bottom: 1px solid rgba(102,126,234,0.2);
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.blog-post-content {
  color: #333;
  line-height: 1.7;
}

/* ===========================================
   👥 FRIENDS - GLOSSY CARDS
   =========================================== */

.featured-friends {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 15px;
  padding: 2rem;
  margin: 2rem 0;
  backdrop-filter: blur(20px);
}

.friend-card {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.9) 0%, 
    rgba(255,255,255,0.7) 100%);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 10px;
  padding: 1rem;
  margin: 1rem;
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.8);
  transition: all 0.3s ease;
}

.friend-card:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.9);
}

/* ===========================================
   💌 GUESTBOOK - WEB 2.0 STYLE
   =========================================== */

.guestbook-section {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 15px;
  padding: 2rem;
  margin: 2rem 0;
  backdrop-filter: blur(20px);
}

.guestbook-entry {
  background: rgba(255,255,255,0.8);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.05),
    inset 0 1px 0 rgba(255,255,255,1);
}

/* ===========================================
   🎛️ INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: linear-gradient(135deg, 
    rgba(102,126,234,0.8) 0%, 
    rgba(118,75,162,0.8) 100%);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  padding: 10px 20px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.3);
  transition: all 0.3s ease;
  cursor: pointer;
}

.profile-button:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.4);
}

.profile-tab-button {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.6) 0%, 
    rgba(255,255,255,0.4) 100%);
  color: #333;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 8px 8px 0 0;
  padding: 10px 20px;
  margin: 0 2px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.9) 0%, 
    rgba(255,255,255,0.8) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.profile-tab-panel {
  background: rgba(255,255,255,0.9);
  border-radius: 0 0 12px 12px;
  padding: 2rem;
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,1);
}

/* ===========================================
   📱 RESPONSIVE DESIGN
   =========================================== */

@media (max-width: 768px) {
  .profile-display-name {
    font-size: 2rem;
  }
  
  .site-main {
    padding: 1rem;
  }
}

/* ===========================================
   ✨ FINISHING TOUCHES
   =========================================== */

/* Subtle animations */
@keyframes glow {
  0%, 100% { 
    box-shadow: 
      0 8px 32px rgba(0,0,0,0.1),
      inset 0 1px 0 rgba(255,255,255,0.8),
      0 0 20px rgba(102,126,234,0.3);
  }
  50% { 
    box-shadow: 
      0 8px 32px rgba(0,0,0,0.1),
      inset 0 1px 0 rgba(255,255,255,0.8),
      0 0 30px rgba(102,126,234,0.5);
  }
}

.profile-container:hover {
  animation: glow 2s ease-in-out infinite;
}

/* Smooth transitions for all interactive elements */
* {
  transition: all 0.3s ease;
}`;