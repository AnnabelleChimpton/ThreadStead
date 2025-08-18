export const SOCIAL_MODERN_TEMPLATE = `<style>
/* Cyberpunk Social Hub Styling */
body {
  background: linear-gradient(135deg, #0a0a0a 0%, #1a0033 50%, #000a1a 100%) !important;
  background-attachment: fixed !important;
  color: #00ffff !important;
  overflow-x: hidden !important;
}

/* Custom container classes to avoid globals.css dependencies */
.cyber-main-container {
  width: 100% !important;
  margin: 0 auto !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

.cyber-split-layout {
  display: flex !important;
  gap: 1.5rem !important;
  margin-bottom: 2rem !important;
  flex-wrap: wrap !important;
}

.cyber-split-main {
  flex: 65% !important;
  min-width: 300px !important;
}

.cyber-split-sidebar {
  flex: 35% !important;
  min-width: 250px !important;
}

.cyber-flex-row {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 1.5rem !important;
  flex-wrap: wrap !important;
}

.cyber-flex-col {
  display: flex !important;
  flex-direction: column !important;
  gap: 1rem !important;
}

.cyber-flex-end {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-end !important;
  gap: 1rem !important;
}

.cyber-flex-social {
  display: flex !important;
  flex-direction: row !important;
  gap: 1rem !important;
}

@media (max-width: 768px) {
  .cyber-split-layout {
    flex-direction: column !important;
  }
  .cyber-split-main, .cyber-split-sidebar {
    flex: 100% !important;
  }
}

/* Animated background particles */
body::before {
  content: '' !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 0, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(255, 255, 0, 0.05) 0%, transparent 50%) !important;
  animation: particle-drift 20s ease-in-out infinite !important;
  z-index: -1 !important;
}

@keyframes particle-drift {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(10px) rotate(240deg); }
}

/* Neon DisplayName */
.ts-profile-display-name {
  font-size: 4rem !important;
  font-family: 'Orbitron', monospace, sans-serif !important;
  color: transparent !important;
  background: linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff) !important;
  background-size: 400% 400% !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: 
    0 0 20px #00ffff,
    0 0 40px #ff00ff,
    0 0 60px #ffff00 !important;
  animation: neon-glow 3s ease-in-out infinite alternate, color-shift 8s linear infinite !important;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5)) !important;
}

@keyframes neon-glow {
  0% { 
    text-shadow: 0 0 20px #00ffff, 0 0 40px #ff00ff, 0 0 60px #ffff00;
    filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
  }
  100% { 
    text-shadow: 0 0 40px #00ffff, 0 0 80px #ff00ff, 0 0 120px #ffff00;
    filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.8));
  }
}

@keyframes color-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Holographic Profile Photo */
.ts-profile-photo-frame {
  position: relative !important;
  border: 3px solid transparent !important;
  border-radius: 50% !important;
  background: linear-gradient(45deg, #00ffff, #ff00ff) !important;
  padding: 4px !important;
  animation: holo-rotate 4s linear infinite !important;
}

.ts-profile-photo-frame::before {
  content: '' !important;
  position: absolute !important;
  top: -5px !important;
  left: -5px !important;
  right: -5px !important;
  bottom: -5px !important;
  background: linear-gradient(45deg, transparent, #00ffff, transparent, #ff00ff) !important;
  border-radius: 50% !important;
  animation: holo-spin 2s linear infinite !important;
  z-index: -1 !important;
}

@keyframes holo-rotate {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

@keyframes holo-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Cyber Bio Section */
.ts-profile-bio-section {
  background: rgba(0, 0, 0, 0.8) !important;
  border: 2px solid #00ffff !important;
  border-radius: 10px !important;
  padding: 20px !important;
  box-shadow: 
    0 0 20px rgba(0, 255, 255, 0.3),
    inset 0 0 20px rgba(0, 255, 255, 0.1) !important;
  position: relative !important;
  overflow: hidden !important;
}

.ts-profile-bio-section::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent) !important;
  animation: scan-line 3s linear infinite !important;
}

@keyframes scan-line {
  0% { left: -100%; }
  100% { left: 100%; }
}

.ts-bio-text {
  color: #00ffff !important;
  font-family: 'Courier New', monospace !important;
  font-size: 1.1rem !important;
  line-height: 1.6 !important;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5) !important;
}

/* Futuristic Blog Posts */
.ts-blog-posts {
  background: rgba(0, 0, 0, 0.9) !important;
  border: 1px solid #ff00ff !important;
  border-radius: 8px !important;
  overflow: hidden !important;
}

.ts-blog-posts-title {
  background: linear-gradient(90deg, #ff00ff, #00ffff) !important;
  color: #000000 !important;
  font-weight: bold !important;
  font-family: 'Orbitron', sans-serif !important;
  text-align: center !important;
  padding: 10px !important;
  margin: 0 !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
}

.ts-blog-post {
  background: rgba(255, 0, 255, 0.05) !important;
  border-bottom: 1px solid rgba(255, 0, 255, 0.3) !important;
  padding: 15px !important;
  transition: all 0.3s ease !important;
  position: relative !important;
}

.ts-blog-post:hover {
  background: rgba(255, 0, 255, 0.1) !important;
  transform: translateX(5px) !important;
  box-shadow: -5px 0 15px rgba(255, 0, 255, 0.3) !important;
}

.ts-blog-post::before {
  content: '▶' !important;
  position: absolute !important;
  left: 5px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  color: #00ffff !important;
  opacity: 0 !important;
  transition: opacity 0.3s ease !important;
}

.ts-blog-post:hover::before {
  opacity: 1 !important;
}

.ts-blog-post-meta {
  color: #ffff00 !important;
  font-family: 'Courier New', monospace !important;
  font-size: 0.9rem !important;
}

/* Glitch effect for headings */
h1, h2, h3 {
  font-family: 'Orbitron', monospace, sans-serif !important;
  color: #00ffff !important;
  position: relative !important;
  animation: glitch-text 4s linear infinite !important;
}

@keyframes glitch-text {
  0%, 98% { 
    transform: translate(0);
    filter: hue-rotate(0deg);
  }
  99% { 
    transform: translate(-2px, 2px);
    filter: hue-rotate(90deg);
  }
  100% { 
    transform: translate(2px, -2px);
    filter: hue-rotate(180deg);
  }
}

/* Cyberpunk Links */
a {
  color: #00ffff !important;
  text-decoration: none !important;
  position: relative !important;
  font-weight: bold !important;
  transition: all 0.3s ease !important;
}

a:hover {
  color: #ff00ff !important;
  text-shadow: 0 0 10px currentColor !important;
}

a::after {
  content: '' !important;
  position: absolute !important;
  bottom: -2px !important;
  left: 0 !important;
  width: 0 !important;
  height: 2px !important;
  background: linear-gradient(90deg, #00ffff, #ff00ff) !important;
  transition: width 0.3s ease !important;
}

a:hover::after {
  width: 100% !important;
}

/* Terminal-style containers */
.cyber-terminal {
  background: #000000 !important;
  border: 2px solid #00ff00 !important;
  border-radius: 8px !important;
  padding: 15px !important;
  font-family: 'Courier New', monospace !important;
  color: #00ff00 !important;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3) !important;
  position: relative !important;
}

.cyber-terminal::before {
  content: '●●●' !important;
  position: absolute !important;
  top: 8px !important;
  right: 15px !important;
  color: #ff0000 !important;
  font-size: 12px !important;
}

.cyber-header {
  background: rgba(0,0,0,0.9) !important;
  border-bottom: 2px solid #00ffff !important;
  padding: 2rem !important;
  margin-bottom: 2rem !important;
  position: relative !important;
}

.status-online {
  color: #ffff00 !important;
  font-family: 'Courier New', monospace !important;
  margin-top: 0.5rem !important;
}

.access-level {
  color: #ff00ff !important;
  font-family: 'Courier New', monospace !important;
  margin-top: 0.25rem !important;
}

.connection-status {
  padding: 10px 15px !important;
  font-size: 0.9rem !important;
}

.section-title {
  margin-bottom: 1rem !important;
  font-size: 1.5rem !important;
}

.terminal-prompt {
  color: #ffff00 !important;
  margin-bottom: 0.5rem !important;
}

.terminal-prompt.network-cmd {
  margin: 0.5rem 0 !important;
}

.terminal-prompt.social-cmd {
  margin: 0.5rem 0 !important;
}

.terminal-output {
  margin-left: 1rem !important;
}

.quick-access-panel {
  background: rgba(255,0,255,0.1) !important;
  border: 2px solid #ff00ff !important;
  border-radius: 8px !important;
  padding: 1rem !important;
}

.visitor-log-panel {
  background: rgba(0,255,255,0.1) !important;
  border: 2px solid #00ffff !important;
  border-radius: 8px !important;
  padding: 1rem !important;
}

.panel-title {
  margin-bottom: 1rem !important;
  font-size: 1.2rem !important;
}

.quick-access-title {
  color: #ff00ff !important;
}

.visitor-log-title {
  color: #00ffff !important;
}

.visitor-prompt {
  font-family: 'Courier New', monospace !important;
  font-size: 0.9rem !important;
  color: #ffff00 !important;
  margin-bottom: 1rem !important;
}

.cyber-footer {
  margin-top: 4rem !important;
  background: rgba(0,0,0,0.95) !important;
  border-top: 2px solid #00ff00 !important;
}

.footer-system {
  color: #00ff00 !important;
  font-family: 'Courier New', monospace !important;
  font-size: 0.9rem !important;
}

.footer-powered {
  color: #ffff00 !important;
  font-family: 'Courier New', monospace !important;
  font-size: 0.8rem !important;
  margin-top: 0.5rem !important;
}

.footer-highlight {
  color: #ffff00 !important;
}
</style>

<div className="cyber-main-container">
  
  <div className="cyber-header">
    <div className="cyber-split-layout">
      <div className="cyber-flex-row">
        <ProfilePhoto size="xl" shape="circle" />
        <div>
          <DisplayName as="h1" />
          <div className="status-online">
            STATUS: ONLINE
          </div>
          <div className="access-level">
            ACCESS LEVEL: PUBLIC
          </div>
        </div>
      </div>
      
      <div className="cyber-flex-end">
        <div className="cyber-terminal connection-status">
          CONNECTION: SECURE
        </div>
        <div className="cyber-flex-social">
          <FollowButton />
          <MutualFriends />
        </div>
      </div>
    </div>
  </div>

  <div className="cyber-split-layout">
    
    <div className="cyber-split-main">
      <div className="cyber-flex-col">
        <div>
          <h2 className="section-title">PERSONAL_DATA.txt</h2>
          <Bio />
        </div>
        
        <div>
          <h2 className="section-title">RECENT_TRANSMISSIONS</h2>
          <BlogPosts limit="4" />
        </div>
      </div>
    </div>
    
    <div className="cyber-split-sidebar">
      <div className="cyber-flex-col">
        
        <div className="cyber-terminal">
          <div className="terminal-prompt">$ whoami</div>
          <div className="terminal-output"><DisplayName as="span" /></div>
          <div className="terminal-prompt network-cmd">$ network_status</div>
          <div className="terminal-output">CONNECTED TO THREADSTEAD</div>
          <div className="terminal-prompt social-cmd">$ social_links</div>
          <div className="terminal-output">
            <FriendDisplay />
          </div>
        </div>
        
        <div className="quick-access-panel">
          <h3 className="panel-title quick-access-title">QUICK_ACCESS</h3>
          <div className="cyber-flex-col">
            <NotificationBell />
            <NavigationLinks />
          </div>
        </div>
        
        <div className="visitor-log-panel">
          <h3 className="panel-title visitor-log-title">VISITOR_LOG</h3>
          <div className="visitor-prompt">
            &gt; Leave your mark in the digital void...
          </div>
          <Guestbook />
        </div>
        
      </div>
    </div>
    
  </div>

  <div className="cyber-footer">
    <div className="footer-system">
      &gt; SYSTEM MAINTAINED BY <DisplayName as="span" className="footer-highlight" />
    </div>
    <div className="footer-powered">
      &gt; POWERED BY THREADSTEAD NEURAL NETWORK
    </div>
    <SiteBranding />
  </div>

</div>`;