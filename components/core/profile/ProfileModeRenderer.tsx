// Renders a page of your own HTML (advanced mode), on the server and then
// hydrated. The standard layout (default/enhanced) is ProfileLayout, rendered
// by the profile page itself.
import React from 'react';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import AdvancedNavFrame from './AdvancedNavFrame';
import AdvancedProfileRenderer from './AdvancedProfileRenderer';
import { pageHasMain } from '@/lib/templates/rendering/page-tree';

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
    cssMode?: 'inherit' | 'override' | 'disable';
    compiledTemplate?: unknown;
    templateCompiledAt?: Date | null;
    hideNavigation?: boolean;
  } | null;
}

export interface ProfileModeRendererProps {
  user: ProfileUser;
  residentData: ResidentData;
  /** Shown when there's nothing compiled to render */
  fallbackContent?: React.ReactNode;
  hideNavigation?: boolean;
  /** Site chrome under the nav (or at the very top when it's hidden) */
  afterNav?: React.ReactNode;
}

export default function ProfileModeRenderer({
  user,
  residentData,
  fallbackContent,
  hideNavigation = false,
  afterNav
}: ProfileModeRendererProps) {
  if (user.profile?.compiledTemplate) {
    const shouldShowNavigation = !hideNavigation && !user.profile?.hideNavigation;
    return (
      <AdvancedNavFrame showNavigation={shouldShowNavigation} afterNav={afterNav} pageHasMain={pageHasMain(user.profile.compiledTemplate)}>
        <AdvancedProfileRenderer user={user} residentData={residentData} />
      </AdvancedNavFrame>
    );
  }

  return (
    <>
      {afterNav}
      {fallbackContent || <div>Error loading profile</div>}
    </>
  );
}
