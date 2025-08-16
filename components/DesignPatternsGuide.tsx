import React, { useState } from "react";

interface PatternExample {
  name: string;
  description: string;
  code: string;
  preview?: string;
}

interface PatternCategory {
  title: string;
  icon: string;
  patterns: PatternExample[];
}

export default function DesignPatternsGuide() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string, patternName: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(patternName);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const categories: PatternCategory[] = [
    {
      title: "Layout Patterns",
      icon: "📐",
      patterns: [
        {
          name: "Full Screen Hero",
          description: "Eye-catching full viewport height section perfect for landing pages",
          code: `<div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center;">
  <div>
    <h1 style="font-size: 4rem; margin-bottom: 1rem; font-weight: bold;">Welcome</h1>
    <p style="font-size: 1.5rem; margin-bottom: 2rem;">Your amazing content starts here</p>
    <button style="background: white; color: #667eea; padding: 1rem 2rem; border: none; border-radius: 50px; font-size: 1.1rem; font-weight: bold; cursor: pointer;">Get Started</button>
  </div>
</div>`
        },
        {
          name: "Centered Container",
          description: "Classic centered content with max width - perfect for articles and forms",
          code: `<div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
  <h1 style="text-align: center; margin-bottom: 2rem; color: #333;">Page Title</h1>
  <div style="background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <p style="line-height: 1.6; color: #666; margin-bottom: 1rem;">Your content goes here. This creates a nice, readable layout that works well for most content types.</p>
    <p style="line-height: 1.6; color: #666;">Add more paragraphs, images, or any other content you need.</p>
  </div>
</div>`
        },
        {
          name: "Two Column Layout",
          description: "Side-by-side content sections that stack on mobile",
          code: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 2rem; max-width: 1200px; margin: 0 auto;">
  <div style="background: #f8f9fa; padding: 2rem; border-radius: 10px;">
    <h2 style="margin-bottom: 1rem; color: #333;">Left Column</h2>
    <p style="color: #666; line-height: 1.6;">Content for the left side. This could be text, images, or any other elements.</p>
  </div>
  <div style="background: #e3f2fd; padding: 2rem; border-radius: 10px;">
    <h2 style="margin-bottom: 1rem; color: #333;">Right Column</h2>
    <p style="color: #666; line-height: 1.6;">Content for the right side. On mobile devices, this will stack below the left column.</p>
  </div>
</div>

<style>
@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr !important; }
}
</style>`
        },
        {
          name: "Card Grid",
          description: "Responsive grid of cards - great for services, team members, or features",
          code: `<div style="padding: 2rem;">
  <h1 style="text-align: center; margin-bottom: 3rem; color: #333;">Our Services</h1>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto;">
    <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); text-align: center; transition: transform 0.3s ease;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
      <h3 style="margin-bottom: 1rem; color: #333;">Fast Performance</h3>
      <p style="color: #666; line-height: 1.6;">Lightning-fast loading times and optimized performance for the best user experience.</p>
    </div>
    <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🛡️</div>
      <h3 style="margin-bottom: 1rem; color: #333;">Secure & Reliable</h3>
      <p style="color: #666; line-height: 1.6;">Enterprise-grade security measures to keep your data safe and protected.</p>
    </div>
    <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">💡</div>
      <h3 style="margin-bottom: 1rem; color: #333;">Smart Features</h3>
      <p style="color: #666; line-height: 1.6;">Intelligent tools and features designed to streamline your workflow.</p>
    </div>
  </div>
</div>`
        }
      ]
    },
    {
      title: "Color & Backgrounds",
      icon: "🎨",
      patterns: [
        {
          name: "Gradient Backgrounds",
          description: "Beautiful gradient backgrounds for modern, vibrant designs",
          code: `<!-- Sunset Gradient -->
<div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%); min-height: 50vh; padding: 3rem; text-align: center;">
  <h2 style="color: white; font-size: 2.5rem; margin-bottom: 1rem;">Sunset Vibes</h2>
  <p style="color: white; font-size: 1.2rem;">Warm and inviting gradient perfect for hero sections</p>
