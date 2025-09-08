// Profile-aware island wrapper for template components
import React, { Suspense, useMemo, useState, useEffect } from 'react';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import type { ProfileMode } from '@/components/core/profile/ProfileModeRenderer';

// Island wrapper props interface
export interface ProfileIslandWrapperProps {
  componentType: string;
  props: Record<string, unknown>;
  residentData: ResidentData;
  profileMode: ProfileMode;
  islandId: string;
  onError?: (error: Error, islandId: string) => void;
  onRender?: (islandId: string) => void;
}

// Island loading states
type IslandState = 'loading' | 'ready' | 'error' | 'not-found';

// Island wrapper component
export default function ProfileIslandWrapper({ 
  componentType, 
  props, 
  residentData, 
  profileMode,
  islandId,
  onError,
  onRender
}: ProfileIslandWrapperProps) {
  const [state, setState] = useState<IslandState>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [Component, setComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  // Load the component from registry
  useEffect(() => {
    try {
      const registration = componentRegistry.get(componentType);
      
      if (!registration) {
        setState('not-found');
        const notFoundError = new Error(`Component ${componentType} not found in registry`);
        setError(notFoundError);
        onError?.(notFoundError, islandId);
        return;
      }

      setComponent(() => registration.component);
      setState('ready');
      onRender?.(islandId);
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error(`Failed to load component ${componentType}`);
      setState('error');
      setError(loadError);
      onError?.(loadError, islandId);
    }
  }, [componentType, islandId, onError, onRender]);

  // Create enhanced context for islands
  const contextValue = useMemo(() => ({
    ...residentData,
    profileMode,
    isIsland: true,
    islandId
  }), [residentData, profileMode, islandId]);

  // Render based on state
  if (state === 'loading') {
    return <IslandSkeleton profileMode={profileMode} componentType={componentType} />;
  }

  if (state === 'error' || state === 'not-found') {
    return (
      <IslandError 
        error={error} 
        componentType={componentType} 
        islandId={islandId}
        profileMode={profileMode}
      />
    );
  }

  if (!Component) {
    console.error(`No component found for ${componentType} in island ${islandId}`);
    return <IslandSkeleton profileMode={profileMode} componentType={componentType} />;
  }
  
  
  return (
    <div 
      data-island={islandId} 
      data-component={componentType}
      data-profile-mode={profileMode}
      className="profile-island"
      style={{ 
        border: '2px solid red', 
        padding: '8px', 
        margin: '4px',
        minHeight: '50px',
        backgroundColor: '#f0f0f0'
      }}
    >
      <div style={{ fontSize: '12px', color: 'blue', marginBottom: '4px' }}>
        🏝️ Island: {componentType} ({islandId})
      </div>
      <Suspense fallback={<IslandSkeleton profileMode={profileMode} componentType={componentType} />}>
        <ResidentDataProvider data={contextValue}>
          <IslandErrorBoundary 
            islandId={islandId} 
            componentType={componentType}
            onError={onError}
          >
            <Component {...props} />
          </IslandErrorBoundary>
        </ResidentDataProvider>
      </Suspense>
    </div>
  );
}

// Island loading skeleton component
interface IslandSkeletonProps {
  profileMode: ProfileMode;
  componentType: string;
}

function IslandSkeleton({ profileMode, componentType }: IslandSkeletonProps) {
  // Different skeleton styles based on profile mode
  const skeletonClass = `island-skeleton island-skeleton--${profileMode}`;
  
  // Component-specific skeleton sizes
  const getSkeletonStyle = () => {
    switch (componentType) {
      case 'ProfilePhoto':
        return { width: '120px', height: '120px', borderRadius: '50%' };
      case 'DisplayName':
        return { width: '200px', height: '32px' };
      case 'BlogPosts':
        return { width: '100%', height: '200px' };
      case 'Guestbook':
        return { width: '100%', height: '150px' };
      default:
        return { width: '100%', height: '40px' };
    }
  };

  return (
    <div 
      className={skeletonClass}
      style={getSkeletonStyle()}
      data-component={componentType}
      data-state="loading"
    >
      <div className="skeleton-content">
        <div className="skeleton-shimmer" />
      </div>
    </div>
  );
}

// Island error display component
interface IslandErrorProps {
  error: Error | null;
  componentType: string;
  islandId: string;
  profileMode: ProfileMode;
}

function IslandError({ error, componentType, islandId, profileMode }: IslandErrorProps) {
  return (
    <div 
      className={`island-error island-error--${profileMode}`}
      data-island={islandId}
      data-component={componentType}
      data-state="error"
    >
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <div className="error-text">
          <div className="error-title">Component Error</div>
          <div className="error-details">
            Failed to load {componentType}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-stack">
                <summary>Error details</summary>
                <pre>{error.message}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Error boundary for catching runtime errors in islands
interface IslandErrorBoundaryProps {
  islandId: string;
  componentType: string;
  onError?: (error: Error, islandId: string) => void;
  children: React.ReactNode;
}

interface IslandErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class IslandErrorBoundary extends React.Component<
  IslandErrorBoundaryProps, 
  IslandErrorBoundaryState
> {
  constructor(props: IslandErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): IslandErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Island ${this.props.islandId} (${this.props.componentType}) error:`, error, errorInfo);
    this.props.onError?.(error, this.props.islandId);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="island-runtime-error" data-island={this.props.islandId}>
          <span>Component crashed</span>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for managing island state
export interface UseIslandManagerResult {
  loadedIslands: Set<string>;
  failedIslands: Map<string, Error>;
  islandsReady: boolean;
  totalIslands: number;
}

export function useIslandManager(expectedIslands: string[] = []): UseIslandManagerResult {
  const [loadedIslands, setLoadedIslands] = useState<Set<string>>(new Set());
  const [failedIslands, setFailedIslands] = useState<Map<string, Error>>(new Map());

  const handleIslandRender = (islandId: string) => {
    setLoadedIslands(prev => new Set([...prev, islandId]));
  };

  const handleIslandError = (error: Error, islandId: string) => {
    setFailedIslands(prev => new Map([...prev, [islandId, error]]));
  };

  const totalIslands = expectedIslands.length;
  const islandsReady = (loadedIslands.size + failedIslands.size) >= totalIslands;

  return {
    loadedIslands,
    failedIslands,
    islandsReady,
    totalIslands
  };
}

// Export types for use by other components
export type { IslandState };