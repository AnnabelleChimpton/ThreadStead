import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import { SITE_TITLE } from "@/lib/config/site/constants";
import { isLabelTombstoned } from "@/lib/domain/users/handle-tombstones";
import { isValidLabel } from "@/lib/subdomains/host";

/**
 * Any page on a resident's address (alice.homepageagain.com/anything),
 * rewritten here by middleware.ts. Until their page lives there (Phase 2 of
 * design/home-subdomains/SCOPE.md), it sends visitors to their profile on
 * the main site. The label isn't always the username: a_b's is a-b.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }
  const base = getSiteBaseUrl().replace(/\/+$/, "");
  const label = typeof req.query.label === "string" ? req.query.label : "";

  const user = isValidLabel(label)
    ? await db.user.findUnique({ where: { subdomainLabel: label }, select: { primaryHandle: true } })
    : null;
  const username = user?.primaryHandle?.split("@")[0];
  res.setHeader("Cache-Control", "public, max-age=60");

  if (username) {
    return res.redirect(302, `${base}/resident/${encodeURIComponent(username)}`);
  }
  if (isValidLabel(label) && (await isLabelTombstoned(db, label))) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(410).send(closedPage(base));
  }
  return res.redirect(302, `${base}/`);
}

function closedPage(base: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>This page has closed</title></head>
<body style="font-family: Georgia, serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; color: #2e3a2f; background: #fbf7ee;">
<h1 style="font-size: 1.5rem;">This page has closed</h1>
<p>Whoever lived here has moved out, and the address is resting.</p>
<p><a href="${base}/">Go to ${SITE_TITLE}</a></p>
</body>
</html>`;
}
