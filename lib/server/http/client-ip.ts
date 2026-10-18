import type { IncomingMessage } from "http";

type RequestLike = Pick<IncomingMessage, "headers" | "socket">;

/**
 * The caller's IP address: the first `X-Forwarded-For` hop (set by the reverse
 * proxy in production), else the socket's address. null when neither is known.
 *
 * The first XFF hop is only as trustworthy as the proxy in front of us: if it
 * appends rather than overwrites, a client can choose this value. Use it for
 * rate limiting and audit trails, never for authorization.
 */
export function getClientIp(req: RequestLike): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = first?.split(",")[0].trim() || req.socket?.remoteAddress?.trim();
  return ip || null;
}
