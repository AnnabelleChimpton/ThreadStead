/**
 * Pixel Home Randomization Utilities
 * Provides functions to generate random home configurations for new users
 */

import { HouseTemplate, ColorPalette } from '@/components/pixel-homes/HouseSVG';

// Available options
const HOUSE_TEMPLATES: HouseTemplate[] = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1'];
const COLOR_PALETTES: ColorPalette[] = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen'];
const WINDOW_STYLES = ['default', 'round', 'arched', 'bay'] as const;
const DOOR_STYLES = ['default', 'arched', 'double', 'cottage'] as const;
const ROOF_TRIMS = ['default', 'ornate', 'scalloped', 'gabled'] as const;

// Atmospheric variations
const SKY_OPTIONS = ['sunny', 'cloudy', 'sunset', 'night'] as const;
const WEATHER_OPTIONS = ['clear', 'light_rain', 'light_snow'] as const;
const TIME_OPTIONS = ['morning', 'midday', 'evening', 'night'] as const;

// Inspirational house titles for variety
const HOUSE_TITLES = [
  'Cozy Corner', 'Pixel Paradise', 'Digital Den', 'Byte Bungalow', 'Code Cabin',
  'Thread Haven', 'Sage Sanctuary', 'Charcoal Cottage', 'Glow Grove', 'Linen Lodge',
  'Peaceful Place', 'Quiet Quarters', 'Happy Home', 'Sweet Spot', 'Comfort Castle',
  'Zen Zone', 'Calm Corner', 'Bright Bungalow', 'Warm Welcome', 'Safe Space',
  'Creative Corner', 'Inspiration Inn', 'Dream Dwelling', 'Wonder Works', 'Magic Manor',
  'Pixel Portal', 'Digital Doorway', 'Virtual Villa', 'Cyber Sanctuary', 'Tech Temple'
];

/**
 * Generate a random home configuration for a new user
 * Creates variety while keeping reasonable defaults
 */
export function generateRandomHomeConfig() {
  const template = HOUSE_TEMPLATES[Math.floor(Math.random() * HOUSE_TEMPLATES.length)];
  const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];

  // 60% chance of customizations for variety (less aggressive than migration script)
  const hasCustomizations = Math.random() < 0.6;

  const config: any = {
    houseTemplate: template,
    palette: palette,
    bookSkin: 'linen_v1',
    seasonalOptIn: Math.random() < 0.5, // 50% opt into seasonal changes
    preferPixelHome: true, // New users get pixel homes by default
  };

  if (hasCustomizations) {
    // 40% chance of each customization type
    if (Math.random() < 0.4) {
      config.windowStyle = WINDOW_STYLES[Math.floor(Math.random() * WINDOW_STYLES.length)];
    }
    if (Math.random() < 0.4) {
      config.doorStyle = DOOR_STYLES[Math.floor(Math.random() * DOOR_STYLES.length)];
    }
    if (Math.random() < 0.4) {
      config.roofTrim = ROOF_TRIMS[Math.floor(Math.random() * ROOF_TRIMS.length)];
    }

    // 25% chance of a house title
    if (Math.random() < 0.25) {
      config.houseTitle = HOUSE_TITLES[Math.floor(Math.random() * HOUSE_TITLES.length)];
    }
  }

  // Random atmosphere (70% chance of non-default for new users)
  const hasAtmosphere = Math.random() < 0.7;
  if (hasAtmosphere) {
    config.atmosphereSky = SKY_OPTIONS[Math.floor(Math.random() * SKY_OPTIONS.length)];
    config.atmosphereWeather = WEATHER_OPTIONS[Math.floor(Math.random() * WEATHER_OPTIONS.length)];
    config.atmosphereTimeOfDay = TIME_OPTIONS[Math.floor(Math.random() * TIME_OPTIONS.length)];
  } else {
    config.atmosphereSky = 'sunny';
    config.atmosphereWeather = 'clear';
    config.atmosphereTimeOfDay = 'midday';
  }

  return config;
}

/**
 * Generate multiple random configurations and pick the most "interesting" one
 * This creates more variety by generating several options and selecting the best
 */
export function generateInterestingHomeConfig(): any {
  const candidates = Array.from({ length: 5 }, () => generateRandomHomeConfig());

  // Score each configuration based on "interestingness"
  const scoredCandidates = candidates.map(config => {
    let score = 0;

    // Points for non-default customizations
    if (config.windowStyle && config.windowStyle !== 'default') score += 2;
    if (config.doorStyle && config.doorStyle !== 'default') score += 2;
    if (config.roofTrim && config.roofTrim !== 'default') score += 2;
    if (config.houseTitle) score += 3;

    // Points for interesting atmosphere
    if (config.atmosphereSky !== 'sunny') score += 1;
    if (config.atmosphereWeather !== 'clear') score += 1;
    if (config.atmosphereTimeOfDay !== 'midday') score += 1;

    // Bonus for certain appealing combinations
    if (config.palette === 'pixel_petals' && config.atmosphereSky === 'sunset') score += 2;
    if (config.palette === 'charcoal_nights' && config.atmosphereTimeOfDay === 'night') score += 2;
    if (config.houseTemplate === 'cabin_v1' && config.atmosphereWeather === 'light_snow') score += 2;

    return { config, score };
  });

  // Return the highest scoring configuration
  scoredCandidates.sort((a, b) => b.score - a.score);
  return scoredCandidates[0].config;
}

/**
 * Generate a simple, clean configuration for users who might prefer minimal customization
 */
export function generateCleanHomeConfig(): any {
  const template = HOUSE_TEMPLATES[Math.floor(Math.random() * HOUSE_TEMPLATES.length)];
  const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];

  return {
    houseTemplate: template,
    palette: palette,
    bookSkin: 'linen_v1',
    seasonalOptIn: false,
    preferPixelHome: true,
    windowStyle: 'default',
    doorStyle: 'default',
    roofTrim: 'default',
    atmosphereSky: 'sunny',
    atmosphereWeather: 'clear',
    atmosphereTimeOfDay: 'midday',
  };
}

/**
 * Main function to use for new user signups
 * Provides good balance of customization and simplicity
 */
export function getNewUserHomeConfig(): any {
  // 80% get interesting configs, 20% get clean configs
  return Math.random() < 0.8
    ? generateInterestingHomeConfig()
    : generateCleanHomeConfig();
}