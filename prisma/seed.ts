import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  await db.user.deleteMany();

  const alice = await db.user.create({
    data: {
      did: "did:key:z6MkAliceDid",
      primaryHandle: "alice@local",
      handles: {
        create: [{ handle: "alice", host: "local", verifiedAt: new Date() }],
      },
      profile: {
        create: {
          displayName: "Alice",
          bio: "Hi, I'm Alice! Welcome to my retro page.",
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

  console.log("Seeded:", alice.primaryHandle);
}

main().finally(() => db.$disconnect());
