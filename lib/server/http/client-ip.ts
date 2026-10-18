import type { IncomingMessage } from "http";
import { isIP } from "net";
import { getServerEnv } from "@/lib/config/env";

type RequestLike = Pick<IncomingMessage, "headers" | "socket">;

/**
 * The caller's IP address, or null when nothing usable is known.
 *
 * Each proxy in front of us appends the address it received the connection
 * from to `X-Forwarded-For`, so the right end of the list is written by
 * proxies we trust and everything to the left is whatever the client sent.
 * With `trustedHops` proxies (TRUSTED_PROXY_HOPS), the client is the entry
 * `trustedHops` from the right. Reading the first entry instead let any
 * client pick its own rate-limit bucket.
 *
 * Production is 1 hop: nginx swaps in the visitor from CF-Connecting-IP
 * (only when the connection comes from a Cloudflare range) and appends that
 * address, so the rightmost entry is the visitor whether or not the request
 * came through Cloudflare.
 *
 * Without a usable X-Forwarded-For we fall back to `X-Real-IP` (also set by
 * the proxy), then the socket address. With `trustedHops` 0 both headers are
 * ignored. A request that skipped a proxy (a shorter chain than expected)
 * gets the leftmost entry, which that caller can choose — so this is for
 * rate limiting and audit trails, never for authorization.
 */
export function getClientIp(
  req: RequestLike,
  trustedHops: number = getServerEnv().TRUSTED_PROXY_HOPS
): string | null {
  if (trustedHops > 0) {
    const chain = headerValues(req.headers["x-forwarded-for"])
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
    const forwarded = chain.length ? normalizeIp(chain[Math.max(0, chain.length - trustedHops)]) : null;
    if (forwarded) return forwarded;

    const realIp = normalizeIp(headerValues(req.headers["x-real-ip"])[0]);
    if (realIp) return realIp;
  }
  return normalizeIp(req.socket?.remoteAddress);
}

function headerValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * A bare, comparable IP: drops a port (`1.2.3.4:80`, `[::1]:80`), the
 * IPv4-mapped prefix sockets report (`::ffff:1.2.3.4`) and IPv6 case, so the
 * same caller always lands in the same bucket. null if it isn't an IP.
 */
export function normalizeIp(raw: string | undefined): string | null {
  let ip = raw?.trim();
  if (!ip) return null;

  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed) ip = bracketed[1];
  else if (/^[\d.]+:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(":"));

  ip = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped) ip = mapped[1];

  return isIP(ip) ? ip : null;
}
