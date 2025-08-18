// Import individual HTML templates
import { SOCIAL_MODERN_TEMPLATE } from './html-templates/social-modern';
import { CLASSIC_WEB1_TEMPLATE } from './html-templates/classic-web1';
import { SIMPLE_DEFAULT_TEMPLATE } from './html-templates/simple-default';

// Template metadata for UI display
export interface HTMLTemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'classic' | 'minimal';
  template: string;
  preview?: string;
}

// Available HTML templates
export const HTML_TEMPLATES: HTMLTemplateInfo[] = [
  {
    id: 'simple-default',
    name: 'Modern Minimal',
    description: 'Clean glassmorphism design with gradient backgrounds and smooth animations',
    category: 'minimal',
    template: SIMPLE_DEFAULT_TEMPLATE,
    preview: '🔮 Glassmorphism cards with gradient text and backdrop blur effects'
  },
  {
    id: 'social-modern',
    name: 'Cyberpunk Social',
    description: 'Futuristic cyberpunk theme with neon glows, holographic effects, and terminal aesthetics',
    category: 'modern',
    template: SOCIAL_MODERN_TEMPLATE,
    preview: '⚡ Neon animations, glitch effects, holographic borders, and matrix-style terminals'
  },
  {
    id: 'classic-web1',
    name: 'Vintage Neocities',
    description: 'Authentic 90s homepage with animated GIFs, blinking text, and retro web aesthetics',
    category: 'classic',
    template: CLASSIC_WEB1_TEMPLATE,
    preview: '💾 Marquee scrolling, rainbow text, animated borders, visitor counters, and webring links'
  }
];

// Get template by ID
export function getHTMLTemplate(id: string): string {
  const template = HTML_TEMPLATES.find(t => t.id === id);
  return template?.template || SIMPLE_DEFAULT_TEMPLATE;
}

// Get template info by ID
export function getHTMLTemplateInfo(id: string): HTMLTemplateInfo | undefined {
  return HTML_TEMPLATES.find(t => t.id === id);
}

// Get templates by category
export function getHTMLTemplatesByCategory(category: 'modern' | 'classic' | 'minimal'): HTMLTemplateInfo[] {
  return HTML_TEMPLATES.filter(t => t.category === category);
}

// Export individual templates
export {
  SOCIAL_MODERN_TEMPLATE,
  CLASSIC_WEB1_TEMPLATE,
  SIMPLE_DEFAULT_TEMPLATE
};