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

      // Return widget configurations (without component instances)
      const widgetConfigs = availableWidgets.map(widget => ({
        config: widget.config,
        hasData: !!widget.fetchData
      }));

      res.status(200).json({
        success: true,
        widgets: widgetConfigs,
        count: widgetConfigs.length
      });

    } catch (error) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch widgets'
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