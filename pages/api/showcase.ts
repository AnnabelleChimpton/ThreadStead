import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { listShowcase, parseOffset } from "@/lib/domain/profile/showcase";

// GET ?offset=N -> the next page of /build/showcase (the first is server-rendered)
export default apiHandler(
  { methods: ["GET"], auth: "optional", rateLimit: "reads" },
  async (req, res, { user }) => {
    const list = await listShowcase(db, user?.id, { offset: parseOffset(req.query.offset) });
    return res.status(200).json(list);
  }
);
