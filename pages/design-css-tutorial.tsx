import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/ui/layout/Layout";
import Head from "next/head";
import RetroFooter from "@/components/design-tutorial/RetroFooter";
import { PixelIcon } from "@/components/ui/PixelIcon";

// CSS Class Categories
const cssCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'zap',
    description: 'Step-by-step tutorial for beginners - learn by example!'
  },
  {
    id: 'css-modes',
    title: 'CSS Modes',
    icon: 'sliders',
    description: 'Understanding CSS layering and mode system'
  },
  {
    id: 'profile-structure',
    title: 'Profile Structure',
    icon: 'Structure',
    description: 'Main containers and layout elements for profile pages'
  },
  {
    id: 'profile-components',
    title: 'Profile Components',
    icon: 'Components',
    description: 'Header, tabs, blog posts, media, and badge styling'
  },
  {
    id: 'threadring-pages',
    title: 'ThreadRing Pages',
    icon: 'ThreadRings',
    description: 'ThreadRing community page styling and components'
  },
  {
    id: 'thread-utilities',
    title: 'Thread Utilities',
    icon: 'Utilities',
    description: 'ThreadStead design system classes and components'
  },
  {
    id: 'colors-themes',
    title: 'Colors & Themes',
    icon: 'Colors',
    description: 'Color palette and theming utilities'
  },
  {
    id: 'typography',
    title: 'Typography',
    icon: 'Typography',
    description: 'Text styling and content formatting'
  }
];

