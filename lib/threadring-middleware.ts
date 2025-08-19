import type { NextApiRequest, NextApiResponse } from "next";
import { featureFlags } from "@/lib/feature-flags";

export function withThreadRingFeatureFlag(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!featureFlags.threadrings()) {
      return res.status(404).json({ error: "Feature not available" });
    }
    
    return handler(req, res);
  };
}