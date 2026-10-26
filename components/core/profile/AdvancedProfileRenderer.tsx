// A page of your own HTML (advanced mode), server-rendered and hydrated.
// The page's CSS is injected in <head> by _app.tsx.

import React from 'react';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { PageTreeNode } from '@/lib/templates/rendering/page-tree';
import { GlobalTemplateStateProvider, type VariableConfig } from '@/lib/templates/state/TemplateStateProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import TemplateErrorBoundary from '@/components/features/templates/TemplateErrorBoundary';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { StaticHTMLWithIslands } from './HTMLIslandHydration';
import { siteStylesOn } from '@/lib/domain/profile/layout';
import { pageRootAttributes } from '@/lib/templates/compilation/document-head';
import { USER_CONTENT_PREFIX } from '@/lib/utils/css/css-transform';
import { pageHash } from '@/components/features/templates/state/actions/page-targets';
import { readServerOnly } from '@/lib/utils/server-only';
import { usePageVariables } from './page-variables';
import type { AdvancedProfileRendererProps } from './types';

export type { AdvancedProfileRendererProps, StaticHTMLWithIslandsProps } from './types';

/** What the renderer reads from Profile.compiledTemplate (or the slim copy the page sends) */
export interface RenderableTemplate {
  /** Built on the server from the stored compile result (page-tree-server.ts) */
  tree?: PageTreeNode[];
  /** The compiled HTML: only when there's no tree (a lesson's example) */
  staticHTML?: string;
  /** A page with no components, as HTML (page-html.ts); its tree is empty */
  html?: string;
  islands?: Island[];
}

const NO_ISLANDS: Island[] = [];

/** The page's <Var> declarations, as written */
export function declaredVariables(islands: Island[]): VariableConfig[] {
  return islands
    .filter((island) => island.component.toLowerCase() === 'var')
    .map((island) => {
      const props = (island._precomputed?.componentProps ?? island.props) as Record<string, unknown>;
      return {
        name: String(props.name ?? ''),
        type: props.type as VariableConfig['type'],
        initial: props.initial,
        computed: typeof props.expression === 'string' ? props.expression : undefined,
        default: props.default,
      };
    });
}

/**
 * A link to /resident/x#about lands on the page's #about, which the
 * sanitizer renamed #user-content-about: on arrival and on every hash
 * change. Replacing the hash (not adding one) keeps Back as it was, and
 * makes :target apply.
 */
function useLandOnPageIds() {
  React.useEffect(() => {
    const land = () => {
      const hash = pageHash(window.location.hash);
      if (hash !== window.location.hash) window.location.replace(hash);
    };
    land();
    window.addEventListener('hashchange', land);
    return () => window.removeEventListener('hashchange', land);
  }, []);
}

export default function AdvancedProfileRenderer({ user, residentData }: AdvancedProfileRendererProps) {
  const compiled = user.profile?.compiledTemplate as RenderableTemplate | null | undefined;
  const islands = compiled?.islands ?? NO_ISLANDS;
  const declared = React.useMemo(() => declaredVariables(islands), [islands]);
  useLandOnPageIds();
  const rootAttributes = pageRootAttributes(compiled);
  // A pasted page's <body id="home"> is the root's, as its CSS knows it
  // (body#home h1 found nothing; bug bash 2026-10-26)
  const profileId = rootAttributes?.id ? `${USER_CONTENT_PREFIX}${rootAttributes.id}` : `profile-${user.id}`;
  // The clock, the pointer and a seed, as CSS variables on the root
  usePageVariables(profileId, compiled);
  // A page with no components is its HTML, which React leaves as the server
  // wrote it (page-html.ts). Sent once: read back in the browser from the
  // root it went into (lib/utils/server-only.ts), as a prop after a
  // client-side navigation. The same object while it's the same HTML.
  const staticHtml =
    compiled && islands.length === 0 && compiled.tree?.length === 0
      ? compiled.html ?? readServerOnly(compiled, profileId, user.id, 'html')
      : undefined;
  const rootHtml = React.useMemo(() => (staticHtml === undefined ? undefined : { __html: staticHtml }), [staticHtml]);

  if (!compiled?.tree && !compiled?.staticHTML?.trim()) {
    console.error('AdvancedProfileRenderer: No compiled template available');
    return <AdvancedProfileFallback />;
  }

  return (
    <TemplateErrorBoundary
      componentName="AdvancedProfileRenderer"
      fallbackMessage="The template could not be rendered due to an error. This may be caused by invalid template syntax or missing required properties."
    >
      {/* Renders with each <Var>'s starting value, here and at hydration */}
      <GlobalTemplateStateProvider declared={declared} page={user.id}>
        <ResidentDataProvider data={residentData}>
          <ToastProvider>
            {/* A neutral box that the page can't lift over the site's chrome
                (styles/chrome-layers.css): its own stacking context, no clipping */}
            <div
              id={profileId}
              // A pasted page's <html>/<body> class, lang, dir and data-* (document-head.ts)
              className={rootAttributes?.className ? `profile-template-root ${rootAttributes.className}` : 'profile-template-root'}
              lang={rootAttributes?.lang}
              dir={rootAttributes?.dir}
              {...rootAttributes?.data}
              // What the page's own actions may reach (components/features/templates/state/actions/page-targets.ts)
              data-template-root
              // styles/theme-parts.css: with site styles off, the site's parts
              // take the page's own colours
              data-site-styles={siteStylesOn(user.profile?.cssMode) ? 'on' : 'off'}
              style={{
                overflow: 'visible',
                minHeight: '100vh',
                width: '100%',
                display: 'block'
              }}
              dangerouslySetInnerHTML={rootHtml}
            >
              {/* Each component has its own boundary (PageWithComponents): one
                  that throws on the server is rendered in the browser alone.
                  This one is for anything else. */}
              {rootHtml ? undefined : <React.Suspense fallback={null}>
                {/* The page's top-level elements are the root's children, as they'd
                    be body's on their own site: no wrapper between them */}
                <StaticHTMLWithIslands
                  tree={compiled.tree}
                  staticHTML={compiled.staticHTML}
                  islands={islands}
                  residentData={residentData}
                />
              </React.Suspense>}
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
