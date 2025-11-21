import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  await db.user.deleteMany();

  const defaultHandle = process.env.SEED_USER_HANDLE || "alice";
  const siteDomain = process.env.SITE_HANDLE_DOMAIN || "YourSiteHere";
  const defaultName = process.env.SEED_USER_DISPLAY_NAME || "Alice";
  const defaultBio = process.env.SEED_USER_BIO || "Hi, I'm Alice! Welcome to my retro page.";

  const alice = await db.user.create({
    data: {
      did: "did:key:z6MkAliceDid",
      primaryHandle: `${defaultHandle}@${siteDomain}`,
      handles: {
        create: [{ handle: defaultHandle, host: siteDomain, verifiedAt: new Date() }],
      },
      profile: {
        create: {
          displayName: defaultName,
          bio: defaultBio,
          avatarUrl: "/assets/default-avatar.gif",
          blogroll: [{ label: "Cool Zines", url: "https://example.com" }],
          visibility: "public",
        },
      },
      posts: {
        create: [
          { bodyText: "First post! Loving this retro vibe.", visibility: "public" },
        ],
      },
      installs: {
        create: [
          { pluginId: "com.example.hello", mode: "trusted", enabled: true },
        ],
      },
    },
  });

  // a couple guestbook entries
  await db.guestbookEntry.createMany({
    data: [
      { profileOwner: alice.id, authorId: null, message: "This page is awesome!" },
      { profileOwner: alice.id, authorId: null, message: "So many vibes here." },
    ],
  });

  // Create default chat room
  await db.chatRoom.upsert({
    where: { id: "lounge" },
    update: {},
    create: {
      id: "lounge",
      name: "Lounge",
    },
  });

  console.log("Seeded:", alice.primaryHandle);
  console.log("Created chat room: Lounge");
}

main().finally(() => db.$disconnect());
