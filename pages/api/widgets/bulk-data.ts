import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { widgetRegistry } from '@/components/widgets/registry/WidgetRegistry';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { widgetIds } = req.body;

      if (!Array.isArray(widgetIds) || widgetIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Widget IDs array is required'
        });
      }

      const sessionUser = await getSessionUser(req);

      // Transform user for widget API compatibility
      const user = sessionUser ? {
        id: sessionUser.id,
        did: sessionUser.did,
        role: String(sessionUser.role),
        primaryHandle: sessionUser.primaryHandle
      } : undefined;

      // Get available widgets for user
      const availableWidgets = widgetRegistry.getAvailableForUser(sessionUser);
      const availableWidgetIds = new Set(availableWidgets.map(w => w.config.id));

      // Filter requested widgets to only include accessible ones
      const accessibleWidgetIds = widgetIds.filter(id => availableWidgetIds.has(id));

      // Fetch data for each accessible widget
      const results: Record<string, any> = {};

      await Promise.allSettled(
        accessibleWidgetIds.map(async (widgetId) => {
          const widget = widgetRegistry.get(widgetId);

          if (!widget) {
            results[widgetId] = {
              success: false,
              error: 'Widget not found'
            };
            return;
          }

          if (!widget.fetchData) {
            results[widgetId] = {
              success: true,
              data: null,
              hasData: false
            };
            return;
          }

          try {
            const data = await widget.fetchData(user);
            results[widgetId] = {
              success: true,
              data,
              hasData: true,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error fetching data for widget ${widgetId}:`, error);
            results[widgetId] = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              hasData: true
            };
          }
        })
      );

      // Add results for inaccessible widgets
      const inaccessibleWidgets = widgetIds.filter(id => !availableWidgetIds.has(id));
      inaccessibleWidgets.forEach(widgetId => {
        results[widgetId] = {
          success: false,
          error: 'Access denied or widget not found'
        };
      });

      res.status(200).json({
        success: true,
        results,
        requestedCount: widgetIds.length,
        accessibleCount: accessibleWidgetIds.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in bulk widget data API:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }
}