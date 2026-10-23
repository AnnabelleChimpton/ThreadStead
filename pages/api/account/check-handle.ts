// pages/api/account/check-handle.ts
import { apiHandler } from "@/lib/api/handler";
import { validateUsername } from "@/lib/domain/validation";
import { HANDLE_UNAVAILABLE_MESSAGES, handleUnavailableReason } from "@/lib/domain/users/handle-availability";

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (req, res) => {
    const { handle } = req.query;
  
    if (typeof handle !== "string") {
      return res.status(400).json({ error: "handle must be a string", available: false });
    }

    const validation = validateUsername(handle);
    if (!validation.ok) {
      return res.status(400).json({ 
        error: validation.message, 
        code: validation.code,
        available: false 
      });
    }

    try {
      const unavailable = await handleUnavailableReason(handle);

      return res.status(200).json({
        available: !unavailable,
        handle,
        message: unavailable ? HANDLE_UNAVAILABLE_MESSAGES[unavailable] : "Username is available"
      });
    } catch (error) {
      console.error("Error checking handle availability:", error);
      return res.status(500).json({ error: "Internal server error", available: false });
    }
  }
);