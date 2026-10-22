import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { verifyPassword } from "@/lib/auth/password";
import { sessionSecret } from "@/lib/auth/server";
import { rateLimitCheck } from "@/lib/server/http/rate-limit";

/** One message for a missing or wrong current password, so neither says more. */
export const WRONG_CURRENT_PASSWORD = "Current password is incorrect";

/**
 * Gate for routes that replace an existing password or the seed phrase it
 * encrypts. A session alone isn't enough: a borrowed laptop or a copied
 * cookie could otherwise lock the owner out.
 *
 * Counts every check against the user's `password_checks` limit before
 * verifying, so guesses can't be brute-forced through a stolen session.
 * Sends the 429, or a 400 as change-password always has, and returns false
 * when the caller should stop.
 */
export async function checkCurrentPassword(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; passwordHash: string | null },
  currentPassword: unknown
): Promise<boolean> {
  if (!(await rateLimitCheck(req, res, "password_checks", user.id))) return false;

  const ok =
    typeof currentPassword === "string" &&
    currentPassword.length > 0 &&
    !!user.passwordHash &&
    (await verifyPassword(currentPassword, user.passwordHash));

  if (!ok) {
    res.status(400).json({ error: WRONG_CURRENT_PASSWORD });
    return false;
  }
  return true;
}

/** How recent a sign-in has to be to set a first password with no other proof. */
export const RECENT_SIGN_IN_MS = 15 * 60 * 1000;

/** Whether this request's session was issued within RECENT_SIGN_IN_MS. */
export async function signedInRecently(req: Pick<NextApiRequest, "headers">): Promise<boolean> {
  const secret = sessionSecret(req);
  if (!secret) return false;
  const session = await db.session.findUnique({ where: { secret }, select: { issuedAt: true } });
  return !!session && Date.now() - session.issuedAt.getTime() < RECENT_SIGN_IN_MS;
}
