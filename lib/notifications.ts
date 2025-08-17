import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export type NotificationType = "comment" | "reply" | "photo_comment" | "photo_reply" | "follow" | "friend" | "guestbook";

export interface NotificationData {
  postId?: string;
  commentId?: string;
  parentCommentId?: string;
  mediaId?: string;
  mediaTitle?: string;
  mediaOwnerHandle?: string;
  postAuthorHandle?: string;
  guestbookEntryId?: string;
  [key: string]: any;
}

export async function createNotification(
  recipientId: string,
  actorId: string,
  type: NotificationType,
  data?: NotificationData
) {
  // Don't create notification if actor is the same as recipient
  if (recipientId === actorId) {
    console.log(`Skipping self-notification: ${actorId} -> ${recipientId} (${type})`);
    return null;
  }

  try {
    console.log(`Creating notification: ${actorId} -> ${recipientId} (${type})`, data);
    
    // Check if a similar notification already exists (within last hour to prevent spam)
    const recentNotification = await db.notification.findFirst({
      where: {
        recipientId,
        actorId,
        type,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
    });

    if (recentNotification) {
      console.log(`Recent notification exists, updating timestamp`);
      const notification = await db.notification.update({
        where: { id: recentNotification.id },
        data: {
          status: "unread",
          createdAt: new Date(),
          readAt: null,
          data: data || {},
        },
      });
      return notification;
    }

    // Create new notification
    const notification = await db.notification.create({
      data: {
        recipientId,
        actorId,
        type,
        data: data || {},
      },
    });

    console.log(`Notification created:`, notification.id);
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function createCommentNotification(
  postAuthorId: string,
  commentAuthorId: string,
  postId: string,
  commentId: string,
  postAuthorHandle?: string | null
) {
  return createNotification(postAuthorId, commentAuthorId, "comment", {
    postId,
    commentId,
    postAuthorHandle: postAuthorHandle || undefined,
  });
}

export async function createReplyNotification(
  parentCommentAuthorId: string,
  replyAuthorId: string,
  postId: string,
  commentId: string,
  parentCommentId: string,
  postAuthorHandle?: string | null
) {
  return createNotification(parentCommentAuthorId, replyAuthorId, "reply", {
    postId,
    commentId,
    parentCommentId,
    postAuthorHandle: postAuthorHandle || undefined,
  });
}

export async function createFollowNotification(
  followeeId: string,
  followerId: string
) {
  return createNotification(followeeId, followerId, "follow");
}

export async function createFriendNotification(
  userId: string,
  friendId: string
) {
  return createNotification(userId, friendId, "friend");
}

export async function createGuestbookNotification(
  profileOwnerId: string,
  entryAuthorId: string,
  entryId: string
) {
  return createNotification(profileOwnerId, entryAuthorId, "guestbook", {
    guestbookEntryId: entryId,
  });
}

export async function checkForMutualFollow(userId1: string, userId2: string): Promise<boolean> {
  const count = await db.follow.count({
    where: {
      OR: [
        { followerId: userId1, followeeId: userId2, status: "accepted" },
        { followerId: userId2, followeeId: userId1, status: "accepted" },
      ],
    },
  });
  
  return count === 2; // Both users follow each other
}