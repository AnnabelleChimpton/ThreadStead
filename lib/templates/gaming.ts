export const RETRO_GAMING_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

/* 8-bit Gaming Theme */
.site-layout {
  background: #0f0f0f;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: #00ff00;
  image-rendering: pixelated;
}

.site-footer {
  background: #1a1a1a !important;
  border-top: 2px solid #00ff00 !important;
  color: #00ff00 !important;
}

.site-header {
  background: #1a1a1a !important;
  border-bottom: 2px solid #00ff00 !important;
  color: #00ff00 !important;
  font-family: 'Press Start 2P', monospace !important;
}

.site-title {
  color: #ffff00 !important;
  text-shadow: 2px 2px #ff0000 !important;
  animation: glow 1s ease-in-out infinite alternate !important;
}

.nav-link {
  background: #333 !important;
  color: #00ff00 !important;
  border: 2px solid #00ff00 !important;
  padding: 8px 12px !important;
  margin: 0 4px !important;
  text-transform: uppercase !important;
  box-shadow: 2px 2px 0px #00ff00 !important;
}

.nav-link:hover {
  background: #00ff00 !important;
  color: #000 !important;
  box-shadow: none !important;
}

.ts-profile-container {
  background: #1a1a1a;
  border: 3px solid #00ff00;
  box-shadow: 0 0 20px #00ff00;
  margin: 2rem 0;
}

.ts-profile-header {
  background: linear-gradient(45deg, #1a1a1a, #333);
  border-bottom: 3px solid #00ff00;
  padding: 2rem;
  text-align: center;
}

.ts-profile-display-name {
  color: #ffff00;
  font-size: 1.5rem;
  text-shadow: 2px 2px #ff0000;
  animation: glow 2s ease-in-out infinite alternate;
}

.ts-profile-bio {
  background: #333;
  border: 2px solid #00ff00;
  color: #00ff00;
  padding: 1rem;
  margin: 1rem;
  font-family: monospace;
}

.blog-post-card {
  background: #1a1a1a;
  border: 2px solid #00ff00;
  color: #00ff00;
  margin: 1rem 0;
  padding: 1rem;
  box-shadow: 4px 4px 0px #00ff00;
}

.profile-tab-button {
  background: #333 !important;
  color: #00ff00 !important;
  border: 2px solid #00ff00 !important;
  padding: 8px 16px !important;
  margin: 0 2px !important;
  font-family: 'Press Start 2P', monospace !important;
  font-size: 8px !important;
  text-transform: uppercase !important;
  box-shadow: 2px 2px 0px #00ff00 !important;
}

.profile-tab-button:hover {
  background: #00ff00 !important;
  color: #000 !important;
  transform: translate(2px, 2px) !important;
  box-shadow: none !important;
}

.profile-tab-button[aria-selected="true"] {
  background: #ffff00 !important;
  color: #000 !important;
  box-shadow: inset 2px 2px 0px #ff0000 !important;
}

@keyframes glow {
  from { text-shadow: 2px 2px #ff0000, 0 0 5px #00ff00; }
  to { text-shadow: 2px 2px #ff0000, 0 0 20px #00ff00, 0 0 30px #00ff00; }
}

@keyframes scanlines {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}`;