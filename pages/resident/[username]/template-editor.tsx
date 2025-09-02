import React from "react";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";

import Layout from "@/components/Layout";
import EnhancedTemplateEditor from '@/components/template/EnhancedTemplateEditor';
import type { CompiledTemplate } from '@/lib/template-compiler';

interface TemplateEditorPageProps {
  username: string;
  isOwner: boolean;
  existingTemplate?: string;
  customCSS?: string;
  templateEnabled?: boolean;
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
  templateEnabled = false,
  hideNavigation = false,
  currentUser
}: TemplateEditorPageProps) {
  const router = useRouter();

  // Extract HTML content from existing template (for custom template users)
  // For standard layout users, this should be empty so the editor detects standard layout mode
  const extractedHtmlContent = existingTemplate 
    ? existingTemplate.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim()
    : ''; // Empty for standard layout users

  // Use the actual customCSS from the profile, not extracted from template HTML
  // This ensures standard layout users see their saved CSS
  const extractedCssContent = customCSS || '/* Add your custom CSS here */\n\n';
  
  // Extract CSS mode from CSS comment if present
  const extractCSSMode = (): 'inherit' | 'override' | 'disable' => {
    const css = customCSS || '';
    const modeMatch = css.match(/\/\* CSS_MODE:(\w+) \*\//);
    if (modeMatch && ['inherit', 'override', 'disable'].includes(modeMatch[1])) {
      return modeMatch[1] as 'inherit' | 'override' | 'disable';
    }
    // Default to inherit mode - this is the most common and safe default
    return 'inherit';
  };
  
  const initialCSSMode = extractCSSMode();
  
  // Clean CSS mode comment from CSS for editor
  const cleanedCssContent = extractedCssContent.replace(/\/\* CSS_MODE:\w+ \*\/\n?/, '');

  const handleSave = async (template: string, css: string, compiledTemplate?: CompiledTemplate, cssMode?: 'inherit' | 'override' | 'disable', showNavigation?: boolean) => {
    // Combine HTML and CSS for API
    const fullTemplate = `${template}${css.trim() ? `\n<style>\n${css}\n</style>` : ''}`;


    try {
      // Save the template
      const response = await fetch(`/api/profile/${username}/template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template: template, // Send HTML template only
          customCSS: css, // Send CSS separately
          // For legacy compatibility, we might need the AST
          ...(compiledTemplate && { ast: compiledTemplate }),
          ...(cssMode && { cssMode: cssMode })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save template");
      }

      // Automatically enable template mode and set to advanced
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        throw new Error("Failed to update layout mode. Please check Layout Settings.");
      }
      const { token } = await capRes.json();

      // Set template mode based on whether user has a custom template
      const templateMode = template.trim() === '' ? 'enhanced' : 'advanced';
      
      const layoutResponse = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateMode: templateMode,
          hideNavigation: !showNavigation, // Invert because we're asking "show navigation" but storing "hide navigation"
          cap: token 
        }),
      });

      if (!layoutResponse.ok) {
        throw new Error("Template saved, but failed to enable template mode. Please check Layout Settings.");
      }

      // Also enable the template
      const templateToggleResponse = await fetch(`/api/profile/${username}/template-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      if (!templateToggleResponse.ok) {
        throw new Error("Template saved and mode set, but failed to enable template. Please check Layout Settings.");
      }

      // Success - will be handled by the EnhancedTemplateEditor
    } catch (error) {
      // Re-throw to let EnhancedTemplateEditor handle the error display
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

  // Use the actual current user or create a fallback
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
          {/* Header with navigation - matching original style */}
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

          {/* Enhanced Template Editor - styled to match original tabs */}
          <div className="flex-1">
            <EnhancedTemplateEditor
              user={editorUser}
              initialTemplate={extractedHtmlContent}
              initialCSS={cleanedCssContent}
              initialCSSMode={initialCSSMode}
              initialShowNavigation={!hideNavigation}
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
    // Get current user session
    const { getSessionUser } = await import('@/lib/auth-server');
    const currentUser = await getSessionUser(req as NextApiRequest);

    if (!currentUser) {
      return {
        redirect: {
          destination: `/identity?redirect=${encodeURIComponent(`/resident/${username}/template-editor`)}`,
          permanent: false,
        },
      };
    }

    // Get profile data
    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(username)}`);
    if (profileRes.status === 404) return { notFound: true };
    
    if (!profileRes.ok) {
      return {
        props: {
          username,
          isOwner: false,
        },
      };
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

    // Try to get existing template
    let existingTemplate = "";
    let customCSS = "";
    let templateEnabled = false;

    if (isOwner) {
      try {
        const templateRes = await fetch(`${base}/api/profile/${username}/template`, {
          headers: {
            cookie: req.headers.cookie || "",
          },
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
    }

    const hideNavigation = profileData.profile?.hideNavigation || false;

    return {
      props: {
        username,
        isOwner,
        existingTemplate,
        customCSS,
        hideNavigation,
        templateEnabled,
        currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return { notFound: true };
  }
};