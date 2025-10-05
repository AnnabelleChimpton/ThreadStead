export const SOCIAL_MODERN_TEMPLATE = `<style>
/* ThreadRing Portal Styling */
body {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  background-attachment: fixed;
  color: #eee;
  font-family: 'Trebuchet MS', 'Lucida Sans', sans-serif;
  margin: 0;
  padding: 20px;
}

.portal-container {
  max-width: 1000px;
  margin: 0 auto;
}

.portal-header {
  background: linear-gradient(135deg, #e94560 0%, #d62c4e 100%);
  border: 3px solid #fff;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(233, 69, 96, 0.3);
}

.portal-title {
  font-size: 3rem;
  font-weight: bold;
  color: #fff;
  margin: 0;
  text-shadow: 3px 3px 0 rgba(0,0,0,0.3);
  letter-spacing: 2px;
}

.portal-subtitle {
  font-size: 1.2rem;
  color: #fff;
  margin-top: 10px;
  opacity: 0.9;
}

.welcome-banner {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
}

.welcome-banner h2 {
  color: #e94560;
  margin-top: 0;
}

.ring-navigation {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 30px 0;
}

.nav-card {
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.2) 0%, rgba(214, 44, 78, 0.2) 100%);
  border: 2px solid #e94560;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  text-decoration: none;
  color: #fff;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.nav-card:hover {
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.4) 0%, rgba(214, 44, 78, 0.4) 100%);
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(233, 69, 96, 0.4);
}

.nav-card .icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 10px;
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.member-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(233, 69, 96, 0.5);
  border-radius: 10px;
  padding: 20px;
  transition: all 0.3s ease;
}

.member-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #e94560;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(233, 69, 96, 0.3);
}

.member-card h3 {
  color: #e94560;
  margin-top: 0;
  font-size: 1.3rem;
}

.member-card p {
  color: #ccc;
  line-height: 1.6;
  margin: 10px 0;
}

.badge-collection {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 30px 0;
  justify-content: center;
}

.ring-badge {
  width: 88px;
  height: 31px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  border: 2px solid;
  font-family: Arial, sans-serif;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.ring-badge:hover {
  transform: scale(1.1);
}

.badge-member {
  background: linear-gradient(135deg, #e94560, #d62c4e);
  color: white;
  border-color: #fff;
}

.badge-featured {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  border-color: #000;
}

.badge-verified {
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  color: white;
  border-color: #fff;
}

.join-section {
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.3) 0%, rgba(15, 52, 96, 0.3) 100%);
  border: 3px solid #e94560;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  margin: 30px 0;
}

.join-section h2 {
  color: #fff;
  font-size: 2rem;
  margin-top: 0;
}

.cta-button {
  display: inline-block;
  background: linear-gradient(135deg, #e94560, #d62c4e);
  color: white;
  padding: 15px 30px;
  border: 3px solid #fff;
  border-radius: 10px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.2rem;
  margin-top: 15px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.cta-button:hover {
  background: linear-gradient(135deg, #d62c4e, #c42345);
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(233, 69, 96, 0.5);
}

.info-box {
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid #e94560;
  border-radius: 5px;
  padding: 15px;
  margin: 20px 0;
}

.footer-portal {
  text-align: center;
  margin-top: 50px;
  padding-top: 30px;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  color: #999;
  font-size: 0.9rem;
}

a {
  color: #e94560;
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: #ff6b81;
  text-decoration: underline;
}

h2 {
  color: #fff;
  font-size: 1.8rem;
  margin-bottom: 20px;
}

.section-heading {
  text-align: center;
}

.welcome-text {
  color: #ccc;
  line-height: 1.8;
}

.member-info {
  margin-top: 15px;
}

.join-text {
  color: #eee;
  font-size: 1.1rem;
  line-height: 1.8;
}

.badges-description {
  text-align: center;
  color: #aaa;
  margin-bottom: 20px;
}

.about-portal-box {
  margin: 40px 0;
}

.about-portal-heading {
  color: #e94560;
  margin-top: 0;
}

.about-portal-text {
  color: #ccc;
}

.footer-links {
  margin-top: 10px;
}
</style>

<div class="portal-container">
  <div class="portal-header">
    <div class="portal-title">🔗 ThreadRing Portal 🔗</div>
    <div class="portal-subtitle">Connecting the independent web, one thread at a time</div>
  </div>

  <div class="welcome-banner">
    <h2>Welcome to the Ring!</h2>
    <p class="welcome-text">
      ThreadRing is a community of independent websites and creative minds. We believe in the open web,
      personal expression, and the joy of discovering new corners of the internet. Navigate through our
      members, discover amazing content, and maybe join us on this journey!
    </p>
  </div>

  <h2 class="section-heading">🧭 Navigate the Ring</h2>
  <div class="ring-navigation">
    <a href="/tr/welcome" class="nav-card">
      <span class="icon">🏠</span>
      Ring Home
    </a>
    <a href="/tr/welcome?action=prev" class="nav-card">
      <span class="icon">←</span>
      Previous Site
    </a>
    <a href="/tr/welcome?action=random" class="nav-card">
      <span class="icon">🎲</span>
      Random Site
    </a>
    <a href="/tr/welcome?action=next" class="nav-card">
      <span class="icon">→</span>
      Next Site
    </a>
  </div>

  <h2 class="section-heading">✨ Featured Ring Members</h2>
  <div class="member-grid">
    <div class="member-card">
      <h3>Creative Portfolios</h3>
      <p>Artists, designers, and makers showcasing their work and process.</p>
      <div class="info-box member-info">
        <strong>12 active members</strong>
      </div>
    </div>

    <div class="member-card">
      <h3>Tech Blogs</h3>
      <p>Developers sharing tutorials, projects, and insights from the trenches.</p>
      <div class="info-box member-info">
        <strong>8 active members</strong>
      </div>
    </div>

    <div class="member-card">
      <h3>Personal Journals</h3>
      <p>Writers documenting their thoughts, travels, and life experiences.</p>
      <div class="info-box member-info">
        <strong>15 active members</strong>
      </div>
    </div>

    <div class="member-card">
      <h3>Hobby Sites</h3>
      <p>Enthusiasts sharing their passions: games, music, books, and more.</p>
      <div class="info-box member-info">
        <strong>10 active members</strong>
      </div>
    </div>
  </div>

  <div class="join-section">
    <h2>🌟 Join the ThreadRing</h2>
    <p class="join-text">
      Have a personal site? Want to connect with other independent creators?
      Join our webring and be part of the movement to reclaim the personal web!
    </p>
    <a href="/tr/welcome" class="cta-button">Explore the Ring →</a>
  </div>

  <h2 class="section-heading">🏆 Ring Badges</h2>
  <p class="badges-description">
    Add these to your site to show you're part of the ring!
  </p>
  <div class="badge-collection">
    <div class="ring-badge badge-member">THREAD RING MEMBER</div>
    <div class="ring-badge badge-featured">FEATURED SITE</div>
    <div class="ring-badge badge-verified">RING VERIFIED</div>
    <div class="ring-badge badge-member">EST. 2024</div>
    <div class="ring-badge badge-featured">TOP RATED</div>
    <div class="ring-badge badge-verified">ACTIVE RING</div>
  </div>

  <div class="info-box about-portal-box">
    <h3 class="about-portal-heading">About This Portal</h3>
    <p class="about-portal-text">
      This is an example ThreadRing portal page. It demonstrates how you can build a webring welcome page
      using Threadstead's template system - no social features required! Perfect for communities,
      collectives, or groups of friends who want to link their sites together.
    </p>
  </div>

  <div class="footer-portal">
    <p>Powered by <strong>Threadstead</strong> | Building the independent web</p>
    <p class="footer-links">
      <a href="/tr/welcome">Visit Official ThreadRing</a> |
      <a href="#">About Webrings</a> |
      <a href="#">Create Your Own</a>
    </p>
  </div>
</div>`;
