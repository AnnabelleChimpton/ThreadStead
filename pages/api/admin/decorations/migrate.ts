import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/config/database/connection";

// Import the existing BETA_ITEMS for migration
const BETA_ITEMS = {
  plants: [
    { id: 'roses_red', name: 'Red Roses', type: 'plant', zone: 'front_yard' },
    { id: 'roses_pink', name: 'Pink Roses', type: 'plant', zone: 'front_yard' },
    { id: 'roses_white', name: 'White Roses', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_white', name: 'White Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_yellow', name: 'Yellow Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'small_tree', name: 'Small Tree', type: 'plant', zone: 'front_yard' },
    { id: 'tree_oak', name: 'Oak Tree', type: 'plant', zone: 'front_yard' },
    { id: 'tree_pine', name: 'Pine Tree', type: 'plant', zone: 'front_yard' },
    { id: 'sunflowers', name: 'Sunflowers', type: 'plant', zone: 'front_yard' },
    { id: 'lavender', name: 'Lavender', type: 'plant', zone: 'front_yard' },
    { id: 'flower_pot', name: 'Flower Pot', type: 'plant', zone: 'front_yard' },
    { id: 'planter_box', name: 'Planter Box', type: 'furniture', zone: 'front_yard' }
  ],
  paths: [
    { id: 'stone_path', name: 'Stone Path', type: 'path', zone: 'front_yard' },
    { id: 'brick_path', name: 'Brick Path', type: 'path', zone: 'front_yard' },
    { id: 'stepping_stones', name: 'Stepping Stones', type: 'path', zone: 'front_yard' },
    { id: 'gravel_path', name: 'Gravel Path', type: 'path', zone: 'front_yard' }
  ],
  features: [
    { id: 'bird_bath', name: 'Bird Bath', type: 'feature', zone: 'front_yard' },
    { id: 'garden_gnome', name: 'Garden Gnome', type: 'feature', zone: 'front_yard' },
    { id: 'decorative_fence', name: 'Decorative Fence', type: 'feature', zone: 'front_yard' },
    { id: 'wind_chimes', name: 'Wind Chimes', type: 'feature', zone: 'front_yard' }
  ],
  furniture: [
    { id: 'garden_bench', name: 'Garden Bench', type: 'furniture', zone: 'front_yard' },
    { id: 'outdoor_table', name: 'Outdoor Table', type: 'furniture', zone: 'front_yard' },
    { id: 'mailbox', name: 'Mailbox', type: 'furniture', zone: 'front_yard' },
    { id: 'picnic_table', name: 'Picnic Table', type: 'furniture', zone: 'front_yard' }
  ],
  lighting: [
    { id: 'garden_lantern', name: 'Garden Lantern', type: 'lighting', zone: 'front_yard' },
    { id: 'string_lights', name: 'String Lights', type: 'lighting', zone: 'front_yard' },
    { id: 'torch', name: 'Garden Torch', type: 'lighting', zone: 'front_yard' },
    { id: 'spotlight', name: 'Spotlight', type: 'lighting', zone: 'front_yard' }
  ],
  water: [
    { id: 'fountain', name: 'Garden Fountain', type: 'water', zone: 'front_yard' },
    { id: 'pond', name: 'Small Pond', type: 'water', zone: 'front_yard' },
    { id: 'sprinkler', name: 'Sprinkler System', type: 'water', zone: 'front_yard' }
  ],
  structures: [
    { id: 'gazebo', name: 'Garden Gazebo', type: 'structure', zone: 'front_yard' },
    { id: 'pergola', name: 'Pergola', type: 'structure', zone: 'front_yard' },
    { id: 'shed', name: 'Garden Shed', type: 'structure', zone: 'front_yard' }
  ],
  atmosphere: [
    { id: 'sunny_sky', name: 'Sunny Day', type: 'sky', zone: 'background' },
    { id: 'sunset_sky', name: 'Sunset', type: 'sky', zone: 'background' },
    { id: 'cloudy_sky', name: 'Cloudy', type: 'sky', zone: 'background' },
    { id: 'night_sky', name: 'Night Sky', type: 'sky', zone: 'background' }
  ],
  house: [
    // Doors Section
    { id: 'default_door', name: 'Default Door', type: 'house_custom', zone: 'house_facade', section: 'doors', isDefault: true },
    { id: 'arched_door', name: 'Arched Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },
    { id: 'double_door', name: 'Double Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },
    { id: 'cottage_door', name: 'Cottage Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },

    // Windows Section
    { id: 'default_windows', name: 'Default Windows', type: 'house_custom', zone: 'house_facade', section: 'windows', isDefault: true },
    { id: 'round_windows', name: 'Round Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },
    { id: 'arched_windows', name: 'Arched Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },
    { id: 'bay_windows', name: 'Bay Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },

    // Roof Trim Section
    { id: 'default_trim', name: 'Default Trim', type: 'house_custom', zone: 'house_facade', section: 'roof', isDefault: true },
    { id: 'ornate_trim', name: 'Ornate Roof Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' },
    { id: 'scalloped_trim', name: 'Scalloped Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' },
    { id: 'gabled_trim', name: 'Gabled Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' }
  ]
};

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Migrate all BETA_ITEMS to database
    for (const [category, items] of Object.entries(BETA_ITEMS)) {
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

          // Create decoration item
          await db.decorationItem.create({
            data: {
              itemId: item.id,
              name: item.name,
              type: item.type,
              category: category,
              zone: item.zone,
              iconSvg,
              renderSvg,
              gridWidth: item.type === 'structure' ? 3 : item.type === 'water' ? 2 : item.type === 'furniture' ? 2 : 1,
              gridHeight: item.type === 'structure' ? 3 : item.type === 'water' ? 2 : item.type === 'feature' ? 2 : 1,
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