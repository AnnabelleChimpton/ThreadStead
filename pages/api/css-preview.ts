// API endpoint for previewing CSS (without saving to database)
import type { NextApiRequest, NextApiResponse } from "next";
import { cleanCss } from "@/lib/utils/sanitization/css";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { css } = req.body;

  if (typeof css !== "string") {
    return res.status(400).json({ error: "Invalid CSS provided" });
  }

  try {
    // Sanitize the CSS
    const cleanedCSS = cleanCss(css);
    
    // Return the cleaned CSS and validation info
    res.json({ 
      cleanedCSS,
      isValid: cleanedCSS.length > 0,
      originalLength: css.length,
      cleanedLength: cleanedCSS.length,
      wasSanitized: cleanedCSS !== css
    });
  } catch {
    res.status(500).json({ error: "Failed to process CSS" });
  }
}