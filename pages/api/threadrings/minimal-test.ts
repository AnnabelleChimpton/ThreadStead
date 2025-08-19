import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Minimal test API called");
  return res.status(200).json({ message: "Hello from minimal test" });
}