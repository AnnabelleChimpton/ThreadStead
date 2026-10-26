/**
 * Two of the old "Just HTML" gallery starters, kept as test fixtures (the
 * rest were dropped 2026-10-26): table-and-font old-web markup, and the
 * conditional components.
 */
import { CLASSIC_WEB1_TEMPLATE } from './html/classic-web1';
import { CONDITIONAL_SHOWCASE_TEMPLATE } from './html/conditional-showcase';

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
