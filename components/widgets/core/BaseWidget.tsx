import React, { useState, useEffect } from 'react';
import { WidgetProps, WidgetData } from '../types/widget';

interface BaseWidgetProps extends WidgetProps {
  data?: WidgetData;
  fetchData?: (user?: WidgetProps['user']) => Promise<WidgetData>;
  children: (props: {
    data: WidgetData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
  }) => React.ReactNode;
}

// .widget-container is the site theme's card hook; the utilities are the
// fallback look when no site CSS is loaded (the site CSS overrides them).
export const widgetFrameClassName =
  'widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy p-3 sm:p-4';

export default function BaseWidget({
  config,
  user,
  fetchData,
  children
}: BaseWidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch by only running after client hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadData = async () => {
    if (!fetchData) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchData(user);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load widget data');
      console.error(`Widget ${config.id} error:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    loadData();
  };

  useEffect(() => {
    // Only start loading data after client hydration
    if (isClient) {
      loadData();
    }
  }, [isClient, user?.id, config.id]);

  // Auto-refresh if interval is set (only after client hydration)
  useEffect(() => {
    if (!isClient || !config.refreshInterval || config.refreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (!isLoading) {
        loadData();
      }
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [isClient, config.refreshInterval, isLoading]);

  return (
    <div className={widgetFrameClassName}>
      {children({ data, isLoading, error, refresh })}
    </div>
  );
}