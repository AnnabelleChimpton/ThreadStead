import React, { useEffect } from "react";
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Link from "next/link";

import Layout from "@/components/ui/layout/Layout";
import EnhancedTemplateEditor from '@/components/features/templates/EnhancedTemplateEditor';
import type { CompiledTemplate } from '@/lib/templates/compilation/compiler';
import { PixelIcon } from "@/components/ui/PixelIcon";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { requestCapability } from "@/lib/api/client/capability";
import { layoutFields, layoutOf } from "@/lib/domain/profile/layout";
import type { StartFromResult } from "@/lib/domain/profile/shared-source";
import PageMeta from "@/components/ui/layout/PageMeta";

type StartFromFailure = Extract<StartFromResult, { ok: false }>["reason"];

/** ?from=<handle>: the page this editor was started from, or why it couldn't be */
type StartedFrom =
  | { ok: true; username: string }
  | { ok: false; username: string; reason: Exclude<StartFromFailure, "own_page"> };

interface TemplateEditorPageProps {
  username: string;
  isOwner: boolean;
  existingTemplate?: string;
  customCSS?: string;
  cssMode?: 'inherit' | 'override' | 'disable';
  templateMode?: 'default' | 'enhanced' | 'advanced';
  hideNavigation?: boolean;
  currentUser?: {
    id: string;
    primaryHandle?: string;
    profile?: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    };
    handles?: Array<{ handle: string }>;
  };
  startedFrom?: StartedFrom | null;
  /** Your own saved CSS, when the editor opens on someone else's page */
  ownCSS?: string;
}

function StartedFromNotice({ startedFrom }: { startedFrom: StartedFrom }) {
  const who = `@${startedFrom.username}`;
  let message: React.ReactNode;
  if (startedFrom.ok) {
    message = (
      <>
        Started from{" "}
        <Link href={`/resident/${encodeURIComponent(startedFrom.username)}`} className="underline">
          {who}&apos;s page
        </Link>
        . Nothing changes on your page until you save.
      </>
    );
  } else if (startedFrom.reason === "not_shared") {
    message = <>{who} hasn&apos;t shared their page&apos;s source, so this is your own page.</>;
  } else if (startedFrom.reason === "no_html") {
    message = <>{who}&apos;s page has no HTML of its own to start from, so this is your own page.</>;
  } else {
    message = <>There&apos;s no page at {who} to start from, so this is your own page.</>;
  }
  return (
    <div
      role="status"
      className="flex items-start gap-2 px-4 py-1.5 bg-thread-cream border-b border-thread-sage text-sm text-nb-ink flex-shrink-0"
    >
      <span className="shrink-0 mt-0.5" aria-hidden="true">
        <PixelIcon name="info-box" size={14} />
      </span>
      <p className="min-w-0 m-0">{message}</p>
    </div>
  );
}

