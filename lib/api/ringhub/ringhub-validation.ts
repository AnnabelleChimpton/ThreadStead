/**
 * Federation Validation
 *
 * Validates that users meet minimum requirements for federated ThreadRing participation.
 */

/**
 * Validate that a user can participate in federated ThreadRings
 *
 * Requirements:
 * - Must have a user handle (required for profile URL in DID document)
 *
 * @param userId - ThreadStead user ID
 * @param db - Prisma database client
 * @returns Validation result with error message if invalid
 */
export async function validateUserForFederation(
  userId: string,
  db: any
): Promise<{ valid: boolean; error?: string }> {
  // Check user has a handle (required for Tier 1 - profile URL)
  const handle = await db.handle.findFirst({
    where: { userId },
    select: { handle: true, host: true }
  })

  if (!handle) {
    return {
      valid: false,
      error: 'You must have a handle to participate in federated ThreadRings. Please set up your handle in your profile settings.'
    }
  }

  // User meets minimum requirements for federation
  return { valid: true }
}

/**
 * Throw an error if user cannot participate in federation
 *
 * Convenience function for API endpoints that require federation.
 *
 * @param userId - ThreadStead user ID
 * @param db - Prisma database client
 * @throws Error if user doesn't meet requirements
 */
export async function requireFederationEligibility(
  userId: string,
  db: any
): Promise<void> {
  const validation = await validateUserForFederation(userId, db)

  if (!validation.valid) {
    throw new Error(validation.error || 'User not eligible for federation')
  }
}
