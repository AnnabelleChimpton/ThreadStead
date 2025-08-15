#!/usr/bin/env tsx

import { PrismaClient, UserRole } from "@prisma/client";

const db = new PrismaClient();

async function migrateUsers() {
  console.log("🔄 Starting migration of legacy users to member role...");

  try {
    // Find all users who don't have a role set or have the old default
    // Also select primaryHandle for handle update
    const usersToUpdate = await db.user.findMany({
      where: {
        NOT: {
          role: UserRole.admin,
        },
      },
      select: {
        id: true,
        did: true,
        primaryHandle: true,
        profile: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (usersToUpdate.length === 0) {
      console.log("✅ No users need migration - all users already have roles assigned!");
      return;
    }

    console.log(`📊 Found ${usersToUpdate.length} users to migrate:`);
    
    for (const user of usersToUpdate) {
      const displayName = user.profile?.displayName || user.primaryHandle || user.did.slice(0, 20) + "...";
      console.log(`  - ${displayName} (${user.id})`);
    }


    // Prepare SITE_HANDLE_DOMAIN from env
    const siteHandleDomain = process.env.SITE_HANDLE_DOMAIN || process.env.NEXT_PUBLIC_SITE_HANDLE_DOMAIN || "local";

    console.log("\n🔄 Updating users to 'member' role and updating primary handles...");

    let migratedCount = 0;
    for (const user of usersToUpdate) {
      // Update role and handle if needed
      let newHandle = user.primaryHandle;
      let handleName = null;
      let needsHandleUpdate = false;
      if (user.primaryHandle && user.primaryHandle.includes("@")) {
        const [name, domain] = user.primaryHandle.split("@");
        handleName = name;
        if (domain === "local" || domain !== siteHandleDomain) {
          newHandle = `${name}@${siteHandleDomain}`;
          needsHandleUpdate = true;
        }
      }
      // Update User record
      await db.user.update({
        where: { id: user.id },
        data: {
          role: UserRole.member,
          primaryHandle: newHandle,
        },
      });

      // Update Handle record if needed
      if (needsHandleUpdate && handleName) {
        await db.handle.updateMany({
          where: {
            userId: user.id,
            handle: handleName,
          },
          data: {
            host: siteHandleDomain,
          },
        });
      }
      migratedCount++;
    }

    console.log(`✅ Successfully migrated ${migratedCount} users to 'member' role and updated handles!`);

    // Verify the migration
    const verifyCount = await db.user.count({
      where: {
        role: UserRole.member,
      },
    });

    const adminCount = await db.user.count({
      where: {
        role: UserRole.admin,
      },
    });

    console.log("\n📈 Final role distribution:");
    console.log(`  - Members: ${verifyCount}`);
    console.log(`  - Admins: ${adminCount}`);
    console.log(`  - Total: ${verifyCount + adminCount}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log("\n🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

export { migrateUsers };