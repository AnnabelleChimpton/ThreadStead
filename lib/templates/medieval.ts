export const MEDIEVAL_FANTASY_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;600;700&family=Uncial+Antiqua&display=swap');

/* Medieval Tavern Theme */
.site-layout {
  background: #f4f1e8;
  background-image: radial-gradient(circle at 20% 80%, rgba(139, 69, 19, 0.03) 0%, transparent 50%);
  font-family: 'Cinzel', serif;
  position: relative;
  min-height: 100vh;
}

.site-layout::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(139, 69, 19, 0.08) 1px, transparent 0);
  background-size: 25px 25px;
  pointer-events: none;
  z-index: 1;
}

.site-footer {
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%) !important;
  border-top: 4px double #cd853f !important;
  color: #f4f1e8 !important;
  font-family: 'Cinzel', serif !important;
}

.site-header {
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%) !important;
  border-bottom: 4px double #cd853f !important;
  color: #f4f1e8 !important;
  font-family: 'Cinzel', serif !important;
}

.site-title {
  color: #ffd700 !important;
  font-family: 'MedievalSharp', cursive !important;
  font-size: 2rem !important;
  text-shadow: 3px 3px 6px rgba(0,0,0,0.7) !important;
}

.nav-link {
  background: linear-gradient(135deg, #cd853f, #daa520) !important;
  color: #8b4513 !important;
  border: 2px solid #8b4513 !important;
  padding: 8px 16px !important;
  margin: 0 4px !important;
  font-family: 'Cinzel', serif !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2) !important;
}

.nav-link:hover {
  background: linear-gradient(135deg, #daa520, #ffd700) !important;
  transform: translateY(-1px) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 8px rgba(0,0,0,0.3) !important;
}

.ts-profile-container {
  background: linear-gradient(135deg, #f9f6f0, #f4f1e8);
  border: 3px solid #8b4513;
  border-radius: 15px;
  box-shadow: 0 8px 20px rgba(139, 69, 19, 0.3), inset 0 2px 4px rgba(255,255,255,0.3);
  margin: 2rem 0;
  position: relative;
  z-index: 2;
}

.ts-profile-header {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  border-radius: 12px 12px 0 0;
  padding: 2.5rem;
  text-align: center;
  border-bottom: 4px double #cd853f;
}

.ts-profile-display-name {
  color: #ffd700;
  font-family: 'MedievalSharp', cursive;
  font-size: 2.5rem;
  text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
  margin-bottom: 0.5rem;
}

.ts-profile-bio {
  background: rgba(205, 133, 63, 0.1);
  border: 2px solid #cd853f;
  border-left: 6px solid #8b4513;
  color: #5d4037;
  padding: 2rem;
  margin: 2rem;
  border-radius: 10px;
  font-family: 'Cinzel', serif;
  font-style: italic;
  box-shadow: inset 0 2px 4px rgba(139, 69, 19, 0.1);
}

.blog-post-card {
  background: linear-gradient(135deg, #faf8f5, #f4f1e8);
  border: 2px solid #cd853f;
  border-left: 6px solid #8b4513;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  color: #5d4037;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.15);
}

.profile-tab-button {
  background: linear-gradient(135deg, #cd853f, #daa520) !important;
  color: #8b4513 !important;
  border: 2px solid #8b4513 !important;
  padding: 10px 20px !important;
  margin: 0 4px !important;
  font-family: 'Cinzel', serif !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2) !important;
}

.profile-tab-button:hover {
  background: linear-gradient(135deg, #daa520, #ffd700) !important;
  transform: translateY(-1px) !important;
}

.profile-tab-button[aria-selected="true"] {
  background: linear-gradient(135deg, #8b4513, #a0522d) !important;
  color: #ffd700 !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
}`;