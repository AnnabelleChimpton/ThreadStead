/**
 * Admin API for managing curated sites for the "Surprise Me" feature
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

// Initial default sites to seed the database
const DEFAULT_SITES = [
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check admin auth
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, user);
    case 'POST':
      return handlePost(req, res, user);
    case 'PUT':
      return handlePut(req, res, user);
    case 'DELETE':
      return handleDelete(req, res, user);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { seed } = req.query;

    // Seed with default sites if requested
    if (seed === 'true') {
      const existingCount = await db.curatedSite.count();

      if (existingCount === 0) {
        // Bulk create default sites
        await db.curatedSite.createMany({
          data: DEFAULT_SITES.map(site => ({
            ...site,
            addedBy: user.primaryHandle || 'System'
          }))
        });

        return res.json({
          message: 'Database seeded with default sites',
          count: DEFAULT_SITES.length
        });
      } else {
        return res.json({
          message: 'Database already has curated sites',
          count: existingCount
        });
      }
    }

    // Regular GET - return all sites
    const sites = await db.curatedSite.findMany({
      orderBy: [
        { active: 'desc' },
        { weight: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Get unique tags
    const allTags = new Set<string>();
    sites.forEach(site => {
      site.tags.forEach(tag => allTags.add(tag));
    });

    res.json({
      sites,
      tags: Array.from(allTags).sort(),
      total: sites.length,
      active: sites.filter(s => s.active).length
    });
  } catch (error) {
    console.error('Error fetching curated sites:', error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { url, title, description, tags, weight = 1 } = req.body;

    // Validation
    if (!url || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate URL
    const existing = await db.curatedSite.findUnique({
      where: { url }
    });

    if (existing) {
      return res.status(409).json({ error: 'Site already exists' });
    }

    // Create new site
    const site = await db.curatedSite.create({
      data: {
        url,
        title,
        description,
        tags: tags || [],
        weight,
        addedBy: user.primaryHandle || user.id
      }
    });

    res.json({ success: true, site });
  } catch (error) {
    console.error('Error creating curated site:', error);
    res.status(500).json({ error: 'Failed to create site' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { id, ...updates } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Site ID required' });
    }

    // Update site
    const site = await db.curatedSite.update({
      where: { id },
      data: updates
    });

    res.json({ success: true, site });
  } catch (error) {
    console.error('Error updating curated site:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Site ID required' });
    }

    // Delete site
    await db.curatedSite.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Site deleted' });
  } catch (error) {
    console.error('Error deleting curated site:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
}