const cssData = {
  'getting-started': [
    {
      name: 'Welcome to CSS Customization!',
      description: 'Don\'t worry if you\'re new to CSS! These templates show you exactly how powerful CSS can be. Follow along step-by-step.',
      classes: [
        { name: 'Prefer Visual?', description: 'Check out our Visual Builder (drag-and-drop, no code!) at /templates' },
        { name: 'Step 1', description: 'Choose a template that speaks to you' },
        { name: 'Step 2', description: 'Copy the CSS code and paste it into your profile editor' },
        { name: 'Step 3', description: 'See the magic happen instantly!' },
        { name: 'Step 4', description: 'Tweak colors, fonts, and effects to make it yours' }
      ],
      example: `/* Getting Started - Copy this example! */

/* This simple CSS transforms your entire profile */
.thread-surface {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}

.site-header {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px) !important;
  border-bottom: 3px solid #667eea !important;
}

.site-title {
  background: linear-gradient(45deg, #667eea, #764ba2) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-lg text-center font-bold">
            Your Profile Background
          </div>
          <div className="bg-white/95 backdrop-blur border-b-4 border-indigo-500 p-2 rounded text-center">
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent font-bold">
              Your Site Title
            </span>
          </div>
          <div className="text-sm text-gray-600 text-center flex items-center justify-center gap-1">
            <PixelIcon name="zap" size={14} /> Just a few lines of CSS created this look!
          </div>
        </div>
      )
    },
    {
      name: 'Template Showcase: Abstract Art Gallery',
      description: 'See how our Abstract Art template transforms a profile into a modern art gallery. Every element is styled with purpose!',
      classes: [
        { name: '.thread-surface', description: 'Canvas background with paint splatters' },
        { name: '.site-header', description: 'Clean gallery navigation with track lighting' },
        { name: '.site-title', description: 'Animated gradient text like a gallery sign' },
        { name: '.nav-link', description: 'Professional gallery-style navigation' }
      ],
      example: `/* Abstract Art Gallery Template - Full Power of CSS! */

/* Transform the entire page into an art gallery */
.thread-surface {
  background: 
    #f8f8f8,
    radial-gradient(ellipse at 15% 25%, rgba(231, 76, 60, 0.15) 0%, transparent 25%),
    radial-gradient(ellipse at 85% 75%, rgba(52, 152, 219, 0.12) 0%, transparent 30%),
    radial-gradient(ellipse at 60% 10%, rgba(155, 89, 182, 0.1) 0%, transparent 35%) !important;
  background-size: 100% 100%, 300px 200px, 250px 180px, 280px 220px !important;
}

/* Gallery-style navigation header */
.site-header {
  background: linear-gradient(180deg, #fefefe 0%, #fdfdfd 100%) !important;
  border-bottom: 6px solid #2c3e50 !important;
  box-shadow: 0 4px 20px rgba(44, 62, 80, 0.15) !important;
}

/* Gallery track lighting effect */
.site-header::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 20% !important;
  width: 60% !important;
  height: 2px !important;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(241, 196, 15, 0.6) 20%, 
    rgba(231, 76, 60, 0.6) 40%,
    rgba(52, 152, 219, 0.6) 60%,
    rgba(155, 89, 182, 0.6) 80%,
    transparent 100%) !important;
  animation: galleryLights 8s ease-in-out infinite !important;
}

/* Animated gallery title */
.site-title {
  color: #2c3e50 !important;
  font-family: 'Righteous', cursive !important;
  background: linear-gradient(135deg, #e74c3c 0%, #f39c12 25%, #3498db 50%, #9b59b6 75%, #2ecc71 100%) !important;
  background-size: 200% 200% !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  animation: paintBrush 6s ease infinite !important;
}`,
      preview: (
        <div className="space-y-4">
          <div className="relative bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
            <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-yellow-400 via-red-400 via-blue-400 via-purple-400 to-green-400 rounded-full opacity-60"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 via-purple-500 to-green-500 bg-clip-text text-transparent">
                Your Gallery
              </h3>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-100 via-blue-100 to-purple-100 p-6 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="w-8 h-8 bg-red-400 rounded-full absolute top-2 left-4"></div>
              <div className="w-6 h-6 bg-blue-400 rounded-full absolute bottom-4 right-8"></div>
              <div className="w-10 h-10 bg-purple-400 rounded-full absolute top-8 right-12"></div>
            </div>
            <div className="relative text-center text-gray-700 font-medium">
              Paint Splatter Canvas Background
            </div>
          </div>
          <div className="text-sm text-green-600 font-medium text-center">
            Professional art gallery aesthetic achieved purely with CSS!
          </div>
        </div>
      )
    },
    {
      name: 'Template Showcase: Retro Social (MySpace 2005)',
      description: 'Travel back to 2005 with authentic MySpace styling! See how CSS can completely change the vibe of your profile.',
      classes: [
        { name: '.thread-surface', description: 'Classic black background with twinkling stars' },
        { name: '.site-header', description: 'Authentic MySpace blue gradient navigation' },
        { name: '.site-title', description: 'Classic MySpace styling with heart animations' },
        { name: '::before elements', description: 'Decorative elements like "★ Online Now ★"' }
      ],
      example: `/* MySpace 2005 Template - Nostalgic Social Media! */

/* Authentic MySpace black background with stars */
.thread-surface {
  background: 
    #000000,
    radial-gradient(circle at 15px 15px, #ffffff 1px, transparent 1px),
    radial-gradient(circle at 35px 25px, #ff1493 0.5px, transparent 0.5px),
    radial-gradient(circle at 55px 35px, #00bfff 0.8px, transparent 0.8px),
    radial-gradient(circle at 25px 45px, #ffff00 0.6px, transparent 0.6px) !important;
  background-size: 60px 60px, 60px 60px, 60px 60px, 60px 60px !important;
  animation: myspaceStars 30s linear infinite !important;
}

/* Classic MySpace blue navigation */
.site-header {
  background: linear-gradient(180deg, #4477cc 0%, #336699 50%, #225588 100%) !important;
  border-bottom: 3px solid #114477 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
}

/* MySpace "Online Now" indicator */
.site-header::before {
  content: '★ Online Now ★' !important;
  position: absolute !important;
  top: 50% !important;
  right: 1rem !important;
  transform: translateY(-50%) !important;
  font-size: 0.75rem !important;
  color: #ffff00 !important;
  font-family: 'Comic Neue', cursive !important;
  font-weight: bold !important;
  text-shadow: 1px 1px 0 #000, 0 0 5px #ffff00 !important;
  animation: myspaceBlink 1.5s ease-in-out infinite !important;
}

/* Classic MySpace title with heart */
.site-title {
  color: #ffffff !important;
  font-family: 'Comic Neue', cursive !important;
  font-weight: 700 !important;
  text-shadow: 2px 2px 0 #000000, 4px 4px 0 #ff1493 !important;
  text-decoration: underline !important;
  text-decoration-color: #ff1493 !important;
}

.site-title::after {
  content: ' ♥' !important;
  color: #ff1493 !important;
  animation: heartBeat 1s ease-in-out infinite !important;
}`,
      preview: (
        <div className="space-y-4">
          <div className="bg-black p-4 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="w-1 h-1 bg-white rounded-full absolute top-2 left-4 animate-pulse"></div>
              <div className="w-0.5 h-0.5 bg-pink-500 rounded-full absolute bottom-4 right-8 animate-pulse"></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full absolute top-8 right-12 animate-pulse"></div>
              <div className="w-0.5 h-0.5 bg-yellow-400 rounded-full absolute bottom-2 left-12 animate-pulse"></div>
            </div>
            <div className="relative text-center text-white font-medium">
              Twinkling Star Background
            </div>
          </div>
          <div className="bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 p-3 rounded text-white relative">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white underline decoration-pink-500">Your Profile ♥</span>
              <span className="text-yellow-300 text-xs font-bold animate-pulse">★ Online Now ★</span>
            </div>
          </div>
          <div className="text-sm text-blue-400 font-medium text-center">
            💖 Pure 2005 MySpace nostalgia with CSS magic!
          </div>
        </div>
      )
    },
    {
      name: 'How to Customize These Templates',
      description: 'Ready to make a template your own? Here are easy modifications you can make to any template!',
      classes: [
        { name: 'Change Colors', description: 'Replace hex codes like #ff1493 with your favorites' },
        { name: 'Adjust Fonts', description: 'Swap Google Fonts imports for different typography' },
        { name: 'Modify Animations', description: 'Speed up, slow down, or remove animations entirely' },
        { name: 'Add Your Touch', description: 'Include personal elements like custom backgrounds' }
      ],
      example: `/* Easy Customizations - Make Any Template Yours! */

/* CHANGE COLORS - Replace these hex codes */
/* Find: #ff1493 (hot pink) Replace with: #your-color */
.site-header {
  background: linear-gradient(180deg, #4477cc 0%, #336699 100%) !important;
  /*                           ^^^^^ Change this blue to any color! */
  border-bottom: 3px solid #your-favorite-color !important;
}

/* ✏️ CHANGE FONTS - Swap the Google Font import */
@import url('https://fonts.googleapis.com/css2?family=Righteous:wght@400&display=swap');
/*                                                    ^^^^^^^^^ Try: Fredoka, Comfortaa, Righteous */

.site-title {
  font-family: 'Righteous', cursive !important;
  /*           ^^^^^^^^^^ Use your new font here */
}

/* ⚡ ADJUST ANIMATIONS - Control the speed */
.site-header::before {
  animation: galleryLights 8s ease-in-out infinite !important;
  /*                       ^^ Try: 2s (faster) or 15s (slower) */
}

/* ADD YOUR BACKGROUND IMAGE */
.thread-surface {
  background: 
    url('your-image-url.jpg'), /* Add your image on top */
    linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  background-size: cover, 100% 100% !important; /* Make image fill screen */
}

/* REMOVE ANIMATIONS - Just delete or comment out */
/* 
.site-title {
  animation: paintBrush 6s ease infinite !important; <-- Delete this line
}
*/`,
      preview: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-500 text-white p-2 rounded text-center text-sm font-bold">
              Original Color
            </div>
            <div className="bg-green-500 text-white p-2 rounded text-center text-sm font-bold">
              Your New Color!
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-gray-300 p-2 text-center">
              <span className="font-serif">Original Font</span>
            </div>
            <div className="border-2 border-purple-500 p-2 text-center">
              <span className="font-bold">Your Font!</span>
            </div>
          </div>
          <div className="bg-blue-50 border-2 border-blue-300 p-3 rounded text-center">
            <span className="text-blue-600 font-medium flex items-center justify-center gap-1">
              <PixelIcon name="paint-bucket" size={14} /> Mix and match colors, fonts, and effects to create something uniquely yours!
            </span>
          </div>
        </div>
      )
    },
    {
      name: 'Next Steps: Beyond Templates',
      description: 'Ready to go beyond templates? Learn the key concepts that will help you create completely custom designs!',
      classes: [
        { name: 'CSS Selectors', description: 'Target specific parts of your profile (.site-header, .nav-link, etc.)' },
        { name: 'CSS Properties', description: 'What each style does (background, color, font-family, etc.)' },
        { name: '!important', description: 'Makes your styles take priority over defaults' },
        { name: 'Animations', description: 'Add movement and life to your profile (@keyframes)' }
      ],
      example: `/* Understanding CSS Structure */

/* SELECTOR - What you're styling */
.site-title {
  /* PROPERTIES - How you're styling it */
  color: #ffffff !important;        /* Text color: white */
  font-size: 2rem !important;       /* Size: 2x normal */
  font-family: cursive !important;  /* Font: handwriting style */
  text-align: center !important;    /* Position: centered */
  
  /* ADVANCED: Gradients and shadows */
  background: linear-gradient(45deg, #red, #blue) !important;
  text-shadow: 2px 2px 0 #black !important;
  
  /* ANIMATION: Make it move */
  animation: bounce 2s infinite !important;
}

/* CREATE YOUR OWN ANIMATION */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }     /* Start/end position */
  50% { transform: translateY(-10px); }      /* Middle position: up 10px */
}

/* RESPONSIVE: Different styles on mobile */
@media (max-width: 768px) {
  .site-title {
    font-size: 1.5rem !important;  /* Smaller on mobile */
  }
}

/* PRO TIP: Use browser dev tools (F12) to experiment! */`,
      preview: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-4 rounded-lg text-center">
            <div className="font-bold text-xl animate-bounce">
              Your Custom Title
            </div>
            <div className="text-sm opacity-75 mt-1">
              (with gradient, shadow, and animation!)
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-red-100 border border-red-300 p-2 rounded text-center">
              <strong>Selector</strong><br/>
              What to style
            </div>
            <div className="bg-green-100 border border-green-300 p-2 rounded text-center">
              <strong>Properties</strong><br/>
              How to style it
            </div>
            <div className="bg-blue-100 border border-blue-300 p-2 rounded text-center">
              <strong>!important</strong><br/>
              Override defaults
            </div>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-300 p-3 rounded text-center text-sm">
            <span className="font-bold text-yellow-800 flex items-center justify-center gap-1">
              <PixelIcon name="lightbulb" size={14} /> Ready to explore? Check out the other tabs for all available CSS classes!
            </span>
          </div>
        </div>
      )
    }
  ],
  'css-modes': [
    {
      name: 'CSS Mode System',
      description: 'Control how your custom CSS interacts with ThreadStead\'s base styles',
      classes: [
        { name: '/* CSS_MODE:inherit */', description: 'Your CSS enhances the default styles (recommended)' },
        { name: '/* CSS_MODE:override */', description: 'Your CSS replaces default styles completely' },
        { name: '/* CSS_MODE:disable */', description: 'Disables all site CSS, only your styles apply' }
      ],
      example: `/* Add this comment at the top of your CSS to set the mode */
/* CSS_MODE:inherit */

/* inherit mode - Works WITH the base styles */
.ts-profile-header {
  /* Enhances the existing header */
  background: linear-gradient(135deg, #667eea, #764ba2) !important;
  padding: 2rem !important;
}

/* CSS_MODE:override */

/* override mode - Replaces base styles completely */
.ts-profile-container {
  /* You define everything from scratch */
  display: grid !important;
  grid-template-columns: 200px 1fr !important;
}

/* CSS_MODE:disable */

/* disable mode - NO base styles at all */
body {
  /* Complete control - even basic styles are removed */
  margin: 0;
  font-family: 'Comic Sans MS', cursive;
}`,
      preview: (
        <div className="space-y-3 text-xs">
          <div className="bg-green-100 border border-green-300 p-2 rounded">
            <strong>inherit</strong>: Enhances existing styles
          </div>
          <div className="bg-yellow-100 border border-yellow-300 p-2 rounded">
            <strong>override</strong>: Replaces styles completely
          </div>
          <div className="bg-red-100 border border-red-300 p-2 rounded">
            <strong>disable</strong>: No base styles at all
          </div>
        </div>
      )
    },
    {
      name: 'Using !important',
      description: 'Best practices for overriding styles with specificity',
      classes: [
        { name: '!important', description: 'Forces your style to take precedence' }
      ],
      example: `/* ALWAYS use !important to ensure your styles apply */

/* ✅ Good - Using !important */
.ts-profile-header {
  background: #ff6b6b !important;
  padding: 3rem !important;
}

/* ❌ Bad - May not override base styles */
.ts-profile-header {
  background: #ff6b6b;
  padding: 3rem;
}

/* Pro tip: In inherit mode, !important ensures your 
   enhancements always apply over the defaults */`,
      preview: (
        <div className="bg-blue-50 border-2 border-blue-300 p-3 rounded text-xs">
          <div className="font-bold mb-2 flex items-center gap-1"><PixelIcon name="lightbulb" size={12} /> Pro Tip</div>
          <div>Always use <code className="bg-white px-1">!important</code> in your custom CSS to ensure your styles take precedence over the base styles.</div>
        </div>
      )
    },
    {
      name: 'Template Modes',
      description: 'Different levels of customization control',
      classes: [
        { name: 'default', description: 'Standard profile with CSS enhancements only' },
        { name: 'enhanced', description: 'Custom CSS with structural modifications' },
        { name: 'advanced', description: 'Full HTML/CSS control with custom templates' }
      ],
      example: `/* Default Mode - CSS customization only */
/* You can style all the ts- classes but can't change HTML */

/* Enhanced Mode - CSS + some structural changes */
/* Additional layout options and component arrangements */

/* Advanced Mode - Complete control */
/* Write your own HTML templates with full control */
/* Usually paired with CSS_MODE:override or disable */`,
      preview: (
        <div className="space-y-2 text-xs">
          <div className="bg-gray-100 p-2 rounded">
            <strong>Default</strong>: Style existing elements
          </div>
          <div className="bg-gray-200 p-2 rounded">
            <strong>Enhanced</strong>: Modify structure + style
          </div>
          <div className="bg-gray-300 p-2 rounded">
            <strong>Advanced</strong>: Full HTML/CSS control
          </div>
        </div>
      )
    }
  ],
  'profile-components': [
    {
      name: 'Profile Header Components',
      description: 'Header section containing profile photo, display name, and bio',
      classes: [
        { name: '.ts-profile-header', description: 'Main profile header container' },
        { name: '.ts-profile-header-layout', description: 'Flex layout for header elements' },
        { name: '.ts-profile-photo-section', description: 'Profile photo container' },
        { name: '.ts-profile-info-section', description: 'Name and bio container' },
        { name: '.ts-profile-identity', description: 'Wrapper for username and status' },
        { name: '.ts-profile-display-name', description: 'Profile display name' },
        { name: '.ts-profile-status', description: 'User status text element' },
        { name: '.ts-profile-bio', description: 'Profile bio text' },
        { name: '.ts-profile-bio-section', description: 'Bio container section' },
        { name: '.ts-profile-actions', description: 'Action buttons container' },
        { name: '.ts-profile-button', description: 'Profile-specific button styling' },
        { name: '.ts-edit-profile-button', description: 'Edit profile button' }
      ],
      example: `/* Modern glass morphism header */
.ts-profile-header {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
  padding: 2rem !important;
}

.ts-profile-display-name {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-size: 3rem !important;
  text-align: center !important;
}

.ts-profile-bio {
  color: rgba(255, 255, 255, 0.9) !important;
  font-style: italic !important;
  text-align: center !important;
  font-size: 1.2rem !important;
  line-height: 1.6 !important;
}

.ts-profile-actions {
  display: flex !important;
  gap: 1rem !important;
  margin-top: 1rem !important;
}`,
      preview: (
        <div className="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-xl p-4">
          <div className="text-center">
            <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Profile Name
            </div>
            <div className="text-sm text-gray-600 italic">This is a sample bio that appears in the header section</div>
          </div>
        </div>
      )
    },
    {
      name: 'Profile Tabs System',
      description: 'Tab navigation and content areas for different profile sections',
      classes: [
        { name: '.profile-tabs-wrapper', description: 'Main tabs container' },
        { name: '.profile-tabs', description: 'Tab navigation container' },
        { name: '.profile-tab-list', description: 'List of tab buttons' },
        { name: '.profile-tab-button', description: 'Individual tab button' },
        { name: '.profile-tab-button[aria-selected="true"]', description: 'Active/selected tab' },
        { name: '.profile-tab-content', description: 'Tab content container' },
        { name: '.profile-tab-panel', description: 'Individual tab panel' }
      ],
      example: `/* Retro 90s style tabs */
.profile-tab-button {
  background: linear-gradient(145deg, #ff6b9d, #c44569) !important;
  border: none !important;
  color: white !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
  border-radius: 20px 20px 0 0 !important;
  box-shadow: inset 2px 2px 5px rgba(255,255,255,0.3) !important;
  transition: all 0.3s ease !important;
}

.profile-tab-button[aria-selected="true"] {
  background: linear-gradient(145deg, #4ecdc4, #44a08d) !important;
  transform: scale(1.1) !important;
  box-shadow: 0 5px 15px rgba(78, 205, 196, 0.4) !important;
}

.profile-tab-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-radius: 0 15px 15px 15px !important;
  padding: 2rem !important;
  color: white !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="flex gap-1">
            <div className="bg-gradient-to-br from-pink-400 to-red-400 text-white px-3 py-2 rounded-t-lg text-xs font-bold">BLOG</div>
            <div className="bg-gradient-to-br from-teal-400 to-green-400 text-white px-3 py-2 rounded-t-lg text-xs font-bold transform scale-110">MEDIA</div>
            <div className="bg-gray-300 px-3 py-2 rounded-t-lg text-xs">BADGES</div>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-purple-600 text-white p-4 rounded-b-lg rounded-tr-lg">
            <div className="text-xs">Tab content appears here...</div>
          </div>
        </div>
      )
    },
    {
      name: 'Blog Post Components', 
      description: 'Blog post display and styling components',
      classes: [
        { name: '.ts-blog-tab-content', description: 'Blog posts tab container' },
        { name: '.ts-blog-posts-list', description: 'List container for posts' },
        { name: '.ts-new-post-section', description: 'New post button area' },
        { name: '.ts-no-posts-message', description: 'Empty state message' },
        { name: '.ts-blog-loading', description: 'Loading state for blog posts' },
        { name: '.blog-post', description: 'Individual blog post' },
        { name: '.blog-post-header', description: 'Post header with date/meta' },
        { name: '.blog-post-content', description: 'Post content area' },
        { name: '.blog-post-meta', description: 'Post metadata' }
      ],
      example: `/* Card-based blog posts */
.ts-blog-tab-content {
  padding: 1rem !important;
}

.blog-post {
  background: white !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
  margin-bottom: 2rem !important;
  padding: 0 !important;
  overflow: hidden !important;
  transition: transform 0.3s ease !important;
}

.blog-post:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15) !important;
}

.blog-post-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  padding: 1.5rem !important;
  border-bottom: none !important;
}

.blog-post-content {
  padding: 1.5rem !important;
  line-height: 1.7 !important;
  color: #333 !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3">
              <div className="font-bold text-sm">Blog Post Title</div>
              <div className="text-xs opacity-75">October 15, 2024</div>
            </div>
            <div className="p-3">
              <div className="text-xs text-gray-700">Post content preview with enhanced styling...</div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'Media Grid Components',
      description: 'Image gallery and media display components',
      classes: [
        { name: '.media-tab-content', description: 'Media tab container' },
        { name: '.media-grid', description: 'Grid layout for media items' },
        { name: '.media-item', description: 'Individual media item' },
        { name: '.media-image', description: 'Media image element' },
        { name: '.media-overlay', description: 'Hover overlay on media items' },
        { name: '.media-caption', description: 'Media item caption' }
      ],
      example: `/* Instagram-style media grid */
.media-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
  gap: 1rem !important;
  padding: 1rem !important;
}

.media-item {
  position: relative !important;
  aspect-ratio: 1 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

.media-item:hover {
  transform: scale(1.05) !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2) !important;
}

.media-overlay {
  position: absolute !important;
  inset: 0 !important;
  background: linear-gradient(45deg, rgba(255, 107, 107, 0.8), rgba(78, 205, 196, 0.8)) !important;
  opacity: 0 !important;
  transition: opacity 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: white !important;
  font-weight: bold !important;
}

.media-item:hover .media-overlay {
  opacity: 1 !important;
}`,
      preview: (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg relative group overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-blue-300 to-purple-400"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-teal-500 opacity-0 group-hover:opacity-80 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                View
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      name: 'Profile Badges Components',
      description: 'ThreadRing badges display and styling',
      classes: [
        { name: '.profile-badges', description: 'Main badges container' },
        { name: '.badges-grid', description: 'Grid layout for badges' },
        { name: '.badge-item', description: 'Individual badge container' },
        { name: '.threadring-badge', description: '88x31 badge styling' },
        { name: '.badge-collection-link', description: 'Link to full badge collection' }
      ],
      example: `/* Floating badge collection */
.profile-badges {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 20px !important;
  padding: 2rem !important;
}

.badge-item {
  transition: all 0.3s ease !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  position: relative !important;
}

.badge-item:hover {
  transform: translateY(-8px) rotate(5deg) !important;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2) !important;
  z-index: 10 !important;
}

.threadring-badge {
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}`,
      preview: (
        <div className="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-xl p-4">
          <div className="text-sm font-bold mb-3">ThreadRing Badges</div>
          <div className="grid grid-cols-3 gap-2">
            {['Community', 'Creator', 'Helper'].map(badge => (
              <div key={badge} className="bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs p-2 rounded border-2 border-white border-opacity-30 hover:transform hover:scale-110 transition-transform">
                {badge}
              </div>
            ))}
          </div>
          <div className="text-xs text-center mt-2 opacity-75">View Full Collection →</div>
        </div>
      )
    }
  ],
  'threadring-pages': [
    {
      name: 'ThreadRing Page Layout',
      description: 'Main page structure for ThreadRing community pages',
      classes: [
        { name: '.tr-page-container', description: 'Main grid container for ThreadRing pages' },
        { name: '.tr-main-content', description: 'Main content area (left column)' },
        { name: '.tr-sidebar', description: 'Sidebar area (right column)' },
        { name: '.tr-header-card', description: 'ThreadRing header information card' },
        { name: '.tr-posts-container', description: 'Container for posts list' }
      ],
      example: `/* Custom ThreadRing page layout */
.tr-page-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  min-height: 100vh !important;
  padding: 2rem !important;
}

.tr-header-card {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: 20px !important;
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.tr-sidebar {
  background: rgba(255, 255, 255, 0.05) !important;
  border-radius: 15px !important;
  padding: 1rem !important;
}`,
      preview: (
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-lg">
          <div className="bg-white bg-opacity-90 rounded-lg p-3 mb-2 shadow-lg">
            <div className="text-sm font-bold text-purple-800">ThreadRing Header</div>
            <div className="text-xs text-gray-600">Community info and actions</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 bg-white bg-opacity-60 rounded p-2 text-xs">Posts Area</div>
            <div className="bg-white bg-opacity-40 rounded p-2 text-xs">Sidebar</div>
          </div>
        </div>
      )
    },
    {
      name: 'ThreadRing Header Elements',
      description: 'Header components showing ThreadRing information',
      classes: [
        { name: '.tr-title', description: 'ThreadRing title/name' },
        { name: '.tr-description', description: 'ThreadRing description text' },
        { name: '.tr-curator-note', description: 'Curator\'s note/welcome message' },
        { name: '.tr-meta-info', description: 'Member count, post count, join type info' },
        { name: '.tr-badge-wrapper', description: 'Container for ThreadRing badge' }
      ],
      example: `/* Cosmic ThreadRing header styling */
.tr-title {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1) !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-size: 3rem !important;
  text-align: center !important;
  animation: rainbow 3s ease-in-out infinite !important;
}

@keyframes rainbow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

.tr-curator-note {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%) !important;
  border: none !important;
  border-radius: 20px !important;
  box-shadow: 0 10px 25px rgba(255, 154, 158, 0.3) !important;
  backdrop-filter: blur(10px) !important;
}

.tr-meta-info {
  background: rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(5px) !important;
  border-radius: 25px !important;
  padding: 1rem 1.5rem !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-center">
            My ThreadRing
          </div>
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-3 rounded-xl border-l-4 border-pink-400">
            <div className="text-xs text-pink-600 font-medium mb-1">Ring Host&apos;s Note</div>
            <div className="text-xs">Welcome to our community!</div>
          </div>
          <div className="bg-white bg-opacity-50 rounded-full px-3 py-1 text-xs text-center">
            25 members • 142 posts • open joining
          </div>
        </div>
      )
    },
    {
      name: 'ThreadRing Sidebar Components',
      description: 'Sidebar widgets and sections',
      classes: [
        { name: '.tr-sidebar-section', description: 'Individual sidebar section container' },
        { name: '.tr-sidebar-header', description: 'Collapsible section header' },
        { name: '.tr-sidebar-title', description: 'Section title text' },
        { name: '.tr-ring-info', description: 'Ring info section' },
        { name: '.tr-member-status', description: 'Current user membership status' },
        { name: '.tr-actions-section', description: 'Action buttons container' }
      ],
      example: `/* Glassmorphism sidebar styling */
.tr-sidebar-section {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(15px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 15px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
  margin-bottom: 1.5rem !important;
}

.tr-sidebar-header {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 15px 15px 0 0 !important;
  transition: all 0.3s ease !important;
}

.tr-sidebar-header:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-2px) !important;
}

.tr-member-status {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="bg-white bg-opacity-20 rounded-lg border border-white border-opacity-30">
            <div className="bg-white bg-opacity-10 rounded-t-lg p-2 border-b border-white border-opacity-20">
              <div className="text-xs font-bold">Ring Info</div>
            </div>
            <div className="p-2 space-y-1 text-xs">
              <div>Created: Oct 15, 2024</div>
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded-full text-center">
                👑 Curator
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'ThreadRing Feed Components',
      description: 'Post feed and scope selection components',
      classes: [
        { name: '.tr-feed-scope', description: 'Feed scope selector widget' },
        { name: '.tr-scope-options', description: 'Scope option buttons container' },
        { name: '.tr-scope-active', description: 'Currently active scope option' },
        { name: '.tr-posts-list', description: 'Posts list container' },
        { name: '.tr-posts-loading', description: 'Loading state for posts' },
        { name: '.tr-posts-empty', description: 'Empty state when no posts' }
      ],
      example: `/* Retro gaming feed styling */
.tr-feed-scope {
  background: #ff6b9d !important;
  border: 4px solid #000 !important;
  border-radius: 0 !important;
  box-shadow: 8px 8px 0 #000 !important;
  font-family: 'Comic Sans MS', cursive !important;
}

.tr-scope-option {
  background: #ffff00 !important;
  border: 3px solid #000 !important;
  color: #000 !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  transition: all 0.1s ease !important;
}

.tr-scope-active {
  background: #00ff00 !important;
  transform: translate(2px, 2px) !important;
  box-shadow: 2px 2px 0 #000 !important;
}

.tr-posts-list {
  background: #e0e0e0 !important;
  border: 4px solid #000 !important;
  border-radius: 0 !important;
  box-shadow: inset 4px 4px 8px rgba(0,0,0,0.3) !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="bg-pink-300 border-2 border-black p-2 shadow-lg">
            <div className="text-xs font-bold mb-2">Feed: This Ring</div>
            <div className="flex gap-1">
              <div className="bg-green-400 border-2 border-black px-2 py-1 text-xs font-bold">THIS</div>
              <div className="bg-yellow-400 border-2 border-black px-2 py-1 text-xs font-bold">FAMILY</div>
            </div>
          </div>
          <div className="bg-gray-200 border-2 border-black p-3">
            <div className="text-xs">Posts would appear here...</div>
          </div>
        </div>
      )
    },
    {
      name: 'ThreadRing Active Prompts',
      description: 'Challenge/prompt display components',
      classes: [
        { name: '.tr-active-prompt', description: 'Active prompt/challenge container' },
        { name: '.tr-prompt-active', description: 'Active prompt styling' },
        { name: '.tr-prompt-inactive', description: 'Inactive/ended prompt styling' },
        { name: '.tr-prompt-title', description: 'Prompt title text' },
        { name: '.tr-prompt-description', description: 'Prompt description/content' },
        { name: '.tr-prompt-status', description: 'Prompt status badges' }
      ],
      example: `/* Holographic prompt styling */
.tr-active-prompt {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4) !important;
  background-size: 400% 400% !important;
  animation: gradient-shift 4s ease infinite !important;
  border: none !important;
  border-radius: 20px !important;
  padding: 2rem !important;
  position: relative !important;
  overflow: hidden !important;
}

.tr-active-prompt::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px) !important;
  z-index: -1 !important;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.tr-prompt-title {
  color: white !important;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5) !important;
  font-size: 2rem !important;
  font-weight: bold !important;
}`,
      preview: (
        <div className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4 rounded-xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <span>💭</span>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded-full animate-pulse">Active</span>
          </div>
          <div className="font-bold mb-1">Weekly Challenge</div>
          <div className="text-sm opacity-90">Share your favorite autumn memory!</div>
          <div className="mt-2 text-xs opacity-75">5 responses so far</div>
        </div>
      )
    },
    {
      name: 'ThreadRing Statistics',
      description: 'Statistics and data display components',
      classes: [
        { name: '.tr-stats', description: 'Statistics widget container' },
        { name: '.tr-stats-overview', description: 'Overview stats section' },
        { name: '.tr-stats-grid', description: 'Grid of stat items' },
        { name: '.tr-stat-value', description: 'Numeric stat values' },
        { name: '.tr-stat-label', description: 'Stat labels/descriptions' },
        { name: '.tr-stats-activity', description: 'Recent activity section' }
      ],
      example: `/* Cyberpunk stats styling */
.tr-stats {
  background: #0f0f0f !important;
  border: 2px solid #00ff41 !important;
  border-radius: 0 !important;
  box-shadow: 
    0 0 20px #00ff41,
    inset 0 0 20px rgba(0, 255, 65, 0.1) !important;
  font-family: 'Courier New', monospace !important;
  color: #00ff41 !important;
}

.tr-stat-value {
  color: #00ffff !important;
  font-size: 2rem !important;
  font-weight: bold !important;
  text-shadow: 0 0 10px #00ffff !important;
  animation: flicker 2s infinite alternate !important;
}

.tr-stat-label {
  color: #00ff41 !important;
  text-transform: uppercase !important;
  font-size: 0.7rem !important;
  letter-spacing: 1px !important;
}

@keyframes flicker {
  0% { opacity: 1; }
  97% { opacity: 1; }
  98% { opacity: 0.8; }
  100% { opacity: 1; }
}`,
      preview: (
        <div className="bg-black border-2 border-green-400 p-3 rounded font-mono text-green-400">
          <div className="text-xs font-bold mb-2 text-center">THREAD.STATS</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-900 p-2 border border-green-400">
              <div className="text-cyan-400 font-bold">42</div>
              <div className="text-green-400">MEMBERS</div>
            </div>
            <div className="bg-gray-900 p-2 border border-green-400">
              <div className="text-cyan-400 font-bold">156</div>
              <div className="text-green-400">POSTS</div>
            </div>
          </div>
        </div>
      )
    }
  ],
  'profile-structure': [
    {
      name: 'Profile Containers',
      description: 'Main structural elements of profile pages',
      classes: [
        { name: '.ts-profile-container', description: 'Main wrapper for entire profile page' },
        { name: '.ts-profile-content-wrapper', description: 'Inner content wrapper with responsive padding' },
        { name: '.ts-profile-main-content', description: 'Contains main profile sections (header, tabs, etc.)' },
        { name: '.ts-profile-header', description: 'Profile header section containing photo and info' },
        { name: '.ts-profile-header-layout', description: 'Flex layout container for header elements' }
      ],
      example: `/* Create a glass morphism profile container */
.ts-profile-container {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.ts-profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  border-radius: 15px !important;
  padding: 2rem !important;
}`,
      preview: (
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-lg border border-blue-200">
          <div className="text-blue-800 font-semibold">Profile Container</div>
          <div className="text-blue-600 text-sm mt-1">Main structural wrapper</div>
        </div>
      )
    },
    {
      name: 'Profile Photo Elements',
      description: 'Photo containers and styling elements',
      classes: [
        { name: '.ts-profile-photo-section', description: 'Container for profile photo area' },
        { name: '.ts-profile-photo-wrapper', description: 'Photo wrapper with positioning' },
        { name: '.ts-profile-photo-frame', description: 'Photo frame/border styling' },
        { name: '.ts-profile-photo-image', description: 'The actual profile image element' },
        { name: '.ts-profile-photo-placeholder', description: 'Placeholder when no photo is set' }
      ],
      example: `/* Polaroid-style photo frame */
.ts-profile-photo-frame {
  background: #ffffff !important;
  border: none !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
  padding: 16px !important;
  transform: rotate(-2deg) !important;
  transition: transform 0.3s ease !important;
}

.ts-profile-photo-frame:hover {
  transform: rotate(0deg) scale(1.05) !important;
}

.ts-profile-photo-image {
  border-radius: 0 !important;
  filter: sepia(20%) contrast(120%) !important;
}`,
      preview: (
        <div className="bg-white p-3 rounded shadow-lg transform -rotate-1 inline-block">
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs">
            Photo
          </div>
        </div>
      )
    },
    {
      name: 'Navigation & Tabs',
      description: 'Site navigation and profile tab system',
      classes: [
        { name: '.site-header', description: 'Main site header bar' },
        { name: '.site-title', description: 'Site title/logo text' },
        { name: '.site-tagline', description: 'Site tagline/subtitle' },
        { name: '.nav-link', description: 'Navigation menu links' },
        { name: '.profile-tabs-wrapper', description: 'Container for tab system' },
        { name: '.profile-tab-button', description: 'Individual tab button' },
        { name: '.profile-tab-button[aria-selected="true"]', description: 'Currently active tab' },
        { name: '.profile-tab-panel', description: 'Tab content container' }
      ],
      example: `/* Retro gaming style tabs */
.profile-tab-button {
  background: #ffff00 !important;
  border: 3px solid #000 !important;
  color: #000 !important;
  font-family: "Comic Sans MS", cursive !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  box-shadow: 4px 4px 0 #000 !important;
  margin: 0 4px !important;
}

.profile-tab-button:hover {
  background: #ff69b4 !important;
  transform: translate(2px, 2px) !important;
  box-shadow: 2px 2px 0 #000 !important;
}

.profile-tab-button[aria-selected="true"] {
  background: #00ff00 !important;
  transform: translate(2px, 2px) !important;
}`,
      preview: (
        <div className="flex gap-2">
          <div className="bg-yellow-400 border-2 border-black px-3 py-1 text-xs font-bold transform">BLOG</div>
          <div className="bg-green-400 border-2 border-black px-3 py-1 text-xs font-bold transform translate-x-0.5 translate-y-0.5">MEDIA</div>
        </div>
      )
    },
    {
      name: 'Blog Post Elements',
      description: 'Blog post cards and content styling',
      classes: [
        { name: '.ts-blog-tab-content', description: 'Container for blog posts tab' },
        { name: '.ts-blog-posts-list', description: 'List container for blog posts' },
        { name: '.blog-post-card', description: 'Individual blog post card' },
        { name: '.blog-post-header', description: 'Post header (date, meta)' },
        { name: '.blog-post-title', description: 'Blog post title/heading' },
        { name: '.blog-post-content', description: 'Post content area' },
        { name: '.blog-post-date', description: 'Post publication date' }
      ],
      example: `/* Newspaper style blog posts */
.blog-post-card {
  background: #f9f7f4 !important;
  border: 2px solid #333 !important;
  border-radius: 0 !important;
  font-family: "Times New Roman", serif !important;
  box-shadow: 5px 5px 0 #333 !important;
  margin-bottom: 2rem !important;
}

.blog-post-title {
  font-size: 2rem !important;
  font-weight: bold !important;
  color: #000 !important;
  text-transform: uppercase !important;
  border-bottom: 3px double #333 !important;
  padding-bottom: 0.5rem !important;
}

.blog-post-date {
  background: #333 !important;
  color: #fff !important;
  padding: 0.25rem 0.5rem !important;
  font-size: 0.8rem !important;
  font-weight: bold !important;
  display: inline-block !important;
}`,
      preview: (
        <div className="bg-yellow-50 border-2 border-gray-800 p-3 font-serif">
          <div className="bg-gray-800 text-white px-2 py-1 text-xs font-bold inline-block mb-2">OCT 15</div>
          <div className="font-bold uppercase border-b-2 border-double border-gray-800 pb-1 mb-2">Blog Post Title</div>
          <div className="text-sm">Post content preview...</div>
        </div>
      )
    }
  ],
  'thread-utilities': [
    {
      name: 'Core Thread Classes',
      description: 'Main ThreadStead design system components',
      classes: [
        { name: '.thread-surface', description: 'Warm paper texture background' },
        { name: '.thread-module', description: 'Paper-like container with cozy shadow' },
        { name: '.thread-divider', description: 'Stitched divider pattern' },
        { name: '.thread-button', description: 'Primary cozy button styling' },
        { name: '.thread-button-secondary', description: 'Secondary button variant' },
        { name: '.thread-headline', description: 'Serif headline with text shadow' },
        { name: '.thread-label', description: 'Monospace micro-labels' },
        { name: '.thread-content', description: 'Enhanced content typography' },
        { name: '.thread-background', description: 'Background hover state for dropdown items' }
      ],
      example: `/* Customize thread components */
.thread-module {
  background: linear-gradient(145deg, #ffffff, #f0f0f0) !important;
  border: none !important;
  border-radius: 15px !important;
  box-shadow: 
    20px 20px 60px #d0d0d0,
    -20px -20px 60px #ffffff !important;
}

.thread-button {
  background: linear-gradient(135deg, #ff69b4, #ff1493) !important;
  color: #fff !important;
  border: 3px solid #000 !important;
  box-shadow: 4px 4px 0px #000 !important;
  text-transform: uppercase !important;
  font-weight: bold !important;
}

.thread-headline {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-size: 3rem !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="bg-cream-100 border border-sage-300 rounded-lg p-3 shadow-lg">
            <div className="font-serif text-pine-700 font-bold mb-2">Thread Module</div>
            <div className="bg-cream-200 border border-sage-300 px-3 py-1 rounded text-sm inline-block">Thread Button</div>
          </div>
        </div>
      )
    },
    {
      name: 'Layout Utilities',
      description: 'Layout and spacing utilities',
      classes: [
        { name: '.line-clamp-2', description: 'Clamp text to 2 lines with ellipsis' },
        { name: '.line-clamp-3', description: 'Clamp text to 3 lines with ellipsis' },
        { name: '.site-layout', description: 'Overall page container' },
        { name: '.site-main', description: 'Main content area' },
        { name: '.site-header', description: 'Site header with consistent background' },
        { name: '.site-footer', description: 'Site footer with consistent background' },
        { name: '.footer-tagline', description: 'Footer tagline text' },
        { name: '.footer-copyright', description: 'Copyright text' }
      ],
      example: `/* Matrix/terminal theme */
.site-layout {
  background: #000 !important;
  color: #00ff00 !important;
  font-family: "Courier New", monospace !important;
}

.site-header {
  background: #000 !important;
  border-bottom: 2px solid #00ff00 !important;
}

.site-title {
  color: #00ff00 !important;
  text-shadow: 0 0 10px #00ff00 !important;
  animation: glow 2s ease-in-out infinite alternate !important;
}

@keyframes glow {
  from { text-shadow: 0 0 5px #00ff00; }
  to { text-shadow: 0 0 25px #00ff00; }
}`,
      preview: (
        <div className="bg-black text-green-400 p-3 rounded font-mono text-xs">
          <div className="border-b border-green-400 mb-2 pb-1">THREADSTEAD TERMINAL</div>
          <div>&gt; Welcome to the matrix_</div>
        </div>
      )
    }
  ],
  'colors-themes': [
    {
      name: 'ThreadStead Color Palette',
      description: 'Official color classes from the ThreadStead design system',
      classes: [
        { name: 'bg-thread-cream', description: 'Warm cream background (#F5E9D4)' },
        { name: 'bg-thread-sage', description: 'Muted sage background (#A18463)' },
        { name: 'bg-thread-pine', description: 'Deep pine background (#2E4B3F)' },
        { name: 'bg-thread-sky', description: 'Soft sky blue background (#8EC5E8)' },
        { name: 'bg-thread-meadow', description: 'Fresh meadow green background (#4FAF6D)' },
        { name: 'bg-thread-sunset', description: 'Warm sunset coral background (#E27D60)' },
        { name: 'bg-thread-paper', description: 'Off-white paper background (#FCFAF7)' },
        { name: 'bg-thread-stone', description: 'Mid gray background (#B8B8B8)' },
        { name: 'bg-thread-charcoal', description: 'Dark charcoal background (#2F2F2F)' }
      ],
      example: `/* Using ThreadStead colors */
.ts-profile-header {
  background: linear-gradient(135deg, 
    rgb(46, 75, 63), /* thread-pine */
    rgb(161, 132, 99) /* thread-sage */
  ) !important;
  color: rgb(252, 250, 247) !important; /* thread-paper */
}

.blog-post-card {
  background: rgb(245, 233, 212) !important; /* thread-cream */
  border: 2px solid rgb(46, 75, 63) !important; /* thread-pine */
  border-radius: 12px !important;
}

.thread-button {
  background: rgb(142, 197, 232) !important; /* thread-sky */
  color: rgb(47, 47, 47) !important; /* thread-charcoal */
  border: 1px solid rgb(161, 132, 99) !important; /* thread-sage */
}`,
      preview: (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-thread-cream p-2 rounded text-center border">Cream</div>
          <div className="bg-thread-sage p-2 rounded text-center text-white">Sage</div>
          <div className="bg-thread-pine p-2 rounded text-center text-white">Pine</div>
          <div className="bg-thread-sky p-2 rounded text-center">Sky</div>
          <div className="bg-thread-meadow p-2 rounded text-center text-white">Meadow</div>
          <div className="bg-thread-sunset p-2 rounded text-center text-white">Sunset</div>
        </div>
      )
    },
    {
      name: 'Text Colors',
      description: 'Text color utilities using ThreadStead palette',
      classes: [
        { name: 'text-thread-cream', description: 'Warm cream text' },
        { name: 'text-thread-sage', description: 'Muted sage text' },
        { name: 'text-thread-pine', description: 'Deep pine text' },
        { name: 'text-thread-sky', description: 'Soft sky blue text' },
        { name: 'text-thread-meadow', description: 'Fresh meadow green text' },
        { name: 'text-thread-sunset', description: 'Warm sunset coral text' },
        { name: 'text-thread-paper', description: 'Off-white paper text' },
        { name: 'text-thread-stone', description: 'Mid gray text' },
        { name: 'text-thread-charcoal', description: 'Dark charcoal text' }
      ],
      example: `/* Text color examples */
.ts-profile-display-name {
  color: rgb(46, 75, 63) !important; /* text-thread-pine */
  font-weight: bold !important;
}

.ts-profile-bio {
  color: rgb(161, 132, 99) !important; /* text-thread-sage */
  font-style: italic !important;
}

.blog-post-title {
  color: rgb(47, 47, 47) !important; /* text-thread-charcoal */
  font-size: 1.5rem !important;
}

.meta-text {
  color: rgb(184, 184, 184) !important; /* text-thread-stone */
  font-size: 0.875rem !important;
}`,
      preview: (
        <div className="space-y-2 text-sm">
          <div className="text-thread-pine font-bold">Pine Green Heading</div>
          <div className="text-thread-sage">Sage muted text</div>
          <div className="text-thread-charcoal">Charcoal body text</div>
          <div className="text-thread-stone">Stone meta text</div>
        </div>
      )
    },
    {
      name: 'Border Colors',
      description: 'Border color utilities',
      classes: [
        { name: 'border-thread-cream', description: 'Warm cream border' },
        { name: 'border-thread-sage', description: 'Muted sage border' },
        { name: 'border-thread-pine', description: 'Deep pine border' },
        { name: 'border-thread-sky', description: 'Soft sky blue border' },
        { name: 'border-thread-meadow', description: 'Fresh meadow green border' },
        { name: 'border-thread-sunset', description: 'Warm sunset coral border' },
        { name: 'border-thread-paper', description: 'Off-white paper border' },
        { name: 'border-thread-stone', description: 'Mid gray border' },
        { name: 'border-thread-charcoal', description: 'Dark charcoal border' }
      ],
      example: `/* Border styling examples */
.ts-profile-container {
  border: 3px solid rgb(161, 132, 99) !important; /* border-thread-sage */
  border-radius: 12px !important;
}

.blog-post-card {
  border-left: 4px solid rgb(46, 75, 63) !important; /* border-thread-pine */
  border-radius: 8px !important;
}

.thread-module {
  border: 1px solid rgb(226, 125, 96) !important; /* border-thread-sunset */
  box-shadow: 3px 3px 0 rgb(226, 125, 96) !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="border-2 border-thread-sage p-2 rounded text-xs">Sage Border</div>
          <div className="border-l-4 border-thread-pine p-2 text-xs">Pine Left Border</div>
          <div className="border border-thread-sunset p-2 rounded text-xs">Sunset Border</div>
        </div>
      )
    }
  ],
  'typography': [
    {
      name: 'Content Typography',
      description: 'Text content and formatting classes',
      classes: [
        { name: '.thread-content h1', description: 'Large heading (1.5rem)' },
        { name: '.thread-content h2', description: 'Medium heading (1.25rem)' },
        { name: '.thread-content h3', description: 'Small heading (1.125rem)' },
        { name: '.thread-content p', description: 'Paragraph with enhanced line-height' },
        { name: '.thread-content blockquote', description: 'Styled blockquotes with border' },
        { name: '.thread-content code', description: 'Inline code styling' },
        { name: '.thread-content pre', description: 'Code block styling' }
      ],
      example: `/* Custom typography styles */
.thread-content h1 {
  font-size: 3rem !important;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  text-align: center !important;
  margin-bottom: 2rem !important;
}

.thread-content blockquote {
  background: linear-gradient(90deg, #f8f9fa, #e9ecef) !important;
  border-left: 5px solid #007bff !important;
  font-style: italic !important;
  font-size: 1.1rem !important;
  padding: 1.5rem !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
}

.thread-content code {
  background: #282c34 !important;
  color: #61dafb !important;
  padding: 0.25rem 0.5rem !important;
  border-radius: 4px !important;
  font-family: 'Fira Code', monospace !important;
}`,
      preview: (
        <div className="space-y-3 text-sm">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Gradient Heading
          </div>
          <blockquote className="border-l-4 border-blue-500 pl-4 italic bg-gray-50 p-2">
            &quot;This is a styled blockquote&quot;
          </blockquote>
          <code className="bg-gray-800 text-blue-300 px-2 py-1 rounded text-xs">inline code</code>
        </div>
      )
    },
    {
      name: 'Font Families',
      description: 'Typography system font stacks',
      classes: [
        { name: 'font-headline', description: 'Georgia, serif for headlines' },
        { name: 'font-body', description: 'System UI sans-serif for body text' },
        { name: 'font-mono', description: 'Monospace for code and labels' },
        { name: 'font-retro', description: 'Legacy Georgia serif' }
      ],
      example: `/* Font family examples */
.custom-headline {
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 2.5rem !important;
  font-weight: bold !important;
  color: #2E4B3F !important;
}

.custom-body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  line-height: 1.7 !important;
  color: #2F2F2F !important;
}

.custom-code {
  font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  background: rgba(161, 132, 99, 0.1) !important;
  padding: 0.5rem !important;
  border-radius: 4px !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="font-serif text-lg font-bold">Headline Font (Georgia)</div>
          <div className="font-sans">Body Font (System UI)</div>
          <div className="font-mono text-sm bg-gray-100 p-1 rounded">Monospace Font</div>
        </div>
      )
    }
  ],
  'layout-responsive': [
    {
      name: 'Shadow Utilities',
      description: 'Custom shadow styles for ThreadStead design',
      classes: [
        { name: 'shadow-cozy', description: 'Warm sage shadow (3px 3px 0 #A18463)' },
        { name: 'shadow-cozySm', description: 'Small warm shadow (2px 2px 0 #A18463)' },
        { name: 'shadow-thread', description: 'Soft pine shadow with blur' },
        { name: 'shadow-retro', description: 'Retro box shadow (4px 4px 0 #A18463)' },
        { name: 'shadow-retroSm', description: 'Small retro shadow (2px 2px 0 #A18463)' }
      ],
      example: `/* Creative shadow combinations */
.floating-card {
  background: white !important;
  border-radius: 12px !important;
  padding: 2rem !important;
  box-shadow: 
    0 10px 25px rgba(0,0,0,0.1),
    0 20px 48px rgba(0,0,0,0.1),
    0 1px 4px rgba(0,0,0,0.1) !important;
  transform: translateY(-2px) !important;
}

.retro-button {
  background: #ffff00 !important;
  border: 3px solid #000 !important;
  box-shadow: 4px 4px 0 #000 !important;
  transition: all 0.1s ease !important;
}

.retro-button:hover {
  transform: translate(2px, 2px) !important;
  box-shadow: 2px 2px 0 #000 !important;
}`,
      preview: (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-lg shadow-lg transform -translate-y-1 text-xs">
            Floating Card Effect
          </div>
          <div className="bg-yellow-400 border-2 border-black px-3 py-1 text-xs font-bold inline-block shadow-lg">
            Retro Button
          </div>
        </div>
      )
    },
    {
      name: 'Border Radius',
      description: 'Consistent border radius utilities',
      classes: [
        { name: 'rounded-cozy', description: 'Cozy border radius (8px)' },
        { name: 'rounded-thread', description: 'Thread border radius (12px)' }
      ],
      example: `/* Border radius examples */
.cozy-container {
  background: #F5E9D4 !important;
  border: 1px solid #A18463 !important;
  border-radius: 8px !important; /* rounded-cozy */
  padding: 1rem !important;
}

.thread-container {
  background: #FCFAF7 !important;
  border: 1px solid #2E4B3F !important;
  border-radius: 12px !important; /* rounded-thread */
  padding: 1.5rem !important;
  box-shadow: 0 4px 8px rgba(46, 75, 63, 0.15) !important;
}`,
      preview: (
        <div className="space-y-2">
          <div className="bg-thread-cream border border-thread-sage rounded-cozy p-2 text-xs">
            Cozy Radius (8px)
          </div>
          <div className="bg-thread-paper border border-thread-pine rounded-thread p-2 text-xs">
            Thread Radius (12px)
          </div>
        </div>
      )
    },
    {
      name: 'Responsive Breakpoints',
      description: 'Mobile-first responsive design guidance',
      classes: [
        { name: '@media (max-width: 767px)', description: 'Mobile devices' },
        { name: '@media (min-width: 768px) and (max-width: 1023px)', description: 'Tablet devices' },
        { name: '@media (min-width: 1024px)', description: 'Desktop devices' },
        { name: '@media (hover: none) and (pointer: coarse)', description: 'Touch devices' }
      ],
      example: `/* Responsive design examples */
.responsive-container {
  padding: 1rem !important;
  margin: 0 auto !important;
}

/* Mobile */
@media (max-width: 767px) {
  .responsive-container {
    padding: 0.5rem !important;
    font-size: 0.875rem !important;
  }
  
  .thread-module {
    min-width: 280px !important;
    max-width: 100% !important;
  }
  
  .ts-profile-display-name {
    font-size: 1.75rem !important;
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .responsive-container {
    padding: 1.5rem 2rem !important;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .responsive-container {
    padding: 2rem !important;
    max-width: 1200px !important;
  }
}`,
      preview: (
        <div className="space-y-2 text-xs">
          <div className="bg-blue-100 p-2 rounded">Mobile: padding: 0.5rem</div>
          <div className="bg-green-100 p-2 rounded">Tablet: padding: 1.5rem</div>
          <div className="bg-purple-100 p-2 rounded">Desktop: padding: 2rem</div>
        </div>
      )
    },
    {
      name: 'Component Utilities',
      description: 'CSS classes for specific UI components and functionality',
      classes: [
        { name: '.nav-link-underline', description: 'Navigation link underline styling' },
        { name: '.post-editor-container', description: 'Wide container for post editor' },
        { name: '.tr-header-min-width', description: 'ThreadRing header minimum width' },
        { name: '.tr-prompt-link-purple', description: 'Purple link styling for prompts' },
        { name: '.tr-prompt-button-white', description: 'White text on colored buttons' },
        { name: '.tr-prompt-host-purple', description: 'Purple styling for prompt hosts' },
        { name: '.modal-overlay-high', description: 'High z-index for modal overlays' },
        { name: '.username-input', description: 'Username input letter spacing' },
        { name: '.preview-isolation', description: 'CSS isolation for previews' },
        { name: '.threadring-badge-image', description: '88x31 badge image dimensions' },
        { name: '.upload-progress-bar', description: 'Dynamic width progress bar' },
        { name: '.template-editor-iframe', description: 'Template editor iframe styling' },
        { name: '.media-modal-overlay', description: 'Media modal overlay positioning' },
        { name: '.template-preview-wrapper', description: 'Template preview isolation' },
        { name: '.code-editor-textarea', description: 'Code editor font family and styling' },
        { name: '.profile-sidebar-hidden', description: 'Hidden profile sidebar' },
        { name: '.profile-sidebar-visible', description: 'Visible profile sidebar' },
        { name: '.user-select-all', description: 'Select all text utility' },
        { name: '.toast-container', description: 'Toast notification z-index' }
      ],
      example: `/* Component-specific customizations */
.post-editor-container {
  width: 90vw !important;
  margin-left: calc(-45vw + 50%) !important;
  margin-right: calc(-45vw + 50%) !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-radius: 20px !important;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important;
}

.tr-prompt-button-white {
  background: linear-gradient(45deg, #ff6b9d, #c44569) !important;
  border: none !important;
  box-shadow: 0 8px 15px rgba(196, 69, 105, 0.3) !important;
  transform: translateY(-2px) !important;
  transition: all 0.3s ease !important;
}

.code-editor-textarea {
  font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
  background: #1e1e1e !important;
  color: #d4d4d4 !important;
  border-radius: 8px !important;
}`,
      preview: (
        <div className="space-y-2 text-xs">
          <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-2 rounded">Wide Editor Container</div>
          <div className="bg-gray-800 text-green-400 p-2 rounded font-mono">Code Editor Styling</div>
          <div className="border-2 border-gray-300 p-2 text-center">88×31 Badge Frame</div>
        </div>
      )
    }
  ]
};

export default function DesignCSSTutorialPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Get active category data
  const activeData = cssCategories.find(cat => cat.id === activeCategory);
  const sections = cssData[activeCategory as keyof typeof cssData] || [];

  // Toggle section expansion
  const toggleSection = (sectionIndex: number) => {
    const sectionKey = `${activeCategory}-${sectionIndex}`;
    const newExpanded = new Set(expandedSections);
    
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    
    setExpandedSections(newExpanded);
  };

  // Reset expanded sections when category changes
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setExpandedSections(new Set()); // Collapse all sections when switching categories
  };

  return (
    <Layout>
      <Head>
        <title>CSS Classes Guide - ThreadStead Design Tutorial</title>
        <meta name="description" content="Complete guide to ThreadStead CSS classes for customizing profile pages" />
      </Head>
      
      <div className="min-h-screen bg-yellow-50 bg-pattern">
        {/* Add retro background pattern */}
        <style jsx global>{`
          .bg-pattern {
            background-image: 
              radial-gradient(circle at 25px 25px, rgba(255,255,255,.2) 2px, transparent 0),
              radial-gradient(circle at 75px 75px, rgba(255,255,255,.2) 2px, transparent 0);
            background-size: 100px 100px;
          }
        `}</style>

        <div className="w-full px-6 py-12">
          {/* Cross-Link Banners */}
          <div className="mb-8 max-w-4xl mx-auto space-y-4">
            {/* Simple CSS Editor Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-3 border-green-500 rounded-lg p-4 flex items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-3xl"><PixelIcon name="zap" size={32} /></div>
                <div>
                  <div className="font-bold text-green-900">Ready to Customize?</div>
                  <div className="text-sm text-green-700">Use our Simple CSS Editor with built-in class reference and live preview</div>
                </div>
              </div>
              <Link
                href="/settings?tab=appearance"
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded shadow-md transition-colors whitespace-nowrap"
              >
                Open CSS Editor →
              </Link>
            </div>

            {/* Alternative Options Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-2xl"><PixelIcon name="paint-bucket" size={24} /></div>
                <div>
                  <div className="font-semibold text-purple-900 text-sm">Don&apos;t want to write CSS?</div>
                  <div className="text-xs text-purple-700">Try Visual Builder (drag & drop) or Template Language (for developers)</div>
                </div>
              </div>
              <Link
                href="/templates"
                className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded border border-purple-300 transition-colors whitespace-nowrap text-sm"
              >
                Explore Options →
              </Link>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            {/* Main Title */}
            <div className="relative mb-8">
              <div className="inline-block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 p-2 border-4 border-black shadow-[12px_12px_0_#000] transform -rotate-1">
                <h1 className="text-5xl font-black text-black px-6 py-4 bg-white border-4 border-black">
                  CSS CLASSES
                  <br />
                  <span className="text-3xl">GUIDE</span>
                </h1>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-green-400 border-4 border-black rotate-45"></div>
              <div className="absolute -bottom-2 -left-6 w-6 h-6 bg-pink-400 border-4 border-black rounded-full"></div>
            </div>

            {/* Subtitle */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-yellow-100 border-4 border-black shadow-[6px_6px_0_#000] p-6 transform rotate-1">
                <p className="text-xl text-gray-800 font-medium leading-relaxed">
                  Master ThreadStead styling with our comprehensive CSS class reference! 
                  Target these classes to completely customize your profile page design.
                </p>
              </div>
            </div>

            {/* Quick tips */}
            <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-green-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
                <div className="font-bold text-black">Target Classes</div>
                <div className="text-sm text-gray-700">Use specific CSS selectors</div>
              </div>
              <div className="bg-pink-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
                <div className="font-bold text-black">Override Styles</div>
                <div className="text-sm text-gray-700">Use !important for control</div>
              </div>
              <div className="bg-cyan-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
                <div className="font-bold text-black">Mobile Ready</div>
                <div className="text-sm text-gray-700">Responsive design tips</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-blue-300 border-4 border-black shadow-[8px_8px_0_#000] p-6 mb-8">
            <h2 className="font-bold text-black text-lg mb-4 text-center">
              Choose Your CSS Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cssCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`p-4 border-4 border-black font-bold transition-all transform hover:scale-105 text-center ${
                    activeCategory === category.id
                      ? 'bg-yellow-300 text-black shadow-[4px_4px_0_#000] scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow-[2px_2px_0_#000]'
                  }`}
                >
                  <div className="font-bold text-sm mb-2">{category.icon}</div>
                  <h3 className="font-semibold text-sm mb-1">{category.title}</h3>
                  <p className="text-xs opacity-80">{category.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Active Category Content */}
          {activeData && (
            <div className="space-y-8">
              {/* Category Header */}
              <div className="text-center mb-12">
                <div className="inline-block bg-red-400 border-4 border-black shadow-[8px_8px_0_#000] p-6 transform rotate-1">
                  <div className="text-2xl font-bold mb-4">{activeData.icon}</div>
                  <h2 className="text-4xl font-black text-black mb-2">
                    {activeData.title}
                  </h2>
                  <p className="text-lg text-gray-800 font-medium">{activeData.description}</p>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-8">
                {sections.map((section, index) => {
                  const sectionKey = `${activeCategory}-${index}`;
                  const isExpanded = expandedSections.has(sectionKey);
                  
                  return (
                    <div key={index} className="bg-white border-4 border-black shadow-[6px_6px_0_#000] transform hover:scale-[1.02] transition-transform">
                      {/* Collapsible Header */}
                      <button
                        onClick={() => toggleSection(index)}
                        className="w-full text-left p-6 hover:bg-gray-50 transition-colors border-b-4 border-black"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-black text-black mb-2">
                              {section.name}
                            </h3>
                            <p className="text-gray-700">{section.description}</p>
                          </div>
                          <div className={`text-3xl font-bold text-black transform transition-transform duration-200 ${isExpanded ? 'rotate-expanded' : 'rotate-collapsed'}`}>
                            ▶
                          </div>
                        </div>
                      </button>

                      {/* Collapsible Content */}
                      {isExpanded && (
                        <div className="p-8 grid lg:grid-cols-2 gap-8 animate-in slide-in-from-top-5 duration-300">
                          {/* Left: Info and Classes */}
                          <div>
                            {/* CSS Classes List */}
                            {section.classes && (
                              <div className="space-y-3">
                                <h4 className="font-bold text-black text-lg">Available Classes</h4>
                                <div className="space-y-2">
                                  {section.classes.map((cls, clsIndex) => (
                                    <div key={clsIndex} className="bg-yellow-100 border-2 border-black p-3 shadow-[2px_2px_0_#000]">
                                      <code className="font-mono text-black font-bold">{cls.name}</code>
                                      <p className="text-sm text-gray-700 mt-1">{cls.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Example and Preview */}
                          <div className="space-y-6">
                            {/* Preview */}
                            {section.preview && (
                              <div>
                                <h4 className="font-bold text-black text-lg mb-3">Preview</h4>
                                <div className="bg-gray-50 border-2 border-black p-4 shadow-[2px_2px_0_#000]">
                                  {section.preview}
                                </div>
                              </div>
                            )}

                            {/* Code Example */}
                            <div>
                              <h4 className="font-bold text-black text-lg mb-3">Example CSS</h4>
                              <div className="bg-black text-green-400 border-2 border-black p-4 overflow-x-auto shadow-[2px_2px_0_#000]">
                                <pre className="text-sm font-mono">
                                  <code>{section.example}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        <RetroFooter isCSSPage />
        </div>
      </div>
    </Layout>
  );
}