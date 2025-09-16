/**
 * Initialize PostMetrics for existing posts
 * Run this once after migration to populate metrics for existing posts
 */

import { db } from "../lib/config/database/connection";

async function initializePostMetrics() {
  console.log("Starting post metrics initialization...");

  try {
    // Get all posts that don't have metrics yet
    const postsWithoutMetrics = await db.post.findMany({
      where: {
        metrics: null,
      },
      include: {
        comments: {
          where: { status: "visible" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${postsWithoutMetrics.length} posts without metrics`);

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < postsWithoutMetrics.length; i += batchSize) {
      const batch = postsWithoutMetrics.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (post) => {
          const commentCount = post.comments.length;

          return db.postMetrics.create({
            data: {
              postId: post.id,
              viewCount: 0,
              uniqueViewCount: 0,
              commentCount,
              lastViewedAt: new Date(),
              lastCommentAt: commentCount > 0 ? new Date() : null,
              trendingScore: 0,
              scoreUpdatedAt: new Date(),
              recentViews: 0,
              recentComments: 0,
              velocityWindow: new Date(),
            },
          });
        })
      );

      processed += batch.length;
      console.log(`Processed ${processed}/${postsWithoutMetrics.length} posts`);
    }

    console.log("✅ Post metrics initialization completed successfully");

    // Show some stats
    const totalMetrics = await db.postMetrics.count();
    const totalPosts = await db.post.count();

    console.log(`📊 Stats: ${totalMetrics} metrics records for ${totalPosts} total posts`);

  } catch (error) {
    console.error("❌ Error initializing post metrics:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  initializePostMetrics()
    .then(() => {
      console.log("🎉 Initialization script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

export { initializePostMetrics };