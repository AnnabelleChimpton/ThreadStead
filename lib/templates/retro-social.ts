export const RETRO_SOCIAL_TEMPLATE = `/* ===========================================
   📱 RETRO SOCIAL - MYSPACE VIBES
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Impact&family=Bebas+Neue&display=swap');

/* CSS_MODE:inherit */

/* MySpace 2005 Authentic Background */
.thread-surface {
  background: 
    /* Tiled star pattern like old MySpace backgrounds */
    radial-gradient(circle at 15px 15px, #ffffff 1px, transparent 1px),
    radial-gradient(circle at 35px 25px, #ff1493 0.5px, transparent 0.5px),
    radial-gradient(circle at 55px 35px, #00bfff 0.8px, transparent 0.8px),
    radial-gradient(circle at 25px 45px, #ffff00 0.6px, transparent 0.6px),
    /* Subtle gradient overlay */
    linear-gradient(135deg, rgba(255, 20, 147, 0.05) 0%, rgba(0, 191, 255, 0.05) 100%),
    /* Classic MySpace black base */
    #000000 !important;
  background-size: 60px 60px, 60px 60px, 60px 60px, 60px 60px, 100% 100%, 100% 100% !important;
  animation: myspaceStars 30s linear infinite !important;
}

/* Authentic MySpace twinkling stars */
@keyframes myspaceStars {
  0% { background-position: 0px 0px, 0px 0px, 0px 0px, 0px 0px, 0% 0%, 0 0; }
  25% { background-position: 15px 15px, -10px 10px, 20px -15px, 5px 25px, 0% 0%, 0 0; }
  50% { background-position: 30px 30px, -20px 20px, 40px -30px, 10px 50px, 0% 0%, 0 0; }
  75% { background-position: 45px 45px, -30px 30px, 60px -45px, 15px 75px, 0% 0%, 0 0; }
  100% { background-position: 60px 60px, -40px 40px, 80px -60px, 20px 100px, 0% 0%, 0 0; }
}

/* Authentic MySpace 2005 Navigation */
.site-header {
  background: 
    /* Classic MySpace blue gradient */
    linear-gradient(180deg, #4477cc 0%, #336699 50%, #225588 100%) !important;
  border-bottom: 3px solid #114477 !important;
  backdrop-filter: none !important;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  position: relative !important;
  overflow: visible !important;
}

/* MySpace corner decorative elements */
.site-header::before {
  content: '★ Online Now ★' !important;
  position: absolute !important;
  top: 50% !important;
  right: 1rem !important;
  transform: translateY(-50%) !important;
  font-size: 0.75rem !important;
  color: #ffff00 !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: bold !important;
  text-shadow: 
    1px 1px 0 #000,
    0 0 5px #ffff00 !important;
  animation: myspaceBlink 1.5s ease-in-out infinite !important;
}

@keyframes myspaceBlink {
  0%, 50% { opacity: 1; }
  70%, 100% { opacity: 0.3; }
}

.site-title {
  color: #ffffff !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  font-size: 2rem !important;
  text-shadow: 
    2px 2px 0 #000000,
    4px 4px 0 #ff1493,
    0 0 10px rgba(255, 255, 255, 0.8) !important;
  position: relative !important;
  text-decoration: underline !important;
  text-decoration-color: #ff1493 !important;
}

/* MySpace classic title decoration */
.site-title::after {
  content: ' ♥' !important;
  color: #ff1493 !important;
  animation: heartBeat 1s ease-in-out infinite !important;
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.site-tagline {
  color: #cccccc !important;
  font-family: 'Impact', 'Arial Black', sans-serif !important;
  font-weight: 400 !important;
  font-size: 0.9rem !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8) !important;
}

.nav-link {
  color: #fff !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  background: 
    linear-gradient(135deg, rgba(0, 191, 255, 0.8) 0%, rgba(255, 105, 180, 0.8) 100%) !important;
  border: 2px solid #fff !important;
  border-radius: 15px !important;
  padding: 0.5rem 1rem !important;
  transition: all 0.3s ease !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8) !important;
  position: relative !important;
  overflow: hidden !important;
}

.nav-link::before {
  content: '' !important;
  position: absolute !important;
  top: -50% !important;
  left: -50% !important;
  width: 200% !important;
  height: 200% !important;
  background: 
    radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%) !important;
  transform: scale(0) !important;
  transition: transform 0.5s ease !important;
}

.nav-link:hover {
  background: 
    linear-gradient(135deg, rgba(50, 205, 50, 0.9) 0%, rgba(255, 20, 147, 0.9) 100%) !important;
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 
    0 6px 15px rgba(255, 20, 147, 0.4),
    0 0 20px rgba(0, 191, 255, 0.3) !important;
  text-decoration: none !important;
}

.nav-link:hover::before {
  transform: scale(1) !important;
}

/* MySpace Footer */
.site-footer {
  background: 
    linear-gradient(135deg, #32cd32 0%, #00bfff 50%, #ff69b4 100%) !important;
  border-top: 4px solid #ff1493 !important;
  position: relative !important;
  overflow: hidden !important;
}

.site-footer::before {
  content: '💖✨💫' !important;
  position: absolute !important;
  top: -8px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: 
    radial-gradient(circle, #ff1493 0%, #ff69b4 100%) !important;
  color: #fff !important;
  padding: 0.3rem 1rem !important;
  border-radius: 20px !important;
  font-size: 1rem !important;
  border: 2px solid #fff !important;
  box-shadow: 0 2px 10px rgba(255, 20, 147, 0.5) !important;
  animation: bounce 2s ease-in-out infinite !important;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-5px); }
}

.footer-tagline {
  color: #fff !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7) !important;
}

.footer-copyright {
  color: rgba(255, 255, 255, 0.9) !important;
  font-family: 'Impact', 'Arial Black', sans-serif !important;
}

/* MySpace-style Interactive Buttons */
.notification-button {
  background: 
    radial-gradient(circle, #ff1493 0%, #ff69b4 70%, #fff 100%) !important;
  color: #000 !important;
  border: 3px solid #00bfff !important;
  border-radius: 50% !important;
  width: 36px !important;
  height: 36px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 1rem !important;
  font-weight: 900 !important;
  transition: all 0.3s ease !important;
  box-shadow: 
    0 0 10px rgba(255, 20, 147, 0.6),
    0 0 20px rgba(0, 191, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  position: relative !important;
  flex-shrink: 0 !important;
  animation: blink 3s ease-in-out infinite !important;
}

@keyframes blink {
  0%, 90%, 100% { opacity: 1; }
  95% { opacity: 0.7; }
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
    radial-gradient(circle, #32cd32 0%, #00bfff 70%, #fff 100%) !important;
  transform: scale(1.2) rotate(10deg) !important;
  box-shadow: 
    0 0 15px rgba(50, 205, 50, 0.8),
    0 0 25px rgba(0, 191, 255, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  animation: none !important;
}

.notification-button.has-notifications::after {
  content: '💕' !important;
  position: absolute !important;
  top: -5px !important;
  right: -5px !important;
  width: 18px !important;
  height: 18px !important;
  background: 
    radial-gradient(circle, #ff1493 0%, #ff69b4 100%) !important;
  border-radius: 50% !important;
  border: 2px solid #fff !important;
  font-size: 0.7rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  animation: pulse 1s ease-in-out infinite !important;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.user-dropdown-trigger {
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 20, 147, 0.1) 100%) !important;
  color: #ff1493 !important;
  border: 3px solid #00bfff !important;
  border-radius: 20px !important;
  padding: 0.4rem 0.7rem !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.3rem !important;
  transition: all 0.3s ease !important;
  box-shadow: 
    0 0 8px rgba(0, 191, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  font-size: 0.85rem !important;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8) !important;
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
    linear-gradient(135deg, rgba(50, 205, 50, 0.9) 0%, rgba(255, 105, 180, 0.9) 100%) !important;
  color: #fff !important;
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 
    0 0 15px rgba(50, 205, 50, 0.6),
    0 0 25px rgba(255, 105, 180, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7) !important;
}

.new-post-button {
  background: 
    linear-gradient(135deg, #ff1493 0%, #00bfff 50%, #32cd32 100%) !important;
  color: #fff !important;
  border: 3px solid #fff !important;
  border-radius: 25px !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
  font-size: 0.8rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  box-shadow: 
    0 0 12px rgba(255, 20, 147, 0.5),
    0 0 20px rgba(0, 191, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  flex-shrink: 0 !important;
  white-space: nowrap !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8) !important;
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
  content: '📱💫' !important;
  font-size: 1rem !important;
  animation: wiggle 2s ease-in-out infinite !important;
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(5deg); }
  75% { transform: rotate(-5deg); }
}

.new-post-button:hover {
  background: 
    linear-gradient(135deg, #32cd32 0%, #ff69b4 50%, #ff1493 100%) !important;
  transform: translateY(-3px) scale(1.1) !important;
  box-shadow: 
    0 0 20px rgba(50, 205, 50, 0.7),
    0 0 30px rgba(255, 105, 180, 0.5),
    inset 0 2px 0 rgba(255, 255, 255, 0.4) !important;
}

/* Retro Social Create New Post Button (Blog Tab) */
.create-new-post-button {
  background: 
    linear-gradient(135deg, #ff1493 0%, #ff69b4 50%, #00bfff 100%) !important;
  color: white !important;
  border: 3px solid #fff !important;
  border-radius: 20px !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  font-size: 0.85rem !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  box-shadow: 
    0 0 12px rgba(255, 20, 147, 0.5),
    0 0 20px rgba(0, 191, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7) !important;
}

.create-new-post-button::before {
  content: '✨📝✨ ' !important;
  font-size: 1rem !important;
  animation: sparkleRotate 3s linear infinite !important;
}

@keyframes sparkleRotate {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg); }
}

.create-new-post-button:hover {
  background: 
    linear-gradient(135deg, #32cd32 0%, #ff1493 50%, #ff69b4 100%) !important;
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 
    0 0 18px rgba(50, 205, 50, 0.6),
    0 0 25px rgba(255, 20, 147, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.4) !important;
}

/* Responsive Button Styles for Retro Social */
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
    font-size: 0.75rem !important;
    letter-spacing: 0.2px !important;
  }
  
  .create-new-post-button {
    padding: 0.5rem 1rem !important;
    font-size: 0.75rem !important;
  }
}

/* MySpace Profile Container */
.ts-profile-container {
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 105, 180, 0.1) 100%) !important;
  border: 4px solid #ff1493 !important;
  border-radius: 15px !important;
  box-shadow: 
    0 0 20px rgba(255, 20, 147, 0.4),
    0 0 40px rgba(0, 191, 255, 0.2),
    inset 0 2px 0 rgba(255, 255, 255, 0.8) !important;
  position: relative !important;
  overflow: hidden !important;
}

.ts-profile-container::before {
  content: '💖✨💫⭐💕' !important;
  position: absolute !important;
  top: 1rem !important;
  right: 1rem !important;
  color: #ff1493 !important;
  font-size: 1.2rem !important;
  animation: sparkleFloat 4s ease-in-out infinite !important;
  z-index: 1 !important;
}

@keyframes sparkleFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-10px) rotate(180deg); opacity: 1; }
}

/* MySpace Content Styling */
.ts-profile-identity h1 {
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  color: #ff1493 !important;
  text-shadow: 
    2px 2px 0 #fff,
    4px 4px 0 #00bfff,
    6px 6px 8px rgba(0, 0, 0, 0.3) !important;
  animation: textGlow 3s ease-in-out infinite alternate !important;
}

@keyframes textGlow {
  0% { 
    text-shadow: 
      2px 2px 0 #fff,
      4px 4px 0 #00bfff,
      6px 6px 8px rgba(0, 0, 0, 0.3);
  }
  100% { 
    text-shadow: 
      2px 2px 0 #fff,
      4px 4px 0 #00bfff,
      6px 6px 8px rgba(0, 0, 0, 0.3),
      0 0 10px rgba(255, 20, 147, 0.8);
  }
}

.ts-profile-bio {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 3px solid #00bfff !important;
  border-radius: 12px !important;
  padding: 1rem !important;
  font-family: 'Impact', 'Arial Black', sans-serif !important;
  color: #333 !important;
  box-shadow: 
    0 0 15px rgba(0, 191, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
}

/* MySpace Blog Content */
.blog-post-title {
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  color: #ff1493 !important;
  border-bottom: 3px dashed #00bfff !important;
  padding-bottom: 0.5rem !important;
  margin-bottom: 1rem !important;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
}

.blog-post-content {
  font-family: 'Impact', 'Arial Black', sans-serif !important;
  line-height: 1.6 !important;
  color: #333 !important;
}

.blog-post-meta {
  color: #32cd32 !important;
  font-family: 'Comic Neue', 'Comic Sans MS', cursive !important;
  font-weight: 700 !important;
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.8) !important;
}

.blog-post-header {
  border-bottom: 2px solid #ff69b4 !important;
  padding-bottom: 0.75rem !important;
  margin-bottom: 0.75rem !important;
}`;