export const ADVANCED_LAYOUT_TEMPLATE = `@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Roboto:wght@400;700&display=swap');

/* Web 2.0 Social Network Theme */
.site-layout {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Open Sans', sans-serif;
  position: relative;
  min-height: 100vh;
}

.site-footer {
  background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.9) 100%) !important;
  border-top: 1px solid rgba(255,255,255,0.1) !important;
  color: rgba(255,255,255,0.8) !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8) !important;
}

.site-header {
  background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%) !important;
  color: #fff !important;
  font-family: 'Open Sans', sans-serif !important;
}

.site-title {
  color: #fff !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
  font-weight: 700 !important;
}

.nav-link {
  background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1)) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,0.3) !important;
  padding: 8px 16px !important;
  margin: 0 4px !important;
  border-radius: 20px !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
}

.nav-link:hover {
  background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.2)) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
}

.ts-profile-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8);
  padding: 0;
  margin: 2rem 0;
}

.ts-profile-header {
  background: linear-gradient(135deg, rgba(102,126,234,0.8), rgba(118,75,162,0.8));
  border-radius: 15px 15px 0 0;
  padding: 2rem;
  text-align: center;
  color: #fff;
}

.ts-profile-display-name {
  color: #fff;
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin-bottom: 0.5rem;
}

.ts-profile-bio {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-left: 4px solid #667eea;
  padding: 1.5rem;
  margin: 1.5rem;
  color: rgba(0,0,0,0.8);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.blog-post-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8);
  color: rgba(0,0,0,0.8);
}

.profile-tab-button {
  background: linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1)) !important;
  color: #667eea !important;
  border: 1px solid rgba(102,126,234,0.3) !important;
  padding: 10px 20px !important;
  margin: 0 4px !important;
  border-radius: 20px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8) !important;
  transition: all 0.3s ease !important;
}

.profile-tab-button:hover {
  background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2)) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15) !important;
}

.profile-tab-button[aria-selected="true"] {
  background: linear-gradient(135deg, #667eea, #764ba2) !important;
  color: #fff !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8) !important;
}`;