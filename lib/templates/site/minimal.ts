export const MINIMAL_SITE_TEMPLATE = `/* ===========================================
   ✨ MINIMAL SITE ENHANCEMENTS
   =========================================== */

/* Subtle improvements that enhance the default design
   without overwhelming changes */

/* ===========================================
   🎨 SUBTLE COLOR ENHANCEMENTS
   =========================================== */

.site-title {
  color: #2563eb !important;
  font-weight: 700 !important;
}

.nav-link:hover {
  background: #f1f5f9 !important;
  border-radius: 6px !important;
  color: #2563eb !important;
}

/* ===========================================
   📦 IMPROVED CARD STYLING
   =========================================== */

.thread-module,
.retro-card {
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
  transition: all 0.2s ease !important;
}

.thread-module:hover,
.retro-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  transform: translateY(-1px) !important;
}

/* ===========================================
   🔘 BUTTON IMPROVEMENTS
   =========================================== */

.thread-button {
  border-radius: 8px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

.thread-button:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
}

/* ===========================================
   📝 FORM ENHANCEMENTS
   =========================================== */

input[type="text"],
input[type="email"],
input[type="password"],
input[type="search"],
textarea {
  border-radius: 8px !important;
  border: 2px solid #e2e8f0 !important;
  transition: border-color 0.2s ease !important;
}

input:focus,
textarea:focus {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
}

/* ===========================================
   💫 SUBTLE ANIMATIONS
   =========================================== */

.site-header {
  backdrop-filter: blur(8px) !important;
}

a {
  transition: color 0.2s ease !important;
}

a:hover {
  color: #2563eb !important;
}`;