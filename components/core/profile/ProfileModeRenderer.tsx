// Profile mode renderer with fallback logic
import React from 'react';
import { extractVisualBuilderClasses } from '@/lib/utils/css/visual-builder-class-extractor';
import { detectTemplateType, type TemplateType } from '@/lib/utils/template-type-detector';

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
                          hasCompiledTemplate; // Always allow islands if compiled template exists
                          
  
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
          // Detect template type to determine rendering approach
          const compiledTemplate = user.profile?.compiledTemplate as any;
          const templateType = detectTemplateType(
            compiledTemplate?.staticHTML,
            user.profile?.customCSS
          );

          // Show MinimalNavBar when navigation toggle is ON and template doesn't have its own navigation
          const navigationElement = !hideNavigation && (() => {
            const islands = compiledTemplate?.islands || [];
            const hasTemplateNavigation = islands.some((island: any) =>
              island.component.toLowerCase().includes('navigation')
            );
            return !hasTemplateNavigation && <MinimalNavBar />;
          })();

          return (
            <>
              {navigationElement}
              <AdvancedProfileRenderer
                user={user}
                residentData={residentData}
                templateType={templateType}
              />
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