import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { widgetRegistry } from '@/components/widgets/registry/WidgetRegistry';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Widget ID is required'
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

      // Get the widget from registry
      const widget = widgetRegistry.get(id);

      if (!widget) {
        return res.status(404).json({
          success: false,
          error: 'Widget not found'
        });
      }

      // Check if user has access to this widget
      const availableWidgets = widgetRegistry.getAvailableForUser(sessionUser);
      const hasAccess = availableWidgets.some(w => w.config.id === id);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this widget'
        });
      }

      // Check if widget has fetchData function
      if (!widget.fetchData) {
        return res.status(400).json({
          success: false,
          error: 'Widget does not support data refresh'
        });
      }

      // Force refresh widget data
      let data = null;
      let error = null;

      try {
        data = await widget.fetchData(user);
      } catch (fetchError) {
        console.error(`Error refreshing data for widget ${id}:`, fetchError);
        error = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      }

      res.status(200).json({
        success: true,
        widgetId: id,
        data,
        error,
        refreshed: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in widget refresh API:', error);
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