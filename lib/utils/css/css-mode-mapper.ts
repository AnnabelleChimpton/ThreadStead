/**
 * CSS Mode Mapping Utilities
 *
 * Maps between profile-level CSS modes and component-level CSS render modes
 * to ensure consistent styling behavior across the application.
 */

// Profile-level CSS modes (used by ProfileLayout and ProfileModeRenderer)
export type ProfileCSSMode = 'inherit' | 'override' | 'disable';

// Component-level CSS render modes (template components)
export type ComponentCSSRenderMode = 'auto' | 'inherit' | 'custom';

/**
 * Maps profile-level CSS mode to component-level CSS render mode
 *
 * @param profileCSSMode - The CSS mode set at the profile level
 * @returns The corresponding CSS render mode for components
 */
export function mapProfileCSSModeToComponentMode(
  profileCSSMode: ProfileCSSMode
): ComponentCSSRenderMode {
  switch (profileCSSMode) {
    case 'inherit':
      // Profile wants to inherit site styles -> components should also inherit
      return 'inherit';
    case 'override':
      // Profile wants to override site styles -> components should use custom CSS
      return 'custom';
    case 'disable':
      // Profile wants to disable site styles -> components should use auto (isolated) mode
      return 'auto';
    default:
      // Fallback to auto mode for safety
      return 'auto';
  }
}

/**
 * Maps component-level CSS render mode back to profile-level CSS mode
 *
 * @param componentMode - The CSS render mode set at the component level
 * @returns The corresponding CSS mode for the profile
 */
export function mapComponentModeToProfileCSSMode(
  componentMode: ComponentCSSRenderMode
): ProfileCSSMode {
  switch (componentMode) {
    case 'inherit':
      return 'inherit';
    case 'custom':
      return 'override';
    case 'auto':
      return 'disable';
    default:
      return 'disable';
  }
}

/**
 * Validates that a CSS mode is a valid profile CSS mode
 */
export function isValidProfileCSSMode(mode: string): mode is ProfileCSSMode {
  return ['inherit', 'override', 'disable'].includes(mode);
}
