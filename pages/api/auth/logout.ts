import { apiHandler } from "@/lib/api/handler";
import { clearSession } from "@/lib/auth/server";

export default apiHandler(
  // CSRF off so signing out always works, even with a lost CSRF cookie;
  // POST-only plus the same-origin check stop a resident page signing visitors out
  { methods: ["POST"], auth: "none", csrf: false },
  async (req, res) => {
    // delete the Session row and expire the cookie
    await clearSession(req, res);
    res.json({ ok: true });
  }
);
