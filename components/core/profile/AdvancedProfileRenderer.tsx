// A page of your own HTML (advanced mode), server-rendered and hydrated.
// The page's CSS is injected in <head> by _app.tsx.

import React from 'react';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { PageTreeNode } from '@/lib/templates/rendering/page-tree';
import { GlobalTemplateStateProvider } from '@/lib/templates/state/TemplateStateProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import TemplateErrorBoundary from '@/components/features/templates/TemplateErrorBoundary';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { StaticHTMLWithIslands } from './HTMLIslandHydration';
import type { AdvancedProfileRendererProps } from './types';

export type { AdvancedProfileRendererProps, StaticHTMLWithIslandsProps } from './types';

/** What the renderer reads from Profile.compiledTemplate (or the slim copy the page sends) */
export interface RenderableTemplate {
  /** Built on the server from the stored compile result (page-tree-server.ts) */
  tree?: PageTreeNode[];
  /** The compiled HTML: only when there's no tree (the editor's preview) */
  staticHTML?: string;
  islands?: Island[];
}

export default function AdvancedProfileRenderer({ user, residentData }: AdvancedProfileRendererProps) {
  const compiled = user.profile?.compiledTemplate as RenderableTemplate | null | undefined;
  const islands = compiled?.islands ?? (user.profile?.templateIslands as Island[] | undefined) ?? [];

  if (!compiled?.tree && !compiled?.staticHTML?.trim()) {
    console.error('AdvancedProfileRenderer: No compiled template available');
    return <AdvancedProfileFallback />;
  }

  const profileId = `profile-${user.id}`;
  return (
    <TemplateErrorBoundary
      componentName="AdvancedProfileRenderer"
      fallbackMessage="The template could not be rendered due to an error. This may be caused by invalid template syntax or missing required properties."
    >
      <GlobalTemplateStateProvider>
        <ResidentDataProvider data={residentData}>
          <ToastProvider>
            {/* A neutral box: no positioning, stacking or clipping context */}
            <div
              id={profileId}
              className="profile-template-root"
              style={{
                position: 'static',
                zIndex: 'auto',
                overflow: 'visible',
                isolation: 'auto',
                minHeight: '100vh',
                width: '100%',
                display: 'block'
              }}
            >
              {/* A component that throws while the server renders the page
                  doesn't take it down: React renders the page in the browser
                  instead, where the island error boundaries catch it. One
                  boundary, so the page still hydrates in one pass. */}
              <React.Suspense fallback={null}>
                {islands.length > 0 ? (
                  <StaticHTMLWithIslands
                    tree={compiled.tree}
                    staticHTML={compiled.staticHTML}
                    islands={islands}
                    residentData={residentData}
                    profileId={profileId}
                  />
                ) : (
                  // Plain HTML, no components: one bare div, as it has always been
                  <div>
                    <StaticHTMLWithIslands
                      tree={compiled.tree}
                      staticHTML={compiled.staticHTML}
                      islands={islands}
                      residentData={residentData}
                    />
                  </div>
                )}
              </React.Suspense>
            </div>
          </ToastProvider>
        </ResidentDataProvider>
      </GlobalTemplateStateProvider>
    </TemplateErrorBoundary>
  );
}

function AdvancedProfileFallback() {
  return (
    <div className="advanced-profile-fallback">
      <div className="fallback-content">
        <div className="fallback-icon"><PixelIcon name="alert" /></div>
        <div className="fallback-message">
          <h3>This page couldn&apos;t be shown</h3>
          <p>Saving it again in the editor fixes this.</p>
        </div>
      </div>
    </div>
  );
}
