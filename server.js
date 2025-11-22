const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { readFileSync } = require('fs');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const {
  getRoomPresence,
  addToPresence,
  removeFromPresence,
  updateLastActive
} = require('./lib/chat/presence');

const dev = process.env.NODE_ENV !== 'production';
const mobileTestingMode = process.env.MOBILE_TESTING === 'true';
// In production, always listen on 0.0.0.0 for external access
// In dev, use 0.0.0.0 only when mobile testing is enabled
const hostname = dev ? (mobileTestingMode ? '0.0.0.0' : 'localhost') : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

// Rate limiting storage
const rateLimits = new Map(); // userId -> { burst: [], sustained: [] }

// Rate limit config
const RATE_LIMIT = {
  BURST_MAX: 5,
  BURST_WINDOW: 10000, // 10 seconds
  SUSTAINED_MAX: 30,
  SUSTAINED_WINDOW: 300000, // 5 minutes
};

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

// Check rate limit
function checkRateLimit(userId) {
  const now = Date.now();

  if (!rateLimits.has(userId)) {
    rateLimits.set(userId, { burst: [], sustained: [] });
  }

  const limits = rateLimits.get(userId);

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
  if (typeof body !== 'string') return '';

  // Trim and limit length
  body = body.trim();
  if (body.length > 280) {
    body = body.substring(0, 280);
  }

  // Basic XSS prevention - strip HTML tags
  body = body.replace(/<[^>]*>/g, '');

  return body;
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

  // Socket.io connection handler
  io.on('connection', async (socket) => {
    console.log('Socket connection attempt:', socket.id);

    // Validate session
    const cookie = socket.handshake.headers.cookie;
    const user = await validateSession(cookie);

    if (!user) {
      console.log('Unauthorized socket connection');
      socket.emit('system:notice', {
        message: 'Authentication required',
        type: 'error'
      });
      socket.disconnect();
      return;
    }

    console.log('Authenticated user connected:', user.primaryHandle || user.id);

    // Store user data on socket
    socket.userData = user;
    socket.currentRoom = null;

    // Handle chat:join
    socket.on('chat:join', async (data) => {
      const { roomId } = data;

      if (!roomId) {
        socket.emit('system:notice', {
          message: 'Room ID required',
          type: 'error'
        });
        return;
      }

      // Leave previous room if any
      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
        removeFromPresence(socket.currentRoom, user.id);
      }

      // Join new room
      socket.join(roomId);
      socket.currentRoom = roomId;

      // Add to presence
      addToPresence(roomId, user);

      // Broadcast presence update to room
      const presence = getRoomPresence(roomId);
      console.log(`Broadcasting presence update to room ${roomId}:`, presence);
      io.to(roomId).emit('presence:update', { users: presence });

      console.log(`User ${user.primaryHandle} joined room ${roomId}`);
    });

    // Handle chat:message
    socket.on('chat:message', async (data) => {
      const { roomId, body } = data;

      if (!roomId || !socket.currentRoom || socket.currentRoom !== roomId) {
        socket.emit('system:notice', {
          message: 'You must join a room first',
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

      // Sanitize and validate message
      const sanitizedBody = sanitizeMessage(body);
      if (!sanitizedBody) {
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
            body: sanitizedBody,
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
          createdAt: message.createdAt,
        };

        io.to(roomId).emit('chat:message', messageData);

        console.log(`Message from ${user.primaryHandle} in ${roomId}: ${sanitizedBody.substring(0, 50)}`);
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('system:notice', {
          message: 'Failed to send message',
          type: 'error'
        });
      }
    });

    // Handle chat:leave
    socket.on('chat:leave', () => {
      if (socket.currentRoom) {
        removeFromPresence(socket.currentRoom, user.id);

        // Broadcast presence update
        const presence = getRoomPresence(socket.currentRoom);
        io.to(socket.currentRoom).emit('presence:update', { users: presence });

        socket.leave(socket.currentRoom);
        socket.currentRoom = null;
      }
    });

    // Handle typing indicators
    socket.on('chat:typing', (data) => {
      const { roomId } = data;
      if (roomId && socket.currentRoom === roomId) {
        socket.to(roomId).emit('chat:typing', {
          userId: user.id,
          handle: user.primaryHandle,
          displayName: user.profile?.displayName
        });
      }
    });

    socket.on('chat:stop_typing', (data) => {
      const { roomId } = data;
      if (roomId && socket.currentRoom === roomId) {
        socket.to(roomId).emit('chat:stop_typing', {
          userId: user.id
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.currentRoom) {
        removeFromPresence(socket.currentRoom, user.id);

        // Broadcast presence update
        const presence = getRoomPresence(socket.currentRoom);
        io.to(socket.currentRoom).emit('presence:update', { users: presence });
      }

      console.log('User disconnected:', user.primaryHandle || user.id);
    });
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    const protocol = mobileTestingMode ? 'https' : 'http';
    console.log(`> Ready on ${protocol}://${hostname}:${port}`);
    if (mobileTestingMode) {
      console.log(`> Mobile testing mode enabled`);
      console.log(`> Access from mobile: ${process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://[YOUR-IP]:${port}`}`);
    }
    console.log(`> Socket.io server running`);
  });
});
