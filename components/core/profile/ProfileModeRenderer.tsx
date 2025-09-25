// Profile mode renderer with fallback logic
import React from 'react';
import { extractVisualBuilderClasses } from '@/lib/utils/css/visual-builder-class-extractor';

// Simple error boundary for advanced profile renderer
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AdvancedProfileRenderer Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { transformNodeToReact } from '@/lib/templates/rendering/template-renderer';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import ProfileLayout from '@/components/ui/layout/ProfileLayout';
import MinimalNavBar from '@/components/ui/navigation/MinimalNavBar';
import { featureFlags } from '@/lib/utils/features/feature-flags';
import { getCurrentBreakpoint } from '@/lib/templates/visual-builder/grid-utils';
import dynamic from 'next/dynamic';
import { BodyClassManager } from '@/lib/utils/css/body-class-manager';

// Restore proper AdvancedProfileRenderer with fixed dependencies
const AdvancedProfileRenderer = dynamic(
  () => import('./AdvancedProfileRenderer'),
  {
    ssr: false,
    loading: () => <div className="advanced-profile-loading">Loading advanced template...</div>
  }
);

// Profile mode types
export type ProfileMode = 'default' | 'enhanced' | 'advanced';

// User profile data interface
export interface ProfileUser {
  id: string;
  handle: string;
  profile?: {
    templateMode?: ProfileMode;
    customCSS?: string | null;
    customTemplate?: string | null;
    customTemplateAst?: string | null;
    cssMode?: 'inherit' | 'override' | 'disable';
    compiledTemplate?: unknown;
    templateIslands?: unknown[];
    templateCompiledAt?: Date | null;
  } | null;
}

// Profile mode renderer props
export interface ProfileModeRendererProps {
  user: ProfileUser;
  residentData: ResidentData;
  useIslands?: boolean;
  fallbackContent?: React.ReactNode;
  onModeChange?: (mode: ProfileMode) => void;
  hideNavigation?: boolean;
}

