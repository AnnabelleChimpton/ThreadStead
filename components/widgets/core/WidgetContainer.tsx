import React from 'react';
import { WidgetContainerProps } from '../types/widget';
import BaseWidget from './BaseWidget';
import WidgetCard from './WidgetCard';

export default function WidgetContainer({
  widgets,
  user,
  layout = 'grid',
  maxColumns = 2
}: WidgetContainerProps) {
  if (widgets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No widgets available</p>
      </div>
    );
  }

  const getLayoutClasses = () => {
    if (layout === 'stack') {
      return 'space-y-4';
    }

    // Use CSS columns for masonry-style layout on larger screens
    if (maxColumns === 2) {
      return 'columns-1 lg:columns-2 gap-4 space-y-4';
    }
    if (maxColumns === 3) {
      return 'columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4';
    }

    // Fallback to flex for single column
    return 'flex flex-col gap-4';
  };

  const getWidgetClasses = (size: string) => {
    if (layout === 'stack' || maxColumns === 1) {
      return 'w-full';
    }

    // For CSS columns layout, widgets should break inside properly
    return 'w-full break-inside-avoid mb-4';
  };

  return (
    <div className={`widget-stack ${getLayoutClasses()}`}>
      {widgets.map((widget) => {
        const WidgetComponent = widget.component;

        return (
          <div
            key={widget.config.id}
            className={getWidgetClasses(widget.config.size)}
          >
            <BaseWidget
              config={widget.config}
              user={user}
              fetchData={widget.fetchData}
            >
              {({ data, isLoading, error, refresh }) => (
                <WidgetCard
                  title={widget.config.title}
                  size={widget.config.size}
                  isLoading={isLoading}
                  error={error}
                  onRefresh={widget.fetchData ? refresh : undefined}
                >
                  <WidgetComponent
                    config={widget.config}
                    user={user}
                    data={data || undefined}
                    isLoading={isLoading}
                    error={error}
                    onRefresh={refresh}
                  />
                </WidgetCard>
              )}
            </BaseWidget>
          </div>
        );
      })}
    </div>
  );
}