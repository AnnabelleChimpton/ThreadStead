#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Missing decoration items that weren't included in original migration
const MISSING_ITEMS = {
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

// SVG icon generator
function getSVGTemplate(type: string, itemId: string): string {
  const baseIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">`;

  switch (type) {
    case 'sky':
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
}

async function migrateMissingDecorations() {
  console.log('🎨 Migrating missing decoration items to database...\n');

  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[]
  };

  try {
    for (const [category, items] of Object.entries(MISSING_ITEMS)) {
      console.log(`📦 Processing ${category}...`);

      for (const item of items) {
        try {
          // Check if item already exists
          const existing = await prisma.decorationItem.findUnique({
            where: { itemId: item.id }
          });

          if (existing) {
            console.log(`  ⏭️  Skipped ${item.id} (already exists)`);
            results.skipped++;
            continue;
          }

          // Generate SVG icons
          const iconSvg = getSVGTemplate(item.type, item.id);
          const renderSvg = iconSvg;

          // Create decoration item
          await prisma.decorationItem.create({
            data: {
              itemId: item.id,
              name: item.name,
              type: item.type,
              category: category,
              zone: item.zone,
              iconSvg,
              renderSvg,
              gridWidth: 1,
              gridHeight: 1,
              isActive: true,
              releaseType: (item as any).isDefault ? 'DEFAULT' : 'PUBLIC',
            }
          });

          console.log(`  ✅ Created ${item.id}`);
          results.created++;
        } catch (error: any) {
          const errorMsg = `Failed to create ${item.id}: ${error.message}`;
          console.error(`  ❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Created: ${results.created} items`);
    console.log(`⏭️  Skipped: ${results.skipped} items`);

    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🎉 Migration complete!');
    console.log('\nThe Home Decorator now has:');
    console.log('  - 🏠 House customizations (doors, windows, roof trim)');
    console.log('  - 🌤️  Sky/atmosphere options');
    console.log('  - 🌳 All existing yard decorations\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateMissingDecorations();
