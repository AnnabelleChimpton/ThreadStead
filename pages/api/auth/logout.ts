import { apiHandler } from "@/lib/api/handler";
import { clearSession } from "@/lib/auth/server";

export default apiHandler(
  // no CSRF today: UserDropdown/UserAccountBottomSheet GET it and did-client POSTs it with plain fetch
  { methods: ["GET", "POST"], auth: "none", csrf: false },
  async (req, res) => {
    // delete the Session row and expire the cookie
    await clearSession(req, res);
    res.json({ ok: true });
  }
);
