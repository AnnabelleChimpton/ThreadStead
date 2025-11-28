/**
 * Diagnostic script to check for problematic bulletins in the database
 * Run with: npx ts-node scripts/check-bad-bulletins.ts
 *
 * For production: Set DATABASE_URL to production connection string before running
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_CATEGORIES = ['LOOKING_FOR', 'SHARING', 'INVITATION', 'HELP_FEEDBACK', 'COMMUNITY_NOTICE'];

async function checkBadBulletins() {
  console.log('🔍 Checking for problematic bulletins...\n');

  const now = new Date();

  // Get all active bulletins (the ones that would be displayed)
  const activeBulletins = await prisma.bulletin.findMany({
    where: {
      isActive: true,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          primaryHandle: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`📋 Found ${activeBulletins.length} active bulletins\n`);

  let issuesFound = 0;

  for (const bulletin of activeBulletins) {
    const issues: string[] = [];

    // Check 1: Invalid category
    if (!VALID_CATEGORIES.includes(bulletin.category)) {
      issues.push(`❌ INVALID CATEGORY: "${bulletin.category}" (expected one of: ${VALID_CATEGORIES.join(', ')})`);
    }

    // Check 2: Missing user relation
    if (!bulletin.user) {
      issues.push(`❌ MISSING USER RELATION: userId=${bulletin.userId}`);
    }

    // Check 3: Text too long (should be max 200)
    if (bulletin.text && bulletin.text.length > 200) {
      issues.push(`⚠️ TEXT TOO LONG: ${bulletin.text.length} chars (max 200)`);
    }

    // Check 4: Empty text
    if (!bulletin.text || bulletin.text.trim() === '') {
      issues.push(`❌ EMPTY TEXT`);
    }

    // Check 5: Invalid URL format
    if (bulletin.linkUrl) {
      try {
        new URL(bulletin.linkUrl);
      } catch {
        issues.push(`⚠️ INVALID URL: "${bulletin.linkUrl}"`);
      }
    }

    // Check 6: Suspicious content (could cause XSS if not properly escaped)
    if (bulletin.text && (bulletin.text.includes('<script') || bulletin.text.includes('javascript:'))) {
      issues.push(`🚨 SUSPICIOUS CONTENT: Possible XSS attempt`);
    }

    if (issues.length > 0) {
      issuesFound++;
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`🔴 PROBLEMATIC BULLETIN FOUND:`);
      console.log(`   ID: ${bulletin.id}`);
      console.log(`   Created: ${bulletin.createdAt}`);
      console.log(`   Expires: ${bulletin.expiresAt}`);
      console.log(`   Category: ${bulletin.category}`);
      console.log(`   Text: "${bulletin.text?.substring(0, 100)}${(bulletin.text?.length || 0) > 100 ? '...' : ''}"`);
      console.log(`   LinkUrl: ${bulletin.linkUrl || '(none)'}`);
      console.log(`   User: ${bulletin.user?.profile?.displayName || bulletin.user?.primaryHandle || 'MISSING'}`);
      console.log(`   User ID: ${bulletin.userId}`);
      console.log(`\n   ISSUES:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    }
  }

  // Also check for orphaned bulletins (where user doesn't exist)
  console.log('\n🔍 Checking for orphaned bulletins (missing user)...');
  const orphanedBulletins = await prisma.$queryRaw<Array<{ id: string; userId: string; category: string; text: string }>>`
    SELECT b.id, b."userId", b.category, b.text
    FROM "Bulletin" b
    LEFT JOIN "User" u ON b."userId" = u.id
    WHERE b."isActive" = true
      AND b."expiresAt" > NOW()
      AND u.id IS NULL
  `;

  if (orphanedBulletins.length > 0) {
    console.log(`\n🔴 Found ${orphanedBulletins.length} orphaned bulletins!`);
    orphanedBulletins.forEach(b => {
      console.log(`   - ID: ${b.id}, userId: ${b.userId}, category: ${b.category}`);
      console.log(`     Text: "${b.text?.substring(0, 50)}..."`);
    });
    issuesFound += orphanedBulletins.length;
  } else {
    console.log('✅ No orphaned bulletins found');
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  if (issuesFound > 0) {
    console.log(`\n🚨 TOTAL ISSUES FOUND: ${issuesFound}`);
    console.log('\nTo fix, you can deactivate problematic bulletins with:');
    console.log('  UPDATE "Bulletin" SET "isActive" = false WHERE id = \'<bulletin_id>\';');
  } else {
    console.log('\n✅ No problematic bulletins found!');
    console.log('\nThe issue might be elsewhere. Check:');
    console.log('  - Server logs for actual error messages');
    console.log('  - Other components on the home/community pages');
    console.log('  - Recent deployments that may have introduced bugs');
  }

  // Show recent bulletins for context
  console.log('\n📋 Most recent 5 active bulletins (for reference):');
  const recentBulletins = activeBulletins.slice(0, 5);
  recentBulletins.forEach((b, i) => {
    console.log(`\n${i + 1}. ID: ${b.id}`);
    console.log(`   Category: ${b.category}`);
    console.log(`   Created: ${b.createdAt}`);
    console.log(`   User: ${b.user?.profile?.displayName || b.user?.primaryHandle || 'Unknown'}`);
    console.log(`   Text: "${b.text?.substring(0, 80)}${(b.text?.length || 0) > 80 ? '...' : ''}"`);
  });
}

checkBadBulletins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
