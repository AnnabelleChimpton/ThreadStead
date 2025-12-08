/**
 * Bulk Upload Decoration PNGs to R2
 *
 * Uploads all PNG files from exports/decorations/ to Cloudflare R2 storage.
 *
 * Usage:
 *   npx tsx scripts/upload-decorations-to-r2.ts           # Upload all
 *   npx tsx scripts/upload-decorations-to-r2.ts --dry-run # Preview only
 *   npx tsx scripts/upload-decorations-to-r2.ts --sync    # Also update DB pngUrl fields
 *   npx tsx scripts/upload-decorations-to-r2.ts --houses  # Upload house templates only
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

const EXPORTS_DIR = path.join(process.cwd(), "exports", "decorations");
const R2_PATH_PREFIX = "pixel-homes/decorations";

interface UploadResult {
  file: string;
  decorationId: string;
  url: string;
  status: "uploaded" | "skipped" | "failed";
  error?: string;
}

function getS3Client(): S3Client {
  const requiredEnvVars = ['R2_PUBLIC_URL', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_PUBLIC_URL!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: false,
  });
}

function getCdnUrl(): string {
  return (process.env.R2_CDN_URL || process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
}

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || "threadstead-media";
}

async function checkFileExists(client: S3Client, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(
  client: S3Client,
  filePath: string,
  r2Key: string,
  skipExisting: boolean = true
): Promise<{ uploaded: boolean; url: string }> {
  const cdnUrl = getCdnUrl();
  const url = `${cdnUrl}/${r2Key}`;

  if (skipExisting) {
    const exists = await checkFileExists(client, r2Key);
    if (exists) {
      return { uploaded: false, url };
    }
  }

  const fileBuffer = fs.readFileSync(filePath);

  await client.send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key: r2Key,
    Body: fileBuffer,
    ContentType: "image/png",
    CacheControl: "public, max-age=31536000", // 1 year cache
  }));

  return { uploaded: true, url };
}

function getDecorationFiles(): { decorations: string[]; houses: string[] } {
  const decorations: string[] = [];
  const houses: string[] = [];

  // Get decoration PNGs
  if (fs.existsSync(EXPORTS_DIR)) {
    const files = fs.readdirSync(EXPORTS_DIR);
    for (const file of files) {
      if (file.endsWith(".png")) {
        decorations.push(path.join(EXPORTS_DIR, file));
      }
    }
  }

  // Get house PNGs
  const housesDir = path.join(EXPORTS_DIR, "houses");
  if (fs.existsSync(housesDir)) {
    const files = fs.readdirSync(housesDir);
    for (const file of files) {
      if (file.endsWith(".png")) {
        houses.push(path.join(housesDir, file));
      }
    }
  }

  return { decorations, houses };
}

function extractDecorationId(filePath: string): string {
  const filename = path.basename(filePath, ".png");
  return filename;
}

async function syncDatabaseUrls(results: UploadResult[], prisma: PrismaClient): Promise<void> {
  console.log("\nSyncing database URLs...");

  for (const result of results) {
    if (result.status === "failed") continue;

    // Skip house templates - they're handled differently
    if (result.file.includes("/houses/")) continue;

    try {
      // Update decoration if it exists in database
      const updated = await prisma.decorationItem.updateMany({
        where: { itemId: result.decorationId },
        data: { pngUrl: result.url },
      });

      if (updated.count > 0) {
        console.log(`  ✓ Updated ${result.decorationId} in database`);
      }
    } catch (error) {
      console.log(`  ✗ Failed to update ${result.decorationId}: ${error}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const syncDb = args.includes("--sync");
  const housesOnly = args.includes("--houses");
  const forceOverwrite = args.includes("--force");

  console.log("=== Decoration PNG Upload to R2 ===\n");

  if (dryRun) {
    console.log("DRY RUN MODE - No files will be uploaded\n");
  }

  const { decorations, houses } = getDecorationFiles();

  let filesToUpload: string[] = [];
  if (housesOnly) {
    filesToUpload = houses;
    console.log(`Found ${houses.length} house template PNGs`);
  } else {
    filesToUpload = [...decorations, ...houses];
    console.log(`Found ${decorations.length} decoration PNGs`);
    console.log(`Found ${houses.length} house template PNGs`);
  }

  if (filesToUpload.length === 0) {
    console.log("\nNo files found to upload.");
    console.log(`Expected directory: ${EXPORTS_DIR}`);
    return;
  }

  const results: UploadResult[] = [];
  let client: S3Client | null = null;

  if (!dryRun) {
    client = getS3Client();
    console.log(`\nUploading to bucket: ${getBucketName()}`);
    console.log(`CDN URL: ${getCdnUrl()}\n`);
  }

  for (const filePath of filesToUpload) {
    const decorationId = extractDecorationId(filePath);
    const isHouse = filePath.includes("/houses/");
    const r2Key = isHouse
      ? `${R2_PATH_PREFIX}/houses/${decorationId}.png`
      : `${R2_PATH_PREFIX}/${decorationId}.png`;

    if (dryRun) {
      console.log(`Would upload: ${decorationId}.png -> ${r2Key}`);
      results.push({
        file: filePath,
        decorationId,
        url: `${getCdnUrl()}/${r2Key}`,
        status: "skipped",
      });
      continue;
    }

    try {
      const { uploaded, url } = await uploadFile(client!, filePath, r2Key, !forceOverwrite);

      if (uploaded) {
        console.log(`✓ Uploaded: ${decorationId}.png`);
        results.push({ file: filePath, decorationId, url, status: "uploaded" });
      } else {
        console.log(`- Skipped (exists): ${decorationId}.png`);
        results.push({ file: filePath, decorationId, url, status: "skipped" });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`✗ Failed: ${decorationId}.png - ${errorMsg}`);
      results.push({
        file: filePath,
        decorationId,
        url: "",
        status: "failed",
        error: errorMsg,
      });
    }
  }

  // Summary
  const uploaded = results.filter(r => r.status === "uploaded").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const failed = results.filter(r => r.status === "failed").length;

  console.log("\n=== Summary ===");
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);

  // Sync to database if requested
  if (syncDb && !dryRun && uploaded > 0) {
    const prisma = new PrismaClient();
    try {
      await syncDatabaseUrls(results, prisma);
    } finally {
      await prisma.$disconnect();
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
