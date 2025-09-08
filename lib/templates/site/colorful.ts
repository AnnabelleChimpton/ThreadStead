export const COLORFUL_SITE_TEMPLATE = `/* ===========================================
   🌈 VIBRANT COLORFUL THEME
   =========================================== */

/* A fun, colorful theme with rainbow accents and gradients */

@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

/* ===========================================
   🎨 VIBRANT COLOR PALETTE
   =========================================== */

:root {
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --gradient-accent: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --gradient-success: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  --rainbow: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3);
}

/* ===========================================
   🌟 SITE LAYOUT TRANSFORMATION
   =========================================== */

.site-layout {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  min-height: 100vh !important;
  font-family: 'Poppins', sans-serif !important;
}

.site-header {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2) !important;
}

.site-title {
  background: var(--rainbow) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-family: 'Poppins', sans-serif !important;
  font-weight: 700 !important;
  font-size: 1.75rem !important;
  animation: rainbow-shift 3s ease-in-out infinite !important;
}

@keyframes rainbow-shift {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(180deg); }
}

.site-tagline {
  background: var(--gradient-primary) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-weight: 600 !important;
}

/* ===========================================
   🎯 NAVIGATION STYLING
   =========================================== */

.nav-link {
  background: var(--gradient-accent) !important;
  color: white !important;
  border: none !important;
  border-radius: 25px !important;
  padding: 8px 20px !important;
  margin: 0 4px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3) !important;
}

.nav-link:hover {
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4) !important;
  background: var(--gradient-secondary) !important;
}

/* ===========================================
   💎 CONTENT CARDS
   =========================================== */

.thread-module,
.retro-card {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15) !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  overflow: hidden !important;
}

.thread-module::before,
.retro-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--rainbow);
  animation: rainbow-shift 3s ease-in-out infinite;
}

.thread-module:hover,
.retro-card:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
}

/* ===========================================
   🎨 TYPOGRAPHY
   =========================================== */

.thread-headline,
h1, h2, h3, h4, h5, h6 {
  background: var(--gradient-primary) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-family: 'Poppins', sans-serif !important;
  font-weight: 600 !important;
}

.thread-label {
  background: var(--gradient-accent) !important;
  color: white !important;
  padding: 4px 12px !important;
  border-radius: 15px !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  display: inline-block !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}

/* ===========================================
   🔘 BUTTONS & FORMS
   =========================================== */

.thread-button,
button {
  background: var(--gradient-secondary) !important;
  color: white !important;
  border: none !important;
  border-radius: 25px !important;
  padding: 12px 30px !important;
  font-family: 'Poppins', sans-serif !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3) !important;
}

.thread-button:hover,
button:hover {
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 0 8px 25px rgba(245, 87, 108, 0.4) !important;
  background: var(--gradient-accent) !important;
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="search"],
textarea {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 2px solid rgba(102, 126, 234, 0.3) !important;
  border-radius: 15px !important;
  padding: 12px 20px !important;
  font-family: 'Poppins', sans-serif !important;
  transition: all 0.3s ease !important;
}

input:focus,
textarea:focus {
  border-color: #667eea !important;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.2) !important;
  outline: none !important;
}

/* ===========================================
   📱 TABS & NAVIGATION
   =========================================== */

.tab-button {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #667eea !important;
  border: 2px solid rgba(102, 126, 234, 0.3) !important;
  border-radius: 15px 15px 0 0 !important;
  padding: 10px 20px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
}

.tab-button:hover,
.tab-button.active {
  background: var(--gradient-primary) !important;
  color: white !important;
  border-color: #667eea !important;
  transform: translateY(-2px) !important;
}

/* ===========================================
   🌐 FOOTER
   =========================================== */

.site-footer {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border-top: 2px solid rgba(102, 126, 234, 0.3) !important;
  color: #667eea !important;
  margin-top: 4rem !important;
}

/* ===========================================
   ✨ SPECIAL EFFECTS
   =========================================== */

/* Selection */
::selection {
  background: rgba(102, 126, 234, 0.3) !important;
  color: white !important;
}

/* Links */
a {
  background: var(--gradient-accent) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  text-decoration: none !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
}

a:hover {
  background: var(--gradient-secondary) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  transform: scale(1.05) !important;
}

/* ===========================================
   🎊 FLOATING PARTICLES ANIMATION
   =========================================== */

.site-layout::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 80%, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(78, 205, 196, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(69, 183, 209, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-10px) rotate(1deg); }
  66% { transform: translateY(5px) rotate(-1deg); }
}

/* ===========================================
   📱 RESPONSIVE DESIGN
   =========================================== */

@media (max-width: 768px) {
  .site-title {
    font-size: 1.5rem !important;
  }
  
  .nav-link {
    padding: 6px 15px !important;
    margin: 2px !important;
    font-size: 0.875rem !important;
  }
  
  .thread-module,
  .retro-card {
    border-radius: 15px !important;
    margin: 1rem 0 !important;
  }
}`;