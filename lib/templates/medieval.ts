export const MEDIEVAL_FANTASY_TEMPLATE = `/* ===========================================
   🏰 YE OLDE TAVERN HOMEPAGE TEMPLATE
   =========================================== */

/* Welcome to the Dragon & Pixel Inn! A cozy medieval fantasy theme
   inspired by old taverns, illuminated manuscripts, and fantasy RPGs */

@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;600;700&family=Uncial+Antiqua&display=swap');

/* ===========================================
   🌟 ANCIENT PARCHMENT & TAVERN ATMOSPHERE
   =========================================== */

/* Aged parchment background with subtle texture */
.site-layout {
  background: #f4f1e8;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(160, 82, 45, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(205, 133, 63, 0.01) 0%, transparent 50%);
  font-family: 'Cinzel', serif;
  position: relative;
  min-height: 100vh;
}

/* Subtle paper texture overlay */
.site-layout::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 1px 1px, rgba(139, 69, 19, 0.08) 1px, transparent 0);
  background-size: 25px 25px;
  pointer-events: none;
  z-index: 1;
}

/* ===========================================
   🛡️ BACKGROUND & FOOTER STYLING
   =========================================== */

/* Medieval tavern footer */
.site-footer {
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%) !important;
  border-top: 4px double #cd853f !important;
  color: #f4f1e8 !important;
  font-family: 'Cinzel', serif !important;
  text-align: center !important;
  padding: 1.5rem !important;
  position: relative !important;
  box-shadow: inset 0 4px 8px rgba(0,0,0,0.3) !important;
}

.site-footer::before {
  content: '🏰 Ye have reached the end of this scroll 🏰';
  display: block;
  font-family: 'MedievalSharp', cursive;
  font-size: 12px;
  margin-bottom: 8px;
  color: #cd853f;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

/* ===========================================
   🎨 NAVIGATION BAR STYLING (SAFE ZONE)
   =========================================== */

/* Medieval tavern navigation */
.site-header {
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%) !important;
  border-bottom: 4px double #cd853f !important;
  color: #f4f1e8 !important;
  font-family: 'Cinzel', serif !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
}

.site-title {
  color: #f4f1e8 !important;
  font-family: 'Uncial Antiqua', cursive !important;
  font-size: 1.8rem !important;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5) !important;
}

.site-tagline {
  color: #cd853f !important;
  font-family: 'MedievalSharp', cursive !important;
  font-style: italic !important;
}

.nav-link {
  background: rgba(205, 133, 63, 0.2) !important;
  color: #f4f1e8 !important;
  padding: 8px 16px !important;
  border: 2px solid #cd853f !important;
  margin: 0 4px !important;
  border-radius: 6px !important;
  font-family: 'MedievalSharp', cursive !important;
  font-size: 12px !important;
  font-weight: bold !important;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
  transition: all 0.3s ease !important;
}

.nav-link:hover {
  background: #cd853f !important;
  color: #2f1b14 !important;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
  transform: translateY(-2px) !important;
}

/* ===========================================
   🏰 CREATIVE HEADER - TAVERN ENTRANCE
   =========================================== */

.site-creative-header {
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #654321 100%);
  padding: 4rem 2rem;
  text-align: center;
  position: relative;
  border-bottom: 6px double #cd853f;
  box-shadow: inset 0 0 30px rgba(0,0,0,0.3);
  overflow: hidden;
}

.site-creative-header::before {
  content: '🏰 THE DRAGON & PIXEL INN 🏰';
  display: block;
  font-family: 'Uncial Antiqua', cursive;
  font-size: 2.5rem;
  color: #f4f1e8;
  text-shadow: 
    2px 2px 4px rgba(0,0,0,0.8),
    0 0 20px rgba(205, 133, 63, 0.5);
  margin-bottom: 1rem;
  animation: glow 3s ease-in-out infinite alternate;
}

@keyframes glow {
  from { 
    text-shadow: 
      2px 2px 4px rgba(0,0,0,0.8),
      0 0 20px rgba(205, 133, 63, 0.5);
  }
  to { 
    text-shadow: 
      2px 2px 4px rgba(0,0,0,0.8),
      0 0 30px rgba(205, 133, 63, 0.8);
  }
}

.site-creative-header::after {
  content: '"A warm hearth for weary adventurers"';
  display: block;
  font-family: 'MedievalSharp', cursive;
  font-size: 1.2rem;
  color: #cd853f;
  font-style: italic;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

/* 🚨 NAVIGATION FUNCTIONALITY PROTECTION 🚨
   DO NOT modify positioning, z-index, or layout properties of navigation.
   Stick to colors, fonts, and basic styling only! */

.site-main {
  padding: 2rem;
  position: relative;
  z-index: 10;
}

/* ===========================================
   📜 ILLUMINATED MANUSCRIPT PROFILE SCROLL
   =========================================== */

.profile-container {
  background: #f9f6f0;
  border: 4px double #8b4513;
  border-radius: 12px;
  padding: 0;
  margin: 2rem 0;
  position: relative;
  box-shadow: 
    0 8px 20px rgba(0,0,0,0.2),
    inset 0 0 30px rgba(205, 133, 63, 0.1);
}

/* Illuminated manuscript header */
.profile-header {
  background: linear-gradient(135deg, #cd853f 0%, #daa520 100%);
  border-bottom: 3px solid #8b4513;
  border-radius: 8px 8px 0 0;
  padding: 3rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.profile-header::before {
  content: '✨ ADVENTURER PROFILE ✨';
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(139, 69, 19, 0.8);
  color: #f4f1e8;
  padding: 6px 20px;
  border: 2px solid #cd853f;
  border-radius: 20px;
  font-family: 'MedievalSharp', cursive;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.profile-header::after {
  content: '🐉';
  position: absolute;
  top: 20px;
  right: 30px;
  font-size: 2rem;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.profile-display-name {
  color: #2f1b14;
  font-size: 3rem;
  font-family: 'Uncial Antiqua', cursive;
  text-shadow: 
    2px 2px 0px #f4f1e8,
    3px 3px 6px rgba(0,0,0,0.3);
  margin-bottom: 1rem;
  position: relative;
  z-index: 2;
}

.profile-bio {
  background: rgba(244, 241, 232, 0.9);
  border: 2px solid #8b4513;
  border-left: 6px solid #cd853f;
  padding: 2rem;
  margin: 2rem;
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  color: #2f1b14;
  line-height: 1.6;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.profile-bio::before {
  content: '📜';
  position: absolute;
  top: -12px;
  left: -12px;
  background: #cd853f;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 3px solid #8b4513;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

/* ===========================================
   📖 TAVERN TALES (BLOG POSTS)
   =========================================== */

.blog-post-card {
  background: #f9f6f0;
  border: 3px solid #8b4513;
  border-radius: 10px;
  margin: 2rem 0;
  padding: 2rem;
  position: relative;
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
}

.blog-post-card::before {
  content: '📜 TALE';
  position: absolute;
  top: -12px;
  right: 20px;
  background: #8b4513;
  color: #f4f1e8;
  padding: 6px 15px;
  border: 2px solid #cd853f;
  border-radius: 20px;
  font-family: 'MedievalSharp', cursive;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.blog-post-header {
  border-bottom: 2px solid #cd853f;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.blog-post-content {
  font-family: 'Cinzel', serif;
  color: #2f1b14;
  line-height: 1.7;
  font-size: 1.05rem;
}

/* ===========================================
   🍺 TAVERN PATRONS (FRIENDS)
   =========================================== */

.featured-friends {
  background: rgba(139, 69, 19, 0.1);
  border: 3px solid #8b4513;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  position: relative;
}

.featured-friends::before {
  content: '🍺 TAVERN PATRONS 🍺';
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #8b4513;
  color: #f4f1e8;
  padding: 8px 24px;
  border: 2px solid #cd853f;
  border-radius: 25px;
  font-family: 'MedievalSharp', cursive;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.friend-card {
  background: #f9f6f0;
  border: 2px solid #cd853f;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  position: relative;
}

.friend-card::before {
  content: '⚔️';
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 1.2rem;
  opacity: 0.6;
}

.friend-card:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  border-color: #8b4513;
}

/* ===========================================
   📋 QUEST BOARD (GUESTBOOK)
   =========================================== */

.guestbook-section {
  background: rgba(205, 133, 63, 0.1);
  border: 4px double #8b4513;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  position: relative;
}

.guestbook-section::before {
  content: '📋 QUEST BOARD 📋';
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #cd853f;
  color: #2f1b14;
  padding: 8px 24px;
  border: 3px solid #8b4513;
  border-radius: 25px;
  font-family: 'MedievalSharp', cursive;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.guestbook-entry {
  background: #f9f6f0;
  border: 2px solid #8b4513;
  border-left: 6px solid #cd853f;
  border-radius: 6px;
  padding: 1.5rem;
  margin: 1rem 0;
  position: relative;
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
}

.guestbook-entry::before {
  content: '🗡️';
  position: absolute;
  top: -8px;
  left: -8px;
  background: #8b4513;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #cd853f;
  font-size: 12px;
}

/* ===========================================
   🎛️ INTERACTIVE ELEMENTS
   =========================================== */

.profile-button {
  background: linear-gradient(135deg, #cd853f 0%, #daa520 100%);
  color: #2f1b14;
  border: 3px solid #8b4513;
  padding: 12px 24px;
  font-family: 'MedievalSharp', cursive;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
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
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s ease;
}

.profile-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.3);
  background: linear-gradient(135deg, #daa520 0%, #cd853f 100%);
}

.profile-button:hover::before {
  left: 100%;
}

.profile-tab-button {
  background: rgba(205, 133, 63, 0.3);
  color: #2f1b14;
  border: 2px solid #8b4513;
  border-radius: 8px 8px 0 0;
  padding: 10px 20px;
  margin: 0 2px;
  font-family: 'MedievalSharp', cursive;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: #cd853f;
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.profile-tab-panel {
  background: #f9f6f0;
  border: 3px solid #8b4513;
  border-top: none;
  border-radius: 0 0 10px 10px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* ===========================================
   📱 MOBILE RESPONSIVENESS
   =========================================== */

@media (max-width: 768px) {
  .profile-display-name {
    font-size: 2rem;
  }
  
  .site-main {
    padding: 1rem;
  }
  
  .site-creative-header::before {
    font-size: 2rem;
  }
}

/* ===========================================
   🎨 MEDIEVAL TYPOGRAPHY
   =========================================== */

/* Decorative initial letters */
.blog-post-content::first-letter {
  float: left;
  font-family: 'Uncial Antiqua', cursive;
  font-size: 4rem;
  line-height: 3rem;
  padding-right: 10px;
  padding-top: 5px;
  color: #8b4513;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

/* Medieval section headings */
.section-heading {
  font-family: 'MedievalSharp', cursive;
  color: #8b4513;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 1.2rem;
  border-bottom: 2px solid #cd853f;
  padding-bottom: 0.5rem;
  margin: 2rem 0 1rem 0;
  position: relative;
}

.section-heading::before {
  content: '⚜️';
  margin-right: 0.5rem;
  color: #cd853f;
}

/* Links with medieval styling */
a {
  color: #8b4513 !important;
  text-decoration: none !important;
  border-bottom: 1px dotted #cd853f !important;
  transition: all 0.3s ease !important;
}

a:hover {
  color: #cd853f !important;
  border-bottom-color: #8b4513 !important;
  text-shadow: 0 0 5px rgba(205, 133, 63, 0.5) !important;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: #f4f1e8;
}

::-webkit-scrollbar-thumb {
  background: #8b4513;
  border-radius: 6px;
  border: 2px solid #f4f1e8;
}

::-webkit-scrollbar-thumb:hover {
  background: #cd853f;
}`;