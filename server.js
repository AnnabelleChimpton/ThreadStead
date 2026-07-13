const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { readFileSync } = require('fs');
const { parse } = require('url');
const dns = require('dns');

// Prefer IPv4. Hosts with an IPv6 address configured but no working route
// make fetch() to dual-stack targets (e.g. RingHub behind Cloudflare) hang
// ~17s and fail intermittently, since Node may try AAAA records first.
dns.setDefaultResultOrder('ipv4first');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const {
  getRoomPresence,
  addToPresence,
  removeFromPresence,
  updateLastActive,
  updateStatus
} = require('./lib/chat/presence');

const dev = process.env.NODE_ENV !== 'production';
const mobileTestingMode = process.env.MOBILE_TESTING === 'true';
// In production, always listen on 0.0.0.0 for external access
// In dev, use 0.0.0.0 only when mobile testing is enabled.
// 127.0.0.1 rather than 'localhost' so SSR self-fetches (getInternalBaseUrl)
// always reach the bound address regardless of how localhost resolves.
const hostname = dev ? (mobileTestingMode ? '0.0.0.0' : '127.0.0.1') : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

// Dev-only logging; production only logs errors and lifecycle events
const log = (...args) => {
  if (dev) console.log(...args);
};

// Rate limiting storage
const rateLimits = new Map(); // userId -> { burst: [], sustained: [] }

// Rate limit config
const RATE_LIMIT = {
  BURST_MAX: 5,
  BURST_WINDOW: 10000, // 10 seconds
  SUSTAINED_MAX: 30,
  SUSTAINED_WINDOW: 300000, // 5 minutes
};

