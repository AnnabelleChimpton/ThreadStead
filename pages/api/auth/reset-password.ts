import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { verifyPasswordResetToken } from "@/lib/email-login";
import { hashPassword, encryptSeedPhraseWithPassword } from "@/lib/auth/password";
import * as bip39 from "bip39";
import * as ed from "@noble/ed25519";
import { toBase64Url } from "@/lib/utils/encoding/base64url";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    try {
        // 1. Verify token
        const { userId } = await verifyPasswordResetToken(token);

        // 2. Hash new password
        const passwordHash = await hashPassword(newPassword);

        // 3. Generate NEW Seed Phrase and Identity (Recovery)
        // Since we cannot decrypt the old seed, we must issue a new one to allow login.
        // This effectively ROTATES the user's DID-based identity.
        const mnemonic = bip39.generateMnemonic();
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const secret = seed.slice(0, 32);
        const publicKey = await ed.getPublicKeyAsync(secret);
        const did = `did:key:ed25519:${toBase64Url(publicKey)}`;

        // 4. Encrypt the new seed with the new password
        const encryptedSeedPhrase = encryptSeedPhraseWithPassword(mnemonic, newPassword);

        // 5. Fetch current user to preserve originalDid if needed
        const currentUser = await db.user.findUnique({ where: { id: userId } });
        if (!currentUser) throw new Error("User not found");

        const originalDid = currentUser.originalDid || currentUser.did;

        // 6. Update User with NEW Identity and Password
        await db.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                encryptedSeedPhrase, // Restore backup (new seed)
                authMethod: 'PASSWORD',
                did, // Rotate DID
                originalDid // Maintain lineage
            }
        });

        // 7. Invalidate all existing sessions
        await db.session.deleteMany({
            where: { userId }
        });

        res.json({ success: true, message: "Password reset successfully. You can now log in." });

    } catch (error) {
        console.error("Password reset error:", error);
        const msg = error instanceof Error ? error.message : "Failed to reset password";
        if (msg.includes("Invalid") || msg.includes("expired")) {
            return res.status(400).json({ error: msg });
        }
        return res.status(500).json({ error: "Failed to reset password" });
    }
}
