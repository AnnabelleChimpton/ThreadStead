#!/usr/bin/env npx tsx

/**
 * Script to clear rate limits for users
 * Usage:
 *   npx tsx scripts/clear-rate-limits.ts <username>              # Clear all rate limits for a user
 *   npx tsx scripts/clear-rate-limits.ts <username> <category>   # Clear specific category for a user
 *   npx tsx scripts/clear-rate-limits.ts --category <category>   # Clear category for all users
 *   npx tsx scripts/clear-rate-limits.ts --expired               # Clear all expired rate limits
 *   npx tsx scripts/clear-rate-limits.ts --all                   # Clear all rate limits (use with caution)
 *
 * Categories: posts, comments, uploads, guestbook, profile_updates, template_editing,
 *             profile_metadata, profile_toggles, threadring_operations, admin, default
 */

import { db } from '../lib/config/database/connection';
import { SITE_NAME } from '../lib/config/site/constants';
import * as readline from 'readline';

const VALID_CATEGORIES = [
  'posts',
  'comments',
  'uploads',
  'profile_updates',
  'template_editing',
  'profile_metadata',
  'profile_toggles',
  'threadring_operations',
  'guestbook',
  'admin',
  'default'
];

interface RateLimitEntry {
  id: string;
  identifier: string;
  category: string;
  requestCount: number;
  windowStart: Date;
  expiresAt: Date;
}

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function findUserByUsername(username: string) {
  // Try with and without @ prefix
  const cleanUsername = username.replace(/^@/, '');

  const user = await db.user.findFirst({
    where: {
      handles: {
        some: {
          handle: {
            equals: cleanUsername,
            mode: 'insensitive'
          }
        }
      }
    },
    select: {
      id: true,
      primaryHandle: true,
      profile: {
        select: {
          displayName: true
        }
      }
    }
  });

  return user;
}

async function getUserRateLimits(userId: string, category?: string): Promise<RateLimitEntry[]> {
  const identifier = `user:${userId}`;

  return await db.rateLimit.findMany({
    where: {
      identifier,
      ...(category && { category })
    },
    orderBy: {
      category: 'asc'
    }
  });
}

async function clearUserRateLimits(userId: string, category?: string): Promise<number> {
  const identifier = `user:${userId}`;

  const result = await db.rateLimit.deleteMany({
    where: {
      identifier,
      ...(category && { category })
    }
  });

  return result.count;
}

async function clearCategoryForAllUsers(category: string): Promise<number> {
  const result = await db.rateLimit.deleteMany({
    where: {
      category
    }
  });

  return result.count;
}

async function clearExpiredRateLimits(): Promise<number> {
  const result = await db.rateLimit.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });

  return result.count;
}

async function clearAllRateLimits(): Promise<number> {
  const result = await db.rateLimit.deleteMany({});
  return result.count;
}

