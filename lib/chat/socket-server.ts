/**
 * Real-time chat over socket.io: the lounge (rooms, presence, typing, topic,
 * status, whispers) and direct messages. server.ts creates the socket.io
 * server and calls attachChatServer(io).
 *
 * Events in:  chat:join, chat:leave, chat:message, chat:typing, chat:stop_typing,
 *             chat:set_topic, chat:status, chat:whisper,
 *             dm:send, dm:read, dm:typing, dm:stop_typing
 * Events out: chat:message, chat:topic, chat:typing, chat:stop_typing,
 *             presence:update, system:notice,
 *             dm:new_message, dm:read_receipt, dm:typing, dm:stop_typing
 */
import type { IncomingMessage } from "http";
import type { Server, Socket } from "socket.io";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { isUserBlocked } from "@/lib/domain/users/blocks";
import { getChatBlockedIds } from "./block-cache";
import { createMemoryRateLimiter } from "@/lib/server/http/rate-limit";
import { findOrCreateDM } from "./direct-messages";
import { resolveDiceCommands, sanitizeMessage } from "./message-text";
import { addToPresence, getRoomPresence, removeFromPresence, updateStatus } from "./presence";

const CHAT_USER_SELECT = {
  id: true,
  primaryHandle: true,
  role: true,
  profile: { select: { displayName: true, avatarUrl: true, avatarThumbnailUrl: true } },
} satisfies Prisma.UserSelect;

export type ChatMember = Prisma.UserGetPayload<{ select: typeof CHAT_USER_SELECT }> & { isGuest: false };
export type ChatGuest = { id: string; isGuest: true };
export type ChatUser = ChatMember | ChatGuest;

/** What each socket carries in `socket.data` (also visible via fetchSockets). */
export interface ChatSocketData {
  user?: ChatUser;
  currentRoom: string | null;
}

type ChatSocket = Socket<any, any, any, ChatSocketData>;
type ChatServer = Server<any, any, any, ChatSocketData>;
/** A client event payload. Untrusted: each handler checks the fields it uses. */
type Incoming = any;

/** Lounge and DM limits per user: 5 per 10 seconds, 30 per 5 minutes. */
export const CHAT_RATE_LIMITS = [
  { name: "burst" as const, max: 5, windowMs: 10 * 1000 },
  { name: "sustained" as const, max: 30, windowMs: 5 * 60 * 1000 },
];

const SLOW_DOWN = {
  burst: "You're sending messages too quickly. Please slow down.",
  sustained: "You've sent too many messages. Please wait a moment.",
};

