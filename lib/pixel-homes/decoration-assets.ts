/**
 * Decoration Asset URL Utilities
 *
 * Provides functions to generate R2 CDN URLs for decoration PNG assets.
 * Used by DecorationSVG component for PNG-first loading.
 */

const R2_PATH_PREFIX = "pixel-homes/decorations";

/**
 * Get the R2 CDN base URL for client-side asset loading.
 * Returns empty string if not configured (will trigger SVG fallback).
 */
export function getR2CdnUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use NEXT_PUBLIC_ prefixed env var
    return (process.env.NEXT_PUBLIC_R2_CDN_URL || "").replace(/\/$/, "");
  }
  // Server-side: can use either
  return (process.env.NEXT_PUBLIC_R2_CDN_URL || process.env.R2_CDN_URL || "").replace(/\/$/, "");
}

/**
 * Check if automatic PNG asset loading from R2 is enabled.
 * When false, only decorations with explicit pngUrl in database will use PNG.
 * Set NEXT_PUBLIC_PNG_AUTO_LOAD="true" to enable automatic R2 loading.
 */
export function isPngLoadingEnabled(): boolean {
  const cdnUrl = getR2CdnUrl();
  if (!cdnUrl) return false;

  // For gradual migration: only auto-load if explicitly enabled
  // Otherwise, only use PNGs that have pngUrl set in database
  const autoLoad = process.env.NEXT_PUBLIC_PNG_AUTO_LOAD === "true";
  return autoLoad;
}

/**
 * Get R2 URL for a decoration PNG
 *
 * @param decorationId - The decoration ID (e.g., 'roses_red', 'tree_oak')
 * @returns Full CDN URL to the PNG, or empty string if CDN not configured
 */
export function getDecorationPngUrl(decorationId: string): string {
  const cdnUrl = getR2CdnUrl();
  if (!cdnUrl) return "";

  // Normalize decoration ID - strip any instance suffixes like 'tree_oak_123_abc'
  const normalizedId = normalizeDecorationId(decorationId);

  return `${cdnUrl}/${R2_PATH_PREFIX}/${normalizedId}.png`;
}

/**
 * Get R2 URL for a house template PNG
 *
 * @param template - House template (e.g., 'cottage_v1', 'townhouse_v1')
 * @param palette - Color palette (e.g., 'thread_sage', 'crt_glow')
 * @returns Full CDN URL to the PNG, or empty string if CDN not configured
 */
export function getHousePngUrl(template: string, palette: string): string {
  const cdnUrl = getR2CdnUrl();
  if (!cdnUrl) return "";

  return `${cdnUrl}/${R2_PATH_PREFIX}/houses/${template}_${palette}.png`;
}

/**
 * Normalize a decoration ID by stripping instance-specific suffixes.
 * Instance IDs may have format: 'tree_oak_123_abc' -> 'tree_oak'
 *
 * @param decorationId - Raw decoration ID that may include instance suffix
 * @returns Normalized decoration ID
 */
export function normalizeDecorationId(decorationId: string): string {
  // Pattern: decorationId may end with _[timestamp]_[hash] for instances
  // We need to extract just the base decoration ID

  // Common decoration IDs we know about (to help identify boundaries)
  const knownPrefixes = [
    // Plants
    'roses_red', 'roses_pink', 'roses_white',
    'daisies_white', 'daisies_yellow',
    'tree_oak', 'tree_pine', 'small_tree',
    'sunflowers', 'lavender', 'flower_pot', 'potted_herbs',
    // Features
    'bird_bath', 'garden_gnome', 'garden_gnome_fishing', 'garden_gnome_reading',
    'decorative_fence', 'wind_chimes', 'flamingo', 'garden_sphere', 'sundial',
    'watering_can', 'garden_tools', 'wheelbarrow',
    'sleeping_cat', 'sleeping_dog', 'bird_feeder', 'firewood_stack',
    'clothesline', 'welcome_sign',
    // Furniture
    'garden_bench', 'outdoor_table', 'mailbox', 'planter_box',
    'picnic_table', 'raised_bed', 'compost_bin', 'garden_cart',
    'rocking_chair', 'garden_swing', 'cozy_blanket',
    // Fencing
    'picket_fence_white', 'picket_fence_natural', 'rustic_fence',
    'stone_wall', 'hedge', 'hedge_round',
    // Lighting
    'garden_lantern', 'string_lights', 'torch', 'spotlight',
    // Water
    'fountain', 'pond', 'rain_barrel',
    // Structures
    'gazebo', 'trellis', 'garden_arch', 'sign_post', 'wishing_well',
    // House custom
    'arched_door', 'double_door', 'cottage_door',
    'round_windows', 'arched_windows', 'bay_windows',
    'shutters', 'flower_boxes', 'awnings',
    'ornate_trim', 'scalloped_trim', 'gabled_trim',
    'brick_chimney', 'stone_chimney',
    'plain_mat', 'floral_mat', 'welcome_text_mat', 'custom_text_mat',
    'classic_house_number', 'modern_house_number', 'rustic_house_number',
    'lantern_lights', 'modern_lights', 'string_exterior_lights',
  ];

  // Check if decorationId starts with a known prefix
  for (const prefix of knownPrefixes) {
    if (decorationId === prefix || decorationId.startsWith(prefix + '_')) {
      // Check if what follows is likely an instance suffix (numbers/hex)
      const suffix = decorationId.slice(prefix.length);
      if (suffix === '' || /^_\d+_[a-f0-9]+$/i.test(suffix)) {
        return prefix;
      }
    }
  }

  // Fallback: try to strip trailing _timestamp_hash pattern
  const instancePattern = /_\d{10,}_[a-f0-9]{6,}$/i;
  if (instancePattern.test(decorationId)) {
    return decorationId.replace(instancePattern, '');
  }

  // Return as-is if no normalization needed
  return decorationId;
}

// Track failed PNG loads to avoid repeated attempts
const failedPngs = new Set<string>();

/**
 * Mark a decoration PNG as failed (404 or load error)
 */
export function markPngFailed(decorationId: string): void {
  failedPngs.add(normalizeDecorationId(decorationId));
}

/**
 * Check if a decoration PNG has previously failed to load
 */
export function hasPngFailed(decorationId: string): boolean {
  return failedPngs.has(normalizeDecorationId(decorationId));
}

/**
 * Preload decoration PNGs for a list of decoration IDs
 * Useful for preloading all decorations in a canvas
 */
export function preloadDecorationPngs(decorationIds: string[]): void {
  if (typeof window === "undefined") return;
  if (!isPngLoadingEnabled()) return;

  const uniqueIds = [...new Set(decorationIds.map(normalizeDecorationId))];

  for (const id of uniqueIds) {
    if (hasPngFailed(id)) continue;

    const url = getDecorationPngUrl(id);
    if (!url) continue;

    const img = new Image();
    img.onerror = () => markPngFailed(id);
    img.src = url;
  }
}