async function showRateLimitStats() {
  const stats = await db.rateLimit.groupBy({
    by: ['category'],
    _count: true,
    _sum: {
      requestCount: true
    }
  });

  console.log('\n📊 Current Rate Limit Statistics:');
  console.log('=' .repeat(60));

  for (const stat of stats) {
    console.log(`  ${stat.category.padEnd(25)} ${stat._count} entries  (${stat._sum.requestCount} total requests)`);
  }

  const total = await db.rateLimit.count();
  console.log('=' .repeat(60));
  console.log(`  Total entries: ${total}\n`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('❌ No arguments provided\n');
    console.log('Usage:');
    console.log('  npx tsx scripts/clear-rate-limits.ts <username>              # Clear all rate limits for a user');
    console.log('  npx tsx scripts/clear-rate-limits.ts <username> <category>   # Clear specific category for a user');
    console.log('  npx tsx scripts/clear-rate-limits.ts --category <category>   # Clear category for all users');
    console.log('  npx tsx scripts/clear-rate-limits.ts --expired               # Clear all expired rate limits');
    console.log('  npx tsx scripts/clear-rate-limits.ts --all                   # Clear all rate limits');
    console.log('  npx tsx scripts/clear-rate-limits.ts --stats                 # Show rate limit statistics');
    console.log('\nValid categories:', VALID_CATEGORIES.join(', '));
    process.exit(1);
  }

  // Show stats
  if (args[0] === '--stats') {
    await showRateLimitStats();
    process.exit(0);
  }

  // Clear expired
  if (args[0] === '--expired') {
    console.log('🧹 Clearing expired rate limits...\n');
    const count = await clearExpiredRateLimits();
    console.log(`✅ Cleared ${count} expired rate limit entries`);
    await showRateLimitStats();
    process.exit(0);
  }

  // Clear all
  if (args[0] === '--all') {
    console.log('⚠️  WARNING: This will clear ALL rate limits for ALL users!\n');
    const confirmed = await promptConfirmation('Are you sure you want to continue?');

    if (!confirmed) {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }

    const count = await clearAllRateLimits();
    console.log(`✅ Cleared ${count} rate limit entries`);
    process.exit(0);
  }

  // Clear by category (all users)
  if (args[0] === '--category') {
    const category = args[1];

    if (!category) {
      console.log('❌ Please specify a category');
      console.log('Valid categories:', VALID_CATEGORIES.join(', '));
      process.exit(1);
    }

    if (!VALID_CATEGORIES.includes(category)) {
      console.log(`❌ Invalid category: ${category}`);
      console.log('Valid categories:', VALID_CATEGORIES.join(', '));
      process.exit(1);
    }

    console.log(`🧹 Clearing "${category}" rate limits for ALL users...\n`);

    const confirmed = await promptConfirmation(`Are you sure you want to clear all "${category}" rate limits?`);

    if (!confirmed) {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }

    const count = await clearCategoryForAllUsers(category);
    console.log(`✅ Cleared ${count} rate limit entries for category "${category}"`);
    await showRateLimitStats();
    process.exit(0);
  }

  // Clear for specific user
  const username = args[0];
  const category = args[1];

  if (category && !VALID_CATEGORIES.includes(category)) {
    console.log(`❌ Invalid category: ${category}`);
    console.log('Valid categories:', VALID_CATEGORIES.join(', '));
    process.exit(1);
  }

  console.log(`🔍 Looking up user: ${username}...\n`);

  const user = await findUserByUsername(username);

  if (!user) {
    console.log(`❌ User not found: ${username}`);
    console.log('Make sure you have the correct username (without @homepageagain suffix)');
    process.exit(1);
  }

  console.log('✅ Found user:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Handle: ${user.primaryHandle || 'N/A'}`);
  console.log(`   Display Name: ${user.profile?.displayName || 'N/A'}\n`);

  // Show current rate limits
  const currentLimits = await getUserRateLimits(user.id, category);

  if (currentLimits.length === 0) {
    if (category) {
      console.log(`ℹ️  No rate limits found for category "${category}"`);
    } else {
      console.log('ℹ️  No rate limits found for this user');
    }
    process.exit(0);
  }

  console.log('📋 Current rate limits:');
  console.log('=' .repeat(60));
  for (const limit of currentLimits) {
    const isExpired = limit.expiresAt < new Date();
    const status = isExpired ? '(expired)' : '(active)';
    console.log(`  ${limit.category.padEnd(25)} ${limit.requestCount} requests ${status}`);
  }
  console.log('=' .repeat(60) + '\n');

  // Confirm deletion
  const message = category
    ? `Clear "${category}" rate limits for ${user.primaryHandle}?`
    : `Clear ALL rate limits for ${user.primaryHandle}?`;

  const confirmed = await promptConfirmation(message);

  if (!confirmed) {
    console.log('❌ Operation cancelled');
    process.exit(0);
  }

  // Clear rate limits
  const count = await clearUserRateLimits(user.id, category);

  if (category) {
    console.log(`✅ Cleared ${count} rate limit entries for category "${category}"`);
  } else {
    console.log(`✅ Cleared ${count} rate limit entries`);
  }

  console.log('✨ User can now perform actions without rate limit restrictions\n');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
