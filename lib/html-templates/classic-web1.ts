export const CLASSIC_WEB1_TEMPLATE = `<style>
/* Classic 90s Web 1.0 Styling */
body {
  background: #000080 !important;
  background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><defs><pattern id="stars" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.5" fill="%23ffffff" opacity="0.3"/></pattern></defs><rect width="20" height="20" fill="url(%23stars)"/></svg>') !important;
  color: #ffffff !important;
  font-family: "Comic Sans MS", cursive, sans-serif !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Custom container classes to avoid globals.css dependencies */
.retro-main-container {
  width: 100% !important;
  margin: 0 auto !important;
  padding: 1rem !important;
  box-sizing: border-box !important;
}

.retro-header-container {
  text-align: center !important;
  margin-bottom: 2rem !important;
  padding: 1.5rem !important;
  max-width: 600px !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.retro-split-layout {
  display: flex !important;
  gap: 1rem !important;
  margin-bottom: 2rem !important;
  flex-wrap: wrap !important;
}

.retro-split-left {
  flex: 30% !important;
  min-width: 200px !important;
  text-align: center !important;
}

.retro-split-right {
  flex: 70% !important;
  min-width: 300px !important;
}

.retro-centered-container {
  text-align: center !important;
  margin: 2rem auto !important;
  padding: 1rem !important;
  max-width: 800px !important;
}

.retro-flex-row {
  display: flex !important;
  flex-direction: row !important;
  justify-content: center !important;
  gap: 1rem !important;
  flex-wrap: wrap !important;
}

.retro-flex-col {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.5rem !important;
}

.retro-links-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.5rem !important;
  margin-bottom: 1rem !important;
}

.retro-links-row {
  display: flex !important;
  flex-direction: row !important;
  justify-content: space-evenly !important;
  gap: 0.5rem !important;
  flex-wrap: wrap !important;
}

@media (max-width: 768px) {
  .retro-split-layout {
    flex-direction: column !important;
  }
  .retro-split-left, .retro-split-right {
    flex: 100% !important;
  }
  .retro-links-row {
    flex-direction: column !important;
  }
}

.ts-profile-display-name {
  background: linear-gradient(45deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff) !important;
  background-size: 400% 400% !important;
  animation: rainbow-shift 3s ease-in-out infinite !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-size: 3rem !important;
  font-weight: bold !important;
  text-shadow: 2px 2px 4px #000000 !important;
  font-family: "Impact", "Arial Black", sans-serif !important;
}

@keyframes rainbow-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.ts-bio-text {
  color: #ffff00 !important;
  font-size: 1.2rem !important;
  background: #800080 !important;
  padding: 10px !important;
  border: 2px dashed #ffff00 !important;
}

.ts-blog-posts {
  background: #ffffff !important;
  color: #000000 !important;
  padding: 15px !important;
  border: 3px double #000000 !important;
}

.ts-blog-post {
  margin-bottom: 1rem !important;
  padding-bottom: 1rem !important;
  border-bottom: 1px solid #cccccc !important;
}

.vintage-table {
  border: 3px outset #c0c0c0 !important;
  background: #c0c0c0 !important;
  width: 100% !important;
  border-spacing: 2px !important;
}

.vintage-cell {
  border: 2px inset #c0c0c0 !important;
  padding: 8px !important;
  background: #ffffff !important;
  color: #000000 !important;
  font-family: "Times New Roman", serif !important;
  text-align: center !important;
}

.marquee-container {
  background: #ff0000 !important;
  color: #ffff00 !important;
  font-weight: bold !important;
  padding: 5px !important;
  border: 2px solid #000000 !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

.marquee-text {
  display: inline-block !important;
  animation: scroll-left 15s linear infinite !important;
}

@keyframes scroll-left {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.construction {
  background: #ffff00 !important;
  color: #000000 !important;
  font-weight: bold !important;
  padding: 10px !important;
  border: 3px solid #ff0000 !important;
  text-align: center !important;
  animation: blink 1s linear infinite !important;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.blink {
  animation: blink 1s linear infinite !important;
}

.flame-text {
  background: linear-gradient(45deg, #ff0000, #ff6600, #ffaa00, #ff0000) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-weight: bold !important;
  animation: flame-flicker 2s ease-in-out infinite alternate !important;
}

@keyframes flame-flicker {
  0% { filter: brightness(1) hue-rotate(0deg); }
  100% { filter: brightness(1.3) hue-rotate(10deg); }
}

.retro-counter {
  background: #000000 !important;
  color: #00ff00 !important;
  font-family: "Courier New", monospace !important;
  padding: 5px !important;
  border: 2px solid #00ff00 !important;
  display: inline-block !important;
  font-weight: bold !important;
}

.gif-border {
  border: 5px solid !important;
  border-image: repeating-linear-gradient(45deg, #ff0000 0px, #ff0000 10px, #ffff00 10px, #ffff00 20px) 5 !important;
  animation: border-shift 2s linear infinite !important;
}

@keyframes border-shift {
  0% { border-image-source: repeating-linear-gradient(45deg, #ff0000 0px, #ff0000 10px, #ffff00 10px, #ffff00 20px); }
  25% { border-image-source: repeating-linear-gradient(45deg, #ffff00 0px, #ffff00 10px, #00ff00 10px, #00ff00 20px); }
  50% { border-image-source: repeating-linear-gradient(45deg, #00ff00 0px, #00ff00 10px, #00ffff 10px, #00ffff 20px); }
  75% { border-image-source: repeating-linear-gradient(45deg, #00ffff 0px, #00ffff 10px, #0000ff 10px, #0000ff 20px); }
  100% { border-image-source: repeating-linear-gradient(45deg, #0000ff 0px, #0000ff 10px, #ff0000 10px, #ff0000 20px); }
}

a {
  color: #00ffff !important;
  text-decoration: underline !important;
  font-weight: bold !important;
}

a:visited {
  color: #ff00ff !important;
}

.homepage-subtitle {
  color: #ff00ff !important;
  font-size: 1.5rem !important;
  font-weight: bold !important;
}

.cool-factor {
  margin-top: 1rem !important;
}

.webmaster-info {
  color: #00ff00 !important;
  font-weight: bold !important;
  margin-top: 1rem !important;
}

.webring-banner {
  background: #ff6600 !important;
  color: #ffffff !important;
  padding: 10px !important;
  border: 3px solid #000000 !important;
  font-weight: bold !important;
}

.awards-title {
  color: #ff00ff !important;
}

.award-badge {
  width: 88px !important;
  height: 31px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.award-badge.best-site {
  background: #ff0000 !important;
  color: white !important;
  font-size: 10px !important;
}

.award-badge.cool-page {
  background: #00ff00 !important;
  color: black !important;
  font-size: 8px !important;
}

.award-badge.awesome {
  background: #ffff00 !important;
  color: black !important;
  font-size: 9px !important;
}

.copyright-footer {
  background: #800080 !important;
  color: #ffff00 !important;
  padding: 10px !important;
  border: 2px solid #ffffff !important;
  font-size: 0.9rem !important;
}
</style>

<div className="retro-main-container">
  <div className="marquee-container">
    <div className="marquee-text">✨ WELCOME TO THE WORLD WIDE WEB ✨ UNDER CONSTRUCTION ✨ GEOCITIES FOREVER ✨</div>
  </div>

  <div className="retro-header-container">
    <DisplayName as="h1" />
    <div className="blink homepage-subtitle">
      🌐 Personal Homepage Since 1999 🌐
    </div>
  </div>

  <div className="vintage-table">
    <div className="retro-flex-row">
      <div className="vintage-cell">📖 About Me</div>
      <div className="vintage-cell">📝 My Diary</div>
      <div className="vintage-cell">📷 Photo Album</div>
      <div className="vintage-cell">🔗 Cool Sites</div>
    </div>
  </div>

  <div className="construction">
    🚧 UNDER CONSTRUCTION 🚧 BEST VIEWED IN NETSCAPE NAVIGATOR 🚧
  </div>

  <div className="retro-split-layout">
    <div className="retro-split-left">
      <div className="gif-border">
        <ProfilePhoto size="lg" shape="square" />
      </div>
      <div className="retro-counter cool-factor">
        COOL FACTOR: 9000
      </div>
    </div>
    
    <div className="retro-split-right">
      <h2 className="flame-text">👤 About This Awesome Person 👤</h2>
      <Bio />
      <div className="webmaster-info">
        💻 Webmaster Status: ELITE<br/>
        🎵 Now Playing: Darude - Sandstorm<br/>
        📧 Email: <span className="blink">CHECK GUESTBOOK!</span>
      </div>
    </div>
  </div>

  <div className="retro-centered-container">
    <h2 className="flame-text">📔 My Internet Diary 📔</h2>
    <BlogPosts limit="2" />
  </div>

  <div className="retro-centered-container">
    <div className="retro-flex-row">
      <div className="retro-counter">
        VISITOR NUMBER: <span className="blink">001337</span>
      </div>
      <div className="retro-counter">
        LAST UPDATED: TODAY!
      </div>
    </div>
  </div>

  <div className="retro-centered-container">
    <h2 className="flame-text">🌈 KOOL LINKS ON THE WEB 🌈</h2>
    <div className="vintage-table">
      <div className="retro-links-grid">
        <div className="retro-links-row">
          <div className="vintage-cell">🔍 Yahoo! - THE BEST SEARCH!</div>
          <div className="vintage-cell">🏠 GeoCities - Free Homepages!</div>
        </div>
        <div className="retro-links-row">
          <div className="vintage-cell">🔎 AltaVista - Search Engine</div>
          <div className="vintage-cell">🔥 Angelfire - Make Your Site!</div>
        </div>
        <div className="retro-links-row">
          <div className="vintage-cell">🎮 My Friend's Gaming Page</div>
          <div className="vintage-cell">🎵 MIDI Music Collection</div>
        </div>
      </div>
    </div>
  </div>

  <div className="retro-centered-container">
    <div className="webring-banner">
      🔗 GEOCITIES NEIGHBORHOOD WEBRING 🔗<br/>
      [← PREV] | [RANDOM] | [NEXT →] | [LIST ALL]
    </div>
  </div>

  <div className="retro-centered-container">
    <h3 className="blink awards-title">🏆 WEBSITE AWARDS WON 🏆</h3>
    <div className="retro-flex-row">
      <div className="award-badge best-site">BEST SITE</div>
      <div className="award-badge cool-page">COOL PAGE</div>
      <div className="award-badge awesome">AWESOME</div>
    </div>
  </div>

  <div className="retro-centered-container">
    <div className="copyright-footer">
      Copyright © 1999 <DisplayName as="span" />. All rights reserved.<br/>
      Made with ❤️ on Windows 98 | Best viewed with 800x600 resolution<br/>
      <span className="blink">This site is Netscape Enhanced!</span>
    </div>
  </div>
</div>`;