import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";

export default apiHandler(
  { methods: ["DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user: adminUser }) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (userId === adminUser.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    try {
      const userToDelete = await db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      if (userToDelete.role === "admin") {
        return res.status(400).json({ error: "Cannot delete another admin account" });
      }

      await db.user.delete({
        where: { id: userId },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);