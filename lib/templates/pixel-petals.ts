export const PIXEL_PETALS_TEMPLATE = `/* ===========================================
   🌸 PIXEL PETALS - KAWAII GARDEN
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&family=Quicksand:wght@400;500;600&display=swap');


/* Override thread-surface for kawaii background */
.thread-surface {
  background: linear-gradient(135deg, #ffe0f0 0%, #ffd4e8 100%) !important;
}

/* Kawaii Navigation */
.site-header {
  background: linear-gradient(135deg, #ff69b4 0%, #ffb6d9 50%, #ffc0cb 100%) !important;
  border-bottom: 3px solid #ff69b4 !important;
  backdrop-filter: none !important;
  box-shadow: 0 4px 16px rgba(255, 105, 180, 0.3) !important;
  position: relative !important;
}

.site-header::after {
  content: '🌸' !important;
  position: absolute !important;
  top: 50% !important;
  right: 2rem !important;
  transform: translateY(-50%) !important;
  font-size: 1.5rem !important;
  animation: bounce 2s infinite !important;
}

.site-title {
  color: #fff !important;
  font-family: 'Comfortaa', cursive !important;
  font-weight: 700 !important;
  text-shadow: 2px 2px 0 #ff69b4, 4px 4px 8px rgba(255, 105, 180, 0.3) !important;
}

.site-tagline {
  color: rgba(255, 255, 255, 0.9) !important;
  font-family: 'Quicksand', sans-serif !important;
  font-weight: 500 !important;
}

.nav-link {
  color: #fff !important;
  font-family: 'Quicksand', sans-serif !important;
  font-weight: 600 !important;
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  padding: 0.5rem 1rem !important;
  transition: all 0.2s ease !important;
  text-transform: lowercase !important;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 8px rgba(255, 105, 180, 0.2) !important;
  text-decoration: none !important;
}

/* Kawaii footer */
.site-footer {
  background: #fff !important;
  border-top: 3px dashed #ffb6d9 !important;
  position: relative !important;
}

.site-footer::before {
  content: '💕' !important;
  position: absolute !important;
  top: -15px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: #fff !important;
  padding: 0 1rem !important;
  font-size: 1.5rem !important;
}

.footer-tagline {
  color: #d63384 !important;
  font-family: 'Quicksand', sans-serif !important;
  font-weight: 500 !important;
}

/* Kawaii Interactive Buttons */
.notification-button {
  background: linear-gradient(135deg, #ff69b4 0%, #ffb6d9 100%) !important;
  color: white !important;
  border: 3px solid #fff !important;
  border-radius: 50% !important;
  width: 45px !important;
  height: 45px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 1.2rem !important;
  box-shadow: 
    0 4px 0 #d63384,
    0 6px 12px rgba(255, 105, 180, 0.3) !important;
  transition: all 0.2s ease !important;
  position: relative !important;
}

.notification-button:hover {
  transform: translateY(2px) !important;
  box-shadow: 
    0 2px 0 #d63384,
    0 4px 8px rgba(255, 105, 180, 0.2) !important;
}

.notification-button.has-notifications::after {
  content: '💕' !important;
  position: absolute !important;
  top: -8px !important;
  right: -8px !important;
  font-size: 1rem !important;
  animation: bounce 1s infinite !important;
}

.user-dropdown-trigger {
  background: linear-gradient(135deg, #ff69b4 0%, #ffb6d9 100%) !important;
  color: white !important;
  border: 3px solid #fff !important;
  border-radius: 25px !important;
  padding: 0.5rem 1.25rem !important;
  font-family: 'Comfortaa', cursive !important;
  font-weight: 600 !important;
  text-transform: lowercase !important;
  font-size: 0.9rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  box-shadow: 
    0 4px 0 #d63384,
    0 6px 12px rgba(255, 105, 180, 0.3) !important;
  transition: all 0.2s ease !important;
  position: relative !important;
}

.user-dropdown-trigger::after {
  content: '✨' !important;
  font-size: 0.9rem !important;
}

.user-dropdown-trigger:hover {
  transform: translateY(2px) !important;
  box-shadow: 
    0 2px 0 #d63384,
    0 4px 8px rgba(255, 105, 180, 0.2) !important;
}

.new-post-button {
  background: linear-gradient(135deg, #ff69b4 0%, #ffb6d9 100%) !important;
  color: white !important;
  border: 4px solid #fff !important;
  border-radius: 30px !important;
  padding: 1rem 2rem !important;
  font-family: 'Comfortaa', cursive !important;
  font-weight: 700 !important;
  text-transform: lowercase !important;
  letter-spacing: 0.5px !important;
  font-size: 1rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  box-shadow: 
    0 6px 0 #d63384,
    0 8px 16px rgba(255, 105, 180, 0.3) !important;
  transition: all 0.2s ease !important;
  position: relative !important;
}

.new-post-button::before {
  content: '📝' !important;
  font-size: 1.2rem !important;
}

.new-post-button::after {
  content: '💖' !important;
  font-size: 1rem !important;
}

.new-post-button:hover {
  transform: translateY(3px) !important;
  box-shadow: 
    0 3px 0 #d63384,
    0 5px 10px rgba(255, 105, 180, 0.2) !important;
  animation: bounce 0.5s ease !important;
}

/* Tiled pixel background */
.ts-profile-container {
  background: 
    repeating-linear-gradient(
      90deg,
      #ffe0f0 0px,
      #ffe0f0 20px,
      #ffd4e8 20px,
      #ffd4e8 40px
    ),
    repeating-linear-gradient(
      0deg,
      #ffe0f0 0px,
      #ffe0f0 20px,
      #ffd4e8 20px,
      #ffd4e8 40px
    ) !important;
  background-size: 40px 40px !important;
  border: 4px solid #ff69b4 !important;
  border-radius: 20px !important;
  box-shadow: 
    0 8px 32px rgba(255, 105, 180, 0.2),
    inset 0 0 0 2px #fff !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Floating petals animation */
.ts-profile-container::before,
.ts-profile-container::after {
  content: '🌸' !important;
  position: absolute !important;
  font-size: 2rem !important;
  animation: float 10s infinite ease-in-out !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

.ts-profile-container::before {
  top: 10% !important;
  left: 5% !important;
  animation-delay: 0s !important;
}

.ts-profile-container::after {
  top: 60% !important;
  right: 10% !important;
  animation-delay: 5s !important;
  content: '🌺' !important;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(10px) rotate(240deg); }
}

/* Kawaii header */
.ts-profile-header {
  background: linear-gradient(135deg, #ff69b4 0%, #ffb6d9 50%, #ffc0cb 100%) !important;
  padding: 2rem !important;
  border-radius: 16px !important;
  margin-bottom: 1.5rem !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Bubble decoration */
.ts-profile-header::before {
  content: '' !important;
  position: absolute !important;
  width: 100px !important;
  height: 100px !important;
  background: rgba(255, 255, 255, 0.3) !important;
  border-radius: 50% !important;
  top: -50px !important;
  right: -30px !important;
}

.ts-profile-header::after {
  content: '' !important;
  position: absolute !important;
  width: 60px !important;
  height: 60px !important;
  background: rgba(255, 255, 255, 0.2) !important;
  border-radius: 50% !important;
  bottom: -30px !important;
  left: 20px !important;
}

/* Cute typography */
.ts-profile-display-name {
  font-family: 'Comfortaa', cursive !important;
  font-weight: 700 !important;
  color: #fff !important;
  text-shadow: 
    2px 2px 0 #ff69b4,
    4px 4px 8px rgba(255, 105, 180, 0.3) !important;
  font-size: 2.5rem !important;
  animation: bounce 2s infinite !important;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.ts-profile-bio {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 2px solid #ffb6d9 !important;
  border-radius: 16px !important;
  padding: 1.25rem !important;
  color: #d63384 !important;
  font-family: 'Quicksand', sans-serif !important;
  font-weight: 500 !important;
  line-height: 1.7 !important;
  box-shadow: 0 4px 12px rgba(255, 105, 180, 0.1) !important;
  position: relative !important;
}

/* Heart decoration */
.ts-profile-bio::after {
  content: '💕' !important;
  position: absolute !important;
  top: -10px !important;
  right: 20px !important;
  font-size: 1.5rem !important;
}

/* Polaroid-style photo */
.ts-profile-photo-frame {
  background: #fff !important;
  border: 10px solid #fff !important;
  box-shadow: 
    0 4px 16px rgba(255, 105, 180, 0.2),
    0 0 0 2px #ffb6d9 !important;
  transform: rotate(-5deg) !important;
  transition: all 0.3s ease !important;
  border-radius: 8px !important;
}

.ts-profile-photo-section:hover .ts-profile-photo-frame {
  transform: rotate(5deg) scale(1.1) !important;
  box-shadow: 
    0 8px 24px rgba(255, 105, 180, 0.3),
    0 0 0 2px #ff69b4 !important;
}

/* Kawaii buttons */
.thread-button {
  background: linear-gradient(135deg, #ff69b4 0%, #ffb6d9 100%) !important;
  color: white !important;
  border: 3px solid #fff !important;
  border-radius: 25px !important;
  padding: 0.75rem 1.75rem !important;
  font-family: 'Comfortaa', cursive !important;
  font-weight: 600 !important;
  text-transform: lowercase !important;
  letter-spacing: 0.5px !important;
  box-shadow: 
    0 4px 0 #d63384,
    0 6px 12px rgba(255, 105, 180, 0.3) !important;
  transition: all 0.2s ease !important;
  position: relative !important;
}

.thread-button:hover {
  transform: translateY(2px) !important;
  box-shadow: 
    0 2px 0 #d63384,
    0 4px 8px rgba(255, 105, 180, 0.2) !important;
}

.thread-button::after {
  content: '✨' !important;
  position: absolute !important;
  right: 1rem !important;
}

/* Tab styling */
.profile-tab-button {
  background: #fff !important;
  color: #ff69b4 !important;
  border: 2px solid #ffb6d9 !important;
  border-radius: 20px 20px 0 0 !important;
  font-family: 'Quicksand', sans-serif !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

.profile-tab-button:hover {
  background: #ffe0f0 !important;
  border-color: #ff69b4 !important;
}

.profile-tab-button[aria-selected="true"] {
  background: #ff69b4 !important;
  color: #fff !important;
  border-color: #ff69b4 !important;
}

/* Content cards */
.thread-module {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 2px solid #ffb6d9 !important;
  border-radius: 16px !important;
  box-shadow: 0 4px 12px rgba(255, 105, 180, 0.1) !important;
}

/* Blog posts */
.blog-post {
  background: #fff !important;
  border: 2px dashed #ffb6d9 !important;
  border-radius: 12px !important;
  padding: 1.5rem !important;
  position: relative !important;
}

.blog-post::before {
  content: '📝' !important;
  position: absolute !important;
  top: -10px !important;
  left: 20px !important;
  background: #fff !important;
  padding: 0 8px !important;
  font-size: 1.25rem !important;
}

/* Pixel Petals Create New Post Button (Blog Tab) */
.create-new-post-button {
  background: linear-gradient(135deg, #ff69b4 0%, #ffb6d9 50%, #ffc0cb 100%) !important;
  color: white !important;
  border: 3px solid #fff !important;
  border-radius: 25px !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Comfortaa', cursive !important;
  font-weight: 700 !important;
  text-transform: lowercase !important;
  letter-spacing: 0.3px !important;
  font-size: 0.85rem !important;
  transition: all 0.2s ease !important;
  position: relative !important;
  box-shadow: 
    0 4px 0 #d63384,
    0 6px 12px rgba(255, 105, 180, 0.3) !important;
}

.create-new-post-button::before {
  content: '📝💖 ' !important;
  font-size: 1rem !important;
}

.create-new-post-button:hover {
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 
    0 6px 0 #d63384,
    0 8px 16px rgba(255, 105, 180, 0.4) !important;
  animation: bounce 0.6s ease !important;
}

@keyframes bounce {
  0%, 100% { transform: translateY(-2px) scale(1.05); }
  50% { transform: translateY(-4px) scale(1.08); }
}

/* Responsive Button Styles for Pixel Petals */
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
    padding: 0.5rem 1rem !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.2px !important;
  }
  
  .create-new-post-button {
    padding: 0.5rem 1rem !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.2px !important;
  }
  
  .create-new-post-button::before {
    font-size: 0.9rem !important;
  }
}`;