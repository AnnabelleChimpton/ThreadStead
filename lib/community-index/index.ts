/**
 * Community Index Main Module
 * Central exports for the community indexing system
 */

// Seeding exports
export { CommunityIndexSeeder } from './seeding/seeder';
export { SeedingFilter } from './seeding/quality-filter';
export {
  DISCOVERY_QUERIES,
  SiteType,
  selectDailyQueries,
  getQueriesByPriority,
  getQueriesByCategory,
  getHighPriorityQueries
} from './seeding/discovery-queries';

// Types
export type { SeedingQuery } from './seeding/discovery-queries';
export type { SeedingScore, SiteEvaluation } from './seeding/quality-filter';
export type { SeedingReport, SeedingOptions } from './seeding/seeder';

// Re-export useful database types
export type IndexedSite = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  submittedBy: string | null;
  discoveredAt: Date;
  discoveryMethod: string;
  discoveryContext: string | null;
  contentSample: string | null;
  extractedKeywords: string[];
  detectedLanguage: string | null;
  siteType: string | null;
  lastCrawled: Date | null;
  crawlStatus: string;
  contentHash: string | null;
  sslEnabled: boolean | null;
  responseTimeMs: number | null;
  lastModified: Date | null;
  communityScore: number;
  totalVotes: number;
  verifiedBy: string | null;
  featured: boolean;
  seedingScore: number | null;
  seedingReasons: string[];
  communityValidated: boolean;
  validationVotes: number;
  outboundLinks: string[];
  inboundLinks: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type SiteVote = {
  id: string;
  siteId: string;
  userId: string;
  voteType: string;
  comment: string | null;
  createdAt: Date;
};

export type SiteTag = {
  id: string;
  siteId: string;
  tag: string;
  suggestedBy: string;
  votes: number;
  createdAt: Date;
};