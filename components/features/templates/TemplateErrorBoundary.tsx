/**
 * TemplateErrorBoundary Component
 * Critical Error Handler for Template System
 *
 * Catches ALL runtime errors in template components and provides graceful fallback UI
 * PREVENTS users from seeing runtime errors during compilation
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface TemplateErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackMessage?: string;
  showDetails?: boolean;
}

interface TemplateErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
  errorCount: number;
}

/**
 * Error boundary that catches ALL template-related runtime errors
 * and provides graceful, user-friendly fallback UI
 *
 * CRITICAL: This prevents users from seeing red error screens
 */
export default class TemplateErrorBoundary extends Component<
  TemplateErrorBoundaryProps,
  TemplateErrorBoundaryState
> {
  constructor(props: TemplateErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<TemplateErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Increment error count for tracking
    this.setState((prev) => ({
      componentStack: errorInfo.componentStack || undefined,
      errorCount: prev.errorCount + 1,
    }));

    // Always log errors for developer debugging
    console.group('🚨 Template Runtime Error (Caught by Error Boundary)');
    console.error('Component:', this.props.componentName || 'Template');
    console.error('Error:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In development, provide more detailed logging
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Template Error Analysis');
      console.log('Possible causes:');

      if (error.message.includes('undefined')) {
        console.log('- Missing required prop (check var, name, item props)');
        console.log('- Variable not registered with <Var> component');
        console.log('- Typo in variable name');
      }

      if (error.message.includes('null')) {
        console.log('- Component received null when it expected a value');
        console.log('- Check data flow and prop passing');
      }

      if (error.message.includes('is not a function')) {
        console.log('- Attempted to call something that isn\'t a function');
        console.log('- Check component registration and imports');
      }

      console.log('\n💡 Quick fixes:');
      console.log('1. Verify all <ForEach> have var="..." and item="..." props');
      console.log('2. Verify all <Validate> are inside <TInput> or have var="..." prop');
      console.log('3. Verify all <ShowVar> have name="..." prop');
      console.log('4. Check that all variables are declared with <Var>');
      console.groupEnd();
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      componentStack: undefined
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { showDetails = true } = this.props;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div
          style={{
            padding: '20px',
            margin: '16px 0',
            border: '3px solid #dc2626',
            borderRadius: '12px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '28px' }}>🚨</span>
            <div>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
                Template Error
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>
                {this.props.componentName || 'A template component'} encountered an error
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.6' }}>
              {this.props.fallbackMessage ||
               'An error occurred while rendering this template. The template may have invalid configuration or missing required properties.'}
            </p>
          </div>

          {/* Common Issues Checklist */}
          <details style={{ marginBottom: '16px' }}>
            <summary
              style={{
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '8px 0',
                color: '#dc2626',
              }}
            >
              ✓ Common Issues Checklist
            </summary>
            <ul
              style={{
                marginTop: '8px',
                marginBottom: '0',
                paddingLeft: '24px',
                fontSize: '12px',
                lineHeight: '1.8',
              }}
            >
              <li>All <code>&lt;ForEach&gt;</code> components have <code>var=&quot;...&quot;</code> and <code>item=&quot;...&quot;</code> props</li>
              <li>All <code>&lt;Validate&gt;</code> components are inside <code>&lt;TInput&gt;</code> or have <code>var=&quot;...&quot;</code> prop</li>
              <li>All <code>&lt;ShowVar&gt;</code> components have <code>name=&quot;...&quot;</code> prop</li>
              <li>All variables are declared with <code>&lt;Var name=&quot;...&quot; type=&quot;...&quot; /&gt;</code></li>
              <li>Variable names match exactly (case-sensitive)</li>
              <li>All required props are provided</li>
            </ul>
          </details>

          {/* Error Details (Development Only) */}
          {isDevelopment && showDetails && (
            <details style={{ marginBottom: '16px' }}>
              <summary
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '8px 0',
                  color: '#dc2626',
                }}
              >
                🔍 Error Details (Development Only)
              </summary>
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                <strong>Error Message:</strong>
                <br />
                {this.state.error.message}
                <br />
                <br />
                <strong>Error Type:</strong>
                <br />
                {this.state.error.name}
                <br />
                <br />
                {this.state.error.stack && (
                  <>
                    <strong>Stack Trace:</strong>
                    <br />
                    {this.state.error.stack}
                    <br />
                    <br />
                  </>
                )}
                {this.state.componentStack && (
                  <>
                    <strong>Component Stack:</strong>
                    <br />
                    {this.state.componentStack}
                  </>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.2s',
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

            <span style={{ fontSize: '12px', opacity: 0.7 }}>
              Error count: {this.state.errorCount}
            </span>

            {isDevelopment && (
              <span style={{ fontSize: '11px', opacity: 0.6, fontStyle: 'italic' }}>
                Check browser console for detailed logs
              </span>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with TemplateErrorBoundary
 */
export function withTemplateErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  fallbackMessage?: string
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <TemplateErrorBoundary
      componentName={componentName}
      fallbackMessage={fallbackMessage}
    >
      <WrappedComponent {...props} />
    </TemplateErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withTemplateErrorBoundary(${
    componentName || WrappedComponent.displayName || WrappedComponent.name
  })`;

  return ComponentWithErrorBoundary;
}
