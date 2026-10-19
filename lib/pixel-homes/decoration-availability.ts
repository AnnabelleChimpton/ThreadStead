import type { Prisma } from '@prisma/client'

/**
 * The catalog items a resident may place: defaults, public items, limited
 * releases that are running now, beta items for beta users, and anything
 * they've claimed. GET /api/decorations/available lists these, and the save
 * API refuses items outside them.
 */
export function availableDecorationsWhere(
  user: { id: string; betaKey?: unknown },
  now: Date = new Date()
): Prisma.DecorationItemWhereInput {
  return {
    isActive: true,
    OR: [
      { releaseType: 'DEFAULT' },
      { releaseType: 'PUBLIC' },
      { releaseType: 'LIMITED_TIME', releaseStartAt: { lte: now }, releaseEndAt: { gte: now } },
      ...(user.betaKey ? [{ releaseType: 'BETA_USERS' as const }] : []),
      { userClaims: { some: { userId: user.id } } },
    ],
  }
}
