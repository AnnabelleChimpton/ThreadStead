// Error boundary and debugging components for island rendering

import React, { useState } from 'react';
import type { HydrationDebugInfoProps } from './types';

// Error boundary for islands rendering (P3.3 - Per-Island Error Boundaries)
export class IslandErrorBoundary extends React.Component<
  { children: React.ReactNode; islandId: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; islandId: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Island ${this.props.islandId} rendering error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="island-error-fallback" style={{
          padding: '16px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33'
        }}>
          <h4>Island Error ({this.props.islandId})</h4>
          <p>Something went wrong rendering this component.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer' }}>Error Details</summary>
              <pre style={{
                marginTop: '8px',
                padding: '8px',
                background: '#fdd',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Development hydration debug info component
export function HydrationDebugInfo({
  totalIslands,
  loadedIslands,
  failedIslands,
  isHydrated
}: HydrationDebugInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="hydration-debug-info">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="debug-toggle"
      >
        🏝️ Islands Debug ({loadedIslands.size}/{totalIslands})
      </button>

      {isExpanded && (
        <div className="debug-panel">
          <div className="debug-stats">
            <div>Total Islands: {totalIslands}</div>
            <div>Loaded: {loadedIslands.size}</div>
            <div>Failed: {failedIslands.size}</div>
            <div>Hydrated: {isHydrated ? '✅' : '⏳'}</div>
          </div>

          {failedIslands.size > 0 && (
            <div className="debug-failures">
              <h4>Failed Islands:</h4>
              {Array.from(failedIslands.entries()).map(([islandId, error]) => (
                <div key={islandId} className="debug-failure">
                  <strong>{islandId}:</strong> {error.message}
                </div>
              ))}
            </div>
          )}

          <div className="debug-loaded">
            <h4>Loaded Islands:</h4>
            {Array.from(loadedIslands).map(islandId => (
              <div key={islandId} className="debug-loaded-item">
                ✅ {islandId}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
