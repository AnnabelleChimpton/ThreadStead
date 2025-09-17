/**
 * Apply auto-validation to existing high-scoring seeded sites
 */

import { db } from '@/lib/config/database/connection';

async function applyAutoValidation() {
  console.log('🔄 Applying auto-validation to existing seeded sites...\n');

  // Find high-scoring seeded sites that should be auto-validated
  const candidates = await db.indexedSite.findMany({
    where: {
      discoveryMethod: 'api_seeding',
      communityValidated: false,
      seedingScore: { gte: 70 } // High score threshold
    },
    select: {
      id: true,
      url: true,
      title: true,
      seedingScore: true,
      seedingReasons: true
    }
  });

  console.log(`📋 Found ${candidates.length} candidates for auto-validation\n`);

  let autoValidated = 0;

  for (const site of candidates) {
    // Simulate the same auto-validation logic from the seeder
    const shouldAutoValidate = shouldAutoValidateSeededSite(site);

    if (shouldAutoValidate) {
      const initialCommunityScore = Math.floor((site.seedingScore || 0) / 10);

      await db.indexedSite.update({
        where: { id: site.id },
        data: {
          communityValidated: true,
          communityScore: initialCommunityScore
        }
      });

      console.log(`✅ Auto-validated: ${site.title} (score: ${site.seedingScore})`);
      autoValidated++;
    } else {
      console.log(`⏭️  Skipped: ${site.title} (score: ${site.seedingScore}) - didn't meet criteria`);
    }
  }

  console.log(`\n🎉 Auto-validated ${autoValidated} out of ${candidates.length} candidate sites`);

  // Show updated stats
  const [pendingCount, validatedCount] = await Promise.all([
    db.indexedSite.count({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: false
      }
    }),
    db.indexedSite.count({
      where: {
        discoveryMethod: 'api_seeding',
        communityValidated: true
      }
    })
  ]);

  console.log(`\n📊 Updated Statistics:`);
  console.log(`   Pending validation: ${pendingCount}`);
  console.log(`   Auto-validated: ${validatedCount}`);

  await db.$disconnect();
}

/**
 * Same auto-validation logic from the seeder
 */
function shouldAutoValidateSeededSite(site: any): boolean {
  const seedingScore = {
    score: site.seedingScore || 0,
    confidence: 0.9, // Assume high confidence for existing scored sites
    reasons: site.seedingReasons || []
  };

  // Conservative thresholds for auto-validation
  const HIGH_SCORE_THRESHOLD = 70;
  const MIN_CONFIDENCE = 0.8;

  // Must meet high score threshold
  if (seedingScore.score < HIGH_SCORE_THRESHOLD) {
    return false;
  }

  // Must have high confidence in the evaluation
  if (seedingScore.confidence < MIN_CONFIDENCE) {
    return false;
  }

  // Must have strong positive indicators
  const strongIndicators = [
    'indie_web_detected',
    'indie_web_domain',
    'personal_domain',
    'privacy_friendly',
    'no_trackers'
  ];

  const hasStrongIndicators = strongIndicators.some(indicator =>
    seedingScore.reasons.includes(indicator)
  );

  if (!hasStrongIndicators) {
    return false;
  }

  // Must not have any negative indicators
  const negativeIndicators = [
    'commercial_domain',
    'big_tech_domain',
    'commercial_content',
    'spam_indicators',
    'low_quality_content'
  ];

  const hasNegativeIndicators = negativeIndicators.some(indicator =>
    seedingScore.reasons.includes(indicator)
  );

  if (hasNegativeIndicators) {
    return false;
  }

  return true; // All checks passed - auto-validate
}

applyAutoValidation().catch(console.error);