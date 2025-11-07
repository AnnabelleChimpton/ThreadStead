/**
 * Beta keys configuration utilities
 * Centralized logic for checking if beta key system is enabled
 */

/**
 * Checks if the beta key system is enabled based on environment configuration
 * @returns true if beta keys are required for account creation, false otherwise
 */
export function isBetaKeysEnabled(): boolean {
  const value = process.env.BETA_KEYS_ENABLED?.toLowerCase().trim();
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Validates the BETA_KEYS_ENABLED environment variable configuration
 * Logs warnings for invalid/unexpected values
 */
export function validateBetaKeysConfig(): void {
  const rawValue = process.env.BETA_KEYS_ENABLED;

  if (!rawValue) {
    console.warn('[Beta Keys Config] BETA_KEYS_ENABLED not set, defaulting to disabled (open registration)');
    return;
  }

  const normalized = rawValue.toLowerCase().trim();
  const validValues = ['true', 'false', '1', '0', 'yes', 'no'];

  if (!validValues.includes(normalized)) {
    console.warn(
      `[Beta Keys Config] BETA_KEYS_ENABLED has unexpected value: "${rawValue}". ` +
      `Expected one of: ${validValues.join(', ')}. Treating as disabled.`
    );
  }

  const enabled = isBetaKeysEnabled();
  console.log(`[Beta Keys Config] Beta key system is ${enabled ? 'ENABLED' : 'DISABLED'}`);
}
