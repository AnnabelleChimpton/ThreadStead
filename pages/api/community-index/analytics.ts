/**
 * API endpoint for community analytics dashboard
 * Provides comprehensive metrics and insights
 */

import { apiHandler } from '@/lib/api/handler';
import { CommunityAnalytics } from '@/lib/community-index/analytics/community-analytics';

export default apiHandler(
  { methods: ['GET'], auth: 'none' },
  async (req, res) => {
    try {
      const analytics = new CommunityAnalytics();
      const { type = 'overview', days = '30', granularity = 'day' } = req.query;

      const daysNum = parseInt(days as string) || 30;

      switch (type) {
        case 'overview':
          const metrics = await analytics.getMetrics(daysNum);
          return res.json({
            success: true,
            metrics,
            period: `${daysNum} days`
          });

        case 'timeseries':
          const timeSeriesData = await analytics.getTimeSeriesData(
            daysNum,
            granularity as 'day' | 'week' | 'month'
          );
          return res.json({
            success: true,
            data: timeSeriesData,
            period: `${daysNum} days`,
            granularity
          });

        case 'quality':
          const qualityMetrics = await analytics.getDiscoveryQualityMetrics();
          return res.json({
            success: true,
            quality: qualityMetrics
          });

        case 'health':
          const healthMetrics = await analytics.getCommunityHealth();
          return res.json({
            success: true,
            health: healthMetrics
          });

        default:
          return res.status(400).json({
            error: 'Invalid type. Use: overview, timeseries, quality, or health'
          });
      }

    } catch (error) {
      console.error('Analytics API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);