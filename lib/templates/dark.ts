export const DARK_THEME_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600;700&family=Orbitron:wght@400;700;900&display=swap');

/* Hacker Terminal Theme */
.site-layout {
  background: #000000 !important;
  color: #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
  font-size: 13px !important;
  position: relative !important;
  overflow: hidden !important;
}

.site-layout::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 98%, #00ff41 100%), linear-gradient(180deg, transparent 70%, rgba(0,255,65,0.03) 100%);
  background-size: 3px 3px, 100% 100%;
  animation: matrix 2s linear infinite;
  pointer-events: none;
  z-index: -1;
}

.site-layout::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.02) 2px, rgba(0,255,65,0.02) 4px);
  pointer-events: none;
  z-index: 10;
}

.site-footer {
  background: rgba(0, 20, 0, 0.95) !important;
  border-top: 2px solid #00ff41 !important;
  color: #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
}

.site-header {
  background: rgba(0, 20, 0, 0.95) !important;
  border-bottom: 2px solid #00ff41 !important;
  color: #00ff41 !important;
  font-family: 'Source Code Pro', monospace !important;
}

.site-title {
  color: #00ff41 !important;
  font-family: 'Orbitron', monospace !important;
  font-weight: 700 !important;
  text-shadow: 0 0 10px #00ff41 !important;
  animation: terminalGlow 2s ease-in-out infinite alternate !important;
}

.nav-link {
  background: transparent !important;
  color: #00ff41 !important;
  border: 1px solid #00ff41 !important;
  padding: 6px 12px !important;
  margin: 0 4px !important;
  font-family: 'Source Code Pro', monospace !important;
  text-transform: uppercase !important;
  transition: all 0.2s ease !important;
}

.nav-link:hover {
  background: #00ff41 !important;
  color: #000 !important;
  box-shadow: 0 0 10px #00ff41 !important;
}

.ts-profile-container {
  background: rgba(0, 20, 0, 0.9);
  border: 2px solid #00ff41;
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.3), inset 0 0 30px rgba(0, 20, 0, 0.8);
  margin: 2rem 0;
  color: #00ff41;
}

.ts-profile-header {
  background: linear-gradient(135deg, rgba(0, 40, 0, 0.9), rgba(0, 20, 0, 0.9));
  border-bottom: 2px solid #00ff41;
  padding: 2rem;
  text-align: center;
}

.ts-profile-display-name {
  color: #00ff41;
  font-family: 'Orbitron', monospace;
  font-weight: 900;
  font-size: 2rem;
  text-shadow: 0 0 15px #00ff41;
  animation: terminalGlow 2s ease-in-out infinite alternate;
}

.ts-profile-bio {
  background: rgba(0, 40, 0, 0.7);
  border: 1px solid #00ff41;
  color: #00ff41;
  padding: 1.5rem;
  margin: 1.5rem;
  font-family: 'Source Code Pro', monospace;
  line-height: 1.6;
}

.blog-post-card {
  background: rgba(0, 20, 0, 0.8);
  border: 1px solid #00ff41;
  color: #00ff41;
  margin: 1.5rem 0;
  padding: 1.5rem;
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.2);
}

.profile-tab-button {
  background: transparent !important;
  color: #00ff41 !important;
  border: 1px solid #00ff41 !important;
  padding: 8px 16px !important;
  margin: 0 2px !important;
  font-family: 'Source Code Pro', monospace !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
}

.profile-tab-button:hover {
  background: rgba(0, 255, 65, 0.1) !important;
  box-shadow: 0 0 10px #00ff41 !important;
}

.profile-tab-button[aria-selected="true"] {
  background: #00ff41 !important;
  color: #000 !important;
  box-shadow: 0 0 15px #00ff41 !important;
}

@keyframes matrix {
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 0 20px, 0 0; }
}

@keyframes terminalGlow {
  from { text-shadow: 0 0 10px #00ff41; }
  to { text-shadow: 0 0 20px #00ff41, 0 0 30px #00ff41; }
}`;