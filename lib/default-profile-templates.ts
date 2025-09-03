// Import all template constants from separate files
import { ABSTRACT_ART_TEMPLATE } from './templates/abstract-art';
import { CHARCOAL_NIGHTS_TEMPLATE } from './templates/charcoal-nights';
import { PIXEL_PETALS_TEMPLATE } from './templates/pixel-petals';
import { RETRO_SOCIAL_TEMPLATE } from './templates/retro-social';
import { CLASSIC_LINEN_TEMPLATE } from './templates/classic-linen';

// Type definitions
export type ProfileTemplateType = 'abstract-art' | 'charcoal-nights' | 'pixel-petals' | 'retro-social' | 'classic-linen';

// Re-export all template constants for backward compatibility
export {
  ABSTRACT_ART_TEMPLATE,
  CHARCOAL_NIGHTS_TEMPLATE,
  PIXEL_PETALS_TEMPLATE,
  RETRO_SOCIAL_TEMPLATE,
  CLASSIC_LINEN_TEMPLATE
};

// Template selection function
export function getDefaultProfileTemplate(type: ProfileTemplateType | 'clear' = 'abstract-art'): string {
  switch (type) {
    case 'abstract-art':
      return ABSTRACT_ART_TEMPLATE;
    case 'charcoal-nights':
      return CHARCOAL_NIGHTS_TEMPLATE;
    case 'pixel-petals':
      return PIXEL_PETALS_TEMPLATE;
    case 'retro-social':
      return RETRO_SOCIAL_TEMPLATE;
    case 'classic-linen':
      return CLASSIC_LINEN_TEMPLATE;
    case 'clear':
      return '';
    default:
      return ABSTRACT_ART_TEMPLATE;
  }
}

// Template metadata for UI display
export const DEFAULT_PROFILE_TEMPLATE_INFO = {
  'abstract-art': {
    name: 'Abstract Art',
    description: 'Colorful and artistic with dynamic gradients',
    emoji: '🎨'
  },
  'charcoal-nights': {
    name: 'Charcoal Nights',
    description: 'Dark retro terminal aesthetic',
    emoji: '🖤'
  },
  'pixel-petals': {
    name: 'Pixel Petals',
    description: 'Kawaii pastel pink paradise',
    emoji: '🌸'
  },
  'retro-social': {
    name: 'Retro Social',
    description: 'MySpace-inspired nostalgic vibes',
    emoji: '📱'
  },
  'classic-linen': {
    name: 'Classic Linen',
    description: 'Vintage cream and dotted elegance',
    emoji: '🧵'
  },
  'clear': {
    name: 'Clear',
    description: 'No custom styling',
    emoji: '🧹'
  }
};

// Get all available template types
export function getAvailableTemplateTypes() {
  return Object.keys(DEFAULT_PROFILE_TEMPLATE_INFO) as Array<keyof typeof DEFAULT_PROFILE_TEMPLATE_INFO>;
}

// Template loading utility
export function loadTemplate(templateName: string): string {
  const templates = {
    'abstract-art': ABSTRACT_ART_TEMPLATE,
    'charcoal-nights': CHARCOAL_NIGHTS_TEMPLATE,
    'pixel-petals': PIXEL_PETALS_TEMPLATE,
    'retro-social': RETRO_SOCIAL_TEMPLATE,
    'classic-linen': CLASSIC_LINEN_TEMPLATE,
    'clear': ''
  };

  return templates[templateName as keyof typeof templates] || ABSTRACT_ART_TEMPLATE;
}