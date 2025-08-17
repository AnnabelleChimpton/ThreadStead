#!/usr/bin/env tsx

import { PrismaClient, UserRole } from "@prisma/client";
import * as bip39 from "bip39";
import * as ed25519 from "@noble/ed25519";
import { bytesToHex } from "@noble/hashes/utils";

const db = new PrismaClient();

async function generateKeyPair() {
  // Generate a random mnemonic seed phrase
  const mnemonic = bip39.generateMnemonic();
  
  // Convert mnemonic to seed
  const seed = await bip39.mnemonicToSeed(mnemonic);
  
  // Take first 32 bytes for private key
  const privateKey = seed.subarray(0, 32);
  
  // Generate public key
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);
  
  // Create DID
  const publicKeyHex = bytesToHex(publicKey);
  const did = `did:key:z6Mk${Buffer.from(publicKey).toString('base64url')}`;
  
  return {
    mnemonic,
    privateKey: bytesToHex(privateKey),
    publicKey: publicKeyHex,
    did,
  };
}

async function createAdminUser() {
  console.log("🚀 Setting up ThreadStead admin user...\n");
  
  // Check if admin user already exists
  const existingAdmin = await db.user.findFirst({
    where: { role: UserRole.admin }
  });
  
  if (existingAdmin) {
    console.log("❌ Admin user already exists!");
    console.log(`   User: ${existingAdmin.primaryHandle}`);
    console.log("   Use the existing admin credentials or delete the user first.\n");
    return;
  }
  
  // Get configuration from environment or use defaults
  const adminHandle = process.env.ADMIN_HANDLE || "admin";
  const siteDomain = process.env.SITE_HANDLE_DOMAIN || "localhost";
  const adminName = process.env.ADMIN_DISPLAY_NAME || "Site Administrator";
  const adminBio = process.env.ADMIN_BIO || "Site administrator and community manager.";
  
  // Generate cryptographic keys
  console.log("🔑 Generating cryptographic keys...");
  const keys = await generateKeyPair();
  
  try {
    // Create admin user
    const adminUser = await db.user.create({
      data: {
        did: keys.did,
        primaryHandle: `${adminHandle}@${siteDomain}`,
        role: UserRole.admin,
        handles: {
          create: [{
            handle: adminHandle,
            host: siteDomain,
            verifiedAt: new Date()
          }]
        },
        profile: {
          create: {
            displayName: adminName,
            bio: adminBio,
            avatarUrl: "/assets/default-avatar.gif",
            visibility: "public"
          }
        }
      },
      include: {
        profile: true,
        handles: true
      }
    });
    
    console.log("✅ Admin user created successfully!\n");
    
    // Display setup information
    console.log("📋 ADMIN USER DETAILS");
    console.log("=" .repeat(50));
    console.log(`Handle: ${adminUser.primaryHandle}`);
    console.log(`Name: ${adminUser.profile?.displayName}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`DID: ${adminUser.did}\n`);
    
    console.log("🔐 SEED PHRASE (SAVE THIS SECURELY!)");
    console.log("=" .repeat(50));
    console.log(`${keys.mnemonic}\n`);
    
    console.log("🔑 CRYPTOGRAPHIC KEYS");
    console.log("=" .repeat(50));
    console.log(`Private Key: ${keys.privateKey}`);
    console.log(`Public Key: ${keys.publicKey}\n`);
    
    console.log("⚠️  IMPORTANT SECURITY NOTES:");
    console.log("   • Save the seed phrase in a secure location");
    console.log("   • The seed phrase can be used to recover the admin account");
    console.log("   • Never share the private key or seed phrase");
    console.log("   • Consider using environment variables for production\n");
    
    console.log("🌐 NEXT STEPS:");
    console.log("   1. Start the development server: npm run dev");
    console.log("   2. Visit http://localhost:3000");
    console.log("   3. Import the seed phrase to sign in as admin");
    console.log("   4. Configure site settings in the admin panel\n");
    
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  createAdminUser().catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
}

export { createAdminUser };