import type { NextApiRequest, NextApiResponse } from "next";

export function withThreadRingFeatureFlag(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // ThreadRings are now always enabled
    return handler(req, res);
  };
}