// Main profile mode renderer component
export default function ProfileModeRenderer({
  user,
  residentData,
  useIslands = false,
  fallbackContent,
  onModeChange,
  hideNavigation = false
}: ProfileModeRendererProps) {
  const mode = user.profile?.templateMode || 'default';

  // Extract CSS mode to determine level of system CSS isolation needed
  const extractCSSMode = (css: string | null | undefined): 'inherit' | 'override' | 'disable' => {
    if (!css) return 'inherit';

    // Check for explicit CSS_MODE comment
    const modeMatch = css.match(/\/\* CSS_MODE:(\w+) \*\//);
    if (modeMatch && ['inherit', 'override', 'disable'].includes(modeMatch[1])) {
      return modeMatch[1] as 'inherit' | 'override' | 'disable';
    }

    // Check for Visual Builder CSS
    const hasVisualBuilderCSS = css.includes('/* Visual Builder Generated CSS */') ||
                               (css.includes('.vb-theme-') && css.includes('--global-bg-color'));
    if (hasVisualBuilderCSS) {
      return 'disable';
    }

    return 'inherit';
  };

  const cssMode = extractCSSMode(user.profile?.customCSS);
  const isVisualBuilderDisableMode = mode === 'advanced' && cssMode === 'disable';
  
  // Feature flag check for islands - bypass if we have compiled template data
  const featureFlagResult = featureFlags.templateIslands({ id: user.id, role: 'member' });
  const hasCompiledTemplate = !!user.profile?.compiledTemplate;
  const shouldUseIslands = useIslands && 
                          mode === 'advanced' && 
                          (featureFlagResult || hasCompiledTemplate); // Allow if feature flag OR compiled template exists
                          
  
  React.useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);


  // Render based on mode with fallback chain
  try {
    switch (mode) {
      case 'default':
        return renderDefaultMode(user, residentData, fallbackContent);
        
      case 'enhanced':
        return renderEnhancedMode(user, residentData, fallbackContent, hideNavigation);
        
      case 'advanced':
        if (shouldUseIslands && user.profile?.compiledTemplate) {
          
          // Advanced template mode: Let AdvancedProfileRenderer handle ALL CSS with proper layering
          // Remove duplicate CSS application - AdvancedProfileRenderer has sophisticated CSS system

          return (
            <>


              {/* Conditional system styles based on CSS mode */}
              {!isVisualBuilderDisableMode && (
                <style dangerouslySetInnerHTML={{ __html: `
                /* Complete CSS reset for advanced templates - user has total control */
                .advanced-template-container:not([class*="vb-"]) {
                  /* Reset all Tailwind utilities to prevent inheritance */
                  --tw-gradient-from: initial;
                  --tw-gradient-to: initial;
                  --tw-gradient-stops: initial;
                  --tw-gradient-position: initial;
                }

                /* NEVER reset Visual Builder container - preserve ALL styling */
                .advanced-template-container[class*="vb-"] {
                  /* Explicitly preserve Visual Builder styling - no resets! */
                  /* Ensure Visual Builder container styling is never overridden */
                  all: revert !important;
                }

                /* Allow template components to use gradients normally */

                /* Reset system CSS for ThreadStead components - EXCLUDE Visual Builder elements */
                .advanced-template-container .thread-module:not([class*="vb-"]) {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }

                .advanced-template-container .thread-headline:not([class*="vb-"]) {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }

                .advanced-template-container .thread-label:not([class*="vb-"]) {
                  all: unset;
                  display: inline;
                  box-sizing: border-box;
                }

                .advanced-template-container .thread-button:not([class*="vb-"]) {
                  all: unset;
                  display: inline-block;
                  box-sizing: border-box;
                  cursor: pointer;
                }

                .advanced-template-container .profile-tab-button:not([class*="vb-"]) {
                  all: unset;
                  display: inline-block;
                  box-sizing: border-box;
                  cursor: pointer;
                }

                .advanced-template-container .profile-tab-panel:not([class*="vb-"]) {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }

                .advanced-template-container .profile-tabs:not([class*="vb-"]) {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }

                .advanced-template-container .profile-tab-list:not([class*="vb-"]) {
                  all: unset;
                  display: flex;
                  box-sizing: border-box;
                }

                /* Provide default component styling that user can override - EXCLUDE Visual Builder elements */
                .advanced-template-container .thread-module:not([class*="vb-"]) {
                  background: #FCFAF7;
                  border: 1px solid #A18463;
                  border-radius: 8px;
                  box-shadow: 3px 3px 0 #A18463;
                  position: relative;
                  min-width: 0;
                  width: 100%;
                  max-width: min(1100px, 100vw);
                  padding: 1.5rem;
                  margin-bottom: 1.5rem;
                }

                @media (max-width: 768px) {
                  .advanced-template-container {
                    max-width: 100vw;
                    padding: 1rem;
                    margin: 0 0 1rem 0;
                    border-radius: 0;
                    box-shadow: none;
                    border-left: none;
                    border-right: none;
                  }
                }

                .advanced-template-container .thread-headline:not([class*="vb-"]) {
                  font-family: Georgia, "Times New Roman", serif;
                  color: #2E4B3F;
                  font-weight: 600;
                  letter-spacing: -0.02em;
                  font-size: 1.25rem;
                  margin-bottom: 1rem;
                }

                .advanced-template-container .thread-label:not([class*="vb-"]) {
                  font-size: 0.75rem;
                  font-weight: 600;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                  color: #A18463;
                }

                .advanced-template-container .profile-tab-button:not([class*="vb-"]) {
                  padding: 0.75rem 1rem;
                  background: #FCFAF7;
                  color: #A18463;
                  border-right: 1px solid rgba(161, 132, 99, 0.2);
                  transition: all 0.2s ease;
                }

                .advanced-template-container .profile-tab-button.active:not([class*="vb-"]) {
                  background: #F5E9D4;
                  color: #2E4B3F;
                  font-weight: 500;
                }

                .advanced-template-container .profile-tab-panel:not([class*="vb-"]) {
                  padding: 1.5rem;
                }

                .advanced-template-container .profile-tab-list:not([class*="vb-"]) {
                  border-bottom: 1px solid rgba(161, 132, 99, 0.3);
                }

                /* Pure Absolute Positioning Container */
                .pure-absolute-container {
                  position: relative;
                  width: 1200px;
                  min-height: 800px;
                  padding: 32px;
                  box-sizing: border-box;
                  background-color: #ffffff;
                }

                /* Legacy grid system support (will be deprecated) */
                .advanced-template-container.grid-enabled {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  grid-auto-rows: 60px;
                  gap: 12px;
                  padding: 16px;
                  width: 100%;
                  max-width: 100vw;
                  min-height: 100vh;
                  box-sizing: border-box;
                }

                @media (min-width: 768px) {
                  .advanced-template-container.grid-enabled {
                    grid-template-columns: repeat(8, 1fr);
                    grid-auto-rows: 60px;
                    gap: 12px;
                    padding: 24px;
                  }
                }

                @media (min-width: 1024px) {
                  .advanced-template-container.grid-enabled {
                    grid-template-columns: repeat(16, 1fr);
                    grid-auto-rows: 60px;
                    gap: 12px;
                    padding: 32px;
                  }
                }

                .template-container.grid-container {
                  display: grid;
                  grid-template-columns: repeat(16, 1fr);
                  grid-auto-rows: 60px;
                  gap: 12px;
                  width: 100%;
                  max-width: 100vw;
                  min-height: 100vh;
                  padding: 32px;
                  box-sizing: border-box;
                }
              ` }} />
              )}

              {/* No user CSS here - AdvancedProfileRenderer handles it with proper layering */}
              
              {/* Show MinimalNavBar when navigation toggle is ON */}
              {!hideNavigation && <MinimalNavBar />}

              {/* Wrap in container for CSS isolation */}
              <div
                id={`profile-${user.id}`}
                className={(() => {
                  // Extract Visual Builder classes from user's CSS
                  const visualBuilderClasses = user.profile?.customCSS
                    ? extractVisualBuilderClasses(user.profile.customCSS)
                    : [];

                  // Check if the template contains grid positioning
                  const compiledTemplate = user.profile?.compiledTemplate as any;
                  const templateHtml = compiledTemplate?.staticHTML || '';
                  const hasGridPositioning = templateHtml.includes('data-positioning-mode="grid"') ||
                                           templateHtml.includes('template-container grid-container');

                  const baseClasses = hasGridPositioning
                    ? 'advanced-template-container grid-enabled'
                    : 'advanced-template-container';

                  // Combine base classes with Visual Builder classes
                  return visualBuilderClasses.length > 0
                    ? `${baseClasses} ${visualBuilderClasses.join(' ')}`
                    : baseClasses;
                })()}
                style={(() => {
                  // Check if the template contains grid positioning
                  const compiledTemplate = user.profile?.compiledTemplate as any;
                  const templateHtml = compiledTemplate?.staticHTML || '';
                  const hasGridPositioning = templateHtml.includes('data-positioning-mode="grid"') ||
                                           templateHtml.includes('template-container grid-container');

                  // Base styles for Visual Builder containers to ensure full-page coverage
                  const baseStyles: React.CSSProperties = isVisualBuilderDisableMode ? {
                    // Make container fill entire viewport edge-to-edge
                    position: 'fixed' as const,
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    minHeight: '100vh',
                    maxWidth: 'none',
                    margin: 0,
                    padding: 0,
                    boxSizing: 'border-box' as const,
                    overflow: 'auto' as const
                  } : {};

                  if (hasGridPositioning) {
                    // Use the same grid system as Visual Builder
                    const currentBreakpoint = getCurrentBreakpoint();

                    return {
                      ...baseStyles,
                      display: 'grid' as const,
                      gridTemplateColumns: `repeat(${currentBreakpoint.columns}, 1fr)`,
                      gridAutoRows: `${currentBreakpoint.rowHeight}px`,
                      gap: `${currentBreakpoint.gap}px`,
                      padding: `${currentBreakpoint.containerPadding}px`
                    };
                  }

                  return baseStyles;
                })()}
              >
                <AdvancedProfileRenderer user={user} residentData={residentData} />
              </div>
            </>
          );
        } else if (shouldUseIslands && !user.profile?.compiledTemplate) {
          // Advanced mode but no compiled template - fall back to enhanced mode
          console.warn('Advanced mode requested but no compiled template available. Falling back to enhanced mode.');
          return renderEnhancedMode(user, residentData, fallbackContent, hideNavigation);
        } else {
          return renderAdvancedLegacyMode(user, residentData);
        }
        
      default:
        console.warn(`Unknown template mode: ${mode}, falling back to default`);
        return renderDefaultMode(user, residentData, fallbackContent);
    }
  } catch (error) {
    console.error(`Error rendering ${mode} mode:`, error);
    
    // Fallback chain: Advanced → Enhanced → Default → Fallback Content
    if (mode === 'advanced') {
      return renderEnhancedMode(user, residentData, fallbackContent, hideNavigation);
    } else if (mode === 'enhanced') {
      return renderDefaultMode(user, residentData, fallbackContent);
    } else {
      return fallbackContent || <div>Error loading profile</div>;
    }
  }
}

