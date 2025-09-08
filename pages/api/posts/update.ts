import type { NextApiRequest, NextApiResponse } from "next";
import { Visibility } from "@prisma/client";
import { db } from "@/lib/db";

import { getSessionUser } from "@/lib/auth/server";
import { cleanAndNormalizeHtml, markdownToSafeHtml } from "@/lib/utils/sanitization/html";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const me = await getSessionUser(req);
  if (!me) return res.status(401).json({ error: "not logged in" });

  const { id, title, bodyText, bodyHtml, bodyMarkdown, visibility } = (req.body || {}) as {
  id?: string;
  title?: string;
  bodyText?: string;
  bodyHtml?: string;
  bodyMarkdown?: string;
  visibility?: Visibility;
};

const data: {
  title?: string;
  bodyText?: string;
  bodyHtml?: string;
  visibility?: Visibility;
} = {};
if (typeof title === "string") data.title = title;
if (typeof bodyText === "string") data.bodyText = bodyText;
if (typeof bodyMarkdown === "string") data.bodyHtml = markdownToSafeHtml(bodyMarkdown);
else if (typeof bodyHtml === "string") data.bodyHtml = cleanAndNormalizeHtml(bodyHtml);
if (visibility && ["public","followers","friends","private"].includes(visibility)) data.visibility = visibility as Visibility;

const updated = await db.post.update({ where: { id }, data });
  res.json({ post: updated });
}