export default function TemplateEditorPage({
  username,
  isOwner,
  existingTemplate,
  customCSS,
  cssMode = 'inherit',
  templateMode = 'default',
  hideNavigation = false,
  currentUser,
  startedFrom = null,
  ownCSS
}: TemplateEditorPageProps) {
  const router = useRouter();

  // ?from= has done its job once the page loads. Without it, a reload (or
  // coming back after saving) opens your own page, not theirs again; unsaved
  // edits are still offered back by the editor's draft recovery.
  useEffect(() => {
    if (typeof router.query.from !== 'string') return;
    const { from: _from, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
  }, [router]);

  // Extract HTML content and any embedded CSS from existing template
  let extractedHtmlContent = '';
  let embeddedCSS = '';

  if (existingTemplate) {
    const styleMatches = existingTemplate.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      styleMatches.forEach(styleTag => {
        const cssMatch = styleTag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (cssMatch && cssMatch[1]) {
          embeddedCSS += cssMatch[1].trim() + '\n\n';
        }
      });
    }
    extractedHtmlContent = existingTemplate.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
  }

  // Combine saved customCSS with any embedded CSS
  let extractedCssContent = customCSS || '';
  if (embeddedCSS && !extractedCssContent.includes(embeddedCSS.trim())) {
    extractedCssContent = extractedCssContent.trim()
      ? `${extractedCssContent}\n\n/* Recovered from template */\n${embeddedCSS.trim()}`
      : embeddedCSS.trim();
  }
  extractedCssContent = extractedCssContent || '/* Add your custom CSS here */\n\n';

  // Older CSS can start with a mode comment (/* CSS_MODE:inherit */). The mode
  // is the profile's cssMode now; the comment means nothing, so it's left
  // out of the editor (and drops off on the next save).
  const cleanedCssContent = extractedCssContent.replace(/\/\* CSS_MODE:\w+ \*\/\n?/, '');

  const handleSave = async (template: string, css: string, compiledTemplate?: CompiledTemplate, cssMode?: 'inherit' | 'override' | 'disable', hideNavigation?: boolean, explicitTemplateMode?: 'default' | 'enhanced' | 'advanced') => {
    const requestBody = {
      template: template,
      customCSS: css,
      ...(compiledTemplate && { ast: compiledTemplate }),
      ...(cssMode && { cssMode })
    };
    try {
      const response = await csrfFetch(`/api/profile/${username}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Failed to save template';
        if (errorData.suggestion) errorMessage += `\n\n${errorData.suggestion}`;
        if (errorData.details) errorMessage += `\n\n${errorData.details}`;
        if (errorData.line) {
          const lineInfo = errorData.column
            ? `Line ${errorData.line}, Column ${errorData.column}`
            : `Line ${errorData.line}`;
          errorMessage = `${lineInfo}: ${errorMessage}`;
        }
        throw new Error(errorMessage);
      }

      // Enable template mode
      const token = await requestCapability("profile");

      const layout = explicitTemplateMode
        ? layoutOf(explicitTemplateMode)
        : (template.trim() === '' ? 'standard' : 'html');

      const layoutResponse = await csrfFetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...layoutFields({ layout }),
          hideNavigation: hideNavigation,
          cap: token
        }),
      });

      if (!layoutResponse.ok) {
        throw new Error((await layoutResponse.json().catch(() => ({}))).error || "Template saved, but failed to enable template mode.");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleBackToProfile = () => {
    router.push(`/resident/${username}`);
  };

  if (!isOwner) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
              <p className="mb-4">You can only edit your own profile.</p>
              <button onClick={handleBackToProfile} className="thread-button">
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const editorUser = currentUser || {
    id: 'template-editor-user',
    primaryHandle: username,
    profile: {
      displayName: username,
      bio: `Template editor for ${username}`,
      avatarUrl: '/assets/default-avatar.gif'
    },
    handles: [{ handle: `${username}@threadstead` }]
  };

  return (
    <>
      <PageMeta title="Your own HTML page" noIndex />
      <Layout workspace>
        <EnhancedTemplateEditor
          user={editorUser}
          initialTemplate={extractedHtmlContent}
          initialCSS={cleanedCssContent}
          initialCSSMode={cssMode}
          // A page started from someone else's is HTML, whatever yours is now
          initialTemplateMode={startedFrom?.ok ? 'advanced' : templateMode}
          initialShowNavigation={!hideNavigation}
          // Always the HTML editor. CSS-only editing is the CSS editor
          // (?mode=css redirects there in next.config.ts).
          initialEditorMode="template"
          startsUnsaved={!!startedFrom?.ok}
          savedCSS={ownCSS}
          notice={startedFrom && <StartedFromNotice startedFrom={startedFrom} />}
          onSave={handleSave}
        />
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<TemplateEditorPageProps> = async ({
  params,
  query,
  req
}) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
  if (!username) return { notFound: true };

  const base = getInternalBaseUrl();

  try {
    const { getSessionUser } = await import('@/lib/auth/server');
    const currentUser = await getSessionUser(req as NextApiRequest);

    if (!currentUser) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(username)}`);
    if (profileRes.status === 404) return { notFound: true };

    if (!profileRes.ok) {
      return { props: { username, isOwner: false } };
    }

    const profileData = await profileRes.json();
    let currentUsername = null;
    if (currentUser.primaryHandle) {
      currentUsername = currentUser.primaryHandle.split("@")[0];
    }

    const isOwner = (
      (currentUsername && currentUsername.toLowerCase() === username.toLowerCase()) ||
      (currentUser.id && profileData.userId && currentUser.id === profileData.userId)
    );

    let existingTemplate = "";
    let customCSS = "";
    let templateMode: 'default' | 'enhanced' | 'advanced' = 'default';

    if (isOwner) {
      try {
        const templateRes = await fetch(`${base}/api/profile/${username}/template`, {
          headers: { cookie: req.headers.cookie || "" },
        });
        if (templateRes.ok) {
          const templateData = await templateRes.json();
          existingTemplate = templateData.template || "";
        }
      } catch (error) {
        console.error("Failed to fetch existing template:", error);
      }

      customCSS = profileData.profile?.customCSS || "";
      templateMode = profileData.profile?.templateMode || 'default';
    }

    const hideNavigation = profileData.profile?.hideNavigation || false;
    let cssMode = (profileData.profile?.cssMode as 'inherit' | 'override' | 'disable') || 'inherit';

    // ?from=<handle>: open with someone else's page as an unsaved starting
    // point, if they share their source and this viewer may see their page
    // (the same rules as /resident/<handle>/source). Your page stays as it is
    // until you save, and saving keeps the old version in History.
    let startedFrom: StartedFrom | null = null;
    let ownCSS: string | null = null;
    const from = typeof query?.from === 'string' ? query.from.trim() : '';
    if (isOwner && from) {
      const { startFromPage } = await import('@/lib/domain/profile/shared-source');
      const start = await startFromPage(currentUser, from);
      if (start.ok) {
        ownCSS = customCSS;
        existingTemplate = start.template;
        customCSS = start.css;
        cssMode = start.cssMode === 'disable' ? 'disable' : 'inherit';
        startedFrom = { ok: true, username: start.username };
      } else if (start.reason !== 'own_page') {
        startedFrom = { ok: false, username: from.slice(0, 64), reason: start.reason };
      }
    }

    return {
      props: {
        username,
        isOwner,
        existingTemplate,
        customCSS,
        cssMode,
        hideNavigation,
        templateMode,
        currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null,
        startedFrom,
        ...(ownCSS !== null && { ownCSS }),
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return { notFound: true };
  }
};
