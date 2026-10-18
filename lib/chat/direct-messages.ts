import { db } from "@/lib/config/database/connection";

/**
 * The 1-on-1 conversation between two users, created if they don't have one
 * yet. Shared by POST /api/messages/conversations and the socket `dm:send`.
 */
export async function findOrCreateDM(
  userId: string,
  otherUserId: string
): Promise<{ id: string; created: boolean }> {
  const candidates = await db.conversation.findMany({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    include: { participants: true },
  });

  // Exactly 2 participants = a DM, not a group that happens to include both
  const existing = candidates.find((c) => c.participants.length === 2);
  if (existing) return { id: existing.id, created: false };

  const conversation = await db.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
  });
  return { id: conversation.id, created: true };
}
