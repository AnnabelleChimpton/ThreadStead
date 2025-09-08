// Import individual templates
import { DEFAULT_CSS_TEMPLATE } from './default';
import { MINIMAL_CSS_TEMPLATE } from './minimal';
import { ADVANCED_LAYOUT_TEMPLATE } from './advanced';
import { RETRO_GAMING_TEMPLATE } from './gaming';
import { NEWSPAPER_TEMPLATE } from './newspaper';
import { DARK_THEME_TEMPLATE } from './dark';
import { MEDIEVAL_FANTASY_TEMPLATE } from './medieval';

// Re-export all templates
export {
  DEFAULT_CSS_TEMPLATE,
  MINIMAL_CSS_TEMPLATE,
  ADVANCED_LAYOUT_TEMPLATE,
  RETRO_GAMING_TEMPLATE,
  NEWSPAPER_TEMPLATE,
  DARK_THEME_TEMPLATE,
  MEDIEVAL_FANTASY_TEMPLATE
};

// Template selection function
export function getDefaultTemplate(type: 'full' | 'minimal' | 'dark' | 'advanced' | 'gaming' | 'newspaper' | 'fantasy' = 'full'): string {
  switch (type) {
    case 'minimal':
      return MINIMAL_CSS_TEMPLATE;
    case 'dark':
      return DARK_THEME_TEMPLATE;
    case 'advanced':
      return ADVANCED_LAYOUT_TEMPLATE;
    case 'gaming':
      return RETRO_GAMING_TEMPLATE;
    case 'newspaper':
      return NEWSPAPER_TEMPLATE;
    case 'fantasy':
      return MEDIEVAL_FANTASY_TEMPLATE;
    case 'full':
    default:
      return DEFAULT_CSS_TEMPLATE;
  }
}