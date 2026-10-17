// pages/api/account/claim-handle.ts
import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { validateUsername } from "@/lib/domain/validation";
import { SITE_NAME } from "@/lib/config/site/constants";


const HOST = SITE_NAME;

export default apiHandler(
  // no CSRF today: onboarding page and did-client signup flows call it with plain fetch
  { methods: ["POST"], auth: "user", csrf: false },
  async (req, res, { user }) => {
    const { handle } = req.body || {};
    if (typeof handle !== "string") {
      return res.status(400).json({ error: "handle must be a string" });
    }

    const validation = validateUsername(handle);
    if (!validation.ok) {
      return res.status(400).json({ 
        error: validation.message, 
        code: validation.code 
      });
    }

    // Ensure it's free on this host
    const existing = await db.handle.findFirst({ where: { handle, host: HOST } });
    if (existing) return res.status(409).json({ error: "handle taken" });

    // Set primaryHandle and create Handle + starter Profile in a transaction
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { primaryHandle: `${handle}@${HOST}` },
      });

      await tx.handle.create({
        data: {
          userId: user.id,
          handle,
          host: HOST,
          verifiedAt: new Date(),
        },
      });

      // Create profile if missing
      const hasProfile = await tx.profile.findUnique({ where: { userId: user.id } });
      if (!hasProfile) {
        await tx.profile.create({
          data: {
            userId: user.id,
            displayName: handle,
            bio: `Hi, I'm ${handle}! Welcome to my retro page.`,
            avatarUrl: "/assets/default-avatar.gif",
            visibility: "public",
          },
        });
      }

      // Optional: install hello plugin by default
      const hasHello = await tx.pluginInstall.findFirst({
        where: { ownerId: user.id, pluginId: "com.example.hello" },
      });
      if (!hasHello) {
        await tx.pluginInstall.create({
          data: { ownerId: user.id, pluginId: "com.example.hello", mode: "trusted", enabled: true },
        });
      }
    
    });

    return res.status(201).json({ ok: true });
  }
);
