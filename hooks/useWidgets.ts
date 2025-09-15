import { useState, useEffect } from 'react';
import { Widget } from '@/components/widgets/types/widget';
import { widgetRegistry } from '@/components/widgets/registry/WidgetRegistry';

interface UseWidgetsOptions {
  enabledWidgetIds?: string[];
  user?: { role: string } | null;
  category?: string;
}

export function useWidgets({
  enabledWidgetIds,
  user,
  category
}: UseWidgetsOptions = {}) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    let availableWidgets: Widget[];

    if (enabledWidgetIds) {
      // Get only enabled widgets
      availableWidgets = widgetRegistry.getEnabledWidgets(enabledWidgetIds, user);
    } else if (category) {
      // Get widgets by category
      availableWidgets = widgetRegistry.getByCategory(category)
        .filter(widget => {
          // Apply user filters
          if (widget.config.requiresAuth && !user) return false;
          if (widget.config.adminOnly && user?.role !== 'admin') return false;
          return true;
        });
    } else {
      // Get all available widgets for user
      availableWidgets = widgetRegistry.getAvailableForUser(user);
    }

    setWidgets(availableWidgets);
    setLoading(false);
  }, [enabledWidgetIds, user?.role, category]);

  return {
    widgets,
    loading,
    registry: widgetRegistry
  };
}

export function useDefaultWidgets(user?: { role: string } | null) {
  const defaultWidgetIds = [
    'new-neighbors',
    'threadring-activity',
    'friend-activity',
    'trending-content',
    'pixel-homes-neighborhood',
    'welcome'
  ];

  return useWidgets({
    enabledWidgetIds: defaultWidgetIds,
    user
  });
}