export const ABSTRACT_ART_TEMPLATE = `/* ===========================================
   🎨 ABSTRACT ART - COLORFUL CREATIVE CANVAS
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Righteous:wght@400&family=Fredoka:wght@400;500;600&display=swap');


/* Abstract Art Canvas Background - Paint Splatters & Brushstrokes */
.thread-surface {
  background: 
    /* Base canvas color */
    #f8f8f8,
    /* Paint splatters */
    radial-gradient(ellipse at 15% 25%, rgba(231, 76, 60, 0.15) 0%, transparent 25%),
    radial-gradient(ellipse at 85% 75%, rgba(52, 152, 219, 0.12) 0%, transparent 30%),
    radial-gradient(ellipse at 60% 10%, rgba(155, 89, 182, 0.1) 0%, transparent 35%),
    radial-gradient(ellipse at 30% 85%, rgba(241, 196, 15, 0.13) 0%, transparent 28%),
    radial-gradient(ellipse at 75% 40%, rgba(46, 204, 113, 0.11) 0%, transparent 32%),
    /* Subtle paper texture */
    repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px) !important;
  background-size: 100% 100%, 300px 200px, 250px 180px, 280px 220px, 200px 150px, 320px 240px, 20px 20px !important;
  background-attachment: fixed, scroll, scroll, scroll, scroll, scroll, fixed !important;
}

/* Subtle paint drip animation */
.thread-surface::before {
  content: '' !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: 
    radial-gradient(circle at 20% 30%, rgba(231, 76, 60, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(52, 152, 219, 0.02) 0%, transparent 40%) !important;
  animation: paintFlow 25s ease-in-out infinite alternate !important;
  pointer-events: none !important;
  z-index: -1 !important;
}

@keyframes paintFlow {
  0% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
  100% { transform: translateY(-10px) rotate(0.5deg); opacity: 0.8; }
}

/* Abstract Art Gallery Navigation */
.site-header {
  background: 
    /* Gallery white with subtle warm tint */
    linear-gradient(180deg, #fefefe 0%, #fdfdfd 100%) !important;
  border-bottom: 6px solid #2c3e50 !important;
  backdrop-filter: none !important;
  box-shadow: 
    0 4px 20px rgba(44, 62, 80, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 1) !important;
  position: relative !important;
  overflow: visible !important;
}

/* Art gallery track lighting effect */
.site-header::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 20% !important;
  width: 60% !important;
  height: 2px !important;
  background: 
    linear-gradient(90deg, 
      transparent 0%, 
      rgba(241, 196, 15, 0.6) 20%, 
      rgba(231, 76, 60, 0.6) 40%,
      rgba(52, 152, 219, 0.6) 60%,
      rgba(155, 89, 182, 0.6) 80%,
      transparent 100%
    ) !important;
  animation: galleryLights 8s ease-in-out infinite !important;
}

@keyframes galleryLights {
  0%, 100% { opacity: 0.4; transform: scaleX(1); }
  50% { opacity: 0.8; transform: scaleX(1.1); }
}

/* Gallery spotlights */
.site-header::after {
  content: '' !important;
  position: absolute !important;
  bottom: -6px !important;
  left: 0 !important;
  right: 0 !important;
  height: 6px !important;
  background: 
    repeating-linear-gradient(
      90deg,
      #2c3e50 0px,
      #2c3e50 3px,
      #34495e 3px,
      #34495e 6px
    ) !important;
}

.site-title {
  color: #2c3e50 !important;
  font-family: 'Righteous', cursive !important;
  font-weight: 400 !important;
  font-size: 2.2rem !important;
  text-shadow: none !important;
  position: relative !important;
  background: 
    linear-gradient(135deg, 
      #e74c3c 0%, 
      #f39c12 25%, 
      #3498db 50%, 
      #9b59b6 75%, 
      #2ecc71 100%
    ) !important;
  background-size: 200% 200% !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  animation: paintBrush 6s ease infinite !important;
}

@keyframes paintBrush {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.site-tagline {
  color: #7f8c8d !important;
  font-family: 'Fredoka', sans-serif !important;
  font-weight: 400 !important;
  font-style: italic !important;
  font-size: 0.9rem !important;
}

.nav-link {
  color: #2c3e50 !important;
  font-family: 'Fredoka', sans-serif !important;
  font-weight: 500 !important;
  background: transparent !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  padding: 0.5rem 1rem !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  font-size: 0.9rem !important;
}

/* Gallery-style underline effect */
.nav-link::before {
  content: '' !important;
  position: absolute !important;
  bottom: 0 !important;
  left: 50% !important;
  width: 0 !important;
  height: 2px !important;
  background: linear-gradient(90deg, #e74c3c, #f39c12, #3498db) !important;
  transition: all 0.3s ease !important;
  transform: translateX(-50%) !important;
}

.nav-link:hover {
  color: #e74c3c !important;
  transform: translateY(-1px) !important;
  text-decoration: none !important;
}

.nav-link:hover::before {
  width: 100% !important;
}

/* Abstract Footer */
.site-footer {
  background: 
    linear-gradient(135deg, 
      rgba(150, 206, 180, 0.9) 0%,
      rgba(255, 234, 167, 0.9) 50%,
      rgba(255, 107, 107, 0.9) 100%
    ) !important;
  border-top: 4px solid #4ecdc4 !important;
  position: relative !important;
  overflow: hidden !important;
}

.site-footer::before {
  content: '✨' !important;
  position: absolute !important;
  top: -10px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: 
    linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%) !important;
  color: #fff !important;
  padding: 0.5rem 1rem !important;
  border-radius: 50% !important;
  font-size: 1.2rem !important;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3) !important;
}

.footer-tagline {
  color: #fff !important;
  font-family: 'Fredoka', sans-serif !important;
  font-weight: 600 !important;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3) !important;
}

.footer-copyright {
  color: rgba(255, 255, 255, 0.8) !important;
  font-family: 'Fredoka', sans-serif !important;
}

/* Interactive Button Styling */
.notification-button {
  background: 
    linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%) !important;
  color: white !important;
  border: 3px solid #fff !important;
  border-radius: 50% !important;
  width: 36px !important;
  height: 36px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 1rem !important;
  transition: all 0.3s ease !important;
  box-shadow: 
    0 4px 12px rgba(255, 107, 107, 0.3),
    0 0 20px rgba(78, 205, 196, 0.2) !important;
  position: relative !important;
  flex-shrink: 0 !important;
  animation: bounce 2s ease-in-out infinite !important;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.1); }
}

@media (min-width: 1024px) {
  .notification-button {
    width: 40px !important;
    height: 40px !important;
    font-size: 1.1rem !important;
  }
}

.notification-button:hover {
  background: 
    linear-gradient(135deg, #45b7d1 0%, #96ceb4 100%) !important;
  transform: translateY(-2px) scale(1.2) !important;
  box-shadow: 
    0 8px 24px rgba(69, 183, 209, 0.4),
    0 0 30px rgba(150, 206, 180, 0.3) !important;
  animation: none !important;
}

.notification-button.has-notifications::after {
  content: '' !important;
  position: absolute !important;
  top: -3px !important;
  right: -3px !important;
  width: 14px !important;
  height: 14px !important;
  background: 
    radial-gradient(circle, #ffeaa7 0%, #ff6b6b 100%) !important;
  border-radius: 50% !important;
  border: 2px solid #fff !important;
  animation: pulse 1.5s ease-in-out infinite !important;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

.user-dropdown-trigger {
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 234, 167, 0.9) 100%) !important;
  color: #ff6b6b !important;
  border: 2px solid #4ecdc4 !important;
  border-radius: 25px !important;
  padding: 0.4rem 0.7rem !important;
  font-family: 'Fredoka', sans-serif !important;
  font-weight: 600 !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.3rem !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.2) !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  font-size: 0.85rem !important;
}

@media (min-width: 1024px) {
  .user-dropdown-trigger {
    padding: 0.5rem 1rem !important;
    gap: 0.5rem !important;
    font-size: 0.9rem !important;
  }
}

.user-dropdown-trigger:hover {
  background: 
    linear-gradient(135deg, rgba(255, 107, 107, 0.9) 0%, rgba(78, 205, 196, 0.9) 100%) !important;
  color: #fff !important;
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 
    0 8px 20px rgba(255, 107, 107, 0.3),
    0 0 25px rgba(78, 205, 196, 0.2) !important;
}

.new-post-button {
  background: 
    linear-gradient(135deg, #45b7d1 0%, #96ceb4 50%, #ffeaa7 100%) !important;
  color: #fff !important;
  border: 3px solid #fff !important;
  border-radius: 30px !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Righteous', cursive !important;
  font-weight: 400 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
  font-size: 0.8rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  box-shadow: 
    0 6px 20px rgba(69, 183, 209, 0.3),
    0 0 25px rgba(150, 206, 180, 0.2) !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
}

@media (min-width: 1024px) {
  .new-post-button {
    padding: 0.875rem 1.75rem !important;
    font-size: 0.9rem !important;
    letter-spacing: 0.5px !important;
    gap: 0.5rem !important;
  }
}

.new-post-button::before {
  content: '🎨' !important;
  font-size: 1rem !important;
  animation: spin 3s linear infinite !important;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.new-post-button::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: 
    linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.3), 
      transparent
    ) !important;
  transition: left 0.6s ease !important;
}

.new-post-button:hover {
  background: 
    linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%) !important;
  transform: translateY(-3px) scale(1.08) !important;
  box-shadow: 
    0 10px 30px rgba(255, 107, 107, 0.4),
    0 0 40px rgba(78, 205, 196, 0.3) !important;
}

.new-post-button:hover::after {
  left: 100% !important;
}

/* Abstract Art Create New Post Button (Blog Tab) */
.create-new-post-button {
  background: 
    linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%) !important;
  color: white !important;
  border: 3px solid #fff !important;
  border-radius: 25px !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Righteous', cursive !important;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  font-size: 0.85rem !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  box-shadow: 
    0 6px 20px rgba(255, 107, 107, 0.3),
    0 0 25px rgba(78, 205, 196, 0.2) !important;
  overflow: hidden !important;
}

.create-new-post-button::before {
  content: '🎨✨ ' !important;
  font-size: 1rem !important;
}

.create-new-post-button::after {
  content: '' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) scale(0) !important;
  width: 300% !important;
  height: 300% !important;
  background: 
    conic-gradient(from 0deg, 
      #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #ff6b6b
    ) !important;
  border-radius: 50% !important;
  transition: transform 0.6s ease !important;
  z-index: -1 !important;
}

.create-new-post-button:hover {
  transform: translateY(-2px) scale(1.05) !important;
  color: #fff !important;
}

.create-new-post-button:hover::after {
  transform: translate(-50%, -50%) scale(1) !important;
}

/* Responsive Button Styles for Abstract Art */
@media (max-width: 1023px) {
  .notification-button {
    width: 36px !important;
    height: 36px !important;
    font-size: 1rem !important;
  }
  
  .user-dropdown-trigger {
    padding: 0.4rem 0.7rem !important;
    gap: 0.3rem !important;
    font-size: 0.85rem !important;
  }
  
  .new-post-button {
    padding: 0.6rem 1.2rem !important;
    font-size: 0.8rem !important;
    letter-spacing: 0.3px !important;
    gap: 0.4rem !important;
  }
  
  .create-new-post-button {
    padding: 0.5rem 1rem !important;
    font-size: 0.8rem !important;
  }
}

/* Artistic Profile Container */
.ts-profile-container {
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 234, 167, 0.7) 100%) !important;
  border: 4px solid transparent !important;
  background-clip: padding-box !important;
  position: relative !important;
  border-radius: 20px !important;
  box-shadow: 
    0 20px 60px rgba(255, 107, 107, 0.15),
    0 0 40px rgba(78, 205, 196, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  overflow: hidden !important;
}

.ts-profile-container::before {
  content: '' !important;
  position: absolute !important;
  top: -2px !important;
  left: -2px !important;
  right: -2px !important;
  bottom: -2px !important;
  background: 
    conic-gradient(from 45deg, 
      #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #ff6b6b
    ) !important;
  border-radius: 20px !important;
  z-index: -1 !important;
  animation: borderRotate 10s linear infinite !important;
}

@keyframes borderRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Creative Content Styling */
.ts-profile-identity h1 {
  font-family: 'Righteous', cursive !important;
  background: 
    linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4) !important;
  background-size: 400% 400% !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  animation: gradientText 5s ease infinite !important;
}

@keyframes gradientText {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.ts-profile-bio {
  background: rgba(255, 255, 255, 0.6) !important;
  border: 2px solid #4ecdc4 !important;
  border-radius: 15px !important;
  padding: 1rem !important;
  font-family: 'Fredoka', sans-serif !important;
  box-shadow: 0 8px 20px rgba(78, 205, 196, 0.2) !important;
}

/* Creative elements for posts and content */
.blog-post-title {
  font-family: 'Righteous', cursive !important;
  color: #ff6b6b !important;
  border-bottom: 3px dashed #4ecdc4 !important;
  padding-bottom: 0.5rem !important;
  margin-bottom: 1rem !important;
}

.blog-post-content {
  font-family: 'Fredoka', sans-serif !important;
  line-height: 1.6 !important;
  color: #333 !important;
}

.blog-post-meta {
  color: #45b7d1 !important;
  font-family: 'Fredoka', sans-serif !important;
  font-weight: 500 !important;
}

.blog-post-header {
  border-bottom: 2px solid #96ceb4 !important;
  padding-bottom: 0.75rem !important;
  margin-bottom: 0.75rem !important;
}`;