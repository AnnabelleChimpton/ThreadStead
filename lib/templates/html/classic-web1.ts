export const CLASSIC_WEB1_TEMPLATE = `<style>
/* Classic 90s Web 1.0 Styling */
body {
  background: #000080;
  background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><defs><pattern id="stars" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.5" fill="%23ffffff" opacity="0.3"/></pattern></defs><rect width="20" height="20" fill="url(%23stars)"/></svg>');
  color: #ffffff;
  font-family: "Comic Sans MS", cursive, sans-serif;
  margin: 0;
  padding: 20px;
}

.page-container {
  max-width: 800px;
  margin: 0 auto;
}

.retro-header {
  text-align: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #ff00ff;
  border: 5px ridge #ffff00;
  box-shadow: 0 0 20px #ff00ff;
}

.site-title {
  font-size: 3rem;
  font-weight: bold;
  background: linear-gradient(45deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff);
  background-size: 400% 400%;
  animation: rainbow-shift 3s ease-in-out infinite;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 2px 2px 4px #000000;
  font-family: "Impact", "Arial Black", sans-serif;
  margin: 0;
}

@keyframes rainbow-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.marquee-banner {
  background: #ff0000;
  color: #ffff00;
  font-weight: bold;
  padding: 8px;
  border: 3px solid #000000;
  margin: 20px 0;
  overflow: hidden;
  white-space: nowrap;
}

.marquee-text {
  display: inline-block;
  animation: scroll-left 20s linear infinite;
}

@keyframes scroll-left {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.construction-banner {
  background: #ffff00;
  color: #000000;
  font-weight: bold;
  padding: 15px;
  border: 3px solid #ff0000;
  text-align: center;
  animation: blink 1s linear infinite;
  margin: 20px 0;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.content-table {
  width: 100%;
  border: 5px outset #c0c0c0;
  background: #c0c0c0;
  border-spacing: 3px;
  margin: 20px 0;
}

.table-cell {
  border: 3px inset #c0c0c0;
  padding: 15px;
  background: #ffffff;
  color: #000000;
  vertical-align: top;
}

.sidebar-cell {
  width: 200px;
  background: #ffffcc;
}

.profile-box {
  background: #ffffff;
  border: 3px double #000000;
  padding: 15px;
  margin-bottom: 15px;
}

.animated-border {
  border: 5px solid;
  border-image: repeating-linear-gradient(45deg, #ff0000 0px, #ff0000 10px, #ffff00 10px, #ffff00 20px) 5;
  animation: border-shift 2s linear infinite;
  padding: 10px;
  margin: 15px 0;
}

@keyframes border-shift {
  0% { border-image-source: repeating-linear-gradient(45deg, #ff0000 0px, #ff0000 10px, #ffff00 10px, #ffff00 20px); }
  25% { border-image-source: repeating-linear-gradient(45deg, #ffff00 0px, #ffff00 10px, #00ff00 10px, #00ff00 20px); }
  50% { border-image-source: repeating-linear-gradient(45deg, #00ff00 0px, #00ff00 10px, #00ffff 10px, #00ffff 20px); }
  75% { border-image-source: repeating-linear-gradient(45deg, #00ffff 0px, #00ffff 10px, #0000ff 10px, #0000ff 20px); }
  100% { border-image-source: repeating-linear-gradient(45deg, #0000ff 0px, #0000ff 10px, #ff0000 10px, #ff0000 20px); }
}

.flame-text {
  background: linear-gradient(45deg, #ff0000, #ff6600, #ffaa00, #ff0000);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: bold;
  font-size: 1.5rem;
  animation: flame-flicker 2s ease-in-out infinite alternate;
}

@keyframes flame-flicker {
  0% { filter: brightness(1) hue-rotate(0deg); }
  100% { filter: brightness(1.3) hue-rotate(10deg); }
}

.retro-counter {
  background: #000000;
  color: #00ff00;
  font-family: "Courier New", monospace;
  padding: 8px 12px;
  border: 2px solid #00ff00;
  display: inline-block;
  font-weight: bold;
  box-shadow: 0 0 10px #00ff00;
}

.link-button {
  display: inline-block;
  background: #0000ff;
  color: #ffffff;
  padding: 8px 16px;
  border: 3px outset #6666ff;
  text-decoration: none;
  font-weight: bold;
  margin: 5px;
  cursor: pointer;
}

.link-button:hover {
  background: #6666ff;
  border: 3px inset #6666ff;
}

.webring-box {
  background: #ff6600;
  color: #ffffff;
  padding: 15px;
  border: 3px solid #000000;
  font-weight: bold;
  text-align: center;
  margin: 20px 0;
}

.award-badge {
  width: 88px;
  height: 31px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 5px;
  font-size: 10px;
  font-weight: bold;
  border: 2px solid #000;
  font-family: Arial, sans-serif;
}

.badge-best {
  background: linear-gradient(135deg, #ff0000, #cc0000);
  color: white;
}

.badge-cool {
  background: linear-gradient(135deg, #00ff00, #00cc00);
  color: black;
}

.badge-awesome {
  background: linear-gradient(135deg, #ffff00, #cccc00);
  color: black;
}

.footer-box {
  background: #800080;
  color: #ffff00;
  padding: 15px;
  border: 2px solid #ffffff;
  text-align: center;
  margin-top: 30px;
}

a {
  color: #00ffff;
  text-decoration: underline;
  font-weight: bold;
}

a:visited {
  color: #ff00ff;
}

a:hover {
  color: #ffff00;
  background: #ff00ff;
  padding: 2px;
}

h2 {
  color: #ffff00;
  text-shadow: 2px 2px 0 #000;
}

.blink {
  animation: blink 1s linear infinite;
}

.subtitle-blink {
  color: #ffff00;
  font-size: 1.3rem;
  margin-top: 10px;
}

.about-heading {
  margin-top: 0;
  color: #000;
}

.counter-spaced-bottom {
  margin-bottom: 15px;
}

.counter-spaced-top {
  margin-top: 15px;
}

.links-section {
  margin: 15px 0;
}

.links-heading {
  color: #000;
}

.webring-buttons {
  margin-top: 10px;
}

.awards-section {
  text-align: center;
  margin: 20px 0;
}

.awards-heading {
  color: #ff00ff;
}
</style>

<div class="page-container">
  <div class="marquee-banner">
    <div class="marquee-text">✨ WELCOME TO THE WORLD WIDE WEB ✨ BEST VIEWED IN NETSCAPE NAVIGATOR ✨ THIS SITE ROCKS! ✨</div>
  </div>

  <div class="retro-header">
    <div class="site-title">
      <DisplayName />
    </div>
    <div class="blink subtitle-blink">
      🌐 Personal Homepage Since 1999 🌐
    </div>
  </div>

  <div class="construction-banner">
    🚧 UNDER CONSTRUCTION 🚧 PLEASE EXCUSE OUR MESS 🚧
  </div>

  <table class="content-table">
    <tr>
      <td class="table-cell sidebar-cell">
        <div class="profile-box">
          <h3 class="about-heading">About Me</h3>
          <Bio />
        </div>

        <div class="retro-counter counter-spaced-bottom">
          VISITORS:<br/>
          <span class="blink">001337</span>
        </div>

        <div class="links-section">
          <h3 class="links-heading">Cool Sites</h3>
          <WebsiteDisplay />
        </div>

        <div class="retro-counter counter-spaced-top">
          LAST UPDATED:<br/>
          <span class="blink">TODAY!</span>
        </div>
      </td>

      <td class="table-cell">
        <h2 class="flame-text">📔 My Internet Diary 📔</h2>
        <div class="animated-border">
          <BlogPosts limit="3" />
        </div>

        <h2 class="flame-text">📷 Photo Album 📷</h2>
        <div class="animated-border">
          <MediaGrid />
        </div>
      </td>
    </tr>
  </table>

  <div class="webring-box">
    🔗 GEOCITIES NEIGHBORHOOD WEBRING 🔗<br/>
    <div class="webring-buttons">
      <a href="#" class="link-button">[← PREV]</a>
      <a href="#" class="link-button">[RANDOM]</a>
      <a href="#" class="link-button">[NEXT →]</a>
      <a href="#" class="link-button">[LIST ALL]</a>
    </div>
  </div>

  <div class="awards-section">
    <h2 class="blink awards-heading">🏆 WEBSITE AWARDS WON 🏆</h2>
    <div>
      <div class="award-badge badge-best">BEST SITE 1999</div>
      <div class="award-badge badge-cool">COOL PAGE</div>
      <div class="award-badge badge-awesome">TOTALLY AWESOME</div>
    </div>
  </div>

  <div class="footer-box">
    Copyright © 1999 <DisplayName as="span" />. All rights reserved.<br/>
    Made with ❤️ on Windows 98 | Best viewed at 800x600<br/>
    <span class="blink">This site is Netscape Enhanced!</span>
  </div>
</div>`;
