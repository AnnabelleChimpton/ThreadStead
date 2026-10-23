import { apiHandler, ApiError } from "@/lib/api/handler";
import { requireRingAs } from "@/lib/domain/threadrings/ring-access";

/**
 * The ring's badge as Ring Hub has it, for the badge manager: the image its
 * members are given. The ring is read signed as the viewer, so a private
 * ring's people see it too. Saving goes through update-badge.
 */
export default apiHandler({ methods: ["GET"], auth: "user" }, async (req, res, { user }) => {
  const slug = req.query.slug;
  if (typeof slug !== "string") throw new ApiError(400, "Invalid slug");
  const { ring } = await requireRingAs(user, slug);
  res.json({
    badge: {
      title: ring.name,
      imageUrl: ring.badgeImageUrl ?? null,
      imageHighResUrl: ring.badgeImageHighResUrl ?? null,
    },
  });
});