</div>

<!-- Ocean Gradient -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 50vh; padding: 3rem; text-align: center;">
  <h2 style="color: white; font-size: 2.5rem; margin-bottom: 1rem;">Ocean Depths</h2>
  <p style="color: white; font-size: 1.2rem;">Cool and professional gradient for business content</p>
</div>

<!-- Forest Gradient -->
<div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); min-height: 50vh; padding: 3rem; text-align: center;">
  <h2 style="color: white; font-size: 2.5rem; margin-bottom: 1rem;">Forest Fresh</h2>
  <p style="color: white; font-size: 1.2rem;">Natural and calming gradient for organic themes</p>
</div>`
        },
        {
          name: "Pattern Backgrounds",
          description: "Subtle patterns to add texture without overwhelming content",
          code: `<!-- Geometric Pattern -->
<div style="background-image: url('data:image/svg+xml,<svg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><g fill=\"%239C92AC\" fill-opacity=\"0.1\"><circle cx=\"30\" cy=\"30\" r=\"4\"/></g></svg>'); padding: 3rem;">
  <div style="background: rgba(255,255,255,0.95); padding: 2rem; border-radius: 10px; max-width: 600px; margin: 0 auto;">
    <h2 style="text-align: center; margin-bottom: 1rem; color: #333;">Subtle Patterns</h2>
    <p style="text-align: center; color: #666;">Content stands out while the pattern adds visual interest</p>
  </div>
</div>

<!-- Grid Pattern -->
<div style="background-image: url('data:image/svg+xml,<svg width=\"40\" height=\"40\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"%23000\" fill-opacity=\"0.05\"><path d=\"M0 0h40v40H0z\"/><path d=\"M0 0h20v20H0z\" fill=\"%23000\" fill-opacity=\"0.02\"/></g></svg>'); padding: 3rem;">
  <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <h2 style="text-align: center; margin-bottom: 1rem; color: #333;">Grid Background</h2>
    <p style="text-align: center; color: #666;">Clean grid pattern perfect for technical or modern designs</p>
  </div>
</div>`
        },
        {
          name: "Color Schemes",
          description: "Pre-designed color palettes for consistent theming",
          code: `<!-- Professional Blue Theme -->
<div style="background: #f0f4f8; padding: 2rem;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h2 style="color: #2d3748; margin-bottom: 2rem; text-align: center;">Professional Theme</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
      <div style="background: #3182ce; color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">Primary Blue</div>
      <div style="background: #63b3ed; color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">Light Blue</div>
      <div style="background: #2d3748; color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">Dark Gray</div>
      <div style="background: #f7fafc; color: #2d3748; padding: 1.5rem; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">Light Gray</div>
    </div>
  </div>
</div>

<!-- Warm Earth Theme -->
<div style="background: #faf5f0; padding: 2rem;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h2 style="color: #744210; margin-bottom: 2rem; text-align: center;">Warm Earth Theme</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
      <div style="background: #c05621; color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">Rust Orange</div>
      <div style="background: #ed8936; color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">Warm Orange</div>
      <div style="background: #744210; color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">Earth Brown</div>
      <div style="background: #fefcbf; color: #744210; padding: 1.5rem; border-radius: 8px; text-align: center; border: 2px solid #f6e05e;">Cream</div>
    </div>
  </div>
</div>`
        }
      ]
    },
    {
      title: "Interactive Elements",
      icon: "⚡",
      patterns: [
        {
          name: "Hover Effects",
          description: "Engaging hover effects that provide visual feedback",
          code: `<style>
.hover-card {
  transition: all 0.3s ease;
  cursor: pointer;
}
.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0,0,0,0.2);
}
.hover-button {
  transition: all 0.3s ease;
  cursor: pointer;
}
.hover-button:hover {
  background: #2563eb !important;
  transform: scale(1.05);
}
</style>

