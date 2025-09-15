import React from 'react';
import { WidgetSize } from '../types/widget';

interface WidgetCardProps {
  title: string;
  size: WidgetSize;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export default function WidgetCard({
  title,
  size,
  isLoading = false,
  error = null,
  onRefresh,
  children
}: WidgetCardProps) {
  return (
    <div className="widget-card h-fit">
      <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 w-full max-w-full overflow-hidden h-full">
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#2E4B3F]">{title}</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              aria-label="Refresh widget"
            >
              {isLoading ? '⟳' : '↻'}
            </button>
          )}
        </div>

        {/* Widget Content */}
        <div className="widget-content">
          {error ? (
            <div className="text-center py-4">
              <div className="text-red-600 text-sm mb-2">⚠️ {error}</div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Try again
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="text-center py-4 text-gray-500">
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}