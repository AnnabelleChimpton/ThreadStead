import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (req, res) => {
    const nonce = crypto.randomUUID();
    const expiresAt = Date.now() + 60_000; // 60s
    res.setHeader(
      "Set-Cookie",
      `retro_nonce=${nonce}.${expiresAt}; HttpOnly; Secure; Path=/; Max-Age=60; SameSite=Strict`
    );
    res.json({ nonce, expiresAt });
  }
);
