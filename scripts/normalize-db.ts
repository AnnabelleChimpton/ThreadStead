import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function normalize() {
  // Normalize Handle.host to match SITE_HANDLE_DOMAIN
  const siteHandleDomain = process.env.SITE_HANDLE_DOMAIN || "YourSiteHere";
  await prisma.$executeRaw`UPDATE "Handle" SET "host" = ${siteHandleDomain} WHERE "host" IS DISTINCT FROM ${siteHandleDomain}`;
  // Normalize Post: set title to 'Alpha Post Title' where title IS NULL
  await prisma.$executeRaw`UPDATE "Post" SET "title" = 'BETA Post Title' WHERE "title" IS NULL`;

  // Normalize Comment: set parentId to NULL for all comments (for legacy data)
  await prisma.$executeRaw`UPDATE "Comment" SET "parentId" = NULL WHERE "parentId" IS DISTINCT FROM NULL`;

  // Backfill BetaKey for early users who do not have one
  const legacyKey = 'LEGACY-BETA-KEY';
  let legacyBetaKey = await prisma.betaKey.findUnique({ where: { key: legacyKey } });
  if (!legacyBetaKey) {
    legacyBetaKey = await prisma.betaKey.create({
      data: {
        key: legacyKey,
        createdAt: new Date(0),
        usedAt: null,
      },
    });
    console.log('Created legacy beta key');
  }

  // Find users without a betaKey
  const users = await prisma.user.findMany({ where: { betaKey: null } });
  for (const user of users) {
    // Only update if not already used (or allow multiple users to share legacy key)
    await prisma.user.update({
      where: { id: user.id },
      data: { betaKey: { connect: { key: legacyKey } } },
    });
  }

  // Optionally, update legacyBetaKey.usedBy and usedAt if you want to track one user

  console.log('Database normalization complete, including beta key backfill.');
}

normalize()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