// Evict idle rate-limit entries so the map doesn't grow with every user ever seen
setInterval(() => {
  const now = Date.now();
  for (const [key, limits] of rateLimits) {
    limits.burst = limits.burst.filter(ts => now - ts < RATE_LIMIT.BURST_WINDOW);
    limits.sustained = limits.sustained.filter(ts => now - ts < RATE_LIMIT.SUSTAINED_WINDOW);
    if (limits.burst.length === 0 && limits.sustained.length === 0) {
      rateLimits.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

// Validate session from cookie
async function validateSession(cookie) {
  if (!cookie) return null;

  const match = cookie.match(/retro_session=([^;]+)/);
  if (!match) return null;

  const [userId, secret] = match[1].split('.');
  if (!userId || !secret) return null;

  try {
    const session = await prisma.session.findFirst({
      where: {
        userId,
        secret,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
    });

    return session?.user || null;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Check rate limit. `scope` separates independent channels (e.g. lounge vs
// DMs) so heavy activity in one doesn't throttle the other.
function checkRateLimit(userId, scope = 'chat') {
  const now = Date.now();
  const key = `${userId}:${scope}`;

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { burst: [], sustained: [] });
  }

  const limits = rateLimits.get(key);

  // Clean old entries
  limits.burst = limits.burst.filter(ts => now - ts < RATE_LIMIT.BURST_WINDOW);
  limits.sustained = limits.sustained.filter(ts => now - ts < RATE_LIMIT.SUSTAINED_WINDOW);

  // Check limits
  if (limits.burst.length >= RATE_LIMIT.BURST_MAX) {
    return { allowed: false, reason: 'burst' };
  }

  if (limits.sustained.length >= RATE_LIMIT.SUSTAINED_MAX) {
    return { allowed: false, reason: 'sustained' };
  }

  // Add timestamp
  limits.burst.push(now);
  limits.sustained.push(now);

  return { allowed: true };
}

// Sanitize message body
function sanitizeMessage(body) {
  if (typeof body !== 'string') return { text: '', isAction: false };

  // Trim and limit length
  body = body.trim();

  // Check for /me action
  const isAction = body.startsWith('/me ');
  if (isAction) {
    body = body.substring(4); // Remove "/me " prefix
  }

  if (body.length > 280) {
    body = body.substring(0, 280);
  }

  // Basic XSS prevention - strip HTML tags
  body = body.replace(/<[^>]*>/g, '');

  return { text: body, isAction };
}

app.prepare().then(() => {
  // Create HTTP or HTTPS server based on mobile testing mode
  // In production, always use HTTP (reverse proxy handles HTTPS)
  let server;
  if (dev && mobileTestingMode) {
    const httpsOptions = {
      key: readFileSync('./localhost+1-key.pem'),
      cert: readFileSync('./localhost+1.pem'),
    };
    server = createHttpsServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
  } else {
    server = createHttpServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
  }

  // Configure CORS for mobile testing or localhost
  const corsOrigin = mobileTestingMode
    ? process.env.NEXT_PUBLIC_BASE_URL || 'https://0.0.0.0:3000'
    : 'http://localhost:3000';

  const io = new Server(server, {
    cors: {
      origin: dev ? corsOrigin : false,
      credentials: true,
    },
  });

  // Socket.io connection handler.
  // NOTE: this callback is intentionally NOT async. Validating an authenticated
  // session requires a DB round-trip, and if we awaited it before registering
  // the event listeners below, a client's immediate `chat:join` (emitted on
  // 'connect') could arrive before its listener exists and be silently dropped
  // — leaving logged-in users unable to join. Instead we register listeners
  // synchronously and expose `socket.sessionReady`; every handler awaits it
  // before touching `socket.userData`.
  io.on('connection', (socket) => {
    const cookie = socket.handshake.headers.cookie;

    socket.currentRoom = null;
    socket.sessionReady = validateSession(cookie).then((sessionUser) => {
      if (!sessionUser) {
        log('Guest connected:', socket.id);
        socket.userData = { id: 'guest-' + socket.id, isGuest: true };
      } else {
        log('Authenticated user connected:', sessionUser.primaryHandle || sessionUser.id, 'Socket:', socket.id);
        socket.userData = sessionUser;
        // Join personal room for whispers (and DMs)
        socket.join(socket.userData.id);
      }
      return socket.userData;
    });

    // Handle chat:join
    socket.on('chat:join', async (data) => {
      const { roomId } = data || {};
      const user = await socket.sessionReady;

      if (!roomId || typeof roomId !== 'string') {
        socket.emit('system:notice', {
          message: 'Room ID required',
          type: 'error'
        });
        return;
      }

      // Verify the room actually exists before joining, so users can't appear
      // in presence (or whisper) inside made-up room namespaces.
      let room;
      try {
        room = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });
      } catch (error) {
        console.error('Error looking up room:', error);
        socket.emit('system:notice', {
          message: 'Failed to join room',
          type: 'error'
        });
        return;
      }

      if (!room) {
        socket.emit('system:notice', {
          message: 'That room does not exist',
          type: 'error'
        });
        return;
      }

      // Leave previous room if any
      if (socket.currentRoom) {
        const previousRoom = socket.currentRoom;
        socket.leave(previousRoom);
        if (!user.isGuest) {
          removeFromPresence(previousRoom, user.id);
          // Tell the old room we left so our avatar doesn't linger there.
          io.to(previousRoom).emit('presence:update', { users: getRoomPresence(previousRoom) });
        }
      }

      // Join new room
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Add to presence (only for authenticated users)
      if (!user.isGuest) {
        addToPresence(roomId, user);
      }

      // Send the room topic to the joining user
      if (room.topic) {
        socket.emit('chat:topic', {
          topic: room.topic,
          topicSetBy: room.topicSetBy,
          topicSetAt: room.topicSetAt
        });
      }

      // Broadcast presence update to room
      const presence = getRoomPresence(roomId);
      io.to(roomId).emit('presence:update', { users: presence });

      log(`User ${user.primaryHandle || user.id} joined room ${roomId}`);
    });

    // Handle chat:message
    socket.on('chat:message', async (data) => {
      const { roomId, body } = data || {};
      const user = await socket.sessionReady;

      if (!roomId || !socket.currentRoom || socket.currentRoom !== roomId) {
        socket.emit('system:notice', {
          message: 'You must join a room first',
          type: 'error'
        });
        return;
      }

      // Block guests from sending messages
      if (user.isGuest) {
        socket.emit('system:notice', {
          message: 'You must be logged in to send messages',
          type: 'error'
        });
        return;
      }

      // Check rate limit
      const rateCheck = checkRateLimit(user.id);
      if (!rateCheck.allowed) {
        const message = rateCheck.reason === 'burst'
          ? 'You\'re sending messages too quickly. Please slow down.'
          : 'You\'ve sent too many messages. Please wait a moment.';

        socket.emit('system:notice', {
          message,
          type: 'warning'
        });
        return;
      }

      // Resolve dice/coin server-side so results are fair and can't be spoofed
      // by hand-typing "/me rolls 20".
      let rawBody = typeof body === 'string' ? body.trim() : '';
      if (rawBody === '/flip' || rawBody.startsWith('/flip ')) {
        rawBody = `/me flips a coin: ${Math.random() < 0.5 ? 'Heads' : 'Tails'}`;
      } else if (rawBody === '/roll' || rawBody.startsWith('/roll ')) {
        let max = parseInt(rawBody.split(/\s+/)[1], 10);
        if (!Number.isFinite(max) || max < 1) max = 100;
        if (max > 1000000) max = 1000000;
        const roll = Math.floor(Math.random() * max) + 1;
        rawBody = `/me rolls ${roll} (1-${max})`;
      }

      // Sanitize and validate message
      const sanitized = sanitizeMessage(rawBody);
      if (!sanitized.text) {
        socket.emit('system:notice', {
          message: 'Message cannot be empty',
          type: 'error'
        });
        return;
      }

      try {
        // Persist message to database
        const message = await prisma.chatMessage.create({
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

        // Broadcast to room
        const messageData = {
          id: message.id,
          roomId: message.roomId,
          userId: message.userId,
          handle: message.user.primaryHandle,
          displayName: message.user.profile?.displayName,
          avatarUrl: message.user.profile?.avatarThumbnailUrl || message.user.profile?.avatarUrl,
          body: message.body,
          isAction: message.isAction,
          createdAt: message.createdAt,
        };

        io.to(roomId).emit('chat:message', messageData);
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('system:notice', {
          message: 'Failed to send message',
          type: 'error'
        });
      }
    });

    // Handle chat:leave
    socket.on('chat:leave', async () => {
      const user = await socket.sessionReady;
      if (socket.currentRoom) {
        if (!user.isGuest) {
          removeFromPresence(socket.currentRoom, user.id);
        }

        // Broadcast presence update
        const presence = getRoomPresence(socket.currentRoom);
        io.to(socket.currentRoom).emit('presence:update', { users: presence });

        socket.leave(socket.currentRoom);
        socket.currentRoom = null;
      }
    });

    // Handle typing indicators
    socket.on('chat:typing', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { roomId } = data || {};
      if (roomId && socket.currentRoom === roomId) {
        socket.to(roomId).emit('chat:typing', {
          userId: user.id,
          handle: user.primaryHandle,
          displayName: user.profile?.displayName
        });
      }
    });

    socket.on('chat:stop_typing', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { roomId } = data || {};
      if (roomId && socket.currentRoom === roomId) {
        socket.to(roomId).emit('chat:stop_typing', {
          userId: user.id
        });
      }
    });

    // Handle chat:set_topic (admin only)
    socket.on('chat:set_topic', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { roomId, topic } = data || {};

      // Check if user is admin
      if (user.role !== 'admin') {
        socket.emit('system:notice', {
          message: 'Only admins can set the room topic',
          type: 'error'
        });
        return;
      }

      if (!roomId || roomId !== socket.currentRoom) {
        socket.emit('system:notice', {
          message: 'You must be in the room to set its topic',
          type: 'error'
        });
        return;
      }

      try {
        // Update room topic (limit to 200 characters)
        const trimmedTopic = typeof topic === 'string' && topic.trim()
          ? topic.trim().substring(0, 200)
          : null;

        await prisma.chatRoom.update({
          where: { id: roomId },
          data: {
            topic: trimmedTopic,
            topicSetBy: trimmedTopic ? user.id : null,
            topicSetAt: trimmedTopic ? new Date() : null,
          },
        });

        // Broadcast topic update to all users in room
        io.to(roomId).emit('chat:topic', {
          topic: trimmedTopic,
          topicSetBy: user.id,
          topicSetAt: new Date(),
        });

        log(`Topic set by ${user.primaryHandle} in ${roomId}: ${trimmedTopic || '(cleared)'}`);
      } catch (error) {
        console.error('Error setting topic:', error);
        socket.emit('system:notice', {
          message: 'Failed to set topic',
          type: 'error'
        });
      }
    });

    // Handle chat:status
    socket.on('chat:status', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { roomId, status, message } = data || {};

      if (!roomId || roomId !== socket.currentRoom) return;

      // Validate status
      const validStatuses = ['online', 'away', 'busy'];
      const newStatus = validStatuses.includes(status) ? status : 'online';
      const statusMessage = typeof message === 'string' && message.trim()
        ? message.trim().substring(0, 50)
        : null;

      updateStatus(roomId, user.id, newStatus, statusMessage);

      // Broadcast presence update
      const presence = getRoomPresence(roomId);
      io.to(roomId).emit('presence:update', { users: presence });
    });

    // Handle chat:whisper
    socket.on('chat:whisper', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { roomId, targetHandle, message } = data || {};

      if (!roomId || roomId !== socket.currentRoom) return;
      if (typeof targetHandle !== 'string' || !targetHandle) return;
      if (typeof message !== 'string' || !message.trim()) return;

      // Rate limit whispers alongside normal lounge messages so they can't be
      // used as an unthrottled spam channel.
      const rateCheck = checkRateLimit(user.id);
      if (!rateCheck.allowed) {
        const notice = rateCheck.reason === 'burst'
          ? 'You\'re sending messages too quickly. Please slow down.'
          : 'You\'ve sent too many messages. Please wait a moment.';
        socket.emit('system:notice', { message: notice, type: 'warning' });
        return;
      }

      // Sanitize + length-cap the body, same as public messages.
      const sanitized = sanitizeMessage(message);
      if (!sanitized.text) return;

      // Find target user in presence
      const presence = getRoomPresence(roomId);
      const targetUser = presence.find(u => u.handle && (
        u.handle.toLowerCase() === targetHandle.toLowerCase() ||
        u.handle.toLowerCase().startsWith(targetHandle.toLowerCase() + '@')
      ));

      if (!targetUser) {
        socket.emit('system:notice', {
          message: `User @${targetHandle} not found in this room`,
          type: 'error'
        });
        return;
      }

      // Respect blocks: if the target has blocked the sender, a whisper must
      // not become a way around it. Report the same "not found" message so the
      // block isn't disclosed.
      try {
        const block = await prisma.userBlock.findUnique({
          where: {
            blockerId_blockedUserId: {
              blockerId: targetUser.userId,
              blockedUserId: user.id
            }
          }
        });
        if (block) {
          socket.emit('system:notice', {
            message: `User @${targetHandle} not found in this room`,
            type: 'error'
          });
          return;
        }
      } catch (error) {
        console.error('Error checking whisper block:', error);
        return;
      }

      const whisperData = {
        id: 'whisper-' + Date.now(),
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

      // Send to target
      io.to(targetUser.userId).emit('chat:message', whisperData);

      // Send to sender (so they see it too)
      socket.emit('chat:message', whisperData);
    });

    // Handle dm:send (Persistent Direct Messages)
    socket.on('dm:send', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) {
        socket.emit('system:notice', { message: 'Guests cannot send DMs', type: 'error' });
        return;
      }

      const { targetUserId, body } = data || {};

      if (typeof targetUserId !== 'string' || !targetUserId || !body || typeof body !== 'string' || !body.trim()) return;

      // Can't DM yourself
      if (targetUserId === user.id) {
        socket.emit('system:notice', { message: 'You cannot message yourself', type: 'error' });
        return;
      }

      // Rate limit check (DMs get their own bucket, separate from the lounge)
      const rateCheck = checkRateLimit(user.id, 'dm');
      if (!rateCheck.allowed) {
        socket.emit('system:notice', { message: 'You are sending messages too fast', type: 'warning' });
        return;
      }

      // Sanitize
      const sanitized = sanitizeMessage(body);
      if (!sanitized.text) return;

      try {
        // Check if sender is blocked by recipient
        const block = await prisma.userBlock.findUnique({
          where: {
            blockerId_blockedUserId: {
              blockerId: targetUserId,
              blockedUserId: user.id
            }
          }
        });

        if (block) {
          return socket.emit('system:notice', { message: 'You cannot send messages to this user.', type: 'error' });
        }

        // Find or create conversation
        // 1. Find existing conversation
        const existingConversations = await prisma.conversation.findMany({
          where: {
            AND: [
              { participants: { some: { userId: user.id } } },
              { participants: { some: { userId: targetUserId } } }
            ]
          },
          include: {
            participants: true
          }
        });

        // Filter for exactly 2 participants (1-on-1 DM)
        let conversation = existingConversations.find(c => c.participants.length === 2);

        // 2. Create if not exists
        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              participants: {
                create: [
                  { userId: user.id },
                  { userId: targetUserId }
                ]
              }
            },
            include: { participants: true }
          });
        }

        // 3. Create message
        const message = await prisma.directMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            body: sanitized.text,
            isRead: false
          },
          include: {
            sender: {
              include: { profile: true }
            }
          }
        });

        // 4. Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() }
        });

        // 5. Emit to both users
        const messageData = {
          id: message.id,
          conversationId: conversation.id,
          senderId: message.senderId,
          handle: message.sender.primaryHandle,
          displayName: message.sender.profile?.displayName,
          avatarUrl: message.sender.profile?.avatarThumbnailUrl || message.sender.profile?.avatarUrl,
          body: message.body,
          createdAt: message.createdAt,
          isRead: false
        };

        // Emit to sender
        socket.emit('dm:new_message', messageData);

        // Emit to recipient
        io.to(targetUserId).emit('dm:new_message', messageData);

      } catch (error) {
        console.error('Error sending DM:', error);
        socket.emit('system:notice', { message: 'Failed to send DM', type: 'error' });
      }
    });

    // Handle dm:read
    socket.on('dm:read', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { conversationId } = data || {};

      if (typeof conversationId !== 'string' || !conversationId) return;

      try {
        // Update lastReadAt for participant
        await prisma.conversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId: user.id
            }
          },
          data: {
            lastReadAt: new Date()
          }
        });

        // Also mark messages as read (optional, but good for simple status)
        // We only mark messages sent by the OTHER person as read
        await prisma.directMessage.updateMany({
          where: {
            conversationId,
            senderId: { not: user.id },
            isRead: false
          },
          data: { isRead: true }
        });

        // Notify the other participant that we read it
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { participants: true }
        });

        if (conversation) {
          const otherParticipant = conversation.participants.find(p => p.userId !== user.id);
          if (otherParticipant) {
            io.to(otherParticipant.userId).emit('dm:read_receipt', {
              conversationId,
              readByUserId: user.id,
              readAt: new Date()
            });
          }
        }

      } catch (error) {
        console.error('Error marking DM as read:', error);
      }
    });

    // Handle dm:typing
    socket.on('dm:typing', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { targetUserId } = data || {};

      if (typeof targetUserId !== 'string' || !targetUserId) return;

      io.to(targetUserId).emit('dm:typing', {
        userId: user.id,
        handle: user.primaryHandle
      });
    });

    socket.on('dm:stop_typing', async (data) => {
      const user = await socket.sessionReady;
      if (user.isGuest) return;
      const { targetUserId } = data || {};

      if (typeof targetUserId !== 'string' || !targetUserId) return;

      io.to(targetUserId).emit('dm:stop_typing', {
        userId: user.id
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      // Await readiness so a disconnect that races session validation still
      // resolves the real user (and cleans up presence correctly).
      const user = await socket.sessionReady;

      if (socket.currentRoom && !user.isGuest) {
        // Check if user has other sockets in the room
        const sockets = await io.in(socket.currentRoom).fetchSockets();
        const userStillConnected = sockets.some(s => s.userData && s.userData.id === user.id);

        if (!userStillConnected) {
          removeFromPresence(socket.currentRoom, user.id);

          // Broadcast presence update
          const presence = getRoomPresence(socket.currentRoom);
          io.to(socket.currentRoom).emit('presence:update', { users: presence });
        }
      }

      log('User disconnected:', user.primaryHandle || user.id);
    });
  });

  // A rejected promise inside a socket handler must not take down the process
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    io.close();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, hostname, () => {
    const protocol = mobileTestingMode ? 'https' : 'http';
    console.log(`> Ready on ${protocol}://${hostname}:${port}`);
    if (mobileTestingMode) {
      console.log(`> Mobile testing mode enabled`);
      console.log(`> Access from mobile: ${process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://[YOUR-IP]:${port}`}`);
    }
    console.log(`> Socket.io server running`);
  });
});
