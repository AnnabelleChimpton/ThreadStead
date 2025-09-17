/**
 * Discovery queries for seeding the community index
 * Based on the Community Indexing Architecture document
 */

export interface SeedingQuery {
  query: string;
  category: SiteType;
  priority: number; // 1-5, how likely to find good sites
  expectedResults: number;
}

export enum SiteType {
  PERSONAL_BLOG = 'personal_blog',
  PORTFOLIO = 'portfolio',
  PROJECT = 'project',
  COMMUNITY = 'community',
  RESOURCE = 'resource',
  TOOL = 'tool',
  ART = 'art',
  DOCUMENTATION = 'documentation',
  ZINE = 'zine',
  OTHER = 'other'
}

export const DISCOVERY_QUERIES: SeedingQuery[] = [
  // Personal blogs and gardens
  { query: "personal blog", category: SiteType.PERSONAL_BLOG, priority: 4, expectedResults: 50 },
  { query: "digital garden", category: SiteType.PERSONAL_BLOG, priority: 5, expectedResults: 30 },
  { query: "now page", category: SiteType.PERSONAL_BLOG, priority: 5, expectedResults: 20 },
  { query: "personal website", category: SiteType.PERSONAL_BLOG, priority: 4, expectedResults: 40 },
  { query: "dev blog", category: SiteType.PERSONAL_BLOG, priority: 4, expectedResults: 35 },
  { query: "tech blog", category: SiteType.PERSONAL_BLOG, priority: 3, expectedResults: 45 },
  { query: "personal journal", category: SiteType.PERSONAL_BLOG, priority: 4, expectedResults: 25 },

  // Creative projects
  { query: "weekend project", category: SiteType.PROJECT, priority: 4, expectedResults: 30 },
  { query: "side project", category: SiteType.PROJECT, priority: 4, expectedResults: 35 },
  { query: "creative coding", category: SiteType.ART, priority: 4, expectedResults: 25 },
  { query: "hobby project", category: SiteType.PROJECT, priority: 4, expectedResults: 30 },
  { query: "web experiments", category: SiteType.ART, priority: 4, expectedResults: 20 },
  { query: "internet art", category: SiteType.ART, priority: 5, expectedResults: 15 },
  { query: "generative art", category: SiteType.ART, priority: 4, expectedResults: 20 },

  // Portfolios and showcases
  { query: "developer portfolio", category: SiteType.PORTFOLIO, priority: 3, expectedResults: 40 },
  { query: "design portfolio", category: SiteType.PORTFOLIO, priority: 3, expectedResults: 35 },
  { query: "creative portfolio", category: SiteType.PORTFOLIO, priority: 4, expectedResults: 30 },
  { query: "personal portfolio", category: SiteType.PORTFOLIO, priority: 3, expectedResults: 45 },

  // Indie web infrastructure
  { query: "indie web", category: SiteType.COMMUNITY, priority: 5, expectedResults: 30 },
  { query: "webring", category: SiteType.COMMUNITY, priority: 5, expectedResults: 25 },
  { query: "small web", category: SiteType.COMMUNITY, priority: 4, expectedResults: 20 },
  { query: "indieweb", category: SiteType.COMMUNITY, priority: 5, expectedResults: 25 },
  { query: "personal web", category: SiteType.COMMUNITY, priority: 4, expectedResults: 30 },

  // Tools and resources
  { query: "web tool", category: SiteType.TOOL, priority: 3, expectedResults: 25 },
  { query: "developer tool", category: SiteType.TOOL, priority: 3, expectedResults: 30 },
  { query: "web resource", category: SiteType.RESOURCE, priority: 3, expectedResults: 35 },
  { query: "learning resource", category: SiteType.RESOURCE, priority: 3, expectedResults: 40 },
  { query: "reference site", category: SiteType.RESOURCE, priority: 3, expectedResults: 30 },

  // Retro and nostalgic
  { query: "90s website", category: SiteType.OTHER, priority: 4, expectedResults: 10 },
  { query: "retro computing", category: SiteType.RESOURCE, priority: 4, expectedResults: 15 },
  { query: "vintage web", category: SiteType.OTHER, priority: 4, expectedResults: 12 },
  { query: "web 1.0", category: SiteType.OTHER, priority: 4, expectedResults: 15 },
  { query: "geocities style", category: SiteType.OTHER, priority: 4, expectedResults: 8 },

  // Publications and writing
  { query: "zine", category: SiteType.ZINE, priority: 5, expectedResults: 15 },
  { query: "web zine", category: SiteType.ZINE, priority: 5, expectedResults: 12 },
  { query: "online magazine", category: SiteType.ZINE, priority: 3, expectedResults: 20 },
  { query: "independent publication", category: SiteType.ZINE, priority: 4, expectedResults: 18 },

  // Minimalism and performance
  { query: "minimal website", category: SiteType.OTHER, priority: 4, expectedResults: 15 },
  { query: "static site", category: SiteType.OTHER, priority: 3, expectedResults: 25 },
  { query: "lightweight website", category: SiteType.OTHER, priority: 4, expectedResults: 20 },
  { query: "no javascript", category: SiteType.OTHER, priority: 4, expectedResults: 12 },

  // Alternative platforms
  { query: "neocities", category: SiteType.COMMUNITY, priority: 5, expectedResults: 30 },
  { query: "tilde club", category: SiteType.COMMUNITY, priority: 5, expectedResults: 15 },
  { query: "self hosted", category: SiteType.OTHER, priority: 4, expectedResults: 25 },

  // Documentation and knowledge
  { query: "personal wiki", category: SiteType.DOCUMENTATION, priority: 4, expectedResults: 20 },
  { query: "knowledge base", category: SiteType.DOCUMENTATION, priority: 3, expectedResults: 30 },
  { query: "personal notes", category: SiteType.DOCUMENTATION, priority: 4, expectedResults: 25 },

  // Community and social
  { query: "community site", category: SiteType.COMMUNITY, priority: 3, expectedResults: 30 },
  { query: "forum", category: SiteType.COMMUNITY, priority: 2, expectedResults: 40 },
  { query: "discussion board", category: SiteType.COMMUNITY, priority: 2, expectedResults: 35 }
];

/**
 * Get queries by priority level
 */
export function getQueriesByPriority(minPriority: number = 1): SeedingQuery[] {
  return DISCOVERY_QUERIES.filter(q => q.priority >= minPriority)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get queries by category
 */
export function getQueriesByCategory(category: SiteType): SeedingQuery[] {
  return DISCOVERY_QUERIES.filter(q => q.category === category);
}

/**
 * Get high-priority queries for daily seeding
 */
export function getHighPriorityQueries(): SeedingQuery[] {
  return getQueriesByPriority(4);
}

/**
 * Select random queries for daily seeding
 */
export function selectDailyQueries(count: number = 5): SeedingQuery[] {
  const highPriority = getHighPriorityQueries();
  const shuffled = [...highPriority].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}