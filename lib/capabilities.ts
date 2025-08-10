import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.CAP_JWT_SECRET || "devsecret");
const aud = process.env.CAP_AUDIENCE || "retro.local";

export type CapPayload = { act: string[]; res: string };

export async function mintCapability(subUserId: string, act: string[], res: string, ttlSec = 900) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ act, res } as CapPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("retro.server")
    .setAudience(aud)
    .setSubject(subUserId) // who the token speaks for
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSec)
    .sign(secret);
}

export async function verifyCapability(token: string) {
  const { payload } = await jwtVerify(token, secret, { audience: aud });
  return {
    sub: String(payload.sub || ""),
    act: (payload as any).act as string[],
    res: (payload as any).res as string,
    exp: (payload as any).exp as number,
  };
}

export function requireAction(action: string, resourceOk: (res: string) => boolean) {
  return async (token: string) => {
    const cap = await verifyCapability(token);
    if (!cap.sub) throw new Error("cap: no subject");
    if (!Array.isArray(cap.act) || !cap.act.includes(action)) throw new Error("cap: missing action");
    if (!resourceOk(cap.res)) throw new Error("cap: bad resource");
    return cap; // includes cap.sub (userId)
  };
}
