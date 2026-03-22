import React from "react";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";

import Layout from "@/components/ui/layout/Layout";
import EnhancedTemplateEditor from '@/components/features/templates/EnhancedTemplateEditor';
import type { CompiledTemplate } from '@/lib/templates/compilation/compiler';
import { csrfFetch } from "@/lib/api/client/csrf-fetch";

interface TemplateEditorPageProps {
  username: string;
  isOwner: boolean;
  existingTemplate?: string;
  customCSS?: string;
  cssMode?: 'inherit' | 'override' | 'disable';
  templateEnabled?: boolean;
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
}

export default function TemplateEditorPage({
  username,
  isOwner,
  existingTemplate,
  customCSS,
  cssMode = 'inherit',
  templateEnabled = false,
  templateMode = 'default',
  hideNavigation = false,
  currentUser
}: TemplateEditorPageProps) {
  const router = useRouter();

  // Get mode parameter from URL (?mode=template, ?mode=css)
  const urlMode = router.query.mode as string | undefined;
  const initialEditorMode = (urlMode === 'template' || urlMode === 'css')
    ? urlMode
    : undefined;

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

  // Extract CSS mode from CSS comment if present
  const extractCSSMode = (): 'inherit' | 'override' | 'disable' => {
    const css = customCSS || '';
    const modeMatch = css.match(/\/\* CSS_MODE:(\w+) \*\//);
    if (modeMatch && ['inherit', 'override', 'disable'].includes(modeMatch[1])) {
      return modeMatch[1] as 'inherit' | 'override' | 'disable';
    }
    return 'inherit';
  };

  const initialCSSMode = extractCSSMode();
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
      const capRes = await csrfFetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        throw new Error("Failed to update layout mode. Please check Layout Settings.");
      }
      const { token } = await capRes.json();

      const templateMode = explicitTemplateMode || (template.trim() === '' ? 'enhanced' : 'advanced');

      const layoutResponse = await csrfFetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateMode: templateMode,
          hideNavigation: hideNavigation,
          cap: token
        }),
      });

      if (!layoutResponse.ok) {
        throw new Error("Template saved, but failed to enable template mode.");
      }

      const templateToggleResponse = await csrfFetch(`/api/profile/${username}/template-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      if (!templateToggleResponse.ok) {
        throw new Error("Template saved and mode set, but failed to enable template.");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleBackToProfile = () => {
    router.push(`/resident/${username}`);
  };

  const handleBackToEdit = () => {
    router.push(`/resident/${username}/edit`);
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
      <Head>
        <title>{`Profile Layout Editor - ${username} | ThreadStead`}</title>
      </Head>
      <Layout fullWidth={true}>
        <div className="editor-full-page flex flex-col bg-white template-editor-page w-full">
          <div className="bg-white border-b border-thread-sage/30 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">Profile Layout Editor</h1>
                <span className="text-thread-sage text-sm">@{username}</span>
                {templateEnabled && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                    Template Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToEdit}
                  className="thread-button-secondary text-xs px-2 py-1"
                >
                  ← Edit Profile
                </button>
                <button
                  onClick={handleBackToProfile}
                  className="thread-button text-xs px-2 py-1"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <EnhancedTemplateEditor
              user={editorUser}
              initialTemplate={extractedHtmlContent}
              initialCSS={cleanedCssContent}
              initialCSSMode={cssMode}
              initialTemplateMode={templateMode}
              initialShowNavigation={!hideNavigation}
              initialEditorMode={initialEditorMode}
              onSave={handleSave}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<TemplateEditorPageProps> = async ({
  params,
  req
}) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
  if (!username) return { notFound: true };

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  try {
    const { getSessionUser } = await import('@/lib/auth/server');
    const currentUser = await getSessionUser(req as NextApiRequest);

    if (!currentUser) {
      return {
        redirect: {
          destination: `/identity?redirect=${encodeURIComponent(`/resident/${username}/template-editor`)}`,
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
    let templateEnabled = false;
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
      templateEnabled = profileData.profile?.templateEnabled || false;
      templateMode = profileData.profile?.templateMode || 'default';
    }

    const hideNavigation = profileData.profile?.hideNavigation || false;
    const cssMode = (profileData.profile?.cssMode as 'inherit' | 'override' | 'disable') || 'inherit';

    return {
      props: {
        username,
        isOwner,
        existingTemplate,
        customCSS,
        cssMode,
        hideNavigation,
        templateEnabled,
        templateMode,
        currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return { notFound: true };
  }
};
