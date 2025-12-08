import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";
import { withCsrfProtection } from "@/lib/api/middleware/withCsrfProtection";
import { withRateLimit } from "@/lib/api/middleware/withRateLimit";
import { BETA_ITEMS } from "@/lib/pixel-homes/decoration-data";

// Basic SVG templates for each type
const getSVGTemplate = (type: string, itemId: string) => {
  const baseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">`;

  switch (type) {
    case 'plant':
      return `${baseIcon}<circle cx="12" cy="16" r="3" fill="#22C55E"/><rect x="11" y="12" width="2" height="8" fill="#15803D"/><circle cx="12" cy="8" r="2" fill="#EF4444" opacity="0.8"/></svg>`;
    case 'furniture':
      return `${baseIcon}<rect x="6" y="14" width="12" height="6" rx="1" fill="#8B4513"/><rect x="8" y="10" width="8" height="4" fill="#D2691E"/></svg>`;
    case 'lighting':
      return `${baseIcon}<circle cx="12" cy="8" r="4" fill="#FCD34D"/><rect x="11" y="12" width="2" height="8" fill="#6B7280"/><path d="M8 8l8 0M8 10l8 0" stroke="#F59E0B" stroke-width="0.5"/></svg>`;
    case 'water':
      return `${baseIcon}<ellipse cx="12" cy="16" rx="8" ry="4" fill="#3B82F6" opacity="0.6"/><circle cx="8" cy="14" r="1" fill="#60A5FA" opacity="0.8"/><circle cx="16" cy="18" r="1" fill="#60A5FA" opacity="0.8"/></svg>`;
    case 'structure':
      return `${baseIcon}<rect x="6" y="10" width="12" height="10" fill="#8B5A3C"/><polygon points="6,10 12,4 18,10" fill="#DC2626"/><rect x="10" y="14" width="4" height="6" fill="#92400E"/></svg>`;
    case 'path':
      return `${baseIcon}<rect x="4" y="18" width="16" height="4" rx="2" fill="#6B7280"/><circle cx="8" cy="20" r="1" fill="#9CA3AF"/><circle cx="16" cy="20" r="1" fill="#9CA3AF"/></svg>`;
    case 'feature':
      return `${baseIcon}<circle cx="12" cy="16" r="6" fill="#E5E7EB"/><circle cx="12" cy="12" r="3" fill="#3B82F6"/><rect x="11" y="8" width="2" height="8" fill="#6B7280"/></svg>`;
    case 'sky':
      // Sky/atmosphere icons - different based on itemId
      if (itemId === 'sunny_sky') {
        return `${baseIcon}<circle cx="12" cy="12" r="5" fill="#FCD34D"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5l1.5-1.5" stroke="#F59E0B" stroke-width="1.5" stroke-linecap="round"/></svg>`;
      } else if (itemId === 'sunset_sky') {
        return `${baseIcon}<circle cx="12" cy="16" r="6" fill="#F97316"/><rect x="0" y="16" width="24" height="8" fill="#FCD34D" opacity="0.3"/><circle cx="12" cy="16" r="4" fill="#FBBF24"/></svg>`;
      } else if (itemId === 'cloudy_sky') {
        return `${baseIcon}<ellipse cx="10" cy="12" rx="4" ry="3" fill="#9CA3AF"/><ellipse cx="14" cy="12" rx="5" ry="3.5" fill="#D1D5DB"/><ellipse cx="12" cy="14" rx="3" ry="2" fill="#9CA3AF" opacity="0.8"/></svg>`;
      } else if (itemId === 'night_sky') {
        return `${baseIcon}<circle cx="14" cy="10" r="6" fill="#1E3A8A"/><circle cx="10" cy="10" r="5" fill="#0F172A"/><circle cx="6" cy="6" r="1" fill="#FCD34D"/><circle cx="18" cy="8" r="0.5" fill="#FCD34D"/><circle cx="8" cy="16" r="0.5" fill="#FCD34D"/></svg>`;
      }
      return `${baseIcon}<rect x="0" y="0" width="24" height="12" fill="#87CEEB"/><circle cx="18" cy="6" r="3" fill="#FCD34D"/></svg>`;
    case 'house_custom':
      // House customization icons - different based on section
      if (itemId.includes('door')) {
        return `${baseIcon}<rect x="8" y="10" width="8" height="12" rx="1" fill="#8B4513"/><circle cx="13" cy="16" r="0.8" fill="#D4AF37"/><rect x="9" y="11" width="2" height="3" fill="#6B4423" opacity="0.5"/></svg>`;
      } else if (itemId.includes('window')) {
        return `${baseIcon}<rect x="6" y="8" width="12" height="10" rx="1" fill="#87CEEB" opacity="0.5"/><path d="M6 13h12M12 8v10" stroke="#8B4513" stroke-width="1.5"/><rect x="6" y="8" width="12" height="10" rx="1" stroke="#8B4513" stroke-width="1.5" fill="none"/></svg>`;
      } else if (itemId.includes('trim')) {
        return `${baseIcon}<polygon points="12,4 4,10 20,10" fill="#8B4513"/><rect x="4" y="9" width="16" height="2" fill="#D2691E"/><path d="M4 10l1-1h14l1 1" fill="#A0522D"/></svg>`;
      }
      return `${baseIcon}<rect x="6" y="8" width="12" height="12" rx="1" fill="#D2691E"/><polygon points="6,8 12,4 18,8" fill="#8B4513"/></svg>`;
    default:
      return `${baseIcon}<rect x="8" y="8" width="8" height="8" rx="2" fill="#6B7280"/></svg>`;
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { force = false } = req.body;

    // Check if decorations already exist
    const existingCount = await db.decorationItem.count();
    if (existingCount > 0 && !force) {
      return res.status(400).json({
        error: `Database already contains ${existingCount} decorations. Use force=true to proceed anyway.`,
        existingCount
      });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Categories to skip - these are handled differently (templates use HouseSVG, colors use picker)
    const SKIP_CATEGORIES = ['templates', 'colors'];

    // Migrate all BETA_ITEMS to database
    for (const [category, items] of Object.entries(BETA_ITEMS)) {
      // Skip categories that aren't actual decorations
      if (SKIP_CATEGORIES.includes(category)) {
        continue;
      }

      for (const item of items) {
        try {
          // Check if item already exists
          const existing = await db.decorationItem.findUnique({
            where: { itemId: item.id }
          });

          if (existing) {
            results.skipped++;
            continue;
          }

          // Generate SVG templates
          const iconSvg = getSVGTemplate(item.type, item.id);
          const renderSvg = iconSvg; // Use same SVG for both for now

          // Determine grid size based on type
          let gridWidth = 1;
          let gridHeight = 1;
          if (item.type === 'structure') {
            gridWidth = 3;
            gridHeight = 3;
          } else if (item.type === 'water') {
            gridWidth = 2;
            gridHeight = 2;
          } else if (item.type === 'furniture') {
            gridWidth = 2;
            gridHeight = 1;
          } else if (item.type === 'feature') {
            gridHeight = 2;
          }

          // Create decoration item
          await db.decorationItem.create({
            data: {
              itemId: item.id,
              name: item.name,
              type: item.type,
              category: category,
              zone: item.zone || 'front_yard',
              section: (item as any).section || null, // House items have sections (doors, windows, etc.)
              iconSvg,
              renderSvg,
              gridWidth,
              gridHeight,
              isActive: true,
              releaseType: (item as any).isDefault ? 'DEFAULT' : 'PUBLIC', // Use DEFAULT for default items
              createdBy: user.id
            }
          });

          results.created++;
        } catch (error) {
          console.error(`Error creating decoration ${item.id}:`, error);
          results.errors.push(`Failed to create ${item.id}: ${error}`);
        }
      }
    }

    return res.status(200).json({
      message: `Migration completed. Created ${results.created} decorations, skipped ${results.skipped}.`,
      results
    });
  } catch (error) {
    console.error('Decoration migration error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Apply CSRF protection and rate limiting
export default withRateLimit('admin')(withCsrfProtection(handler));