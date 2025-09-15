import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { widgetRegistry } from '@/components/widgets/registry/WidgetRegistry';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const sessionUser = await getSessionUser(req);

      // Get available widgets for the current user
      const availableWidgets = widgetRegistry.getAvailableForUser(sessionUser);

      // Group widgets by category
      const categories: Record<string, any[]> = {};

      availableWidgets.forEach(widget => {
        const category = widget.config.category;
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push({
          config: widget.config,
          hasData: !!widget.fetchData
        });
      });

      // Create category summary
      const categorySummary = Object.entries(categories).map(([name, widgets]) => ({
        name,
        count: widgets.length,
        widgets: widgets.map(w => ({
          id: w.config.id,
          title: w.config.title,
          size: w.config.size,
          requiresAuth: w.config.requiresAuth,
          adminOnly: w.config.adminOnly || false,
          hasData: w.hasData
        }))
      }));

      res.status(200).json({
        success: true,
        categories: categorySummary,
        totalWidgets: availableWidgets.length
      });

    } catch (error) {
      console.error('Error fetching widget categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch widget categories'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }
}