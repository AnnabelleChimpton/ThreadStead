import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

/**
 * API endpoint for cleaning up blocked sites from the index
 *
 * POST /api/admin/blocked-sites/cleanup?dryRun=true  - Preview cleanup (default)
 * POST /api/admin/blocked-sites/cleanup?dryRun=false - Execute cleanup
 */

interface CleanupReportSite {
  url: string;
  title: string;
  category: string;
}

interface CleanupReport {
  mode: 'dry_run' | 'executed';
  totalScanned: {
    indexedSites: number;
    crawlQueue: number;
  };
  affectedSites: {
    indexedSites: CleanupReportSite[];
    crawlQueueUrls: string[];
  };
  summary: {
    [category: string]: {
      indexedSites: number;
      crawlQueue: number;
    };
  };
  totalAffected: {
    indexedSites: number;
    crawlQueue: number;
  };
  timestamp: string;
}

function categorizeUrl(url: string, blockedDomains: Map<string, string>): string | null {
  const urlLower = url.toLowerCase();

  for (const [domain, category] of blockedDomains.entries()) {
    if (urlLower.includes(domain)) {
      return category;
    }
  }

  return null;
}

async function performCleanup(dryRun: boolean = true): Promise<CleanupReport> {
  console.log(`🧹 Starting cleanup (${dryRun ? 'DRY RUN' : 'EXECUTE'})...`);

  // Get all blocked sites from database
  const blockedSites = await db.blockedSite.findMany({
    select: {
      domain: true,
      category: true
    }
  });

  // Create a map of domain -> category for fast lookup
  const blockedDomains = new Map<string, string>(
    blockedSites.map(site => [site.domain, site.category])
  );

  // Scan IndexedSite table
  const allIndexedSites = await db.indexedSite.findMany({
    select: {
      id: true,
      url: true,
      title: true,
      indexingPurpose: true
    }
  });

  // Scan CrawlQueue
  const allQueueItems = await db.crawlQueue.findMany({
    select: {
      id: true,
      url: true
    }
  });

  console.log(`📊 Scanned ${allIndexedSites.length} indexed sites and ${allQueueItems.length} queue items`);

  // Find affected sites
  const affectedIndexedSites: CleanupReportSite[] = [];
  const affectedQueueUrls: string[] = [];
  const summary: CleanupReport['summary'] = {};

  // Check IndexedSite entries
  for (const site of allIndexedSites) {
    const category = categorizeUrl(site.url, blockedDomains);
    if (category) {
      affectedIndexedSites.push({
        url: site.url,
        title: site.title,
        category
      });

      if (!summary[category]) {
        summary[category] = { indexedSites: 0, crawlQueue: 0 };
      }
      summary[category].indexedSites++;
    }
  }

  // Check CrawlQueue entries
  for (const item of allQueueItems) {
    const category = categorizeUrl(item.url, blockedDomains);
    if (category) {
      affectedQueueUrls.push(item.url);

      if (!summary[category]) {
        summary[category] = { indexedSites: 0, crawlQueue: 0 };
      }
      summary[category].crawlQueue++;
    }
  }

  console.log(`🎯 Found ${affectedIndexedSites.length} indexed sites and ${affectedQueueUrls.length} queue items to clean`);

  // Execute cleanup if not dry run
  if (!dryRun) {
    console.log('🚀 Executing cleanup...');

    // Update IndexedSite records
    if (affectedIndexedSites.length > 0) {
      const affectedUrls = affectedIndexedSites.map(site => site.url);
      await db.indexedSite.updateMany({
        where: {
          url: { in: affectedUrls }
        },
        data: {
          crawlStatus: 'rejected',
          communityValidated: false,
          communityScore: -999,
          indexingPurpose: 'rejected',
          platformType: 'corporate_generic'
        }
      });
      console.log(`✅ Updated ${affectedIndexedSites.length} IndexedSite records`);
    }

    // Delete CrawlQueue entries
    if (affectedQueueUrls.length > 0) {
      await db.crawlQueue.deleteMany({
        where: {
          url: { in: affectedQueueUrls }
        }
      });
      console.log(`✅ Deleted ${affectedQueueUrls.length} CrawlQueue entries`);
    }

    console.log('✨ Cleanup executed successfully!');
  } else {
    console.log('💡 Dry run mode - no changes made');
  }

  // Build report
  const report: CleanupReport = {
    mode: dryRun ? 'dry_run' : 'executed',
    totalScanned: {
      indexedSites: allIndexedSites.length,
      crawlQueue: allQueueItems.length
    },
    affectedSites: {
      indexedSites: affectedIndexedSites,
      crawlQueueUrls: affectedQueueUrls
    },
    summary,
    totalAffected: {
      indexedSites: affectedIndexedSites.length,
      crawlQueue: affectedQueueUrls.length
    },
    timestamp: new Date().toISOString()
  };

  return report;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupReport | { error: string }>
) {
  // Require admin authentication
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Check for dryRun query parameter (default to true for safety)
    const dryRun = req.query.dryRun !== 'false';

    console.log(`\n🧹 Cleanup request received (dryRun=${dryRun})`);

    const report = await performCleanup(dryRun);

    res.status(200).json(report);
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to perform cleanup' });
  }
}
