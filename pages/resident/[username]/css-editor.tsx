import React, { useState, useEffect, useCallback } from 'react';
import type { GetServerSideProps, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import CSSClassReference from '@/components/features/templates/CSSClassReference';
import CSSGeneratorTools from '@/components/features/templates/CSSGeneratorTools';
import { fetchResidentData } from '@/lib/templates/core/template-data';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { getDefaultProfileTemplate } from '@/lib/templates/default-profile-templates';

interface CSSEditorPageProps {
  username: string;
  isOwner: boolean;
  initialCSS: string;
  templateMode?: 'default' | 'enhanced' | 'advanced';
  currentUser?: {
    id: string;
    primaryHandle?: string;
  };
}

export default function CSSEditorPage({
  username,
  isOwner,
  initialCSS,
  templateMode = 'default',
  currentUser
}: CSSEditorPageProps) {
  const router = useRouter();
  const [css, setCSS] = useState(initialCSS || '/* Add your custom CSS here */\n\n');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(true);
  const [activeTab, setActiveTab] = useState<'generators' | 'reference'>('generators');
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null);
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [currentTemplateMode, setCurrentTemplateMode] = useState<'default' | 'enhanced' | 'advanced'>(templateMode);

  const handleSave = async () => {
    await performSave(css);
  };

  const performSave = async (cssToSave: string) => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // Save CSS
      const response = await fetch(`/api/profile/${username}/css`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customCSS: cssToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save CSS');
      }

      // Automatically switch to enhanced mode
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        throw new Error("Failed to update layout mode. Please log in again.");
      }
      const { token } = await capRes.json();

      const layoutResponse = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateMode: 'enhanced',
          cap: token
        }),
      });

      if (!layoutResponse.ok) {
        throw new Error("CSS saved, but failed to enable CSS mode. Please check Settings.");
      }

      setCurrentTemplateMode('enhanced');
      setSaveMessage('✓ CSS saved and activated successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackToProfile = () => {
    router.push(`/resident/${username}`);
  };

  const handleBackToSettings = () => {
    router.push(`/settings?tab=appearance`);
  };

  // Helper function to insert CSS at cursor position in textarea
  const insertCSSAtCursor = useCallback((cssToInsert: string) => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCSS = css.substring(0, start) + `\n${cssToInsert}\n\n` + css.substring(end);
      setCSS(newCSS);

      // Focus textarea and position cursor after inserted CSS
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + cssToInsert.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  }, [css]);

  const handleResetToDefault = async () => {
    if (!confirm('Switch to default layout? Your CSS will be preserved but not displayed until you switch back to CSS mode.')) {
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        throw new Error("Failed to update layout mode. Please log in again.");
      }
      const { token } = await capRes.json();

      const layoutResponse = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateMode: 'default',
          cap: token
        }),
      });

      if (!layoutResponse.ok) {
        throw new Error("Failed to switch to default layout.");
      }

      setCurrentTemplateMode('default');
      setSaveMessage('✓ Switched to default layout. Your CSS is preserved.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to switch mode'}`);
    } finally {
      setSaving(false);
    }
  };


  // Load resident data for preview
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const data = await fetchResidentData(username);
        setResidentData(data);
      } catch (error) {
        console.error('Failed to load resident data for preview:', error);
        // Set minimal resident data so preview can still work
        setResidentData({
          owner: {
            id: currentUser?.id || 'unknown',
            handle: username,
            displayName: username,
            avatarUrl: '/assets/default-avatar.gif'
          },
          viewer: { id: currentUser?.id || null },
          posts: [],
          guestbook: [],
          featuredFriends: [],
          websites: [],
          badges: [],
          images: []
        });
      } finally {
        setLoadingData(false);
      }
    }

    // Only load if we have user info
    if (currentUser) {
      loadData();
    }
  }, [username, currentUser]);

  // Send preview data to popup window
  const sendPreviewData = useCallback((targetWindow: Window) => {
    if (!residentData || !currentUser) {
      return;
    }

    const previewData = {
      user: {
        id: currentUser.id,
        handle: currentUser.primaryHandle || `${username}@threadstead`,
        profile: {
          templateMode: 'enhanced',
          customCSS: css,
          cssMode: 'inherit',
          templateCompiledAt: new Date()
        }
      },
      residentData: residentData,
      customCSS: css,
      useStandardLayout: true, // Always true for CSS editor
      showNavigation: false
    };

    targetWindow.postMessage({
      type: 'PREVIEW_DATA',
      payload: previewData
    }, window.location.origin);
  }, [css, residentData, currentUser, username]);

  // Open popup preview
  const openPreview = useCallback(() => {
    if (!residentData) {
      alert('Loading preview data... Please wait a moment and try again.');
      return;
    }

    // Close existing preview window if open
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }

    // Open new preview window
    const newWindow = window.open(
      '/preview-temp',
      'css-preview',
      'width=1200,height=800,scrollbars=yes,resizable=yes,status=yes,location=yes'
    );

    if (newWindow) {
      setPreviewWindow(newWindow);

      // Listen for messages from preview window
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'PREVIEW_READY') {
          // Send initial preview data
          sendPreviewData(newWindow);
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup when window closes
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          setPreviewWindow(null);
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
    } else {
      alert('Pop-up blocked! Please allow pop-ups for this site to use the preview feature.');
    }
  }, [previewWindow, residentData, sendPreviewData]);

  // Send CSS updates to preview window when CSS changes
  useEffect(() => {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.postMessage({
        type: 'CSS_UPDATE',
        customCSS: css
      }, window.location.origin);
    }
  }, [css, previewWindow]);

  if (!isOwner) {
    return (
      <Layout>
        <Head>
          <title>Access Denied | ThreadStead</title>
        </Head>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
              <p className="mb-4">You can only edit your own profile.</p>
              <button onClick={handleBackToProfile} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth={true}>
      <Head>
        <title>{`Simple CSS Editor - ${username} | ThreadStead`}</title>
      </Head>
      <div className="flex flex-col h-full bg-white overflow-x-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between max-w-full mx-auto">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">✨ Simple CSS Styling</h1>
                <span className="text-gray-600 text-sm">@{username}</span>
                {currentTemplateMode === 'enhanced' && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    ✓ CSS Mode Active
                  </span>
                )}
                {currentTemplateMode === 'default' && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                    Default Layout
                  </span>
                )}
                {currentTemplateMode === 'advanced' && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    Template Mode Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentTemplateMode !== 'default' && (
                  <button
                    onClick={handleResetToDefault}
                    disabled={saving}
                    className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors disabled:opacity-50"
                    title="Switch back to default layout"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={openPreview}
                  disabled={loadingData}
                  className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors flex items-center gap-1"
                >
                  <span>🔍</span>
                  {loadingData ? 'Load...' : 'Preview'}
                </button>
                <button
                  onClick={() => setShowReference(!showReference)}
                  className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
                >
                  {showReference ? 'Hide' : 'Tools'}
                </button>
                <button
                  onClick={handleBackToSettings}
                  className="text-sm px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={handleBackToProfile}
                  className="text-sm px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors"
                >
                  Profile
                </button>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className={`border-b px-4 py-3 flex-shrink-0 ${
            currentTemplateMode === 'advanced'
              ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
              : currentTemplateMode === 'enhanced'
              ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'
              : 'bg-gradient-to-r from-blue-50 to-gray-50 border-blue-200'
          }`}>
            <div className="max-w-full mx-auto">
              <div className="flex items-center gap-3">
                {currentTemplateMode === 'advanced' ? (
                  <>
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm text-purple-900 font-semibold">
                        You&apos;re currently using a custom template (Advanced Mode)
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        Saving CSS here will switch you to CSS Mode, which uses the default layout with your styles. Your custom template will be preserved but hidden.
                        To use your template, go to <Link href={`/resident/${username}/template-editor`} className="underline">Template Editor</Link> or click &quot;Reset to Default&quot; above to return to standard layout.
                      </p>
                    </div>
                  </>
                ) : currentTemplateMode === 'enhanced' ? (
                  <>
                    <span className="text-2xl">✨</span>
                    <div className="flex-1">
                      <p className="text-sm text-green-900 font-semibold">
                        CSS Mode Active - Your styles are live on the default layout!
                      </p>
                      <p className="text-xs text-gray-700 mt-1">
                        Click <strong className="text-blue-700">&quot;🔍 Open Preview&quot;</strong> to see changes live. •
                        Load a theme below for quick-start styles. •
                        Want custom layouts? Try <Link href="/templates" className="text-blue-600 hover:underline">Visual Builder or Template Language</Link>.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">💡</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        <strong>Just styling your default layout!</strong> Start with a theme or write custom CSS to change colors, fonts, and spacing.
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        New to CSS? <strong className="text-green-700">Load a theme</strong> below (Pixel Petals, Abstract Art, etc.) then customize it! •
                        Click <strong className="text-blue-700">&quot;🔍 Open Preview&quot;</strong> to see changes live. •
                        Click <strong className="text-green-700">&quot;💾 Save CSS&quot;</strong> to activate your styles. •
                        Want custom layouts? Try <Link href="/templates" className="text-blue-600 hover:underline">Visual Builder or Template Language</Link>.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Editor Pane */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">CSS Editor</span>
                <div className="flex items-center gap-2">
                  {saveMessage && (
                    <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                      {saveMessage}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Saving...' : '💾 Save CSS'}
                  </button>
                </div>
              </div>

              {/* Theme Gallery */}
              <details className="bg-white border-b border-gray-200 px-4 py-3">
                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                  <span>🎨 Load a CSS Theme</span>
                  <span className="text-xs text-gray-500 ml-auto">Click to expand</span>
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-gray-600">
                    Quick-start with a pre-designed theme. You can customize it after loading!
                  </p>
                  <div className="flex gap-2 items-center">
                    <select
                      onChange={(e) => {
                        if (e.target.value === '') return;
                        const themeName = e.target.options[e.target.selectedIndex].text;
                        if (confirm(`Load "${themeName}"? This will replace your current CSS. Any unsaved changes will be lost.`)) {
                          const themeCSS = getDefaultProfileTemplate(e.target.value as any);
                          setCSS(themeCSS);
                        }
                        e.target.value = '';
                      }}
                      className="text-sm px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 flex-1"
                    >
                      <option value="">Choose a theme...</option>
                      <option value="abstract-art">🎨 Abstract Art - Colorful gallery aesthetic</option>
                      <option value="charcoal-nights">🖤 Charcoal Nights - Dark terminal theme</option>
                      <option value="pixel-petals">🌸 Pixel Petals - Kawaii paradise</option>
                      <option value="retro-social">📱 Retro Social - MySpace 2005 vibes</option>
                      <option value="classic-linen">🧵 Classic Linen - Vintage elegance</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    💡 After loading, click &quot;🔍 Open Preview&quot; to see your theme in action!
                  </p>
                </div>
              </details>

              <div className="flex-1 overflow-hidden">
                <textarea
                  value={css}
                  onChange={(e) => setCSS(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm resize-none border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/* Add your custom CSS here */

/* Example: Change site header background */
.site-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
}

/* Example: Style blog post cards */
.blog-post-card {
  background: #f0f9ff !important;
  border: 2px solid #3b82f6 !important;
  border-radius: 8px !important;
}
"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Reference & Generators Sidebar */}
            {/* Note: Using inline styles for width to avoid CSS class conflicts with thread-module */}
            {showReference && (
              <div style={{ width: '400px', flexShrink: 0 }} className="border-l border-gray-200 flex flex-col h-full overflow-hidden bg-white">
                {/* Simple Tab Bar */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('generators')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'generators'
                        ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    🎨 Generators
                  </button>
                  <button
                    onClick={() => setActiveTab('reference')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'reference'
                        ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    📚 Reference
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden p-4">
                  {activeTab === 'generators' ? (
                    <CSSGeneratorTools onInsertCSS={insertCSSAtCursor} />
                  ) : (
                    <CSSClassReference
                      onClassSelect={(className) => {
                        insertCSSAtCursor(className);
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Help */}
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex-shrink-0">
            <div className="max-w-full mx-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>💡 Use 🎨 Generators to create CSS visually</span>
              <span>•</span>
              <a href="/design-css-tutorial" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                CSS Tutorial
              </a>
            </div>
          </div>
        </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<CSSEditorPageProps> = async ({
  params,
  req
}) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || '');
  if (!username) return { notFound: true };

  const proto = req?.headers?.['x-forwarded-proto'] || 'http';
  const host = req?.headers?.host || 'localhost:3000';
  const base = `${proto}://${host}`;

  try {
    // Get current user session
    const { getSessionUser } = await import('@/lib/auth/server');
    const currentUser = await getSessionUser(req as NextApiRequest);

    if (!currentUser) {
      return {
        redirect: {
          destination: `/identity?redirect=${encodeURIComponent(`/resident/${username}/css-editor`)}`,
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
          initialCSS: '',
        },
      };
    }

    const profileData = await profileRes.json();
    let currentUsername = null;
    if (currentUser.primaryHandle) {
      currentUsername = currentUser.primaryHandle.split('@')[0];
    }

    const isOwner = (
      (currentUsername && currentUsername.toLowerCase() === username.toLowerCase()) ||
      (currentUser.id && profileData.userId && currentUser.id === profileData.userId)
    );

    const initialCSS = profileData.profile?.customCSS || '';
    const templateMode = (profileData.profile?.templateMode as 'default' | 'enhanced' | 'advanced') || 'default';

    return {
      props: {
        username,
        isOwner,
        initialCSS,
        templateMode,
        currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return { notFound: true };
  }
};