// Default mode renderer (standard React components)
function renderDefaultMode(
  user: ProfileUser, 
  residentData: ResidentData, 
  fallbackContent?: React.ReactNode
) {
  // Return the fallback content which should be the default profile layout
  return fallbackContent || (
    <ProfileLayout>
      <div className="profile-container">
        <div className="text-center p-8">
          <h1>Profile loading...</h1>
          <p>Default profile layout not provided</p>
        </div>
      </div>
    </ProfileLayout>
  );
}

// Enhanced mode renderer (default + CSS override)
function renderEnhancedMode(
  user: ProfileUser, 
  residentData: ResidentData, 
  fallbackContent?: React.ReactNode,
  hideNavigation?: boolean
) {
  const customCSS = user.profile?.customCSS;
  
  return (
    <ProfileLayout 
      customCSS={customCSS || undefined}
      templateMode='enhanced'
      cssMode={user.profile?.cssMode || 'inherit'}
      hideNavigation={hideNavigation}
      includeSiteCSS={true}  // Match live profile behavior
    >
      {fallbackContent || (
        <div className="profile-container">
          <div className="text-center p-8">
            <h1>Enhanced Profile</h1>
            <p>Enhanced profile layout not provided</p>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}

// Note: Advanced islands mode is now handled by AdvancedProfileRenderer component

// Advanced mode renderer (legacy iframe-based)
function renderAdvancedLegacyMode(user: ProfileUser, residentData: ResidentData) {
  const customTemplateAst = user.profile?.customTemplateAst;
  
  if (!customTemplateAst) {
    throw new Error('No custom template available for advanced mode');
  }
  
  // Parse the stored AST
  let templateNode: TemplateNode;
  try {
    templateNode = JSON.parse(customTemplateAst);
  } catch (error) {
    throw new Error('Invalid template AST format');
  }
  
  // Render using existing legacy system
  const templateContent = transformNodeToReact(templateNode);
  
  return (
    <ResidentDataProvider data={residentData}>
      {templateContent}
    </ResidentDataProvider>
  );
}

// Hook for using profile mode rendering
export function useProfileModeRenderer(user: ProfileUser) {
  const [currentMode, setCurrentMode] = React.useState<ProfileMode>(
    user.profile?.templateMode || 'default'
  );
  
  const [renderError, setRenderError] = React.useState<string | null>(null);
  
  const handleModeChange = React.useCallback((mode: ProfileMode) => {
    setCurrentMode(mode);
    setRenderError(null);
  }, []);
  
  const handleRenderError = React.useCallback((error: string) => {
    setRenderError(error);
  }, []);
  
  return {
    currentMode,
    renderError,
    handleModeChange,
    handleRenderError,
  };
}