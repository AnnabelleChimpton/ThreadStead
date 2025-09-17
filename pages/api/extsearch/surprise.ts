/**
 * Surprise Me API
 * Returns a random interesting site from various sources
 * Inspired by StumbleUpon and the old "I'm Feeling Lucky" spirit
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { runExtSearch } from '@/lib/extsearch/registry';

// Fallback curated list (used only if database is empty)
const FALLBACK_GEMS = [
  {
    url: 'https://solar.lowtechmagazine.com/',
    title: 'LOW←TECH MAGAZINE',
    description: 'A solar-powered website that goes offline when the sun doesn\'t shine',
    tags: ['sustainability', 'tech', 'indie']
  },
  {
    url: 'https://theuselessweb.com/',
    title: 'The Useless Web',
    description: 'Take me to a useless website',
    tags: ['fun', 'random', 'classic']
  },
  {
    url: 'https://neocities.org/browse',
    title: 'Neocities',
    description: 'Bringing back the fun, creativity and independence of the web',
    tags: ['hosting', 'indie', 'creative']
  },
  {
    url: 'https://wiby.me/',
    title: 'Wiby',
    description: 'Search engine for the classic web - pages like it\'s 1999',
    tags: ['search', 'retro', 'discovery']
  },
  {
    url: 'https://sadgrl.online/',
    title: 'Sadgrl Online',
    description: 'Resources for the personal web and indie web revival',
    tags: ['resources', 'webdev', 'indie']
  },
  {
    url: 'https://yesterweb.org/',
    title: 'Yesterweb',
    description: 'Reclaiming the internet as a creative and diverse medium',
    tags: ['community', 'indie', 'manifesto']
  },
  {
    url: 'https://indieweb.org/',
    title: 'IndieWeb',
    description: 'A people-focused alternative to the "corporate web"',
    tags: ['community', 'standards', 'indie']
  },
  {
    url: 'https://1mb.club/',
    title: '1MB Club',
    description: 'Websites that are less than 1 megabyte in size',
    tags: ['performance', 'minimal', 'showcase']
  },
  {
    url: 'https://512kb.club/',
    title: '512KB Club',
    description: 'Even smaller websites - under 512KB',
    tags: ['performance', 'minimal', 'showcase']
  },
  {
    url: 'https://250kb.club/',
    title: '250KB Club',
    description: 'The exclusive club of 250KB websites',
    tags: ['performance', 'minimal', 'showcase']
  },
  {
    url: 'https://webring.xxiivv.com/',
    title: 'XXIIVV Webring',
    description: 'A webring for creatives and developers',
    tags: ['webring', 'creative', 'community']
  },
  {
    url: 'https://hotlinewebring.club/',
    title: 'Hotline Webring',
    description: 'A webring for personal sites with personality',
    tags: ['webring', 'personal', 'community']
  },
  {
    url: 'https://weirdwidewebring.net/',
    title: 'Weird Wide Webring',
    description: 'Celebrating the weird and wonderful web',
    tags: ['webring', 'weird', 'fun']
  },
  {
    url: 'https://gossips.cafe/',
    title: 'Gossip\'s Cafe',
    description: 'A cozy corner of the web',
    tags: ['blog', 'personal', 'cozy']
  },
  {
    url: 'https://thoughts.page/',
    title: 'Thoughts Page',
    description: 'Anonymous thoughts from around the world',
    tags: ['anonymous', 'thoughts', 'community']
  },
  {
    url: 'https://tilde.town/',
    title: 'tilde.town',
    description: 'A public unix server focused on radical creativity',
    tags: ['community', 'unix', 'creative']
  }
];

// Fun search queries for discovering interesting content
const DISCOVERY_QUERIES = [
  'personal blog',
  'indie web',
  'digital garden',
  'web revival',
  'small web',
  'personal website',
  'hobby project',
  'creative coding',
  'web experiments',
  'internet art',
  'retro computing',
  'zine',
  'webring',
  'geocities',
  'old internet',
  'web 1.0',
  'static site',
  'minimal website',
  'diy web',
  'handmade web'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mode = req.query.mode as string || 'mixed'; // 'search', 'curated', 'community', or 'mixed'
    const category = req.query.category as string; // Optional category filter

    let surpriseResult = null;

    // Priority order: curated sites (70%) > community validated (20%) > search discovery (10%)
    const sourceRandom = Math.random();
    let preferredSource = 'curated';

    if (mode === 'mixed') {
      if (sourceRandom < 0.7) {
        preferredSource = 'curated';
      } else if (sourceRandom < 0.9) {
        preferredSource = 'community';
      } else {
        preferredSource = 'search';
      }
    } else {
      preferredSource = mode;
    }

    // Try curated sites first (or if explicitly requested)
    if (preferredSource === 'curated' || !surpriseResult) {
      const where: any = { active: true };

      // Filter by tag if category is provided
      if (category) {
        where.tags = { has: category };
      }

      const curatedSites = await db.curatedSite.findMany({
        where,
        select: {
          id: true,
          url: true,
          title: true,
          description: true,
          tags: true,
          weight: true,
          clickCount: true
        }
      });

      if (curatedSites.length > 0) {
        // Weighted random selection based on weight field
        const totalWeight = curatedSites.reduce((sum, site) => sum + site.weight, 0);
        let random = Math.random() * totalWeight;

        let selectedSite = curatedSites[0];
        for (const site of curatedSites) {
          random -= site.weight;
          if (random <= 0) {
            selectedSite = site;
            break;
          }
        }

        // Increment click count
        await db.curatedSite.update({
          where: { id: selectedSite.id },
          data: { clickCount: { increment: 1 } }
        }).catch(() => {}); // Don't fail if update fails

        surpriseResult = {
          url: selectedSite.url,
          title: selectedSite.title,
          description: selectedSite.description,
          source: 'curated',
          tags: selectedSite.tags
        };
      }
    }

    // Try community-validated sites if no curated result or explicitly requested
    if ((preferredSource === 'community' || !surpriseResult) && preferredSource !== 'search') {
      const communityWhere: any = {
        communityValidated: true,
        communityScore: { gte: 1 } // Only sites with positive community score
      };

      // Filter by category if provided
      if (category) {
        communityWhere.siteType = category;
      }

      const communitySites = await db.indexedSite.findMany({
        where: communityWhere,
        select: {
          id: true,
          url: true,
          title: true,
          description: true,
          siteType: true,
          communityScore: true,
          seedingScore: true,
          extractedKeywords: true
        },
        orderBy: [
          { communityScore: 'desc' },
          { seedingScore: 'desc' }
        ],
        take: 50 // Get top 50 to randomly select from
      });

      if (communitySites.length > 0) {
        // Weighted selection based on community score
        const weights = communitySites.map(site => Math.max(1, site.communityScore + (site.seedingScore || 0) / 10));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        let selectedSite = communitySites[0];
        for (let i = 0; i < communitySites.length; i++) {
          random -= weights[i];
          if (random <= 0) {
            selectedSite = communitySites[i];
            break;
          }
        }

        surpriseResult = {
          url: selectedSite.url,
          title: selectedSite.title,
          description: selectedSite.description || `A ${selectedSite.siteType || 'interesting'} site discovered by the community`,
          source: 'community',
          tags: selectedSite.extractedKeywords || [],
          communityScore: selectedSite.communityScore
        };
      }
    }

    // Fallback to hardcoded gems if still no result
    if (!surpriseResult) {
      const filtered = category
        ? FALLBACK_GEMS.filter(gem => gem.tags.includes(category))
        : FALLBACK_GEMS;

      if (filtered.length > 0) {
        const randomGem = filtered[Math.floor(Math.random() * filtered.length)];
        surpriseResult = {
          url: randomGem.url,
          title: randomGem.title,
          description: randomGem.description,
          source: 'curated',
          tags: randomGem.tags
        };
      }
    }

    // If no curated result yet, try search-based discovery
    if (!surpriseResult && (mode === 'search' || mode === 'mixed')) {
      // Pick a random discovery query
      const randomQuery = DISCOVERY_QUERIES[Math.floor(Math.random() * DISCOVERY_QUERIES.length)];

      // Run a search with the random query
      const searchResults = await runExtSearch({
        q: randomQuery,
        page: Math.floor(Math.random() * 3), // Random page for variety
        perPage: 20
      });

      // Filter for interesting results (indie sites, personal blogs, etc.)
      const interestingResults = searchResults.results.filter(result => {
        // Prefer indie/personal sites
        if (result.isIndieWeb) return true;

        // Check for indie indicators in URL or title
        const indieIndicators = ['blog', 'personal', 'garden', 'notes', 'thoughts', 'projects'];
        const url = result.url.toLowerCase();
        const title = result.title?.toLowerCase() || '';

        return indieIndicators.some(indicator =>
          url.includes(indicator) || title.includes(indicator)
        );
      });

      // Pick a random result
      const pool = interestingResults.length > 0 ? interestingResults : searchResults.results;
      if (pool.length > 0) {
        const randomResult = pool[Math.floor(Math.random() * pool.length)];
        surpriseResult = {
          url: randomResult.url,
          title: randomResult.title,
          description: randomResult.snippet || 'Discovered through random exploration',
          source: 'search',
          searchQuery: randomQuery,
          engine: randomResult.engine
        };
      }
    }

    // Fallback to a curated gem if nothing found
    if (!surpriseResult) {
      // Try database first
      const dbFallback = await db.curatedSite.findFirst({
        where: { active: true },
        orderBy: { weight: 'desc' }
      });

      if (dbFallback) {
        surpriseResult = {
          url: dbFallback.url,
          title: dbFallback.title,
          description: dbFallback.description,
          source: 'curated',
          tags: dbFallback.tags
        };
      } else if (FALLBACK_GEMS.length > 0) {
        // Use hardcoded fallback if database is empty
        const fallback = FALLBACK_GEMS[Math.floor(Math.random() * FALLBACK_GEMS.length)];
        surpriseResult = {
          url: fallback.url,
          title: fallback.title,
          description: fallback.description,
          source: 'curated',
          tags: fallback.tags
        };
      }
    }

    // Add some fun metadata
    const responses = [
      "Here's something interesting!",
      "You might enjoy this...",
      "Down the rabbit hole we go!",
      "A hidden gem from the web:",
      "Discovered something cool:",
      "Your random adventure awaits:",
      "Stumbled upon this for you:",
      "The web spirits have chosen:",
      "Your serendipitous find:",
      "Explore something new:"
    ];

    res.status(200).json({
      success: true,
      message: responses[Math.floor(Math.random() * responses.length)],
      surprise: surpriseResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Surprise API error:', error);

    // Even on error, try to return something from database
    try {
      const dbFallback = await db.curatedSite.findFirst({
        where: { active: true },
        orderBy: { weight: 'desc' }
      });

      if (dbFallback) {
        return res.status(200).json({
          success: true,
          message: "Here's a curated surprise for you!",
          surprise: {
            url: dbFallback.url,
            title: dbFallback.title,
            description: dbFallback.description,
            source: 'curated',
            tags: dbFallback.tags
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (dbError) {
      // Database also failed, use hardcoded fallback
    }

    // Final fallback if both database and search failed
    const fallback = FALLBACK_GEMS[Math.floor(Math.random() * FALLBACK_GEMS.length)];
    res.status(200).json({
      success: true,
      message: "Here's a curated surprise for you!",
      surprise: {
        url: fallback.url,
        title: fallback.title,
        description: fallback.description,
        source: 'curated',
        tags: fallback.tags
      },
      timestamp: new Date().toISOString()
    });
  }
}