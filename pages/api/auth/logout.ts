import { apiHandler } from "@/lib/api/handler";
import { clearSession } from "@/lib/auth/server";

export default apiHandler(
  // no CSRF today: UserDropdown/UserAccountBottomSheet GET it and did-client POSTs it with plain fetch
  { methods: ["GET", "POST"], auth: "none", csrf: false },
  async (_req, res) => {
    // expire the session cookie
    clearSession(res);
    res.json({ ok: true });
  }
);
