export const CLASSIC_LINEN_TEMPLATE = `/* ===========================================
   🧵 CLASSIC LINEN - VINTAGE ELEGANCE
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');

/* CSS_MODE:inherit */

/* Override thread-surface for linen background */
.thread-surface {
  background: #faf8f3 !important;
}

/* Classic Linen Navigation */
.site-header {
  background: #faf8f3 !important;
  border-bottom: 1px solid #d4c4b0 !important;
  backdrop-filter: none !important;
  box-shadow: 0 2px 8px rgba(139, 119, 101, 0.1) !important;
  position: relative !important;
}

.site-header::after {
  content: '' !important;
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 3px !important;
  background: repeating-linear-gradient(
    90deg,
    #8b7765 0px,
    #8b7765 2px,
    transparent 2px,
    transparent 4px
  ) !important;
  opacity: 0.3 !important;
}

.site-title {
  color: #3d3128 !important;
  font-family: 'Crimson Text', Georgia, serif !important;
  font-weight: 600 !important;
  letter-spacing: -0.5px !important;
  position: relative !important;
}

.site-title::before,
.site-title::after {
  content: '❦' !important;
  position: absolute !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  color: #8b7765 !important;
  font-size: 1rem !important;
  opacity: 0.5 !important;
}

.site-title::before {
  left: -1.5rem !important;
}

.site-title::after {
  right: -1.5rem !important;
}

.site-tagline {
  color: #5d4e37 !important;
  font-family: 'Lato', sans-serif !important;
  font-weight: 300 !important;
  font-style: italic !important;
}

.nav-link {
  color: #5d4e37 !important;
  font-family: 'Lato', sans-serif !important;
  font-weight: 400 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  font-size: 0.875rem !important;
  border-bottom: 1px dotted transparent !important;
  padding-bottom: 0.25rem !important;
  transition: all 0.2s ease !important;
}

.nav-link:hover {
  color: #3d3128 !important;
  border-bottom-color: #8b7765 !important;
  border-bottom-style: solid !important;
  text-decoration: none !important;
}

/* Vintage footer */
.site-footer {
  background: #faf8f3 !important;
  border-top: 3px double #8b7765 !important;
  position: relative !important;
}

.site-footer::before {
  content: '• • •' !important;
  position: absolute !important;
  top: -12px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: #faf8f3 !important;
  padding: 0 1rem !important;
  color: #8b7765 !important;
  font-size: 1rem !important;
  letter-spacing: 0.5rem !important;
}

.footer-tagline {
  color: #5d4e37 !important;
  font-family: 'Lato', sans-serif !important;
  font-weight: 300 !important;
  font-style: italic !important;
  text-align: center !important;
}

/* Vintage Interactive Buttons */
.notification-button {
  background: #faf8f3 !important;
  color: #3d3128 !important;
  border: 1px solid #8b7765 !important;
  border-radius: 50% !important;
  width: 40px !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: 'Lato', sans-serif !important;
  font-size: 1rem !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 2px 4px rgba(139, 119, 101, 0.2) !important;
  position: relative !important;
}

.notification-button:hover {
  background: #3d3128 !important;
  color: #faf8f3 !important;
  box-shadow: 0 4px 8px rgba(61, 49, 40, 0.3) !important;
}

.notification-button.has-notifications::after {
  content: '●' !important;
  position: absolute !important;
  top: -3px !important;
  right: -3px !important;
  color: #8b7765 !important;
  font-size: 1.2rem !important;
  font-weight: bold !important;
}

.user-dropdown-trigger {
  background: #faf8f3 !important;
  color: #5d4e37 !important;
  border: 1px solid #d4c4b0 !important;
  border-radius: 0 !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Lato', sans-serif !important;
  font-weight: 400 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  font-size: 0.8rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  transition: all 0.2s ease !important;
  position: relative !important;
}

.user-dropdown-trigger::after {
  content: '' !important;
  position: absolute !important;
  bottom: -3px !important;
  left: 0 !important;
  right: 0 !important;
  height: 1px !important;
  background: repeating-linear-gradient(
    90deg,
    #8b7765 0px,
    #8b7765 2px,
    transparent 2px,
    transparent 4px
  ) !important;
  opacity: 0 !important;
  transition: opacity 0.2s ease !important;
}

.user-dropdown-trigger:hover {
  color: #3d3128 !important;
  border-color: #8b7765 !important;
}

.user-dropdown-trigger:hover::after {
  opacity: 1 !important;
}

.new-post-button {
  background: #faf8f3 !important;
  color: #3d3128 !important;
  border: 2px solid #8b7765 !important;
  border-radius: 0 !important;
  padding: 1rem 2rem !important;
  font-family: 'Crimson Text', Georgia, serif !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
  font-size: 0.9rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 1rem !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 2px 4px rgba(139, 119, 101, 0.2) !important;
  position: relative !important;
}

.new-post-button::before {
  content: '§' !important;
  font-size: 1.3rem !important;
  font-family: 'Crimson Text', serif !important;
}

.new-post-button::after {
  content: '' !important;
  position: absolute !important;
  bottom: -4px !important;
  left: 0 !important;
  right: 0 !important;
  height: 2px !important;
  background: repeating-linear-gradient(
    90deg,
    #8b7765 0px,
    #8b7765 3px,
    transparent 3px,
    transparent 6px
  ) !important;
  opacity: 0 !important;
  transition: opacity 0.3s ease !important;
}

.new-post-button:hover {
  background: #3d3128 !important;
  color: #faf8f3 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 8px rgba(61, 49, 40, 0.3) !important;
}

.new-post-button:hover::after {
  opacity: 1 !important;
}

/* Linen texture background */
.ts-profile-container {
  background: 
    linear-gradient(90deg, transparent 79px, #e5d4c1 79px, #e5d4c1 81px, transparent 81px),
    linear-gradient(#f5f0e8 0.1em, transparent 0.1em),
    #faf8f3 !important;
  background-size: 100% 1.2em !important;
  border: 1px solid #d4c4b0 !important;
  border-radius: 0 !important;
  box-shadow: 
    0 4px 20px rgba(139, 119, 101, 0.1),
    inset 0 0 40px rgba(139, 119, 101, 0.05) !important;
  position: relative !important;
  padding: 2rem !important;
}

/* Vintage paper edge */
.ts-profile-container::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 4px !important;
  background: repeating-linear-gradient(
    90deg,
    #8b7765 0px,
    #8b7765 2px,
    transparent 2px,
    transparent 4px
  ) !important;
  opacity: 0.3 !important;
}

.ts-profile-container::after {
  content: '' !important;
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 4px !important;
  background: repeating-linear-gradient(
    90deg,
    #8b7765 0px,
    #8b7765 2px,
    transparent 2px,
    transparent 4px
  ) !important;
  opacity: 0.3 !important;
}

/* Elegant header */
.ts-profile-header {
  background: transparent !important;
  border-bottom: 3px double #8b7765 !important;
  padding: 2rem 0 !important;
  margin-bottom: 2rem !important;
  position: relative !important;
}

/* Decorative dots */
.ts-profile-header::after {
  content: '• • •' !important;
  position: absolute !important;
  bottom: -12px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: #faf8f3 !important;
  padding: 0 1rem !important;
  color: #8b7765 !important;
  font-size: 1rem !important;
  letter-spacing: 0.5rem !important;
}

/* Classic typography */
.ts-profile-display-name {
  font-family: 'Crimson Text', Georgia, serif !important;
  font-weight: 600 !important;
  color: #3d3128 !important;
  font-size: 2.75rem !important;
  text-align: center !important;
  letter-spacing: -0.5px !important;
  position: relative !important;
}

.ts-profile-display-name::before,
.ts-profile-display-name::after {
  content: '❦' !important;
  position: absolute !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  color: #8b7765 !important;
  font-size: 1.5rem !important;
  opacity: 0.5 !important;
}

.ts-profile-display-name::before {
  left: -2rem !important;
}

.ts-profile-display-name::after {
  right: -2rem !important;
}

.ts-profile-bio {
  background: transparent !important;
  border: none !important;
  padding: 1.5rem 2rem !important;
  color: #5d4e37 !important;
  font-family: 'Lato', sans-serif !important;
  font-weight: 300 !important;
  font-size: 1.05rem !important;
  line-height: 1.8 !important;
  text-align: center !important;
  font-style: italic !important;
  position: relative !important;
}

.ts-profile-bio::before {
  content: '"' !important;
  position: absolute !important;
  top: 0.5rem !important;
  left: 1rem !important;
  font-size: 3rem !important;
  color: #d4c4b0 !important;
  font-family: 'Crimson Text', serif !important;
}

.ts-profile-bio::after {
  content: '"' !important;
  position: absolute !important;
  bottom: 0.5rem !important;
  right: 1rem !important;
  font-size: 3rem !important;
  color: #d4c4b0 !important;
  font-family: 'Crimson Text', serif !important;
  transform: rotate(180deg) !important;
}

/* Vintage photo frame */
.ts-profile-photo-frame {
  border: 8px solid #fff !important;
  box-shadow: 
    0 2px 8px rgba(139, 119, 101, 0.2),
    inset 0 0 0 1px #d4c4b0 !important;
  border-radius: 2px !important;
  filter: sepia(20%) !important;
  transition: all 0.3s ease !important;
}

.ts-profile-photo-section:hover .ts-profile-photo-frame {
  filter: sepia(0%) !important;
  transform: scale(1.05) !important;
}

/* Classic buttons */
.thread-button {
  background: #faf8f3 !important;
  color: #3d3128 !important;
  border: 1px solid #8b7765 !important;
  border-radius: 0 !important;
  padding: 0.75rem 2rem !important;
  font-family: 'Lato', sans-serif !important;
  font-weight: 400 !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
  font-size: 0.75rem !important;
  transition: all 0.3s ease !important;
  position: relative !important;
}

.thread-button::after {
  content: '' !important;
  position: absolute !important;
  bottom: -4px !important;
  left: 0 !important;
  right: 0 !important;
  height: 1px !important;
  background: repeating-linear-gradient(
    90deg,
    #8b7765 0px,
    #8b7765 2px,
    transparent 2px,
    transparent 4px
  ) !important;
  opacity: 0 !important;
  transition: opacity 0.3s ease !important;
}

.thread-button:hover {
  background: #3d3128 !important;
  color: #faf8f3 !important;
}

.thread-button:hover::after {
  opacity: 1 !important;
}

/* Tab styling */
.profile-tab-button {
  background: transparent !important;
  color: #5d4e37 !important;
  border: none !important;
  border-bottom: 1px dotted #d4c4b0 !important;
  font-family: 'Lato', sans-serif !important;
  font-weight: 400 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
}

.profile-tab-button:hover {
  color: #3d3128 !important;
  border-bottom-style: solid !important;
}

.profile-tab-button[aria-selected="true"] {
  color: #3d3128 !important;
  border-bottom: 2px solid #8b7765 !important;
  font-weight: 700 !important;
}

/* Content modules */
.thread-module {
  background: rgba(255, 255, 255, 0.5) !important;
  border: 1px solid #e5d4c1 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* Blog posts with vintage style */
.blog-post {
  background: #fff !important;
  border: 1px solid #d4c4b0 !important;
  border-left: 3px solid #8b7765 !important;
  margin-bottom: 1.5rem !important;
  padding: 1.5rem !important;
  position: relative !important;
}

.blog-post::before {
  content: '§' !important;
  position: absolute !important;
  left: -10px !important;
  top: 1rem !important;
  background: #faf8f3 !important;
  color: #8b7765 !important;
  font-size: 1.25rem !important;
  padding: 0 4px !important;
  font-family: 'Crimson Text', serif !important;
}

/* Media grid with vintage photo album feel */
.media-item {
  border: 5px solid #fff !important;
  box-shadow: 0 2px 4px rgba(139, 119, 101, 0.2) !important;
  filter: sepia(30%) !important;
  transition: all 0.3s ease !important;
}

.media-item:hover {
  filter: sepia(0%) !important;
  transform: rotate(-2deg) scale(1.05) !important;
}

/* Classic Linen Create New Post Button (Blog Tab) */
.create-new-post-button {
  background: linear-gradient(135deg, #f5f5dc 0%, #e6ddd4 100%) !important;
  color: #8b4513 !important;
  border: 2px solid #8b4513 !important;
  border-radius: 8px !important;
  padding: 0.6rem 1.2rem !important;
  font-family: 'Crimson Text', serif !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  font-size: 0.85rem !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  box-shadow: 
    0 4px 8px rgba(139, 69, 19, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
}

.create-new-post-button::before {
  content: '§ ' !important;
  font-size: 1rem !important;
  font-weight: 700 !important;
}

.create-new-post-button::after {
  content: '' !important;
  position: absolute !important;
  bottom: -2px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 0% !important;
  height: 2px !important;
  background: repeating-linear-gradient(
    90deg,
    #8b4513,
    #8b4513 4px,
    transparent 4px,
    transparent 8px
  ) !important;
  transition: width 0.3s ease !important;
}

.create-new-post-button:hover {
  background: linear-gradient(135deg, #f0f0e6 0%, #e0d7ce 100%) !important;
  transform: translateY(-1px) !important;
  box-shadow: 
    0 6px 12px rgba(139, 69, 19, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
}

.create-new-post-button:hover::after {
  width: 100% !important;
}

/* Responsive Button Styles for Classic Linen */
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