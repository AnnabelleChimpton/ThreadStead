import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth-server';
import { db } from "@/lib/db";
import { SITE_NAME } from '@/lib/site-config';
import { generateDefaultProfileTemplate, migrateLegacyProfile, TEMPLATE_EXAMPLES } from '@/lib/default-profile-template';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.query;
    
    if (typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }

    if (req.method === 'GET') {
      // Get default template based on user's current setup
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user can access this profile
      const handle = await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: { select: { id: true, primaryHandle: true } } }
      });

      if (!handle) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Only allow access to own template
      const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
      if (currentUsername !== username && user.id !== handle.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Always generate the new default template when requested
      // This is what "Load Default Profile" should do - load the DEFAULT, not the user's current template
      const defaultTemplate = generateDefaultProfileTemplate({
        includeGuestbook: true,
        includeFriends: true,
        includeMedia: true,
        includeBadges: true,
        blogPostLimit: 5,
        customCSS: '',
        cssMode: 'inherit'
      })

      return res.status(200).json({
        template: defaultTemplate.template,
        css: defaultTemplate.css,
        cssMode: defaultTemplate.cssMode,
        examples: TEMPLATE_EXAMPLES
      });

    } else if (req.method === 'POST') {
      // Generate a specific template example
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { templateType, options } = req.body;
      
      let result;
      
      if (templateType && TEMPLATE_EXAMPLES[templateType as keyof typeof TEMPLATE_EXAMPLES]) {
        result = TEMPLATE_EXAMPLES[templateType as keyof typeof TEMPLATE_EXAMPLES];
      } else if (options) {
        result = generateDefaultProfileTemplate(options);
      } else {
        result = generateDefaultProfileTemplate();
      }

      return res.status(200).json(result);

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Default template API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}