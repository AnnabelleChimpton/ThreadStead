/**
 * StyleErrorBoundary Component
 * Phase 2: CSS Validation Layer
 *
 * Error boundary specifically for CSS styling issues
 * Catches rendering errors caused by invalid CSS and provides fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface StyleErrorBoundaryProps {
  children: ReactNode;
  componentId?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackMessage?: string;
}

interface StyleErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

/**
 * Error boundary that catches CSS-related rendering errors
 * and provides a graceful fallback UI
 */
export default class StyleErrorBoundary extends Component<
  StyleErrorBoundaryProps,
  StyleErrorBoundaryState
> {
  constructor(props: StyleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): StyleErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.warn('StyleErrorBoundary caught an error:', error, errorInfo);

    // Store component stack for debugging
    this.setState({
      componentStack: errorInfo.componentStack || undefined
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In development, provide more detailed logging
    if (process.env.NODE_ENV === 'development') {
      console.group('🎨 CSS Style Error Details');
      console.error('Error:', error.message);
      console.error('Component ID:', this.props.componentId || 'unknown');
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Stack:', error.stack);
      console.groupEnd();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, componentStack: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          margin: '8px 0',
          border: '2px solid #f87171',
          borderRadius: '8px',
          backgroundColor: '#fef2f2',
          color: '#dc2626'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
              CSS Styling Error
            </h4>
          </div>

          <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.4' }}>
            {this.props.fallbackMessage ||
             'A styling error occurred while rendering this component. This is usually caused by invalid CSS values.'}
          </p>

          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginBottom: '12px' }}>
              <summary style={{
                fontSize: '12px',
                cursor: 'pointer',
                padding: '4px 0',
                fontWeight: '500'
              }}>
                🔍 Error Details (Development)
              </summary>
              <div style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: '100px'
              }}>
                <strong>Component:</strong> {this.props.componentId || 'unknown'}<br/>
                <strong>Error:</strong> {this.state.error.message}<br/>
                {this.state.componentStack && (
                  <>
                    <strong>Stack:</strong><br/>
                    {this.state.componentStack}
                  </>
                )}
              </div>
            </details>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
            >
              🔄 Try Again
            </button>

            <span style={{ fontSize: '11px', opacity: 0.7 }}>
              💡 Check the CSS Styling section for invalid values
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with StyleErrorBoundary
 */
export function withStyleErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <StyleErrorBoundary
      componentId={componentName}
      fallbackMessage={`Error rendering ${componentName || 'component'} with current styles.`}
    >
      <WrappedComponent {...props} />
    </StyleErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withStyleErrorBoundary(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
}

/**
 * Hook to manually trigger error boundary reset from child components
 */
export function useStyleErrorReset() {
  const [, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const triggerError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  return { resetError, triggerError };
}