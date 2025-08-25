export const DEFAULT_CSS_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap');

/* Classic GeoCities Homepage */
.site-layout {
  background: linear-gradient(45deg, #ff69b4, #00ced1, #ffd700, #ff69b4) !important;
  background-size: 400% 400% !important;
  animation: rainbow 4s ease infinite !important;
  font-family: 'Comic Neue', cursive !important;
  color: #fff !important;
  text-shadow: 2px 2px 4px #000 !important;
}

.site-header {
  background: rgba(139, 0, 139, 0.9) !important;
  border-bottom: 5px solid #ffd700 !important;
  color: #fff !important;
  box-shadow: 0 0 20px #ff69b4 !important;
}

.site-title {
  color: #ffd700 !important;
  font-size: 2rem !important;
  animation: pulse 2s infinite !important;
  text-shadow: 3px 3px 6px #000 !important;
}

.nav-link {
  background: linear-gradient(45deg, #ff1493, #00bfff) !important;
  color: #fff !important;
  border: 2px solid #ffd700 !important;
  padding: 8px 16px !important;
  margin: 0 4px !important;
  text-transform: uppercase !important;
  font-weight: bold !important;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.3) !important;
}

.nav-link:hover {
  background: linear-gradient(45deg, #00bfff, #ff1493) !important;
  transform: scale(1.1) !important;
  box-shadow: 0 0 15px #ffd700 !important;
}

.ts-profile-container {
  background: rgba(255, 255, 255, 0.95);
  border: 5px dashed #ff69b4;
  border-radius: 20px;
  box-shadow: 0 0 30px rgba(255, 105, 180, 0.6);
  margin: 2rem 0;
  position: relative;
}

.ts-profile-header {
  background: linear-gradient(135deg, #ff1493, #00bfff);
  border-radius: 15px 15px 0 0;
  padding: 2rem;
  text-align: center;
  border-bottom: 3px solid #ffd700;
}

.ts-profile-display-name {
  color: #fff;
  font-size: 2.5rem;
  animation: bounce 2s infinite;
  text-shadow: 4px 4px 8px #000;
  font-family: 'Comic Neue', cursive;
}

.ts-profile-bio {
  background: #ffff99;
  border: 3px solid #ff1493;
  color: #8b008b;
  padding: 1.5rem;
  margin: 1.5rem;
  border-radius: 10px;
  font-weight: bold;
  box-shadow: inset 0 0 10px rgba(255, 20, 147, 0.3);
}

.blog-post-card {
  background: linear-gradient(135deg, #fffacd, #f0f8ff);
  border: 3px solid #ff1493;
  border-radius: 15px;
  margin: 2rem 0;
  padding: 1.5rem;
  box-shadow: 5px 5px 15px rgba(0,0,0,0.2);
  color: #8b008b;
}

.profile-tab-button {
  background: linear-gradient(45deg, #ffd700, #ffa500) !important;
  color: #8b008b !important;
  border: 3px solid #ff1493 !important;
  padding: 10px 20px !important;
  margin: 0 3px !important;
  font-family: 'Comic Neue', cursive !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  border-radius: 20px !important;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.3) !important;
}

.profile-tab-button:hover {
  background: linear-gradient(45deg, #ff1493, #00bfff) !important;
  color: #fff !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 0 15px #ffd700 !important;
}

.profile-tab-button[aria-selected="true"] {
  background: linear-gradient(45deg, #ff1493, #8b008b) !important;
  color: #fff !important;
  transform: scale(1.1) !important;
  box-shadow: 0 0 20px #ff69b4 !important;
}

@keyframes rainbow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}`;