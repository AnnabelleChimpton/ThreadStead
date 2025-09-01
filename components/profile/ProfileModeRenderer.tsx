// Profile mode renderer with fallback logic
import React from 'react';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/template/ResidentDataProvider';
import { transformNodeToReact } from '@/lib/template-renderer';
import type { TemplateNode } from '@/lib/template-parser';
import ProfileLayout from '@/components/layout/ProfileLayout';
import { featureFlags } from '@/lib/feature-flags';
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
}

// Main profile mode renderer component
export default function ProfileModeRenderer({ 
  user, 
  residentData, 
  useIslands = false,
  fallbackContent,
  onModeChange 
}: ProfileModeRendererProps) {
  const mode = user.profile?.templateMode || 'default';
  
  // Feature flag check for islands - bypass if we have compiled template data
  const featureFlagResult = featureFlags.templateIslands({ id: user.id, role: 'member' });
  const hasCompiledTemplate = !!user.profile?.compiledTemplate;
  const shouldUseIslands = useIslands && 
                          mode === 'advanced' && 
                          (featureFlagResult || hasCompiledTemplate); // Allow if feature flag OR compiled template exists
                          
  // Debug logging
  console.log('ProfileModeRenderer: Islands decision', {
    useIslands,
    mode,
    featureFlagResult,
    hasCompiledTemplate,
    shouldUseIslands,
    finalCheck: shouldUseIslands && hasCompiledTemplate
  });
  
  React.useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  // Render based on mode with fallback chain
  try {
    switch (mode) {
      case 'default':
        return renderDefaultMode(user, residentData, fallbackContent);
        
      case 'enhanced':
        return renderEnhancedMode(user, residentData, fallbackContent);
        
      case 'advanced':
        console.log('ProfileModeRenderer: Advanced mode decision', {
          shouldUseIslands,
          hasCompiledTemplate: !!user.profile?.compiledTemplate,
          willUseIslands: shouldUseIslands && user.profile?.compiledTemplate
        });
        
        if (shouldUseIslands && user.profile?.compiledTemplate) {
          console.log('ProfileModeRenderer: Using AdvancedProfileRenderer with Islands');
          return <AdvancedProfileRenderer user={user} residentData={residentData} />;
        } else {
          console.log('ProfileModeRenderer: Falling back to legacy advanced mode');
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
      return renderEnhancedMode(user, residentData, fallbackContent);
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
  fallbackContent?: React.ReactNode
) {
  const customCSS = user.profile?.customCSS;
  
  return (
    <ProfileLayout 
      customCSS={customCSS || undefined}
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