/** The signed-in user behind a handshake, or null (guest). Never throws. */
async function resolveChatUser(headers: IncomingMessage["headers"]): Promise<ChatMember | null> {
  try {
    const user = await getSessionUser({ headers }, { select: CHAT_USER_SELECT });
    return user ? { ...user, isGuest: false } : null;
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

export interface ChatServerOptions {
  /** Debug logging (dev only in server.ts). */
  log?: (...args: unknown[]) => void;
}

export function attachChatServer(io: ChatServer, { log = () => {} }: ChatServerOptions = {}) {
  // One budget per user and scope: "chat" (lounge messages + whispers) and
  // "dm", so heavy activity in one doesn't throttle the other.
  const limiter = createMemoryRateLimiter(CHAT_RATE_LIMITS);
  const checkRateLimit = (userId: string, scope: "chat" | "dm" = "chat") =>
    limiter.check(`${userId}:${scope}`);

  const broadcastPresence = (roomId: string) => {
    io.to(roomId).emit("presence:update", { users: getRoomPresence(roomId) });
  };

  /**
   * Who must not get this user's typing events: anyone they blocked or who
   * blocked them (each member's sockets share a room named by their id).
   * Cached, so a keystroke doesn't cost a query. Null if the lookup failed,
   * in which case the caller sends nothing.
   */
  const typingExclusions = async (userId: string): Promise<string[] | null> => {
    try {
      return [...(await getChatBlockedIds(userId))];
    } catch (error) {
      console.error("Error checking typing blocks:", error);
      return null;
    }
  };

  // NOTE: this callback is intentionally NOT async. Validating an authenticated
  // session requires a DB round-trip, and if we awaited it before registering
  // the event listeners below, a client's immediate `chat:join` (emitted on
  // 'connect') could arrive before its listener exists and be silently dropped
  // — leaving logged-in users unable to join. Instead we register listeners
  // synchronously and keep `sessionReady`; every handler awaits it before
  // touching the user.
  io.on("connection", (socket: ChatSocket) => {
    socket.data.currentRoom = null;

    const sessionReady: Promise<ChatUser> = resolveChatUser(socket.handshake.headers).then((member) => {
      if (!member) {
        log("Guest connected:", socket.id);
        socket.data.user = { id: "guest-" + socket.id, isGuest: true };
      } else {
        log("Authenticated user connected:", member.primaryHandle || member.id, "Socket:", socket.id);
        socket.data.user = member;
        // Join personal room for whispers (and DMs). Skip it if the socket
        // already left: socket.io would keep the dead id in that room.
        if (socket.connected) socket.join(member.id);
      }
      return socket.data.user;
    });

    socket.on("chat:join", async (data: Incoming) => {
      const { roomId } = data || {};
      const user = await sessionReady;

      if (!roomId || typeof roomId !== "string") {
        socket.emit("system:notice", { message: "Room ID required", type: "error" });
        return;
      }

      // Verify the room actually exists before joining, so users can't appear
      // in presence (or whisper) inside made-up room namespaces.
      let room;
      try {
        room = await db.chatRoom.findUnique({ where: { id: roomId } });
      } catch (error) {
        console.error("Error looking up room:", error);
        socket.emit("system:notice", { message: "Failed to join room", type: "error" });
        return;
      }

      if (!room) {
        socket.emit("system:notice", { message: "That room does not exist", type: "error" });
        return;
      }

      // The socket may have gone away while we were awaiting the session or
      // the room. Its disconnect cleanup has already run (and found no room),
      // so joining now would leave a ghost in presence that nothing removes.
      if (socket.disconnected) return;

      // Leave previous room if any
      const previousRoom = socket.data.currentRoom;
      if (previousRoom) {
        socket.leave(previousRoom);
        if (!user.isGuest) {
          removeFromPresence(previousRoom, user.id);
          // Tell the old room we left so our avatar doesn't linger there.
          broadcastPresence(previousRoom);
        }
      }

      socket.join(roomId);
      socket.data.currentRoom = roomId;

      // Only signed-in users appear in presence
      if (!user.isGuest) {
        addToPresence(roomId, user);
      }

      // Send the room topic to the joining user
      if (room.topic) {
        socket.emit("chat:topic", {
          topic: room.topic,
          topicSetBy: room.topicSetBy,
          topicSetAt: room.topicSetAt,
        });
      }

      broadcastPresence(roomId);

      log(`User ${(!user.isGuest && user.primaryHandle) || user.id} joined room ${roomId}`);
    });

    socket.on("chat:message", async (data: Incoming) => {
      const { roomId, body } = data || {};
      const user = await sessionReady;

      if (!roomId || !socket.data.currentRoom || socket.data.currentRoom !== roomId) {
        socket.emit("system:notice", { message: "You must join a room first", type: "error" });
        return;
      }

      if (user.isGuest) {
        socket.emit("system:notice", { message: "You must be logged in to send messages", type: "error" });
        return;
      }

      const rateCheck = checkRateLimit(user.id);
      if (!rateCheck.allowed) {
        socket.emit("system:notice", { message: SLOW_DOWN[rateCheck.reason], type: "warning" });
        return;
      }

      const sanitized = sanitizeMessage(resolveDiceCommands(body));
      if (!sanitized.text) {
        socket.emit("system:notice", { message: "Message cannot be empty", type: "error" });
        return;
      }

      try {
        const message = await db.chatMessage.create({
          data: {
            roomId,
            userId: user.id,
            body: sanitized.text,
            isAction: sanitized.isAction,
          },
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        });

        io.to(roomId).emit("chat:message", {
          id: message.id,
          roomId: message.roomId,
          userId: message.userId,
          handle: message.user.primaryHandle,
          displayName: message.user.profile?.displayName,
          avatarUrl: message.user.profile?.avatarThumbnailUrl || message.user.profile?.avatarUrl,
          body: message.body,
          isAction: message.isAction,
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error("Error saving message:", error);
        socket.emit("system:notice", { message: "Failed to send message", type: "error" });
      }
    });

    socket.on("chat:leave", async () => {
      const user = await sessionReady;
      const room = socket.data.currentRoom;
      if (room) {
        if (!user.isGuest) {
          removeFromPresence(room, user.id);
        }
        broadcastPresence(room);
        socket.leave(room);
        socket.data.currentRoom = null;
      }
    });

    socket.on("chat:typing", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { roomId } = data || {};
      if (!roomId || socket.data.currentRoom !== roomId) return;
      const excluded = await typingExclusions(user.id);
      // Re-check: the socket may have moved rooms during the lookup
      if (excluded && socket.data.currentRoom === roomId) {
        socket.to(roomId).except(excluded).emit("chat:typing", {
          userId: user.id,
          handle: user.primaryHandle,
          displayName: user.profile?.displayName,
        });
      }
    });

    socket.on("chat:stop_typing", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { roomId } = data || {};
      if (!roomId || socket.data.currentRoom !== roomId) return;
      const excluded = await typingExclusions(user.id);
      if (excluded && socket.data.currentRoom === roomId) {
        socket.to(roomId).except(excluded).emit("chat:stop_typing", { userId: user.id });
      }
    });

    // Admin only
    socket.on("chat:set_topic", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { roomId, topic } = data || {};

      if (user.role !== "admin") {
        socket.emit("system:notice", { message: "Only admins can set the room topic", type: "error" });
        return;
      }

      if (!roomId || roomId !== socket.data.currentRoom) {
        socket.emit("system:notice", { message: "You must be in the room to set its topic", type: "error" });
        return;
      }

      try {
        // Limit to 200 characters; blank clears the topic
        const trimmedTopic = typeof topic === "string" && topic.trim() ? topic.trim().substring(0, 200) : null;

        await db.chatRoom.update({
          where: { id: roomId },
          data: {
            topic: trimmedTopic,
            topicSetBy: trimmedTopic ? user.id : null,
            topicSetAt: trimmedTopic ? new Date() : null,
          },
        });

        io.to(roomId).emit("chat:topic", {
          topic: trimmedTopic,
          topicSetBy: user.id,
          topicSetAt: new Date(),
        });

        log(`Topic set by ${user.primaryHandle} in ${roomId}: ${trimmedTopic || "(cleared)"}`);
      } catch (error) {
        console.error("Error setting topic:", error);
        socket.emit("system:notice", { message: "Failed to set topic", type: "error" });
      }
    });

    socket.on("chat:status", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { roomId, status, message } = data || {};

      if (!roomId || roomId !== socket.data.currentRoom) return;

      const validStatuses = ["online", "away", "busy"];
      const newStatus = validStatuses.includes(status) ? status : "online";
      const statusMessage = typeof message === "string" && message.trim() ? message.trim().substring(0, 50) : null;

      updateStatus(roomId, user.id, newStatus, statusMessage);
      broadcastPresence(roomId);
    });

    socket.on("chat:whisper", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { roomId, targetHandle, message } = data || {};

      if (!roomId || roomId !== socket.data.currentRoom) return;
      if (typeof targetHandle !== "string" || !targetHandle) return;
      if (typeof message !== "string" || !message.trim()) return;

      // Rate limit whispers alongside normal lounge messages so they can't be
      // used as an unthrottled spam channel.
      const rateCheck = checkRateLimit(user.id);
      if (!rateCheck.allowed) {
        socket.emit("system:notice", { message: SLOW_DOWN[rateCheck.reason], type: "warning" });
        return;
      }

      // Sanitize + length-cap the body, same as public messages.
      const sanitized = sanitizeMessage(message);
      if (!sanitized.text) return;

      const wanted = targetHandle.toLowerCase();
      const targetUser = getRoomPresence(roomId).find((u) => {
        const handle = u.handle?.toLowerCase();
        return handle && (handle === wanted || handle.startsWith(wanted + "@"));
      });

      const notFound = () =>
        socket.emit("system:notice", { message: `User @${targetHandle} not found in this room`, type: "error" });

      if (!targetUser) {
        notFound();
        return;
      }

      // Respect blocks: if the target has blocked the sender, a whisper must
      // not become a way around it. Report the same "not found" message so the
      // block isn't disclosed.
      try {
        if (await isUserBlocked(targetUser.userId, user.id)) {
          notFound();
          return;
        }
      } catch (error) {
        console.error("Error checking whisper block:", error);
        return;
      }

      const whisperData = {
        id: "whisper-" + Date.now(),
        roomId,
        userId: user.id,
        handle: user.primaryHandle,
        displayName: user.profile?.displayName,
        avatarUrl: user.profile?.avatarThumbnailUrl || user.profile?.avatarUrl,
        body: sanitized.text,
        createdAt: new Date().toISOString(),
        isWhisper: true,
        whisperTo: targetUser.handle,
      };

      io.to(targetUser.userId).emit("chat:message", whisperData);
      // The sender sees it too
      socket.emit("chat:message", whisperData);
    });

    // Persistent direct messages
    socket.on("dm:send", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) {
        socket.emit("system:notice", { message: "Guests cannot send DMs", type: "error" });
        return;
      }

      const { targetUserId, body } = data || {};

      if (typeof targetUserId !== "string" || !targetUserId || !body || typeof body !== "string" || !body.trim()) return;

      if (targetUserId === user.id) {
        socket.emit("system:notice", { message: "You cannot message yourself", type: "error" });
        return;
      }

      const rateCheck = checkRateLimit(user.id, "dm");
      if (!rateCheck.allowed) {
        socket.emit("system:notice", { message: "You are sending messages too fast", type: "warning" });
        return;
      }

      const sanitized = sanitizeMessage(body);
      if (!sanitized.text) return;

      try {
        if (await isUserBlocked(targetUserId, user.id)) {
          socket.emit("system:notice", { message: "You cannot send messages to this user.", type: "error" });
          return;
        }

        const conversation = await findOrCreateDM(user.id, targetUserId);

        const message = await db.directMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            body: sanitized.text,
            isRead: false,
          },
          include: {
            sender: {
              include: { profile: true },
            },
          },
        });

        await db.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        const messageData = {
          id: message.id,
          conversationId: conversation.id,
          senderId: message.senderId,
          handle: message.sender.primaryHandle,
          displayName: message.sender.profile?.displayName,
          avatarUrl: message.sender.profile?.avatarThumbnailUrl || message.sender.profile?.avatarUrl,
          body: message.body,
          createdAt: message.createdAt,
          isRead: false,
        };

        socket.emit("dm:new_message", messageData);
        io.to(targetUserId).emit("dm:new_message", messageData);
      } catch (error) {
        console.error("Error sending DM:", error);
        socket.emit("system:notice", { message: "Failed to send DM", type: "error" });
      }
    });

    socket.on("dm:read", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { conversationId } = data || {};

      if (typeof conversationId !== "string" || !conversationId) return;

      try {
        await db.conversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId: user.id,
            },
          },
          data: {
            lastReadAt: new Date(),
          },
        });

        // Mark the OTHER person's messages as read
        await db.directMessage.updateMany({
          where: {
            conversationId,
            senderId: { not: user.id },
            isRead: false,
          },
          data: { isRead: true },
        });

        // Tell the other participant we read it
        const conversation = await db.conversation.findUnique({
          where: { id: conversationId },
          include: { participants: true },
        });

        const otherParticipant = conversation?.participants.find((p) => p.userId !== user.id);
        if (otherParticipant) {
          io.to(otherParticipant.userId).emit("dm:read_receipt", {
            conversationId,
            readByUserId: user.id,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.error("Error marking DM as read:", error);
      }
    });

    socket.on("dm:typing", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { targetUserId } = data || {};

      if (typeof targetUserId !== "string" || !targetUserId) return;
      const excluded = await typingExclusions(user.id);
      if (!excluded || excluded.includes(targetUserId)) return;

      io.to(targetUserId).emit("dm:typing", {
        userId: user.id,
        handle: user.primaryHandle,
      });
    });

    socket.on("dm:stop_typing", async (data: Incoming) => {
      const user = await sessionReady;
      if (user.isGuest) return;
      const { targetUserId } = data || {};

      if (typeof targetUserId !== "string" || !targetUserId) return;
      const excluded = await typingExclusions(user.id);
      if (!excluded || excluded.includes(targetUserId)) return;

      io.to(targetUserId).emit("dm:stop_typing", { userId: user.id });
    });

    socket.on("disconnect", async () => {
      // Await readiness so a disconnect that races session validation still
      // resolves the real user (and cleans up presence correctly).
      const user = await sessionReady;
      const room = socket.data.currentRoom;

      if (room && !user.isGuest) {
        // Another tab of the same user may still be in the room
        const sockets = await io.in(room).fetchSockets();
        const userStillConnected = sockets.some((s) => s.data.user?.id === user.id);

        if (!userStillConnected) {
          removeFromPresence(room, user.id);
          broadcastPresence(room);
        }
      }

      log("User disconnected:", (!user.isGuest && user.primaryHandle) || user.id);
    });
  });

  return {
    /** Stop the limiter's sweep timer (tests, shutdown). */
    close() {
      limiter.stop();
    },
  };
}
