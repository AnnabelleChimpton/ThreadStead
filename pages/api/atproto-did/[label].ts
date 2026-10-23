import type { NextApiRequest, NextApiResponse } from "next";
import { servedDidFor } from "@/lib/domain/bluesky/served-dids";
import { isValidLabel, requestedLabel } from "@/lib/subdomains/host";

/**
 * https://<label>.homepageagain.com/.well-known/atproto-did, rewritten here
 * by middleware.ts: the resident's Bluesky DID as plain text, or 404.
 * From memory (lib/domain/bluesky/served-dids.ts), no rate limit: Bluesky's
 * resolvers come from a few shared IPs and give up after 3 seconds.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }
  const label = requestedLabel(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  // Browser-based atproto clients resolve handles with fetch
  res.setHeader("Access-Control-Allow-Origin", "*");

  let did: string | null;
  try {
    did = isValidLabel(label) ? await servedDidFor(label) : null;
  } catch (error) {
    console.error("atproto-did: couldn't load handles", error);
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).send("Try again in a minute");
  }

  if (!did) {
    // Not cached: someone partway through linking needs the next look to see it
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).send("Not found");
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).send(did);
}
