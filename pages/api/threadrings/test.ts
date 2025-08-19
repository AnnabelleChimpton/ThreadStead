import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Test API called with method:", req.method);
  
  if (req.method !== "POST") {
    console.log("Wrong method, returning 405");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("Getting session user...");
    const viewer = await getSessionUser(req);
    console.log("Session user:", viewer ? "Found" : "Not found");
    
    if (!viewer) {
      console.log("No user, returning 401");
      return res.status(401).json({ error: "not logged in" });
    }

    console.log("User found, returning success");
    return res.status(200).json({ 
      success: true, 
      user: viewer.id,
      body: req.body 
    });
  } catch (error) {
    console.error("Test API error:", error);
    return res.status(500).json({ error: "Internal server error", details: error });
  }
}