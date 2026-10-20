// Import individual HTML templates
import { SOCIAL_MODERN_TEMPLATE } from './html/social-modern';
import { CLASSIC_WEB1_TEMPLATE } from './html/classic-web1';
import { SIMPLE_DEFAULT_TEMPLATE } from './html/simple-default';
import { CONDITIONAL_SHOWCASE_TEMPLATE } from './html/conditional-showcase';
import { QUIET_GARDEN_TEMPLATE } from './html/quiet-garden';
import { STUDIO_NOCTURNE_TEMPLATE } from './html/studio-nocturne';

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
    id: 'quiet-garden',
    name: 'Quiet Garden',
    description: 'A calm, editorial personal homepage — about, now, and a bed of links',
    category: 'minimal',
    template: QUIET_GARDEN_TEMPLATE,
    preview: 'Serif typography on warm paper, anchor nav, link cards, no components at all'
  },
  {
    id: 'studio-nocturne',
    name: 'Studio Nocturne',
    description: 'A bold dark one-pager — big type, project rows, one hot accent',
    category: 'modern',
    template: STUDIO_NOCTURNE_TEMPLATE,
    preview: 'Portfolio-style single page in plain HTML: display headline, hover rows, contact pills'
  },
  {
    id: 'simple-default',
    name: 'Personal Homepage',
    description: 'Early 2000s blog-style homepage with sidebar, status updates, and blogroll',
    category: 'minimal',
    template: SIMPLE_DEFAULT_TEMPLATE,
    preview: '📝 Sidebar layout, custom badges, currently reading/playing status, no social features'
  },
  {
    id: 'social-modern',
    name: 'ThreadRing Portal',
    description: 'Webring welcome page with navigation, member showcase, and community badges',
    category: 'modern',
    template: SOCIAL_MODERN_TEMPLATE,
    preview: '🔗 Links to /tr/welcome, ring navigation (prev/random/next), 88x31 badges, community portal'
  },
  {
    id: 'classic-web1',
    name: 'Vintage Web 1.0',
    description: 'Authentic 90s Geocities/Neocities homepage with animated effects and retro styling',
    category: 'classic',
    template: CLASSIC_WEB1_TEMPLATE,
    preview: '✨ Marquee text, blinking construction signs, table layouts, rainbow gradients, visitor counters'
  },
  {
    id: 'conditional-showcase',
    name: 'Conditional Logic Showcase',
    description: 'Interactive demonstration of all conditional operators with live examples and syntax guide',
    category: 'minimal',
    template: CONDITIONAL_SHOWCASE_TEMPLATE,
    preview: '🎓 Learn conditional logic with comparison, string, and logical operators - includes level system, owner/visitor detection, and complete syntax reference'
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
  SIMPLE_DEFAULT_TEMPLATE,
  CONDITIONAL_SHOWCASE_TEMPLATE
};