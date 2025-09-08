#!/usr/bin/env npx tsx

/**
 * Script to create test users for testing blocking and reporting functionality
 * Run with: npx tsx scripts/create-test-users.ts
 */

import { db } from "../lib/db";
import { generateSeedPhrase, createKeypairFromSeedPhrase } from "../lib/api/did/did-client";

interface TestUser {
  handle: string;
  displayName: string;
  bio: string;
  samplePosts: string[];
}

const TEST_USERS: TestUser[] = [
  {
    handle: "alice_blogger",
    displayName: "Alice Johnson", 
    bio: "Tech enthusiast and blogger. Love writing about web development and UI/UX design.",
    samplePosts: [
      "Just finished a great article about React hooks! The useCallback optimization is really powerful when used correctly.",
      "Working on a new design system for our company. Typography choices are so important for user experience.",
      "Debugging CSS grid layouts on mobile devices. Anyone else struggle with responsive design sometimes?"
    ]
  },
  {
    handle: "bob_developer",
    displayName: "Bob Smith",
    bio: "Full-stack developer specializing in Node.js and PostgreSQL. Coffee addict ☕",
    samplePosts: [
      "PostgreSQL's JSONB features are incredible for handling semi-structured data. Much better than NoSQL for most use cases.",
      "Spent the morning optimizing database queries. A simple index made a 10x performance improvement!",
      "TypeScript strict mode catches so many bugs early. I can't imagine going back to plain JavaScript."
    ]
  },
  {
    handle: "carol_artist",
    displayName: "Carol Martinez",
    bio: "Digital artist and illustrator. Creating colorful worlds one pixel at a time 🎨",
    samplePosts: [
      "Finished a new character design today! Really happy with how the color palette turned out.",
      "Experimenting with different brush techniques in Procreate. The texture brushes add so much depth.",
      "Working on a series of cyberpunk cityscapes. The neon lighting effects are challenging but fun!"
    ]
  },
  {
    handle: "david_writer",
    displayName: "David Chen",
    bio: "Science fiction writer and worldbuilding enthusiast. Currently working on my first novel.",
    samplePosts: [
      "Outlining chapter 12 of my sci-fi novel. The plot is getting complex but I think readers will love the twists.",
      "Researching exoplanet atmospheres for my alien world. Scientific accuracy matters even in fiction!",
      "Character development is the hardest part of writing. How do you make fictional people feel real?"
    ]
  },
  {
    handle: "eve_gamer",
    displayName: "Eve Thompson",
    bio: "Indie game developer and streamer. Building the games I want to play! 🎮",
    samplePosts: [
      "Implemented a new dialogue system in my RPG today. Branching conversations are more complex than I expected.",
      "Playtesting is revealing so many balance issues. Players always find creative ways to break your game!",
      "Working on pixel art animations for character movement. 16 frames per walk cycle takes forever but looks smooth."
    ]
  },
  {
    handle: "frank_annoying",
    displayName: "Frank Spam",
    bio: "CHECK OUT MY CRYPTO COURSE!!! MAKE MILLIONS!!! 💰💰💰",
    samplePosts: [
      "🚀🚀🚀 AMAZING CRYPTO OPPORTUNITY!!! CLICK HERE TO MAKE $10,000 IN ONE DAY!!! 🚀🚀🚀",
      "DOCTORS HATE THIS ONE SIMPLE TRICK!!! LOSE 50 POUNDS IN 2 WEEKS!!!",
      "BUY MY COURSE NOW!!! LIMITED TIME OFFER!!! ONLY 99.99!!! ACT FAST!!!"
    ]
  }
];

async function createTestUser(testUser: TestUser): Promise<void> {
  console.log(`Creating test user: ${testUser.handle}...`);

  try {
    // Generate DID and keypair
    const seedPhrase = await generateSeedPhrase();
    const keypair = await createKeypairFromSeedPhrase(seedPhrase);

    // Create user
    const user = await db.user.create({
      data: {
        did: keypair.did,
        primaryHandle: testUser.handle,
        role: "member",
      },
    });

    // Create handle
    await db.handle.create({
      data: {
        userId: user.id,
        handle: testUser.handle,
        host: process.env.SITE_HANDLE_DOMAIN || "threadstead.local",
        verifiedAt: new Date(),
      },
    });

    // Create profile
    await db.profile.create({
      data: {
        userId: user.id,
        displayName: testUser.displayName,
        bio: testUser.bio,
        visibility: "public",
      },
    });

    // Create sample posts
    for (const postContent of testUser.samplePosts) {
      await db.post.create({
        data: {
          authorId: user.id,
          title: `Post by ${testUser.displayName}`,
          bodyText: postContent,
          bodyMarkdown: postContent,
          visibility: "public",
          publishedAt: new Date(),
        },
      });
    }

    console.log(`✅ Created user ${testUser.handle} with ${testUser.samplePosts.length} posts`);
    console.log(`   Seed phrase: ${seedPhrase}`);
    console.log(`   DID: ${keypair.did}`);

  } catch (error) {
    console.error(`❌ Failed to create user ${testUser.handle}:`, error);
  }
}

async function main() {
  console.log("🔧 Creating test users for blocking/reporting functionality...\n");

  for (const testUser of TEST_USERS) {
    await createTestUser(testUser);
    console.log(); // Empty line for readability
  }

  console.log("✨ Test user creation complete!");
  console.log("\n📝 Test scenarios you can try:");
  console.log("1. Report frank_annoying's spam posts");
  console.log("2. Block frank_annoying to hide their content");
  console.log("3. Report inappropriate comments if any are added");
  console.log("4. Test that blocked users don't appear in feeds");
  console.log("5. Use admin panel to review and resolve reports");

  process.exit(0);
}

// Handle any uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});