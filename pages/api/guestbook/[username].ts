import { NextApiRequest, NextApiResponse } from "next";

type GuestbookData = {
  [username: string]: string[];
};

// In-memory store (resets on server restart)
const guestbookStore: GuestbookData = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username } = req.query as { username: string };

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  if (req.method === "GET") {
    const entries = guestbookStore[username] || [];
    return res.status(200).json({ entries });
  }

  if (req.method === "POST") {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message required" });
    }

    if (!guestbookStore[username]) {
      guestbookStore[username] = [];
    }
    guestbookStore[username].unshift(message); // newest first

    return res.status(201).json({ success: true });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
