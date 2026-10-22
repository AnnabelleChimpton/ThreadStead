/**
 * The ThreadStead process: Next.js plus the socket.io chat server on one port.
 *
 * Started through server.js (`npm run dev`, `npm start`, pm2), which registers
 * tsx so this file and the lib/ modules it imports run as TypeScript.
 */
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync } from "fs";
import dns from "dns";
import next from "next";
import { Server } from "socket.io";

// Prefer IPv4. Hosts with an IPv6 address configured but no working route
// make fetch() to dual-stack targets (e.g. RingHub behind Cloudflare) hang
// ~17s and fail intermittently, since Node may try AAAA records first.
dns.setDefaultResultOrder("ipv4first");

// Read before Next loads .env, as server.js always did: these come from the
// process environment (npm script, pm2), not from .env.
const dev = process.env.NODE_ENV !== "production";
const mobileTestingMode = process.env.MOBILE_TESTING === "true";
// In production, always listen on 0.0.0.0 for external access
// In dev, use 0.0.0.0 only when mobile testing is enabled.
// 127.0.0.1 rather than 'localhost' so SSR self-fetches (getInternalBaseUrl)
// always reach the bound address regardless of how localhost resolves.
const hostname = dev ? (mobileTestingMode ? "0.0.0.0" : "127.0.0.1") : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Dev-only logging; production only logs errors and lifecycle events
const log = (...args: unknown[]) => {
  if (dev) console.log(...args);
};

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  // Loaded only now: app.prepare() loads .env, and the shared Prisma client
  // builds its connection URL from DATABASE_URL when first imported. Next's
  // API routes reuse that same client (one pool for the whole process).
  // require, not import(): tsx hooks require; import() would bypass it.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { db } = require("./lib/config/database/connection") as typeof import("./lib/config/database/connection");
  const { attachChatServer, allowChatHandshake } = require("./lib/chat/socket-server") as typeof import("./lib/chat/socket-server");
  /* eslint-enable @typescript-eslint/no-require-imports */

  // Next parses the URL itself (url.parse is deprecated, DEP0169)
  const requestListener = (req: IncomingMessage, res: ServerResponse) => {
    handle(req, res);
  };

  // HTTPS only for mobile testing in dev; in production a reverse proxy
  // terminates TLS.
  const server =
    dev && mobileTestingMode
      ? createHttpsServer(
          {
            key: readFileSync("./localhost+1-key.pem"),
            cert: readFileSync("./localhost+1.pem"),
          },
          requestListener
        )
      : createHttpServer(requestListener);

  // Configure CORS for mobile testing or localhost
  const corsOrigin = mobileTestingMode
    ? process.env.NEXT_PUBLIC_BASE_URL || "https://0.0.0.0:3000"
    : "http://localhost:3000";

  const io = new Server(server, {
    cors: {
      origin: dev ? corsOrigin : false,
      credentials: true,
    },
    // production: only handshakes from the site itself
    allowRequest: allowChatHandshake,
  });

  const chat = attachChatServer(io, { log });

  // A rejected promise inside a socket handler must not take down the process
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    chat.close();
    io.close();
    server.close();
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  server.on("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });

  server.listen(port, hostname, () => {
    const protocol = mobileTestingMode ? "https" : "http";
    console.log(`> Ready on ${protocol}://${hostname}:${port}`);
    if (mobileTestingMode) {
      console.log(`> Mobile testing mode enabled`);
      console.log(`> Access from mobile: ${process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://[YOUR-IP]:${port}`}`);
    }
    console.log(`> Socket.io server running`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
