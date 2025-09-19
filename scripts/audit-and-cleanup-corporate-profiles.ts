/**
 * Audit and cleanup script for existing production database
 * Identifies corporate profiles that may have been incorrectly indexed
 * Run with: npx tsx scripts/audit-and-cleanup-corporate-profiles.ts
 */

import { db } from '../lib/config/database/connection';
import { domainClassifier } from '../lib/community-index/seeding/domain-classifier';
import { corporatePlatforms } from '../lib/community-index/seeding/corporate-platforms';

interface AuditResult {
  totalSites: number;
  corporateProfiles: Array<{
    id: string;
    url: string;
    title: string;
    currentScore: number;
    platformType: string;
    shouldBeExtraction: boolean;
  }>;
  indieUpgrades: Array<{
    id: string;
    url: string;
    title: string;
    currentScore: number;
    newPlatformType: string;
    scoreBonus: number;
  }>;
  summary: {
    corporateFound: number;
    indieUpgrades: number;
    falsePositives: number;
    sitesToUpdate: number;
  };
}

class DatabaseAuditor {
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  /**
   * Main audit function
   */
  async auditDatabase(): Promise<AuditResult> {
    console.log('🔍 Starting database audit for corporate profiles...\n');
    console.log(`Mode: ${this.dryRun ? '🏃 DRY RUN' : '💾 LIVE UPDATE'}`);
    console.log('=' .repeat(80));

    const result: AuditResult = {
      totalSites: 0,
      corporateProfiles: [],
      indieUpgrades: [],
      summary: {
        corporateFound: 0,
        indieUpgrades: 0,
        falsePositives: 0,
        sitesToUpdate: 0
      }
    };

    // Get all indexed sites that are currently marked as "full_index"
    const sites = await db.indexedSite.findMany({
      where: {
        OR: [
          { indexingPurpose: 'full_index' },
          { indexingPurpose: null }, // Legacy sites without classification
          { platformType: null }     // Legacy sites without platform type
        ]
      },
      select: {
        id: true,
        url: true,
        title: true,
        communityScore: true,
        seedingScore: true,
        indexingPurpose: true,
        platformType: true,
        discoveryMethod: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    result.totalSites = sites.length;
    console.log(`\n📊 Analyzing ${sites.length} indexed sites...\n`);

    for (const site of sites) {
      const classification = domainClassifier.classify(site.url);

      // Check for corporate profiles that shouldn't be indexed
      if (classification.platformType === 'corporate_profile') {
        result.corporateProfiles.push({
          id: site.id,
          url: site.url,
          title: site.title,
          currentScore: site.communityScore || 0,
          platformType: classification.platformType,
          shouldBeExtraction: true
        });
        result.summary.corporateFound++;
      }

      // Check for indie platforms that should get better treatment
      else if (classification.platformType === 'indie_platform' &&
               site.platformType !== 'indie_platform') {
        const currentScore = site.seedingScore || site.communityScore || 0;
        const bonusPoints = Math.floor(currentScore * (classification.scoreModifier - 1.0));

        result.indieUpgrades.push({
          id: site.id,
          url: site.url,
          title: site.title,
          currentScore,
          newPlatformType: classification.platformType,
          scoreBonus: bonusPoints
        });
        result.summary.indieUpgrades++;
      }
    }

    // Calculate false positives (corporate profiles with good scores)
    result.summary.falsePositives = result.corporateProfiles.filter(
      site => site.currentScore > 0
    ).length;

    result.summary.sitesToUpdate = result.corporateProfiles.length + result.indieUpgrades.length;

    this.printAuditResults(result);

    return result;
  }

  /**
   * Print detailed audit results
   */
  private printAuditResults(result: AuditResult): void {
    console.log('\n🚨 CORPORATE PROFILES FOUND (should be link extraction only):');
    console.log('-' .repeat(80));

    if (result.corporateProfiles.length === 0) {
      console.log('✅ No corporate profiles found in search index!');
    } else {
      result.corporateProfiles.slice(0, 10).forEach(site => {
        console.log(`❌ ${site.title}`);
        console.log(`   URL: ${site.url}`);
        console.log(`   Current Score: ${site.currentScore}`);
        console.log(`   Action: Mark for link extraction only`);
        console.log('');
      });

      if (result.corporateProfiles.length > 10) {
        console.log(`... and ${result.corporateProfiles.length - 10} more`);
      }
    }

    console.log('\n🌟 INDIE PLATFORMS TO UPGRADE:');
    console.log('-' .repeat(80));

    if (result.indieUpgrades.length === 0) {
      console.log('✅ All indie platforms already properly classified!');
    } else {
      result.indieUpgrades.slice(0, 10).forEach(site => {
        console.log(`⬆️ ${site.title}`);
        console.log(`   URL: ${site.url}`);
        console.log(`   Current Score: ${site.currentScore}`);
        console.log(`   Platform: ${site.newPlatformType}`);
        console.log(`   Bonus: +${site.scoreBonus} points`);
        console.log('');
      });

      if (result.indieUpgrades.length > 10) {
        console.log(`... and ${result.indieUpgrades.length - 10} more`);
      }
    }

    console.log('\n📈 SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`Total sites analyzed: ${result.totalSites}`);
    console.log(`Corporate profiles found: ${result.summary.corporateFound}`);
    console.log(`  - False positives (good scores): ${result.summary.falsePositives}`);
    console.log(`Indie platforms to upgrade: ${result.summary.indieUpgrades}`);
    console.log(`Total sites needing updates: ${result.summary.sitesToUpdate}`);
    console.log('');
  }

  /**
   * Apply the cleanup (only if not dry run)
   */
  async applyCleanup(auditResult: AuditResult): Promise<void> {
    if (this.dryRun) {
      console.log('🏃 DRY RUN MODE - No changes applied');
      console.log('Run with --apply flag to make actual changes');
      return;
    }

    console.log('\n💾 Applying cleanup changes...\n');

    let updatedCount = 0;

    // Update corporate profiles
    for (const site of auditResult.corporateProfiles) {
      try {
        await db.indexedSite.update({
          where: { id: site.id },
          data: {
            indexingPurpose: 'link_extraction',
            platformType: 'corporate_profile',
            communityScore: -999, // Ensure they don't appear in search
            crawlStatus: 'pending_extraction'
          }
        });

        console.log(`✅ Updated corporate profile: ${site.title}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${site.title}:`, error);
      }
    }

    // Update indie platforms
    for (const site of auditResult.indieUpgrades) {
      try {
        const newScore = site.currentScore + site.scoreBonus;

        await db.indexedSite.update({
          where: { id: site.id },
          data: {
            platformType: 'indie_platform',
            indexingPurpose: 'full_index',
            seedingScore: newScore > 0 ? newScore : site.currentScore
          }
        });

        console.log(`✅ Upgraded indie platform: ${site.title} (+${site.scoreBonus} points)`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${site.title}:`, error);
      }
    }

    console.log(`\n🎉 Cleanup complete! Updated ${updatedCount} sites.`);
  }

  /**
   * Generate detailed report for review
   */
  async generateReport(auditResult: AuditResult): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `audit-report-${timestamp}.json`;

    const report = {
      timestamp: new Date().toISOString(),
      mode: this.dryRun ? 'dry-run' : 'live',
      summary: auditResult.summary,
      corporateProfiles: auditResult.corporateProfiles,
      indieUpgrades: auditResult.indieUpgrades,
      recommendations: this.generateRecommendations(auditResult)
    };

    // In a real implementation, you'd write this to a file
    console.log('\n📋 DETAILED REPORT:');
    console.log('=' .repeat(80));
    console.log(JSON.stringify(report, null, 2));
  }

  /**
   * Generate cleanup recommendations
   */
  private generateRecommendations(result: AuditResult): string[] {
    const recommendations: string[] = [];

    if (result.summary.corporateFound > 0) {
      recommendations.push(
        `Remove ${result.summary.corporateFound} corporate profiles from search index`
      );
    }

    if (result.summary.indieUpgrades > 0) {
      recommendations.push(
        `Upgrade ${result.summary.indieUpgrades} indie platforms with proper classification and score bonuses`
      );
    }

    if (result.summary.falsePositives > 10) {
      recommendations.push(
        'High number of false positives detected - review seeding criteria'
      );
    }

    if (result.summary.corporateFound === 0 && result.summary.indieUpgrades === 0) {
      recommendations.push(
        'Database is clean! No corporate profiles found and indie platforms properly classified.'
      );
    }

    return recommendations;
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply');
  const generateReport = args.includes('--report');

  console.log('🧹 Corporate Profile Database Cleanup Tool');
  console.log('==========================================\n');

  if (!applyChanges) {
    console.log('⚠️  Running in DRY RUN mode');
    console.log('   Use --apply flag to make actual changes');
    console.log('   Use --report flag to generate detailed JSON report\n');
  }

  try {
    const auditor = new DatabaseAuditor(!applyChanges);
    const auditResult = await auditor.auditDatabase();

    if (applyChanges) {
      console.log('\n⚠️  APPLYING CHANGES TO DATABASE...');
      console.log('This will modify your production data!');

      // In production, you might want to add a confirmation prompt here
      await auditor.applyCleanup(auditResult);
    }

    if (generateReport) {
      await auditor.generateReport(auditResult);
    }

    console.log('\n✅ Audit complete!');

    if (!applyChanges && auditResult.summary.sitesToUpdate > 0) {
      console.log(`\n🔄 To apply these changes, run:`);
      console.log(`npx tsx scripts/audit-and-cleanup-corporate-profiles.ts --apply`);
    }

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}