export const MINIMAL_CSS_TEMPLATE = `/* ===========================================
   🏠 PERSONAL HOMEPAGE TEMPLATE
   =========================================== */

/* Simple but charming design inspired by early personal websites
   Perfect for your first homepage! 
   
   Note: This template is resilient against site-wide CSS
   by using higher specificity and strategic !important declarations. */

@import url('https://fonts.googleapis.com/css2?family=Trebuchet+MS&family=Georgia:wght@400;700&display=swap');

/* ===========================================
   🌟 HOMEPAGE BASICS - SIMPLE & CLEAN
   =========================================== */

/* Classic web background */
.profile-container .site-layout,
.site-layout {
  background: #e0e0e0 !important;
  background-image: 
    linear-gradient(45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(-45deg, #d0d0d0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d0d0d0 75%),
    linear-gradient(-45deg, transparent 75%, #d0d0d0 75%) !important;
  background-size: 20px 20px !important;
  font-family: 'Trebuchet MS', sans-serif !important;
}

/* ===========================================
   🛡️ BACKGROUND & FOOTER STYLING
   =========================================== */

/* Simple footer to match the minimal theme */
.profile-container .site-footer,
.site-footer {
  background: #4a4a4a !important;
  border-top: 2px solid #333 !important;
  color: #ccc !important;
  text-align: center !important;
  padding: 1rem !important;
  font-size: 11px !important;
}

/* ===========================================
   🎨 NAVIGATION BAR STYLING (SAFE ZONE)
   =========================================== */

/* Simple, clean navigation styling */
.profile-container .site-header,
.site-header {
  background: #333 !important;
  color: #fff !important;
  font-family: 'Trebuchet MS', sans-serif !important;
}

.site-title {
  color: #fff !important;
  font-family: 'Georgia', serif !important;
}

.site-tagline {
  color: #ccc !important;
}

.nav-link {
  color: #fff !important;
  background: #666 !important;
  padding: 6px 12px !important;
  border: 1px solid #888 !important;
  margin: 0 2px !important;
  text-decoration: none !important;
  font-size: 12px !important;
}

.nav-link:hover {
  background: #888 !important;
  color: #fff !important;
}

/* ===========================================
   🏠 CREATIVE HEADER - SIMPLE ELEGANCE
   =========================================== */

.site-creative-header {
  background: linear-gradient(135deg, #87CEEB, #4682B4);
  padding: 2rem;
  text-align: center;
  border-bottom: 2px solid #333;
  position: relative;
}

.site-creative-header::before {
  content: 'Welcome to My Personal Space';
  display: block;
  font-family: 'Georgia', serif;
  font-size: 1.8rem;
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
  margin-bottom: 0.5rem;
}

.site-creative-header::after {
  content: 'A simple corner of the web';
  display: block;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 1rem;
  color: #f0f0f0;
  font-style: italic;
}

/* 🚨 NAVIGATION FUNCTIONALITY PROTECTION 🚨
   DO NOT modify positioning, z-index, or layout properties of navigation.
   Stick to colors, fonts, and basic styling only! */

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
  content: 'Welcome!';
  position: absolute;
  top: 10px;
  right: 20px;
  background: #fff;
  color: #333;
  padding: 4px 12px;
  border: 1px solid #333;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.profile-display-name {
  color: #fff;
  font-size: 2.2rem;
  font-family: 'Georgia', serif;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  margin-bottom: 0.5rem;
}

.profile-bio {
  background: #f8f8f8;
  border-left: 4px solid #4682B4;
  padding: 1rem;
  margin: 1rem;
  font-style: italic;
  color: #555;
}

/* ===========================================
   📝 BLOG POSTS - CLEAN STYLE
   =========================================== */

.blog-post-card {
  background: #fff;
  border: 1px solid #ccc;
  border-left: 4px solid #4682B4;
  margin: 1.5rem 0;
  padding: 1.5rem;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.blog-post-header {
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.blog-post-content {
  font-family: 'Trebuchet MS', sans-serif;
  color: #333;
  line-height: 1.6;
}

/* ===========================================
   👥 FRIENDS & SOCIAL
   =========================================== */

.featured-friends {
  background: #f0f0f0;
  border: 1px solid #ccc;
  padding: 1rem;
  margin: 1rem 0;
}

.friend-card {
  background: #fff;
  border: 1px solid #ddd;
  padding: 0.75rem;
  margin: 0.5rem;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

.friend-card:hover {
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
  transform: translateY(-1px);
}

/* ===========================================
   💌 GUESTBOOK
   =========================================== */

.guestbook-section {
  background: #fafafa;
  border: 1px solid #ddd;
  padding: 1.5rem;
  margin: 1.5rem 0;
}

.guestbook-entry {
  background: #fff;
  border-left: 3px solid #87CEEB;
  padding: 1rem;
  margin: 1rem 0;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

/* ===========================================
   🎛️ INTERACTIVE ELEMENTS
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

.profile-tab-button {
  background: #e0e0e0;
  color: #333;
  border: 1px solid #ccc;
  padding: 6px 12px;
  margin: 2px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: #4682B4;
  color: #fff;
  border-color: #333;
}

.profile-tab-panel {
  background: #fff;
  border-top: 2px solid #666;
  padding: 1.5rem;
}

/* ===========================================
   📱 MOBILE RESPONSIVENESS
   =========================================== */

@media (max-width: 768px) {
  .site-main {
    padding: 1rem;
  }
  
  .profile-display-name {
    font-size: 1.8rem;
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

/* Profile photo minimal styling */
.profile-photo-frame {
  background: #fff;
  padding: 4px;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.profile-photo-image {
  border: 1px solid #ddd;
}

.profile-photo-placeholder {
  background: #f0f0f0 !important;
  color: #666 !important;
  border: 1px dashed #ccc !important;
}

/* Website section minimal styling */
.websites-section {
  background: #f8f8f8;
  border: 1px solid #ddd;
  padding: 1rem;
  margin: 1rem 0;
}

.website-item {
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-left: 3px solid #4682B4;
}

.website-link {
  color: #4682B4 !important;
  font-weight: 600 !important;
}

.website-link:hover {
  color: #333 !important;
  text-decoration: underline !important;
}

/* Comment styling - clean and minimal */
.comment-container {
  background: #fafafa;
  border: 1px solid #eee;
  padding: 1rem;
  margin: 0.75rem 0;
  border-radius: 4px;
}

.comment-content {
  color: #555 !important;
  line-height: 1.6 !important;
}

.comment-button {
  background: #4682B4 !important;
  color: #fff !important;
  border: 1px solid #333 !important;
  padding: 4px 8px !important;
  font-size: 11px !important;
  border-radius: 2px !important;
}

.comment-button:hover {
  background: #5a9fd4 !important;
}

.comment-thread {
  border-left: 2px solid #ddd !important;
  margin-left: 1rem !important;
  padding-left: 1rem !important;
}

/* Clean link styling */
a {
  color: #4682B4;
  text-decoration: none;
  border-bottom: 1px dotted #4682B4;
}

a:hover {
  color: #333;
  border-bottom: 1px solid #333;
}`;