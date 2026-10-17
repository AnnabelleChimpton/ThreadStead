import { apiHandler } from "@/lib/api/handler";
import { getCookieSecureFlag } from "@/lib/middleware/csrf";

export default apiHandler(
  // no CSRF today: UserDropdown/UserAccountBottomSheet GET it and did-client POSTs it with plain fetch
  { methods: ["GET", "POST"], auth: "none", csrf: false },
  async (_req, res) => {
    // expire the session cookie
    res.setHeader("Set-Cookie", `retro_session=; HttpOnly; ${getCookieSecureFlag()}Path=/; Max-Age=0; SameSite=Strict`);
    res.json({ ok: true });
  }
);
