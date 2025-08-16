// Default Profile CSS Templates - Admin Only
// These templates enhance the existing profile page styling with tasteful improvements
// They work WITH the base styles rather than overriding everything

// Professional - Clean Corporate Enhancement
export const DEFAULT_PROFILE_TEMPLATE = `/* ===========================================
   📋 PROFESSIONAL CORPORATE ENHANCEMENT
   =========================================== */

/* Admin Default Template - Works harmoniously with existing base styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;600&display=swap');

/* Subtle container enhancement */
.profile-container {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: all 0.3s ease;
}

.profile-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  opacity: 0.6;
}

.profile-container:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* Enhanced but respectful module styling */
.profile-container .thread-module {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.profile-container .thread-module:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Subtle header enhancement */
.profile-container .profile-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e5e7eb;
}

/* Refined typography - works with existing fonts */
.profile-container .thread-headline {
  color: #1e293b;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 600;
}

.profile-container .thread-label {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Enhanced bio styling - subtle improvements */
.profile-container .profile-bio {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #3b82f6;
  border-radius: 6px;
  color: #334155;
  font-family: 'Inter', system-ui, sans-serif;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

/* Subtle photo frame enhancement */
.profile-container .profile-photo-frame {
  border: 3px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.profile-container .profile-photo-section:hover .profile-photo-frame {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
  transform: scale(1.02);
}

/* Refined button styling - keeps existing size */
.profile-container .thread-button {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.profile-container .thread-button:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Enhanced tab styling - works with existing structure */
.profile-container .profile-tab-button {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  transition: all 0.2s ease;
}

.profile-container .profile-tab-button:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.profile-container .profile-tab-button.active,
.profile-container .profile-tab-button[aria-selected="true"] {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 2px solid #3b82f6;
  font-weight: 600;
}

/* Subtle animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-container {
  animation: fadeIn 0.4s ease-out;
}`;

// Minimal - Subtle Enhancement
export const MINIMAL_PROFILE_TEMPLATE = `/* ===========================================
   ✨ MINIMAL ELEGANT ENHANCEMENT
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

/* Clean, understated container */
.profile-container {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.profile-container:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Subtle module enhancement */
.profile-container .thread-module {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Clean header */
.profile-container .profile-header {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  position: relative;
}

.profile-container .profile-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 1px;
  background: #c0c0c0;
}

/* Refined typography */
.profile-container .thread-headline {
  font-family: 'Crimson Text', Georgia, serif;
  font-weight: 600;
  color: #2c2c2c;
}

.profile-container .thread-label {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 400;
  color: #666;
  text-transform: lowercase;
  letter-spacing: 0.5px;
}

/* Subtle bio styling */
.profile-container .profile-bio {
  background: #f5f5f5;
  border-left: 2px solid #c0c0c0;
  border-radius: 4px;
  color: #444;
  line-height: 1.6;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Minimal photo frame */
.profile-container .profile-photo-frame {
  border: 2px solid #e0e0e0;
  transition: all 0.3s ease;
}

.profile-container .profile-photo-section:hover .profile-photo-frame {
  border-color: #888;
  transform: scale(1.01);
}

/* Clean button styling */
.profile-container .thread-button {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  transition: all 0.2s ease;
}

.profile-container .thread-button:hover {
  background: #e8e8e8;
  border-color: #b0b0b0;
  transform: translateY(-1px);
}

/* Minimal tab styling */
.profile-container .profile-tab-button {
  font-family: 'Inter', system-ui, sans-serif;
  transition: all 0.2s ease;
}

.profile-container .profile-tab-button:hover {
  color: #333;
  background: rgba(0, 0, 0, 0.05);
}

.profile-container .profile-tab-button.active,
.profile-container .profile-tab-button[aria-selected="true"] {
  color: #2c2c2c;
  background: rgba(0, 0, 0, 0.08);
  border-bottom: 2px solid #666;
}`;

// Dark - Modern Dark Enhancement  
export const DARK_PROFILE_TEMPLATE = `/* ===========================================
   🌙 MODERN DARK ENHANCEMENT
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

/* Dark theme container */
.profile-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #3a3a5c;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  position: relative;
  transition: all 0.3s ease;
}

.profile-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00d4ff, #7b68ee);
  opacity: 0.6;
}

.profile-container:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

/* Dark module styling */
.profile-container .thread-module {
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid #3a3a5c;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Dark header */
.profile-container .profile-header {
  background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
  border-bottom: 1px solid #3a3a5c;
  position: relative;
}

.profile-container .profile-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 2rem;
  right: 2rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, #00d4ff, transparent);
  opacity: 0.4;
}

/* Dark typography */
.profile-container .thread-headline {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  background: linear-gradient(135deg, #00d4ff, #7b68ee);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.profile-container .thread-label {
  color: #8892b0;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Dark bio styling */
.profile-container .profile-bio {
  background: rgba(15, 20, 25, 0.6);
  border: 1px solid #3a3a5c;
  border-left: 3px solid #00d4ff;
  border-radius: 6px;
  color: #ccd6f6;
  line-height: 1.6;
  font-family: 'Inter', system-ui, sans-serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Dark photo styling */
.profile-container .profile-photo-frame {
  border: 3px solid #3a3a5c;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.1);
}

.profile-container .profile-photo-section:hover .profile-photo-frame {
  border-color: #00d4ff;
  box-shadow: 0 6px 16px rgba(0, 212, 255, 0.3);
  transform: scale(1.02);
}

/* Dark button styling */
.profile-container .thread-button {
  background: linear-gradient(135deg, #00d4ff 0%, #7b68ee 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);
}

.profile-container .thread-button:hover {
  background: linear-gradient(135deg, #0099cc 0%, #6b5ce7 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);
}

/* Dark tab styling */
.profile-container .profile-tab-button {
  color: #8892b0;
  font-family: 'Inter', system-ui, sans-serif;
  transition: all 0.2s ease;
}

.profile-container .profile-tab-button:hover {
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.1);
}

.profile-container .profile-tab-button.active,
.profile-container .profile-tab-button[aria-selected="true"] {
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.15);
  border-bottom: 2px solid #00d4ff;
}`;

