// Import individual site templates
import { DEFAULT_SITE_TEMPLATE } from './site/default';
import { MINIMAL_SITE_TEMPLATE } from './site/minimal';
import { DARK_SITE_TEMPLATE } from './site/dark';
import { COLORFUL_SITE_TEMPLATE } from './site/colorful';

// Re-export all templates
export {
  DEFAULT_SITE_TEMPLATE,
  MINIMAL_SITE_TEMPLATE,
  DARK_SITE_TEMPLATE,
  COLORFUL_SITE_TEMPLATE
};

// Template selection function
export function getSiteTemplate(type: 'default' | 'minimal' | 'dark' | 'colorful' | 'clear' = 'default'): string {
  switch (type) {
    case 'minimal':
      return MINIMAL_SITE_TEMPLATE;
    case 'dark':
      return DARK_SITE_TEMPLATE;
    case 'colorful':
      return COLORFUL_SITE_TEMPLATE;
    case 'clear':
      return '';
    case 'default':
    default:
      return DEFAULT_SITE_TEMPLATE;
  }
}

// Template metadata for UI display
export const SITE_TEMPLATE_INFO = {
  default: {
    name: 'Starter',
    description: 'A small baseline with examples'
  },
  minimal: {
    name: 'Minimal',
    description: 'Subtle enhancements only'
  },
  dark: {
    name: 'Dark',
    description: 'Modern dark theme'
  },
  colorful: {
    name: 'Vibrant',
    description: 'Colorful gradient theme'
  },
  clear: {
    name: 'Empty',
    description: 'No site CSS. Turns the theme off'
  }
} as const;