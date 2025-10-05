export const SIMPLE_DEFAULT_TEMPLATE = `<style>
/* Personal Homepage - Early 2000s Blog Style */
body {
  background: #f5f5dc;
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px);
  color: #333;
  font-family: 'Verdana', 'Geneva', sans-serif;
  margin: 0;
  padding: 0;
  font-size: 14px;
}

.homepage-container {
  max-width: 900px;
  margin: 20px auto;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
  padding: 0 20px;
}

@media (max-width: 768px) {
  .homepage-container {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: 2;
  }
}

.header-banner {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, #4a90a4 0%, #5ba4b8 100%);
  border: 3px solid #2c5f77;
  border-radius: 8px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 3px 10px rgba(0,0,0,0.2);
}

.site-name {
  font-size: 2.5rem;
  font-family: 'Georgia', serif;
  color: #fff;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.tagline {
  color: #e0f0f5;
  font-size: 1rem;
  margin-top: 8px;
  font-style: italic;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.sidebar-module {
  background: #fff;
  border: 2px solid #ccc;
  border-radius: 5px;
  padding: 12px;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
}

.sidebar-module h3 {
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #4a90a4;
  color: #2c5f77;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.about-box {
  background: linear-gradient(135deg, #fff 0%, #f9f9f9 100%);
  line-height: 1.6;
}

.status-box {
  background: #fffef0;
  border-color: #d4af37;
}

.status-item {
  margin: 8px 0;
  font-size: 0.85rem;
  line-height: 1.5;
}

.status-label {
  font-weight: bold;
  color: #d4af37;
  display: inline-block;
  min-width: 80px;
}

.links-box ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.links-box li {
  margin: 6px 0;
}

.links-box a {
  color: #4a90a4;
  text-decoration: none;
  font-size: 0.9rem;
  display: block;
  padding: 3px 5px;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.links-box a:hover {
  background: #e8f4f8;
  color: #2c5f77;
  padding-left: 10px;
}

.links-box a:before {
  content: '→ ';
  opacity: 0.5;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-section {
  background: #fff;
  border: 2px solid #ccc;
  border-radius: 5px;
  padding: 20px;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
}

.content-section h2 {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 3px double #4a90a4;
  color: #2c5f77;
  font-size: 1.5rem;
  font-family: 'Georgia', serif;
}

.photo-gallery {
  background: linear-gradient(135deg, #f9f9f9 0%, #fff 100%);
}

.blog-section {
  background: linear-gradient(135deg, #fff 0%, #fffff8 100%);
}

.footer-bar {
  grid-column: 1 / -1;
  background: #4a90a4;
  border: 2px solid #2c5f77;
  border-radius: 5px;
  padding: 15px;
  text-align: center;
  color: #fff;
  font-size: 0.85rem;
  margin-top: 10px;
}

.footer-bar a {
  color: #e0f0f5;
  text-decoration: underline;
}

.footer-bar a:hover {
  color: #fff;
}

.badges-module {
  text-align: center;
}

.stats-module {
  background: #f0f0f0;
  font-size: 0.8rem;
  text-align: center;
}

.footer-powered {
  margin-top: 8px;
  font-size: 0.75rem;
}

.button-88 {
  display: inline-block;
  width: 88px;
  height: 31px;
  background: linear-gradient(135deg, #4a90a4, #5ba4b8);
  border: 2px solid #2c5f77;
  border-radius: 3px;
  color: white;
  font-size: 10px;
  font-weight: bold;
  text-align: center;
  line-height: 27px;
  text-decoration: none;
  margin: 3px;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
  font-family: Arial, sans-serif;
  transition: transform 0.2s ease;
}

.button-88:hover {
  transform: scale(1.05);
}

a {
  color: #4a90a4;
  text-decoration: underline;
}

a:hover {
  color: #2c5f77;
}

a:visited {
  color: #7b68a6;
}
</style>

<div class="homepage-container">
  <div class="header-banner">
    <h1 class="site-name"><DisplayName as="span" /></h1>
    <div class="tagline">my little corner of the internet</div>
  </div>

  <aside class="sidebar">
    <div class="sidebar-module about-box">
      <h3>About Me</h3>
      <Bio />
    </div>

    <div class="sidebar-module status-box">
      <h3>Currently</h3>
      <div class="status-item">
        <span class="status-label">Reading:</span> Various blogs
      </div>
      <div class="status-item">
        <span class="status-label">Playing:</span> Indie games
      </div>
      <div class="status-item">
        <span class="status-label">Mood:</span> ☕ Cozy
      </div>
    </div>

    <div class="sidebar-module links-box">
      <h3>Blogroll</h3>
      <WebsiteDisplay />
    </div>

    <div class="sidebar-module badges-module">
      <h3>Badges</h3>
      <div>
        <div class="button-88">PERSONAL SITE</div>
        <div class="button-88">EST. 2024</div>
        <div class="button-88">AD FREE</div>
      </div>
    </div>

    <div class="sidebar-module stats-module">
      <strong>Site Stats</strong><br/>
      Last updated: Today<br/>
      Established: 2024
    </div>
  </aside>

  <main class="main-content">
    <section class="content-section blog-section">
      <h2>Recent Entries</h2>
      <BlogPosts limit="5" />
    </section>

    <section class="content-section photo-gallery">
      <h2>Photo Album</h2>
      <MediaGrid />
    </section>
  </main>

  <footer class="footer-bar">
    <div>
      © 2024 <DisplayName as="span" /> | Handcrafted with care
    </div>
    <div class="footer-powered">
      Powered by <strong>Threadstead</strong> - Building the personal web
    </div>
  </footer>
</div>`;
