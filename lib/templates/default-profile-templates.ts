// The themes people pick for their page (signup, Settings > Your page, the
// CSS editor's Browse Themes). This list is the only one: everything that
// shows or accepts a theme reads it. A theme is saved as a copy of its CSS,
// so dropping one here leaves the pages that already use it as they are.
import { CHARCOAL_NIGHTS_TEMPLATE } from './charcoal-nights';
import { PIXEL_PETALS_TEMPLATE } from './pixel-petals';
import { RETRO_SOCIAL_TEMPLATE } from './retro-social';
import { CLASSIC_LINEN_TEMPLATE } from './classic-linen';
import { WEB1_STARFIELD_TEMPLATE } from './web1-starfield';

export type ProfileTemplateType = 'classic-linen' | 'charcoal-nights' | 'pixel-petals' | 'retro-social' | 'web1-starfield';

export {
  CHARCOAL_NIGHTS_TEMPLATE,
  PIXEL_PETALS_TEMPLATE,
  RETRO_SOCIAL_TEMPLATE,
  CLASSIC_LINEN_TEMPLATE,
  WEB1_STARFIELD_TEMPLATE
};

const TEMPLATES: Record<ProfileTemplateType, string> = {
  'classic-linen': CLASSIC_LINEN_TEMPLATE,
  'charcoal-nights': CHARCOAL_NIGHTS_TEMPLATE,
  'pixel-petals': PIXEL_PETALS_TEMPLATE,
  'retro-social': RETRO_SOCIAL_TEMPLATE,
  'web1-starfield': WEB1_STARFIELD_TEMPLATE,
};

/** A theme's CSS ('clear' is no CSS). An unknown id gets Classic Linen. */
export function getDefaultProfileTemplate(type: ProfileTemplateType | 'clear' = 'classic-linen'): string {
  if (type === 'clear') return '';
  return TEMPLATES[type] ?? CLASSIC_LINEN_TEMPLATE;
}

// Names and one-line descriptions, in the order pickers show them
export const DEFAULT_PROFILE_TEMPLATE_INFO = {
  'classic-linen': {
    name: 'Classic Linen',
    description: 'A cream page set in a bookish serif.',
  },
  'charcoal-nights': {
    name: 'Charcoal Nights',
    description: 'A dark page with orange links, for reading at night.',
  },
  'pixel-petals': {
    name: 'Pixel Petals',
    description: 'Pink and white, with headings in a pixel font.',
  },
  'retro-social': {
    name: 'Retro Social',
    description: 'Blue bars and small Verdana, like a 2005 profile page.',
  },
  'web1-starfield': {
    name: 'Starfield',
    description: 'Stars, Times New Roman and bright links, like a 1999 homepage.',
  },
  'clear': {
    name: 'Clear',
    description: 'No theme: the site\'s own notebook look.',
  },
};

/** Every theme id plus 'clear' */
export function getAvailableTemplateTypes() {
  return Object.keys(DEFAULT_PROFILE_TEMPLATE_INFO) as Array<keyof typeof DEFAULT_PROFILE_TEMPLATE_INFO>;
}

/** The theme ids, without 'clear' */
export const PROFILE_THEME_IDS = Object.keys(TEMPLATES) as ProfileTemplateType[];

export function isProfileThemeId(id: unknown): id is ProfileTemplateType {
  return typeof id === 'string' && (PROFILE_THEME_IDS as string[]).includes(id);
}
