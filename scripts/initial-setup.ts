#!/usr/bin/env tsx

import { exec } from "child_process";
import { promisify } from "util";
import { createAdminUser } from "./setup-admin";

const execAsync = promisify(exec);

async function setupRepository() {
  console.log("🏗️  ThreadStead Repository Setup");
  console.log("=" .repeat(50));
  console.log("This script will:");
  console.log("  1. Apply database migrations");
  console.log("  2. Generate Prisma client");
  console.log("  3. Create an admin user");
  console.log("  4. Display setup credentials\n");
  
  try {
    // Step 1: Apply migrations
    console.log("📦 Applying database migrations...");
    await execAsync("npx prisma migrate deploy");
    console.log("✅ Migrations applied successfully\n");
    
    // Step 2: Generate Prisma client
    console.log("🔧 Generating Prisma client...");
    await execAsync("npx prisma generate");
    console.log("✅ Prisma client generated\n");
    
    // Step 3: Create admin user
    await createAdminUser();
    
    console.log("🎉 Repository setup complete!");
    console.log("   Your ThreadStead instance is ready to use.\n");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
    console.log("\n🔧 Manual setup steps:");
    console.log("   1. Run: npx prisma migrate deploy");
    console.log("   2. Run: npx prisma generate");
    console.log("   3. Run: npm run setup:admin");
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  setupRepository().catch((error) => {
    console.error("Setup script failed:", error);
    process.exit(1);
  });
}