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
    name: 'Simple Default',
    description: 'Clean and minimal profile layout',
    category: 'minimal',
    template: SIMPLE_DEFAULT_TEMPLATE,
    preview: '📝 Basic profile with posts and bio'
  },
  {
    id: 'social-modern',
    name: 'Social Hub',
    description: 'Modern social profile with neon effects and interactive elements',
    category: 'modern',
    template: SOCIAL_MODERN_TEMPLATE,
    preview: '✨ Neon borders, gradients, and social features'
  },
  {
    id: 'classic-web1',
    name: 'Web 1.0 Classic',
    description: 'Nostalgic 90s homepage with classic HTML styling',
    category: 'classic',
    template: CLASSIC_WEB1_TEMPLATE,
    preview: '🖥️ Retro design with visitor counters and web rings'
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