import { apiHandler } from "@/lib/api/handler";
import { isBetaKeysEnabled } from "../../../lib/config/beta-keys";

export default apiHandler(
  { methods: ["GET"], auth: "none" },
  async (req, res) => {
    const betaEnabled = isBetaKeysEnabled();

    res.json({ enabled: betaEnabled });
  }
);
