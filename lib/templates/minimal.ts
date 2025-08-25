export const MINIMAL_CSS_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Georgia:wght@400;700&display=swap');

/* Simple Homepage Template */
.site-layout {
  background: #e0e0e0 !important;
  background-image: linear-gradient(45deg, #d0d0d0 25%, transparent 25%), linear-gradient(-45deg, #d0d0d0 25%, transparent 25%) !important;
  background-size: 20px 20px !important;
  font-family: system-ui, sans-serif !important;
}

.site-footer {
  background: #4a4a4a !important;
  border-top: 2px solid #333 !important;
  color: #ccc !important;
  text-align: center !important;
}

.site-header { background: #333 !important; color: #fff !important; }
.site-title { color: #fff !important; font-family: Georgia, serif !important; }
.nav-link { color: #fff !important; background: #666 !important; padding: 6px 12px !important; border: 1px solid #888 !important; margin: 0 2px !important; }
.nav-link:hover { background: #888 !important; }

.site-creative-header {
  background: linear-gradient(135deg, #87CEEB, #4682B4);
  padding: 2rem;
  text-align: center;
  border-bottom: 2px solid #333;
}

.ts-profile-container {
  background: #fff;
  border: 2px solid #666;
  box-shadow: 4px 4px 8px rgba(0,0,0,0.2);
  margin: 1rem 0;
}

.ts-profile-header {
  background: linear-gradient(135deg, #87CEEB, #4682B4);
  border-bottom: 2px solid #333;
  padding: 2rem;
  text-align: center;
}

.ts-profile-display-name {
  color: #fff;
  font-size: 2.2rem;
  font-family: Georgia, serif;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.ts-profile-bio {
  background: #f8f8f8;
  border-left: 4px solid #4682B4;
  padding: 1rem;
  margin: 1rem;
  font-style: italic;
  color: #555;
}

.blog-post-card {
  background: #fff;
  border: 1px solid #ccc;
  border-left: 4px solid #4682B4;
  margin: 1.5rem 0;
  padding: 1.5rem;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.profile-tab-button {
  background: #e0e0e0;
  color: #333;
  border: 1px solid #ccc;
  padding: 6px 12px;
  margin: 2px;
  cursor: pointer;
}

.profile-tab-button:hover,
.profile-tab-button[aria-selected="true"] {
  background: #4682B4;
  color: #fff;
  border-color: #333;
}

.profile-button {
  background: #4682B4;
  color: #fff;
  border: 1px solid #333;
  padding: 6px 12px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

.profile-button:hover { background: #5a9fd4; }
.ts-profile-container:hover { box-shadow: 6px 6px 12px rgba(0,0,0,0.25); }
.ts-profile-container { animation: fadeIn 0.8s ease-in; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;