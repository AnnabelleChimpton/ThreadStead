#!/usr/bin/env tsx

import { PrismaClient, UserRole } from "@prisma/client";

const db = new PrismaClient();

async function promoteToAdmin(identifier: string) {
  console.log(`🔍 Looking for user: ${identifier}`);

  try {
    // Try to find user by different identifiers
    let user = await db.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { did: identifier },
          { primaryHandle: identifier },
          { 
            handles: {
              some: {
                handle: identifier.split('@')[0] // Remove @domain if present
              }
            }
          }
        ]
      },
      include: {
        handles: true,
        profile: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${identifier}`);
      console.log("\n💡 Try using one of these identifiers:");
      console.log("  - User ID (e.g., clxxxxx...)");
      console.log("  - DID (e.g., did:key:...)");
      console.log("  - Handle (e.g., alice or alice@local)");
      return false;
    }

    const displayName = user.profile?.displayName || user.primaryHandle || user.handles[0]?.handle || "Unknown";
    console.log(`✅ Found user: ${displayName}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   DID: ${user.did}`);
    console.log(`   Primary Handle: ${user.primaryHandle || "None"}`);
    console.log(`   Current Role: ${user.role}`);

    if (user.role === UserRole.admin) {
      console.log("🎯 User is already an admin!");
      return true;
    }

    console.log(`\n🔄 Promoting ${displayName} to admin...`);

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { role: UserRole.admin },
      select: {
        id: true,
        role: true,
        profile: {
          select: {
            displayName: true,
          },
        },
      },
    });

    console.log(`✅ Successfully promoted ${displayName} to admin!`);
    console.log(`   New Role: ${updatedUser.role}`);

    return true;
  } catch (error) {
    console.error("❌ Promotion failed:", error);
    return false;
  }
}

async function listUsers() {
  console.log("👥 Current users in the system:\n");

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        did: true,
        role: true,
        primaryHandle: true,
        handles: {
          select: {
            handle: true,
            host: true,
          },
        },
        profile: {
          select: {
            displayName: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (users.length === 0) {
      console.log("No users found.");
      return;
    }

    console.log("ID                     | Role   | Display Name       | Handle");
    console.log("─".repeat(70));

    for (const user of users) {
      const displayName = (user.profile?.displayName || "No name").padEnd(18);
      const handle = (user.primaryHandle || user.handles[0]?.handle || "No handle").padEnd(15);
      const role = user.role.padEnd(6);
      const shortId = user.id.substring(0, 20).padEnd(22);
      
      console.log(`${shortId} | ${role} | ${displayName} | ${handle}`);
    }

    console.log(`\nTotal: ${users.length} users`);
    
    const adminCount = users.filter(u => u.role === UserRole.admin).length;
    const memberCount = users.filter(u => u.role === UserRole.member).length;
    
    console.log(`Admins: ${adminCount}, Members: ${memberCount}`);

  } catch (error) {
    console.error("❌ Failed to list users:", error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("🛡️  Promote User to Admin");
    console.log("\nUsage:");
    console.log("  npm run promote-admin <user-identifier>");
    console.log("  npm run promote-admin --list");
    console.log("\nExamples:");
    console.log("  npm run promote-admin alice");
    console.log("  npm run promote-admin alice@local");
    console.log("  npm run promote-admin clxxxxx...");
    console.log("  npm run promote-admin did:key:...");
    console.log("  npm run promote-admin --list");
    console.log("\nOptions:");
    console.log("  --list, -l    List all users");
    console.log("  --help, -h    Show this help message");
    return;
  }

  if (args[0] === "--list" || args[0] === "-l") {
    await listUsers();
    return;
  }

  const identifier = args[0];
  const success = await promoteToAdmin(identifier);
  
  if (!success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 Script completed successfully!");
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    })
    .finally(() => {
      db.$disconnect();
    });
}

export { promoteToAdmin, listUsers };