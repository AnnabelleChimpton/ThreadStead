import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from '@/lib/config/site/constants';
import { generateDefaultProfileTemplate, TEMPLATE_EXAMPLES } from '@/lib/templates/default-profile-template';
import { apiHandler } from '@/lib/api/handler';
import { resolveCSSMode } from '@/lib/utils/css/css-mode';

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'user', rateLimit: 'profile_toggles' },
  async (req, res, { user }) => {
    try {
      const { username } = req.query;
    
      if (typeof username !== 'string') {
        return res.status(400).json({ error: 'Invalid username' });
      }

      if (req.method === 'GET') {
        // Get default template based on user's current setup
        // Check if user can access this profile
        const handle = await db.handle.findFirst({
          where: { handle: username, host: SITE_NAME },
          include: {
            user: {
              select: {
                id: true,
                primaryHandle: true,
                profile: { select: { customCSS: true, cssMode: true } },
              },
            },
          },
        });

        if (!handle) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Only allow access to own template
        const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
        if (currentUsername !== username && user.id !== handle.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // A fresh default layout, but the person's saved CSS comes with it.
        // Loading the default used to blank the stylesheet, so one save
        // silently replaced their theme.
        const profile = handle.user.profile;
        const savedCSS = profile?.customCSS ?? '';
        const defaultTemplate = generateDefaultProfileTemplate({
          includeGuestbook: true,
          includeFriends: true,
          includeMedia: true,
          includeBadges: true,
          blogPostLimit: 5,
          customCSS: savedCSS,
          cssMode: resolveCSSMode(profile?.cssMode),
        });

        return res.status(200).json({
          template: defaultTemplate.template,
          css: defaultTemplate.css,
          cssMode: defaultTemplate.cssMode,
          examples: TEMPLATE_EXAMPLES
        });

      } else if (req.method === 'POST') {
        // Generate a specific template example
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

      }

    } catch (error) {
      console.error('Default template API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