<div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; margin-bottom: 2rem; color: #333;">Interactive Cards</h2>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-bottom: 3rem;">
    <div class="hover-card" style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center;">
      <div style="font-size: 2.5rem; margin-bottom: 1rem;">📈</div>
      <h3 style="color: #333; margin-bottom: 1rem;">Analytics</h3>
      <p style="color: #666;">Hover to see the lift effect</p>
    </div>
    
    <div class="hover-card" style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center;">
      <div style="font-size: 2.5rem; margin-bottom: 1rem;">🎯</div>
      <h3 style="color: #333; margin-bottom: 1rem;">Targeting</h3>
      <p style="color: #666;">Interactive and engaging</p>
    </div>
  </div>
  
  <div style="text-align: center;">
    <button class="hover-button" style="background: #3b82f6; color: white; padding: 1rem 2rem; border: none; border-radius: 50px; font-size: 1.1rem; font-weight: bold;">Try Hover Effect</button>
  </div>
</div>`
        },
        {
          name: "Animated Buttons",
          description: "Eye-catching buttons with smooth animations",
          code: `<style>
.pulse-button {
  animation: pulse 2s infinite;
  transition: all 0.3s ease;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.slide-button {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.slide-button:before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}
.slide-button:hover:before {
  left: 100%;
}

.bounce-button {
  transition: all 0.3s ease;
}
.bounce-button:hover {
  animation: bounce 0.6s;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>

<div style="padding: 3rem; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <h2 style="color: white; margin-bottom: 3rem; font-size: 2rem;">Animated Buttons</h2>
  
  <div style="display: flex; flex-wrap: wrap; gap: 2rem; justify-content: center; align-items: center;">
    <button class="pulse-button" style="background: #3b82f6; color: white; padding: 1rem 2rem; border: none; border-radius: 50px; font-weight: bold; cursor: pointer;">
      Pulsing CTA
    </button>
    
    <button class="slide-button" style="background: #10b981; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
      Slide Effect
    </button>
    
    <button class="bounce-button" style="background: #f59e0b; color: white; padding: 1rem 2rem; border: none; border-radius: 25px; font-weight: bold; cursor: pointer;">
      Bounce on Hover
    </button>
  </div>
</div>`
        },
        {
          name: "Progress Indicators",
          description: "Visual progress bars and loading indicators",
          code: `<style>
.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.step-indicator {
  display: flex;
  align-items: center;
  margin: 1rem 0;
}
.step-circle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-weight: bold;
  font-size: 0.9rem;
}
.step-complete {
  background: #10b981;
  color: white;
}
.step-active {
  background: #3b82f6;
  color: white;
}
.step-pending {
  background: #e5e7eb;
  color: #6b7280;
}
</style>

<div style="padding: 2rem; max-width: 600px; margin: 0 auto;">
  <h2 style="text-align: center; margin-bottom: 2rem; color: #333;">Progress Indicators</h2>
  
  <!-- Progress Bars -->
  <div style="margin-bottom: 3rem;">
    <h3 style="margin-bottom: 1rem; color: #333;">Project Progress</h3>
    <div style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span style="color: #666;">Design</span>
        <span style="color: #666;">90%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 90%;"></div>
      </div>
    </div>
    
    <div style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span style="color: #666;">Development</span>
        <span style="color: #666;">65%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 65%;"></div>
      </div>
    </div>
  </div>
  
  <!-- Step Indicators -->
  <div style="margin-bottom: 3rem;">
    <h3 style="margin-bottom: 1rem; color: #333;">Process Steps</h3>
    <div class="step-indicator">
      <div class="step-circle step-complete">✓</div>
      <span style="color: #333;">Planning Complete</span>
    </div>
    <div class="step-indicator">
      <div class="step-circle step-active">2</div>
      <span style="color: #333;">In Development</span>
    </div>
    <div class="step-indicator">
      <div class="step-circle step-pending">3</div>
      <span style="color: #6b7280;">Testing</span>
    </div>
  </div>
  
  <!-- Loading Spinner -->
  <div style="text-align: center;">
    <h3 style="margin-bottom: 1rem; color: #333;">Loading Indicator</h3>
    <div class="spinner" style="margin: 0 auto;"></div>
  </div>
</div>`
        }
      ]
    },
    {
      title: "Typography & Content",
      icon: "📝",
      patterns: [
        {
          name: "Article Layout",
          description: "Clean, readable article formatting with proper typography",
          code: `<article style="max-width: 700px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333;">
  <header style="text-align: center; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 2px solid #e5e7eb;">
    <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: #1f2937; font-weight: bold;">The Art of Web Design</h1>
    <p style="color: #6b7280; font-size: 1.1rem; margin-bottom: 1rem;">Creating beautiful and functional websites</p>
    <div style="color: #9ca3af; font-size: 0.9rem;">
      <span>Published on March 15, 2024</span> • <span>5 min read</span>
    </div>
  </header>
  
  <div style="font-size: 1.1rem; line-height: 1.7;">
    <p style="margin-bottom: 1.5rem; font-size: 1.2rem; color: #4b5563; font-style: italic;">
      Web design is more than just making things look pretty – it's about creating experiences that users love and remember.
    </p>
    
    <h2 style="font-size: 1.8rem; margin: 2rem 0 1rem 0; color: #1f2937;">The Foundation of Good Design</h2>
    <p style="margin-bottom: 1.5rem;">
      Great web design starts with understanding your users and their needs. Every element on your page should serve a purpose and guide users toward their goals.
    </p>
    
    <blockquote style="border-left: 4px solid #3b82f6; padding-left: 1.5rem; margin: 2rem 0; font-style: italic; color: #4b5563; background: #f8fafc; padding: 1.5rem; border-radius: 0 8px 8px 0;">
      "Design is not just what it looks like and feels like. Design is how it works." - Steve Jobs
    </blockquote>
    
    <h3 style="font-size: 1.4rem; margin: 1.5rem 0 1rem 0; color: #1f2937;">Key Principles</h3>
    <ul style="margin-bottom: 1.5rem; padding-left: 1.5rem;">
      <li style="margin-bottom: 0.5rem;">Keep it simple and focused</li>
      <li style="margin-bottom: 0.5rem;">Ensure fast loading times</li>
      <li style="margin-bottom: 0.5rem;">Make it mobile-friendly</li>
      <li style="margin-bottom: 0.5rem;">Prioritize accessibility</li>
    </ul>
  </div>
</article>`
        },
        {
          name: "Feature Callouts",
          description: "Highlight important information with styled callout boxes",
          code: `<div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; margin-bottom: 2rem; color: #333;">Important Information</h2>
  
  <!-- Success Callout -->
  <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #10b981;">
    <div style="display: flex; align-items: flex-start;">
      <span style="font-size: 1.2rem; margin-right: 0.5rem;">✅</span>
      <div>
        <h3 style="color: #065f46; margin-bottom: 0.5rem; font-weight: bold;">Success!</h3>
        <p style="color: #047857; margin: 0;">Your changes have been saved successfully. All updates are now live on your site.</p>
      </div>
    </div>
  </div>
  
  <!-- Warning Callout -->
  <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #f59e0b;">
    <div style="display: flex; align-items: flex-start;">
      <span style="font-size: 1.2rem; margin-right: 0.5rem;">⚠️</span>
      <div>
        <h3 style="color: #92400e; margin-bottom: 0.5rem; font-weight: bold;">Important Notice</h3>
        <p style="color: #d97706; margin: 0;">Please backup your data before proceeding with this operation. This action cannot be undone.</p>
      </div>
    </div>
  </div>
  
  <!-- Info Callout -->
  <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #3b82f6;">
    <div style="display: flex; align-items: flex-start;">
      <span style="font-size: 1.2rem; margin-right: 0.5rem;">💡</span>
      <div>
        <h3 style="color: #1e40af; margin-bottom: 0.5rem; font-weight: bold;">Pro Tip</h3>
        <p style="color: #2563eb; margin: 0;">Use keyboard shortcuts Ctrl+S (Cmd+S on Mac) to save your work quickly while editing.</p>
      </div>
    </div>
  </div>
  
  <!-- Error Callout -->
  <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #ef4444;">
    <div style="display: flex; align-items: flex-start;">
      <span style="font-size: 1.2rem; margin-right: 0.5rem;">❌</span>
      <div>
        <h3 style="color: #991b1b; margin-bottom: 0.5rem; font-weight: bold;">Error</h3>
        <p style="color: #dc2626; margin: 0;">Something went wrong. Please check your connection and try again, or contact support if the issue persists.</p>
      </div>
    </div>
  </div>
</div>`
        },
        {
          name: "FAQ Section",
          description: "Expandable FAQ section with clean styling",
          code: `<style>
.faq-item {
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1rem;
}
.faq-question {
  cursor: pointer;
  padding: 1rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  color: #1f2937;
  transition: color 0.3s ease;
}
.faq-question:hover {
  color: #3b82f6;
}
.faq-answer {
  padding-bottom: 1rem;
  color: #4b5563;
  line-height: 1.6;
  display: none;
}
.faq-toggle {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}
.faq-open .faq-toggle {
  transform: rotate(45deg);
}
.faq-open .faq-answer {
  display: block;
}
</style>

<script>
function toggleFAQ(element) {
  element.parentElement.classList.toggle('faq-open');
}
</script>

<div style="max-width: 700px; margin: 0 auto; padding: 2rem;">
  <h2 style="text-align: center; margin-bottom: 2rem; color: #1f2937; font-size: 2rem;">Frequently Asked Questions</h2>
  
  <div class="faq-item">
    <div class="faq-question" onclick="toggleFAQ(this)">
      <span>How do I customize my page design?</span>
      <span class="faq-toggle">+</span>
    </div>
    <div class="faq-answer">
      You can customize your page by editing the HTML content directly. Use inline styles, CSS classes, and any HTML elements you need to create your desired layout.
    </div>
  </div>
  
  <div class="faq-item">
    <div class="faq-question" onclick="toggleFAQ(this)">
      <span>Can I use external CSS frameworks?</span>
      <span class="faq-toggle">+</span>
    </div>
    <div class="faq-answer">
      Yes! You can include external CSS frameworks by adding link tags to CSS CDNs in your page content. Popular options include Bootstrap, Tailwind CSS, and Bulma.
    </div>
  </div>
  
  <div class="faq-item">
    <div class="faq-question" onclick="toggleFAQ(this)">
      <span>How do I make my page mobile-friendly?</span>
      <span class="faq-toggle">+</span>
    </div>
    <div class="faq-answer">
      Use responsive design techniques like CSS Grid, Flexbox, and media queries. The patterns in this guide are already mobile-responsive and will work great on all devices.
    </div>
  </div>
  
  <div class="faq-item">
    <div class="faq-question" onclick="toggleFAQ(this)">
      <span>Can I add JavaScript functionality?</span>
      <span class="faq-toggle">+</span>
    </div>
    <div class="faq-answer">
      Absolutely! You can include JavaScript in script tags within your page content to add interactive features, animations, and dynamic behavior.
    </div>
  </div>
</div>`
        }
      ]
    }
  ];

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        📚 Design Patterns Guide
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Copy-paste ready code examples for common design patterns. Click any example to copy it to your clipboard.
      </p>
      
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
        {categories.map((category, index) => (
          <button
            key={index}
            onClick={() => setActiveCategory(index)}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-all ${
              activeCategory === index
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.icon} {category.title}
          </button>
        ))}
      </div>
      
      {/* Pattern Examples */}
      <div className="space-y-4">
        {categories[activeCategory].patterns.map((pattern, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-3 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-800">{pattern.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(pattern.code, pattern.name)}
                  className={`px-3 py-1 text-xs rounded transition-all ${
                    copiedCode === pattern.name
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {copiedCode === pattern.name ? '✓ Copied!' : '📋 Copy Code'}
                </button>
              </div>
            </div>
            <div className="p-3">
              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                <code>{pattern.code}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="text-blue-800">
          <strong>💡 Pro Tips:</strong> These patterns are fully responsive and work great together. 
          You can combine multiple patterns in a single page, customize colors and spacing, 
          and add your own content. All patterns include proper accessibility features.
        </p>
      </div>
    </div>
  );
}