// Colorful - Vibrant Enhancement
export const COLORFUL_PROFILE_TEMPLATE = `/* ===========================================
   🌈 VIBRANT COLORFUL ENHANCEMENT
   =========================================== */

@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=Comfortaa:wght@400;600&display=swap');

/* Colorful container with subtle vibrancy */
.profile-container {
  background: linear-gradient(135deg, 
    rgba(255, 107, 107, 0.08) 0%,
    rgba(78, 205, 196, 0.08) 25%,
    rgba(69, 183, 209, 0.08) 50%,
    rgba(150, 206, 180, 0.08) 75%,
    rgba(254, 202, 87, 0.08) 100%
  );
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.1);
  position: relative;
  transition: all 0.3s ease;
}

.profile-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
  opacity: 0.6;
}

.profile-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
}

/* Colorful module styling */
.profile-container .thread-module {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(102, 126, 234, 0.15);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.08);
}

/* Colorful header */
.profile-container .profile-header {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.9) 0%, 
    rgba(248, 250, 252, 0.9) 100%
  );
  border-bottom: 1px solid rgba(102, 126, 234, 0.15);
  position: relative;
}

/* Vibrant typography */
.profile-container .thread-headline {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 50%, #4facfe 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: 'Poppins', system-ui, sans-serif;
  font-weight: 600;
}

.profile-container .thread-label {
  color: #667eea;
  font-family: 'Comfortaa', system-ui, sans-serif;
  font-weight: 600;
  text-transform: lowercase;
  letter-spacing: 0.5px;
}

/* Colorful bio styling */
.profile-container .profile-bio {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-left: 3px solid #667eea;
  border-radius: 6px;
  color: #2d3748;
  line-height: 1.6;
  font-family: 'Poppins', system-ui, sans-serif;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.08);
}

/* Colorful button styling */
.profile-container .thread-button {
  background: linear-gradient(135deg, #f093fb 0%, #4facfe 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-family: 'Poppins', system-ui, sans-serif;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
}

.profile-container .thread-button:hover {
  background: linear-gradient(135deg, #4facfe 0%, #f093fb 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
}

/* Colorful tab styling */
.profile-container .profile-tab-button {
  color: #667eea;
  font-family: 'Poppins', system-ui, sans-serif;
  transition: all 0.2s ease;
}

.profile-container .profile-tab-button:hover {
  color: #4facfe;
  background: rgba(79, 172, 254, 0.1);
}

.profile-container .profile-tab-button.active,
.profile-container .profile-tab-button[aria-selected="true"] {
  color: #667eea;
  background: rgba(102, 126, 234, 0.15);
  border-bottom: 2px solid #667eea;
  font-weight: 600;
}`;

// Template selection function
export function getDefaultProfileTemplate(type: 'default' | 'minimal' | 'dark' | 'colorful' | 'clear' = 'default'): string {
  switch (type) {
    case 'minimal':
      return MINIMAL_PROFILE_TEMPLATE;
    case 'dark':
      return DARK_PROFILE_TEMPLATE;
    case 'colorful':
      return COLORFUL_PROFILE_TEMPLATE;
    case 'clear':
      return '';
    case 'default':
    default:
      return DEFAULT_PROFILE_TEMPLATE;
  }
}

// Template metadata for UI display
export const DEFAULT_PROFILE_TEMPLATE_INFO = {
  default: {
    name: '📋 Professional',
    description: 'Modern corporate design with elegant typography'
  },
  minimal: {
    name: '✨ Minimal',
    description: 'Clean, understated elegance with subtle animations'
  },
  dark: {
    name: '🌙 Dark Mode',
    description: 'Sleek cyberpunk aesthetic with glowing effects'
  },
  colorful: {
    name: '🌈 Vibrant',
    description: 'Energetic rainbow theme with dynamic animations'
  },
  clear: {
    name: '🗑️ None',
    description: 'No default styling - complete creative freedom'
  }
} as const;