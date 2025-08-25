export const NEWSPAPER_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');

/* Early Web Newspaper */
.site-layout {
  background: #fffef7;
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0);
  background-size: 15px 15px;
  font-family: 'Times New Roman', serif;
  line-height: 1.5;
  color: #1a1a1a;
  position: relative;
}

.site-layout::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(0,0,0,0.02) 50px, rgba(0,0,0,0.02) 52px);
  pointer-events: none;
  z-index: -1;
}

.site-footer {
  background: #e0e0e0 !important;
  border-top: 4px double #000 !important;
  color: #000 !important;
  font-family: 'Times New Roman', serif !important;
  text-align: center !important;
  padding: 1rem !important;
}

.site-header {
  background: #f5f5f5 !important;
  border-bottom: 4px double #000 !important;
  color: #000 !important;
  font-family: 'Times New Roman', serif !important;
}

.site-title {
  color: #000 !important;
  font-family: 'Playfair Display', serif !important;
  font-size: 2.5rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 2px !important;
  text-align: center !important;
  border-bottom: 2px solid #000 !important;
  padding-bottom: 0.5rem !important;
}

.nav-link {
  background: #fff !important;
  color: #000 !important;
  border: 2px solid #000 !important;
  padding: 4px 8px !important;
  margin: 0 1px !important;
  font-family: 'Times New Roman', serif !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  transition: all 0.1s ease !important;
}

.nav-link:hover {
  background: #000 !important;
  color: #fff !important;
}

.ts-profile-container {
  background: #fff;
  border: 3px solid #000;
  margin: 2rem 0;
  box-shadow: 5px 5px 0px #000;
}

.ts-profile-header {
  background: #f0f0f0;
  border-bottom: 3px solid #000;
  padding: 2rem;
  text-align: center;
}

.ts-profile-display-name {
  color: #000;
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1rem;
}

.ts-profile-bio {
  background: #f8f8f8;
  border: 2px solid #000;
  color: #000;
  padding: 1.5rem;
  margin: 2rem;
  font-family: 'Times New Roman', serif;
  font-style: italic;
  line-height: 1.7;
}

.blog-post-card {
  background: #fff;
  border: 2px solid #000;
  color: #000;
  margin: 2rem 0;
  padding: 1.5rem;
  box-shadow: 3px 3px 0px #000;
}

.blog-post-header {
  border-bottom: 1px solid #000;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.profile-tab-button {
  background: #f0f0f0 !important;
  color: #000 !important;
  border: 2px solid #000 !important;
  padding: 8px 12px !important;
  margin: 2px !important;
  font-family: 'Times New Roman', serif !important;
  font-weight: bold !important;
  font-size: 10px !important;
  text-transform: uppercase !important;
}

.profile-tab-button:hover {
  background: #000 !important;
  color: #fff !important;
}

.profile-tab-button[aria-selected="true"] {
  background: #000 !important;
  color: #fff !important;
  box-shadow: inset 2px 2px 0px #333 !important;
}`;