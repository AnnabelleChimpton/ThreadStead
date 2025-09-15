import { ReactNode } from 'react';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetCategory = 'social' | 'community' | 'personal' | 'utility' | 'external';

export interface WidgetConfig {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  size: WidgetSize;
  requiresAuth: boolean;
  adminOnly?: boolean;
  defaultEnabled: boolean;
  refreshInterval?: number; // in milliseconds
  settings?: Record<string, any>;
}

export interface WidgetProps {
  config: WidgetConfig;
  user?: {
    id: string;
    did: string;
    role: string;
    primaryHandle: string | null;
  };
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export interface WidgetData {
  [key: string]: any;
}

export interface Widget {
  config: WidgetConfig;
  component: React.ComponentType<WidgetProps & { data?: WidgetData }>;
  fetchData?: (user?: WidgetProps['user']) => Promise<WidgetData>;
}

export interface WidgetContainerProps {
  widgets: Widget[];
  user?: WidgetProps['user'];
  layout?: 'grid' | 'stack';
  maxColumns?: number;
}