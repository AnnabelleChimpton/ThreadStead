// Profile mode renderer with fallback logic
import React from 'react';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { transformNodeToReact } from '@/lib/templates/rendering/template-renderer';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import ProfileLayout from '@/components/ui/layout/ProfileLayout';
import MinimalNavBar from '@/components/ui/navigation/MinimalNavBar';
import { featureFlags } from '@/lib/utils/features/feature-flags';
import dynamic from 'next/dynamic';

// Dynamically import AdvancedProfileRenderer to avoid SSR issues
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
          
          // Advanced template mode: ONLY USER CSS - zero system interference
          const cleanUserCSS = (user.profile?.customCSS || '')
            .replace(/\/\* CSS_MODE:\w+ \*\/\n?/g, '') // Remove mode comments
            .replace(/!important/g, ''); // Remove !important declarations
          
          return (
            <>
              {/* Essential component classes for structure (matching preview behavior) */}
              <style dangerouslySetInnerHTML={{ __html: `
                /* Complete CSS reset for advanced templates - user has total control */
                .advanced-template-container {
                  /* Reset all Tailwind utilities to prevent inheritance */
                  --tw-gradient-from: initial;
                  --tw-gradient-to: initial;
                  --tw-gradient-stops: initial;
                  --tw-gradient-position: initial;
                }
                
                /* Reset ALL Tailwind gradient classes within advanced templates */
                .advanced-template-container [class*="bg-gradient"] {
                  background-image: none !important;
                  --tw-gradient-from: initial !important;
                  --tw-gradient-to: initial !important;
                  --tw-gradient-stops: initial !important;
                  --tw-gradient-position: initial !important;
                }
                
                /* Reset system CSS for ThreadStead components */
                .advanced-template-container .thread-module {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }
                
                .advanced-template-container .thread-headline {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }
                
                .advanced-template-container .thread-label {
                  all: unset;
                  display: inline;
                  box-sizing: border-box;
                }
                
                .advanced-template-container .thread-button {
                  all: unset;
                  display: inline-block;
                  box-sizing: border-box;
                  cursor: pointer;
                }
                
                .advanced-template-container .profile-tab-button {
                  all: unset;
                  display: inline-block;
                  box-sizing: border-box;
                  cursor: pointer;
                }
                
                .advanced-template-container .profile-tab-panel {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }
                
                .advanced-template-container .profile-tabs {
                  all: unset;
                  display: block;
                  box-sizing: border-box;
                }
                
                .advanced-template-container .profile-tab-list {
                  all: unset;
                  display: flex;
                  box-sizing: border-box;
                }
                
                /* Provide default component styling that user can override */
                .advanced-template-container .thread-module {
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
                
                .advanced-template-container .thread-headline {
                  font-family: Georgia, "Times New Roman", serif;
                  color: #2E4B3F;
                  font-weight: 600;
                  letter-spacing: -0.02em;
                  font-size: 1.25rem;
                  margin-bottom: 1rem;
                }
                
                .advanced-template-container .thread-label {
                  font-size: 0.75rem;
                  font-weight: 600;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                  color: #A18463;
                }
                
                .advanced-template-container .profile-tab-button {
                  padding: 0.75rem 1rem;
                  background: #FCFAF7;
                  color: #A18463;
                  border-right: 1px solid rgba(161, 132, 99, 0.2);
                  transition: all 0.2s ease;
                }
                
                .advanced-template-container .profile-tab-button.active {
                  background: #F5E9D4;
                  color: #2E4B3F;
                  font-weight: 500;
                }
                
                .advanced-template-container .profile-tab-panel {
                  padding: 1.5rem;
                }
                
                .advanced-template-container .profile-tab-list {
                  border-bottom: 1px solid rgba(161, 132, 99, 0.3);
                }
              ` }} />
              
              {/* User CSS - can override everything above */}
              {cleanUserCSS && <style dangerouslySetInnerHTML={{ __html: cleanUserCSS }} />}
              
              {/* Show MinimalNavBar when navigation toggle is ON */}
              {!hideNavigation && <MinimalNavBar />}
              
              {/* Wrap in container for CSS isolation */}
              <div className="advanced-template-container">
                <AdvancedProfileRenderer user={user} residentData={residentData} />
              </div>
            </>
          );
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