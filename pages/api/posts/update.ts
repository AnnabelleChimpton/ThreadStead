import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Visibility } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { requireAction } from "@/lib/capabilities";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/sanitize";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const { id, bodyText, bodyHtml, bodyMarkdown, visibility, cap } = (req.body || {}) as {
  id?: string;
  bodyText?: string;
  bodyHtml?: string;
  bodyMarkdown?: string;
  visibility?: Visibility;
  cap?: string;
};

const data: any = {};
if (typeof bodyText === "string") data.bodyText = bodyText;
if (typeof bodyMarkdown === "string") data.bodyHtml = markdownToSafeHtml(bodyMarkdown);
else if (typeof bodyHtml === "string") data.bodyHtml = cleanAndNormalizeHtml(bodyHtml);
if (visibility && ["public","followers","friends","private"].includes(visibility)) data.visibility = visibility as Visibility;

const updated = await db.post.update({ where: { id }, data });
  res.json({ post: updated });
}
