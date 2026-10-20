import { apiHandler } from "@/lib/api/handler";
import { shareRecentPageUpdate } from "@/lib/domain/profile/page-updates";

// "Share this update in the feed" for the HTML editor. Its save request is
// built by pages/resident/[username]/template-editor.tsx, so the share comes
// as a second request right after the save works. It only shares when the
// signed-in person's page changed in the last few minutes; the CSS editor
// sends shareToFeed with its save instead.
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "template_editing" },
  async (_req, res, { user }) => {
    const result = await shareRecentPageUpdate(user.id);
    if (result === "failed") return res.status(500).json({ error: "Couldn't share that. Try again." });
    return res.status(200).json({ shared: result === "shared" });
  }
);
