/**
 * API endpoint for tracking discovery events
 * Called when users navigate to indexed sites
 */

import { apiHandler } from '@/lib/api/handler';
import { DiscoveryPathTracker } from '@/lib/community-index/discovery/path-tracker';

export default apiHandler(
  {
    methods: ['POST'],
    auth: 'optional',
    // no CSRF today: anonymous visitors, plain fetch and navigator.sendBeacon
    csrf: false,
  },
  async (req, res, { user }) => {
    try {
      // Logged-out visitors are allowed, but only signed-in clicks get a path record
      const userId = user?.id ?? null;

      const {
        fromSite,
        toSite,
        discoveryMethod,
        sessionId,
        metadata
      } = req.body;

      // Validate required fields
      if (!toSite || !discoveryMethod) {
        return res.status(400).json({
          error: 'toSite and discoveryMethod are required'
        });
      }

      // Validate discovery method
      const validMethods = [
        'link_click',
        'search_result',
        'webring',
        'random',
        'surprise',
        'validation',
        'direct',
        'recommendation',
        'discovery_feed'
      ];

      if (!validMethods.includes(discoveryMethod)) {
        return res.status(400).json({
          error: 'Invalid discovery method'
        });
      }

      // Track the discovery
      const tracker = new DiscoveryPathTracker();
      await tracker.trackDiscovery({
        fromSite,
        toSite,
        discoveredBy: userId,
        discoveryMethod,
        sessionId,
        metadata
      });

      return res.json({
        success: true,
        message: 'Discovery tracked successfully'
      });

    } catch (error) {
      console.error('Discovery tracking error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);