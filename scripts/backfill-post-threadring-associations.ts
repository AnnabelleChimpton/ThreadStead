/**
 * Backfill script to create missing PostThreadRing associations
 * 
 * This script fixes the issue where posts were submitted to RingHub ThreadRings
 * but don't have local PostThreadRing database records, causing them to not
 * show ThreadRing badges in the main feed.
 * 
 * Usage:
 *   npx tsx scripts/backfill-post-threadring-associations.ts
 */

import { db } from "@/lib/db";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { featureFlags } from "@/lib/feature-flags";

interface RingHubPost {
  id: string;
  ringId: string;
  ringSlug: string;
  ringName: string;
  actorDid: string;
  uri: string;
  submittedAt: string;
  submittedBy: string;
  status: "ACCEPTED";
  metadata: any;
}

/**
 * Extract post ID from ThreadStead post URI
 */
function extractPostIdFromUri(uri: string): string | null {
  // Handle ThreadStead post URIs like https://domain.com/posts/[id] or https://domain.com/resident/[username]/post/[id]
  const matches = uri.match(/\/posts?\/([^\/\?]+)/);
  return matches ? matches[1] : null;
}

/**
 * Get all posts from RingHub that reference ThreadStead posts
 */
async function getAllThreadSteadPostsFromRingHub(): Promise<RingHubPost[]> {
  if (!featureFlags.ringhub()) {
    throw new Error("RingHub feature flag is not enabled");
  }

  const client = getRingHubClient();
  if (!client) {
    throw new Error("RingHub client not available");
  }

  console.log("🔍 Fetching all rings from RingHub...");
  
  // Get all rings (paginated)
  let allRings: any[] = [];
  let offset = 0;
  const limit = 100;
  
  do {
    const response = await client.listRings({ limit, offset });
    allRings.push(...response.rings);
    offset += limit;
    
    if (response.rings.length < limit) break;
  } while (true);
  
  console.log(`📊 Found ${allRings.length} rings in RingHub`);
  
  // Get posts from each ring
  const allPosts: RingHubPost[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://homepageagain.com';
  
  for (const ring of allRings) {
    try {
      console.log(`🔍 Checking posts in ring: ${ring.slug}`);
      
      // Get all posts from this ring (paginated)
      let ringOffset = 0;
      const ringLimit = 100;
      
      do {
        const feedResponse = await client.getRingFeed(ring.slug, { 
          limit: ringLimit, 
          offset: ringOffset 
        });
        
        // Filter to only ThreadStead posts (posts that have URIs from our domain)
        const threadSteadPosts = feedResponse.posts.filter(post => 
          post.uri.includes(baseUrl) || 
          post.uri.includes('localhost') || 
          post.uri.includes('127.0.0.1')
        ).map(post => ({
          id: post.id || `${ring.slug}-${post.uri}`, // Fallback ID if not provided
          ringId: ring.id,
          ringSlug: ring.slug,
          ringName: ring.name,
          actorDid: post.submittedBy, // Use submittedBy as the actor DID
          uri: post.uri,
          submittedAt: post.submittedAt,
          submittedBy: post.submittedBy,
          status: (post.status || "ACCEPTED") as "ACCEPTED",
          metadata: post.metadata || null
        }));
        
        allPosts.push(...threadSteadPosts);
        console.log(`  📄 Found ${threadSteadPosts.length} ThreadStead posts in this batch`);
        
        ringOffset += ringLimit;
        if (feedResponse.posts.length < ringLimit) break;
      } while (true);
      
    } catch (error) {
      console.error(`❌ Failed to fetch posts from ring ${ring.slug}:`, error);
      // Continue with other rings
    }
  }
  
  console.log(`📊 Total ThreadStead posts found in RingHub: ${allPosts.length}`);
  return allPosts;
}

/**
 * Main backfill function
 */
async function backfillPostThreadRingAssociations() {
  console.log("🚀 Starting PostThreadRing backfill process...");
  
  try {
    // Get all ThreadStead posts from RingHub
    const ringHubPosts = await getAllThreadSteadPostsFromRingHub();
    
    if (ringHubPosts.length === 0) {
      console.log("✅ No ThreadStead posts found in RingHub. Nothing to backfill.");
      return;
    }
    
    let processedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each post
    for (const ringHubPost of ringHubPosts) {
      try {
        processedCount++;
        
        // Extract post ID from URI
        const postId = extractPostIdFromUri(ringHubPost.uri);
        if (!postId) {
          console.log(`⚠️ Could not extract post ID from URI: ${ringHubPost.uri}`);
          errorCount++;
          continue;
        }
        
        // Check if the post exists in our database
        const localPost = await db.post.findUnique({
          where: { id: postId },
          select: { id: true, authorId: true }
        });
        
        if (!localPost) {
          console.log(`⚠️ Post ${postId} not found in local database (URI: ${ringHubPost.uri})`);
          errorCount++;
          continue;
        }
        
        // Check if the ThreadRing exists in our database, create if missing
        let localRing = await db.threadRing.findUnique({
          where: { slug: ringHubPost.ringSlug },
          select: { id: true, name: true }
        });
        
        if (!localRing) {
          console.log(`🔧 Creating missing local ThreadRing: ${ringHubPost.ringSlug}`);
          try {
            // Generate a unique URI for the RingHub ThreadRing
            const currentBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://homepageagain.com';
            const ringUri = `${currentBaseUrl}/tr/${ringHubPost.ringSlug}`;
            
            // Create a basic local ThreadRing record to support feed associations
            localRing = await db.threadRing.create({
              data: {
                uri: ringUri,
                name: ringHubPost.ringName,
                slug: ringHubPost.ringSlug,
                description: `RingHub ThreadRing: ${ringHubPost.ringName}`,
                visibility: "public",
                curatorId: localPost.authorId, // Use post author as temporary curator
                joinType: "open",
                postCount: 0,
                memberCount: 1
              },
              select: { id: true, name: true }
            });
            console.log(`✅ Created local ThreadRing record for ${ringHubPost.ringSlug}`);
          } catch (createError) {
            console.error(`❌ Failed to create local ThreadRing ${ringHubPost.ringSlug}:`, createError);
            errorCount++;
            continue;
          }
        }
        
        // Check if PostThreadRing association already exists
        const existingAssociation = await db.postThreadRing.findUnique({
          where: {
            postId_threadRingId: {
              postId: postId,
              threadRingId: localRing.id
            }
          }
        });
        
        if (existingAssociation) {
          console.log(`⏭️ Association already exists: Post ${postId} -> Ring ${ringHubPost.ringSlug}`);
          skippedCount++;
          continue;
        }
        
        // Create the PostThreadRing association
        await db.postThreadRing.create({
          data: {
            postId: postId,
            threadRingId: localRing.id,
            addedBy: localPost.authorId,
            addedAt: new Date(ringHubPost.submittedAt)
          }
        });
        
        console.log(`✅ Created association: Post ${postId} -> Ring ${ringHubPost.ringSlug}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error processing post ${ringHubPost.uri}:`, error);
        errorCount++;
      }
      
      // Progress indicator
      if (processedCount % 10 === 0) {
        console.log(`📊 Progress: ${processedCount}/${ringHubPosts.length} posts processed`);
      }
    }
    
    // Final summary
    console.log("\n🎉 Backfill completed!");
    console.log(`📊 Summary:`);
    console.log(`   • Total posts processed: ${processedCount}`);
    console.log(`   • Associations created: ${createdCount}`);
    console.log(`   • Already existed (skipped): ${skippedCount}`);
    console.log(`   • Errors: ${errorCount}`);
    
    if (createdCount > 0) {
      console.log(`\n✨ Created ${createdCount} new PostThreadRing associations!`);
      console.log(`   Posts in the main feed should now show their ThreadRing badges.`);
    }
    
  } catch (error) {
    console.error("💥 Backfill failed:", error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  backfillPostThreadRingAssociations()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

export { backfillPostThreadRingAssociations };