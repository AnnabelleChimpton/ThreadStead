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

export default function BaseWidget({
  config,
  user,
  fetchData,
  children
}: BaseWidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    loadData();
  }, [user?.id, config.id]);

  // Auto-refresh if interval is set
  useEffect(() => {
    if (!config.refreshInterval || config.refreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (!isLoading) {
        loadData();
      }
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.refreshInterval, isLoading]);

  return (
    <div className="widget-container">
      {children({ data, isLoading, error, refresh })}
    </div>
  );
}