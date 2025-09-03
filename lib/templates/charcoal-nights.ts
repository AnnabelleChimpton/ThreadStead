export const CHARCOAL_NIGHTS_TEMPLATE = `/* ===========================================
   🖤 CHARCOAL NIGHTS - RETRO TERMINAL
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Share+Tech+Mono&display=swap');

/* CSS_MODE:inherit */

/* Override thread-surface for dark terminal background */
.thread-surface {
  background: #0a0a0a !important;
}

/* Terminal Navigation */
.site-header {
  background: #1a1a1a !important;
  border-bottom: 1px solid #00ff00 !important;
  backdrop-filter: none !important;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.1) !important;
  position: relative !important;
}

.site-header::before {
  content: '[SYSTEM NAVIGATION]' !important;
  position: absolute !important;
  top: 0.5rem !important;
  left: 1rem !important;
  color: #00ff00 !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 0.75rem !important;
  opacity: 0.6 !important;
}

.site-title {
  color: #00ff00 !important;
  font-family: 'Share Tech Mono', monospace !important;
  text-shadow: 0 0 10px #00ff00 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  animation: glow 2s ease-in-out infinite alternate !important;
}

.site-tagline {
  color: rgba(0, 255, 0, 0.8) !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 0.75rem !important;
}

.nav-link {
  color: #00ff00 !important;
  font-family: 'Space Mono', monospace !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  border: 1px solid transparent !important;
  padding: 0.5rem 1rem !important;
  transition: all 0.3s ease !important;
}

.nav-link:hover {
  background: #00ff00 !important;
  color: #000 !important;
  border-color: #00ff00 !important;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5) !important;
  text-decoration: none !important;
}

/* Terminal footer */
.site-footer {
  background: #0a0a0a !important;
  border-top: 1px solid #00ff00 !important;
  color: #00ff00 !important;
}

.footer-tagline {
  color: #00ff00 !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 0.75rem !important;
}

.footer-tagline::before {
  content: '>' !important;
  animation: blink 1s infinite !important;
  margin-right: 0.5rem !important;
}

/* Terminal Interactive Buttons */
.notification-button {
  background: #000 !important;
  color: #00ff00 !important;
  border: 1px solid #00ff00 !important;
  border-radius: 0 !important;
  width: 40px !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 1rem !important;
  position: relative !important;
  overflow: hidden !important;
  transition: all 0.3s ease !important;
}

.notification-button::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: #00ff00 !important;
  transition: left 0.3s ease !important;
}

.notification-button:hover::before {
  left: 0 !important;
}

.notification-button:hover {
  color: #000 !important;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.5) !important;
}

.notification-button.has-notifications::after {
  content: '!' !important;
  position: absolute !important;
  top: -5px !important;
  right: -5px !important;
  width: 15px !important;
  height: 15px !important;
  background: #ff0000 !important;
  color: #fff !important;
  font-size: 0.7rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  animation: blink 1s infinite !important;
}

.user-dropdown-trigger {
  background: #000 !important;
  color: #00ff00 !important;
  border: 1px solid #00ff00 !important;
  border-radius: 0 !important;
  padding: 0.5rem 1rem !important;
  font-family: 'Space Mono', monospace !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  font-size: 0.8rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  position: relative !important;
  overflow: hidden !important;
  transition: all 0.3s ease !important;
}

.user-dropdown-trigger::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: #00ff00 !important;
  transition: left 0.3s ease !important;
}

.user-dropdown-trigger:hover::before {
  left: 0 !important;
}

.user-dropdown-trigger:hover {
  color: #000 !important;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.5) !important;
}

.new-post-button {
  background: #000 !important;
  color: #00ff00 !important;
  border: 2px solid #00ff00 !important;
  border-radius: 0 !important;
  padding: 0.75rem 1.5rem !important;
  font-family: 'Space Mono', monospace !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  font-size: 0.875rem !important;
  position: relative !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  transition: all 0.3s ease !important;
}

.new-post-button::before {
  content: '[NEW_POST]' !important;
  position: relative !important;
  z-index: 2 !important;
}

.new-post-button::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: #00ff00 !important;
  transition: left 0.3s ease !important;
  z-index: 1 !important;
}

.new-post-button:hover::after {
  left: 0 !important;
}

.new-post-button:hover {
  color: #000 !important;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5) !important;
}

/* Terminal screen effect */
.ts-profile-container {
  background: #0a0a0a !important;
  border: 3px solid #333 !important;
  border-radius: 8px !important;
  box-shadow: 
    0 0 40px rgba(0, 255, 0, 0.1),
    inset 0 0 60px rgba(0, 0, 0, 0.8) !important;
  position: relative !important;
  overflow: hidden !important;
}

/* CRT scanlines */
.ts-profile-container::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 255, 0, 0.03),
    rgba(0, 255, 0, 0.03) 1px,
    transparent 1px,
    transparent 2px
  ) !important;
  pointer-events: none !important;
  z-index: 3 !important;
  animation: scanlines 8s linear infinite !important;
}

@keyframes scanlines {
  0% { transform: translateY(0); }
  100% { transform: translateY(10px); }
}

/* Terminal flicker effect */
.ts-profile-container::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(18, 16, 16, 0.1) !important;
  opacity: 0 !important;
  z-index: 2 !important;
  pointer-events: none !important;
  animation: flicker 0.15s infinite !important;
}

@keyframes flicker {
  0% { opacity: 0.27861; }
  5% { opacity: 0.34769; }
  10% { opacity: 0.23604; }
  15% { opacity: 0.90626; }
  20% { opacity: 0.18128; }
  25% { opacity: 0.83891; }
  30% { opacity: 0.65583; }
  35% { opacity: 0.67807; }
  40% { opacity: 0.26559; }
  45% { opacity: 0.84693; }
  50% { opacity: 0.96019; }
  55% { opacity: 0.08594; }
  60% { opacity: 0.20313; }
  65% { opacity: 0.71988; }
  70% { opacity: 0.53455; }
  75% { opacity: 0.37288; }
  80% { opacity: 0.71428; }
  85% { opacity: 0.70419; }
  90% { opacity: 0.7003; }
  95% { opacity: 0.36108; }
  100% { opacity: 0.24387; }
}

/* Terminal header */
.ts-profile-header {
  background: #1a1a1a !important;
  border: 1px solid #00ff00 !important;
  border-radius: 0 !important;
  padding: 1.5rem !important;
  margin-bottom: 1.5rem !important;
  position: relative !important;
}

.ts-profile-header::before {
  content: '[SYSTEM PROFILE]' !important;
  position: absolute !important;
  top: 0.5rem !important;
  left: 1rem !important;
  color: #00ff00 !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 0.75rem !important;
  opacity: 0.6 !important;
}

/* Terminal text styling */
.ts-profile-display-name {
  font-family: 'Share Tech Mono', monospace !important;
  color: #00ff00 !important;
  text-shadow: 
    0 0 5px #00ff00,
    0 0 10px #00ff00,
    0 0 15px #00ff00 !important;
  font-size: 2rem !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
  animation: glow 2s ease-in-out infinite alternate !important;
}

@keyframes glow {
  from { text-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00; }
  to { text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00; }
}

.ts-profile-bio {
  background: rgba(0, 0, 0, 0.8) !important;
  border: 1px solid #00ff00 !important;
  border-radius: 0 !important;
  padding: 1rem !important;
  color: #00ff00 !important;
  font-family: 'Space Mono', monospace !important;
  font-size: 0.9rem !important;
  line-height: 1.6 !important;
  position: relative !important;
}

.ts-profile-bio::before {
  content: '>' !important;
  position: absolute !important;
  left: 0.5rem !important;
  color: #00ff00 !important;
  animation: blink 1s infinite !important;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Terminal photo style */
.ts-profile-photo-frame {
  border: 2px solid #00ff00 !important;
  filter: grayscale(100%) contrast(120%) !important;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3) !important;
  border-radius: 0 !important;
}

/* Terminal buttons */
.thread-button {
  background: #000 !important;
  color: #00ff00 !important;
  border: 1px solid #00ff00 !important;
  border-radius: 0 !important;
  font-family: 'Space Mono', monospace !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  padding: 0.75rem 1.5rem !important;
  position: relative !important;
  overflow: hidden !important;
  transition: all 0.3s ease !important;
}

.thread-button::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: #00ff00 !important;
  transition: left 0.3s ease !important;
}

.thread-button:hover::before {
  left: 0 !important;
}

.thread-button:hover {
  color: #000 !important;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5) !important;
}

/* Tab styling */
.profile-tab-button {
  background: #000 !important;
  color: #00ff00 !important;
  border: 1px solid #333 !important;
  border-radius: 0 !important;
  font-family: 'Space Mono', monospace !important;
  transition: all 0.2s ease !important;
}

.profile-tab-button:hover {
  background: #111 !important;
  border-color: #00ff00 !important;
}

.profile-tab-button[aria-selected="true"] {
  background: #00ff00 !important;
  color: #000 !important;
  font-weight: 700 !important;
}

/* Content modules */
.thread-module {
  background: rgba(0, 0, 0, 0.9) !important;
  border: 1px solid #333 !important;
  border-radius: 0 !important;
  color: #00ff00 !important;
}

/* Blog posts terminal style */
.blog-post {
  background: #0a0a0a !important;
  border: 1px solid #00ff00 !important;
  border-radius: 0 !important;
  padding: 1rem !important;
  color: #00ff00 !important;
  font-family: 'Space Mono', monospace !important;
}

.blog-post-header {
  border-bottom: 1px dotted #00ff00 !important;
  padding-bottom: 0.5rem !important;
  margin-bottom: 0.5rem !important;
}

/* Charcoal Nights Create New Post Button (Blog Tab) */
.create-new-post-button {
  background: linear-gradient(135deg, #1e1e1e 0%, #0f0f0f 100%) !important;
  color: #00ff00 !important;
  border: 2px solid #00ff00 !important;
  border-radius: 4px !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Courier New', monospace !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  font-size: 0.85rem !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  overflow: hidden !important;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3) !important;
}

.create-new-post-button::before {
  content: '[NEW_POST]' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: #00ff00 !important;
  color: #000 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: left 0.3s ease !important;
  font-size: 0.85rem !important;
}

.create-new-post-button:hover::before {
  left: 0 !important;
}

.create-new-post-button:hover {
  color: transparent !important;
  text-shadow: none !important;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.6) !important;
}

/* Responsive Button Styles for Charcoal Nights */
@media (max-width: 1023px) {
  .notification-button {
    width: 36px !important;
    height: 36px !important;
    font-size: 1rem !important;
  }
  
  .user-dropdown-trigger {
    padding: 0.4rem 0.7rem !important;
    gap: 0.3rem !important;
    font-size: 0.8rem !important;
  }
  
  .new-post-button {
    padding: 0.6rem 1rem !important;
    font-size: 0.8rem !important;
    letter-spacing: 0.5px !important;
  }
  
  .create-new-post-button {
    padding: 0.5rem 1rem !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.5px !important;
  }
  
  .create-new-post-button::before {
    font-size: 0.75rem !important;
  }
}`;