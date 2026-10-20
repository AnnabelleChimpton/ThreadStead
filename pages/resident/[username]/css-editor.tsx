import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import type { GetServerSideProps, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { css as cssLang } from '@codemirror/lang-css';
import type { EditorView } from '@codemirror/view';
import Head from 'next/head';

// CodeMirror is editor-page-only — loaded dynamically so it never lands in
// the shared bundle (first-load JS is already heavy, see C2).
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full p-4 font-mono text-sm text-gray-400">Loading editor…</div>
  ),
});
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import CSSClassReference from '@/components/features/templates/CSSClassReference';
import CSSGeneratorTools from '@/components/features/templates/CSSGeneratorTools';
import { fetchResidentData } from '@/lib/templates/core/template-data';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import DraftRestoreBanner from '@/components/ui/feedback/DraftRestoreBanner';
import { useLocalDraft } from '@/hooks/useLocalDraft';
import TemplateHistoryPanel, { type FullRevision } from '@/components/features/templates/TemplateHistoryPanel';
import TemplatePanelSelector from '@/components/features/templates/TemplatePanelSelector';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { insertCSSIntoView, planCSSInsertion } from '@/components/features/templates/css-generators/shared/insertCSS';
import { layoutFields, layoutOf, siteStylesCSSMode, siteStylesOn, type Layout as PageLayout } from '@/lib/domain/profile/layout';

interface CSSEditorPageProps {
  username: string;
  isOwner: boolean;
  initialCSS: string;
  initialCSSMode?: 'inherit' | 'override' | 'disable';
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
  initialCSSMode = 'inherit',
  templateMode = 'default',
  currentUser
}: CSSEditorPageProps) {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();
  const confirm = useConfirm();
  const emptyCSS = '/* Add your custom CSS here */\n\n';
  const [css, setCSS] = useState(initialCSS || emptyCSS);
  // Site styles on ('inherit') or off ('disable'); an older 'override' reads as on
  const [cssMode, setCSSMode] = useState<'inherit' | 'disable'>(siteStylesCSSMode(initialCSSMode));
  // What the server currently has — dirty means the editor differs from this.
  const [savedSnapshot, setSavedSnapshot] = useState({ css: initialCSS || emptyCSS, cssMode: siteStylesCSSMode(initialCSSMode) });
  const isDirty = css !== savedSnapshot.css || cssMode !== savedSnapshot.cssMode;
  const draftData = useMemo(() => ({ css, cssMode }), [css, cssMode]);
  const { pendingDraft, clearDraft } = useLocalDraft(
    `threadstead:draft:css-editor:${username}`,
    draftData,
    isDirty
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(true);
  const [activeTab, setActiveTab] = useState<'generators' | 'reference'>('generators');
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null);
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [layout, setLayout] = useState<PageLayout>(layoutOf(templateMode));
  // The standard layout shows the site's default look until there's saved CSS
  const hasSavedCSS = savedSnapshot.css.trim() !== '' && savedSnapshot.css.trim() !== emptyCSS.trim();
  const pageLook: 'html' | 'css' | 'default' = layout === 'html' ? 'html' : hasSavedCSS ? 'css' : 'default';
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showThemeGallery, setShowThemeGallery] = useState(false);

  // Warn before navigating away with unsaved CSS.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSave = async () => {
    await performSave(css);
  };

  const performSave = async (cssToSave: string) => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // Save CSS and CSS mode
      const response = await csrfFetch(`/api/profile/${username}/css`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customCSS: cssToSave, ...layoutFields({ siteStyles: siteStylesOn(cssMode) }) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save CSS');
      }

      // The layout stays as it is: saved CSS shows on either layout
      setSavedSnapshot({ css: cssToSave, cssMode });
      clearDraft();

      setSaveMessage('✓ CSS saved');
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

  // Captured via onCreateEditor: next/dynamic doesn't forward refs, so a
  // ref on the <CodeMirror> wrapper would stay null forever.
  const editorViewRef = useRef<EditorView | null>(null);
  // Until the person clicks into the editor its cursor sits at 0; inserting
  // there would put new rules above (and under) everything already written.
  const cursorPlacedRef = useRef(false);

  // Generators and the class reference drop their CSS in through here.
  const insertCSSAtCursor = useCallback((cssToInsert: string) => {
    const view = editorViewRef.current;
    if (view) {
      insertCSSIntoView(view, cssToInsert, cursorPlacedRef.current);
    } else {
      // Editor still loading: append, the same place it would go untouched.
      setCSS(prev => {
        const plan = planCSSInsertion(prev, prev.length, prev.length, cssToInsert);
        return prev + plan.insert;
      });
    }
  }, []);

  const confirmReset = async () => {
    const ok = await confirm({
      title: "Reset to Default Template?",
      message: (
        <div className="space-y-3">
          <p>This will:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Remove all your custom CSS</li>
            <li>Remove any custom HTML templates</li>
            <li>Return your profile to the site&apos;s default appearance</li>
          </ul>
          <p className="mt-4">You can bring the old version back from History.</p>
        </div>
      ),
      confirmText: "Yes, Reset to Default",
      variant: "danger",
    });
    if (ok) await handleResetToDefault();
  };

  const handleResetToDefault = async () => {
    setSaving(true);

    try {
      // First, clear the CSS
      const cssResponse = await csrfFetch(`/api/profile/${username}/css`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customCSS: '', ...layoutFields({ siteStyles: true }) }),
      });

      if (!cssResponse.ok) {
        throw new Error('Failed to clear CSS');
      }

      // Clear the template
      const templateResponse = await csrfFetch(`/api/profile/${username}/template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ template: '', customCSS: '' }),
      });

      if (!templateResponse.ok) {
        throw new Error('Failed to clear template');
      }

      // Back to the standard layout
      const capRes = await csrfFetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        throw new Error("Failed to update layout mode. Please log in again.");
      }
      const { token } = await capRes.json();

      const layoutResponse = await csrfFetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...layoutFields({ layout: 'standard' }),
          cap: token
        }),
      });

      if (!layoutResponse.ok) {
        throw new Error("Failed to set default mode.");
      }

      // Update local state - stay on CSS editor with cleared CSS
      setCSS(emptyCSS);
      setCSSMode('inherit');
      setLayout('standard');
      setSavedSnapshot({ css: emptyCSS, cssMode: 'inherit' });
      clearDraft();

      // Show success toast
      showSuccess('Reset complete — your profile is back on the site default template.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to reset');
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
      hideNavigation: true
    };

    targetWindow.postMessage({
      type: 'PREVIEW_DATA',
      payload: previewData
    }, window.location.origin);
  }, [css, residentData, currentUser, username]);

  // Open popup preview
  const openPreview = useCallback(() => {
    if (!residentData) {
      showInfo('Loading preview data... Please wait a moment and try again.');
      return;
    }

    // Close existing preview window if open
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }

    // Open new preview window
    const newWindow = window.open(
      '/template-preview',
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
      showError('Pop-up blocked — allow pop-ups for this site to use the preview.');
    }
  }, [previewWindow, residentData, sendPreviewData, showError, showInfo]);

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
    <>
      <Layout fullWidth={true}>
        <Head>
          <title>{`Simple CSS Editor - ${username} | ThreadStead`}</title>
        </Head>
      <div className="flex flex-col h-full bg-white overflow-x-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 max-w-full mx-auto">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <h1 className="text-lg font-semibold flex items-center gap-2"><PixelIcon name="paint-bucket" size={16} /> Simple CSS Styling</h1>
                <span className="text-gray-600 text-sm">@{username}</span>
                {pageLook === 'css' && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    ✓ CSS Mode Active
                  </span>
                )}
                {pageLook === 'default' && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                    Default Layout
                  </span>
                )}
                {pageLook === 'html' && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    Template Mode Active
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pageLook !== 'default' && (
                  <button
                    onClick={confirmReset}
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
                  <PixelIcon name="search" />
                  {loadingData ? 'Load...' : 'Preview'}
                </button>
                <button
                  onClick={() => setShowHistoryPanel(true)}
                  className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors flex items-center gap-1"
                  title="Load an earlier version of your CSS"
                >
                  <PixelIcon name="clock" size={14} /> History
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
            pageLook === 'html'
              ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
              : pageLook === 'css'
              ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'
              : 'bg-gradient-to-r from-blue-50 to-gray-50 border-blue-200'
          }`}>
            <div className="max-w-full mx-auto">
              <div className="flex items-center gap-3">
                {pageLook === 'html' ? (
                  <>
                    <PixelIcon name="warning-box" size={24} />
                    <div className="flex-1">
                      <p className="text-sm text-purple-900 font-semibold">
                        You&apos;re currently using a custom template
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        CSS you save here styles your custom template, which stays on.
                        To go back to the standard layout, use &quot;Reset to Default&quot;.
                      </p>
                    </div>
                  </>
                ) : pageLook === 'css' ? (
                  <>
                    <PixelIcon name="zap" size={24} />
                    <div className="flex-1">
                      <p className="text-sm text-green-900 font-semibold">
                        CSS Mode Active - Your styles are live on the default layout
                      </p>
                      <p className="text-xs text-gray-700 mt-1">
                        Click <strong className="text-blue-700">&quot;Preview&quot;</strong> to see changes live. •
                        Load a theme below for quick-start styles. •
                        Want custom layouts? Try <Link href="/templates" className="text-blue-600 hover:underline">Template Language</Link>.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <PixelIcon name="lightbulb" size={24} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        <strong>Just styling your default layout.</strong> Start with a theme or write custom CSS to change colors, fonts, and spacing.
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        New to CSS? <strong className="text-green-700">Load a theme</strong> below (Pixel Petals, Abstract Art, etc.) then make it yours. •
                        Click <strong className="text-blue-700">&quot;Preview&quot;</strong> to see changes live. •
                        Click <strong className="text-green-700">&quot;Save CSS&quot;</strong> to put your styles live. •
                        Want custom layouts? Try <Link href="/templates" className="text-blue-600 hover:underline">Template Language</Link>.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Draft recovery */}
          {pendingDraft && (
            <DraftRestoreBanner
              savedAt={pendingDraft.savedAt}
              onRestore={() => {
                setCSS(pendingDraft.data.css);
                setCSSMode(siteStylesCSSMode(pendingDraft.data.cssMode));
                clearDraft();
              }}
              onDiscard={clearDraft}
            />
          )}

          {/* Main Content */}
          {/* Below lg the tools stack under the editor instead of squeezing it */}
          <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden min-h-0">
            {/* Editor Pane */}
            <div className="lg:flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-700">CSS Editor</span>
                <div className="flex flex-wrap items-center gap-2">
                  {saveMessage && (
                    <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                      {saveMessage}
                    </span>
                  )}
                  <button
                    onClick={confirmReset}
                    disabled={saving}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-medium transition-colors disabled:opacity-50 text-sm border border-gray-300 flex items-center gap-1"
                    title="Remove all customizations and return to site default"
                  >
                    <PixelIcon name="reload" /> Reset to Default
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors disabled:opacity-50 text-sm flex items-center gap-1"
                  >
                    {saving ? 'Saving...' : <><PixelIcon name="save" /> Save CSS</>}
                  </button>
                </div>
              </div>

              {/* Theme Gallery */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowThemeGallery(true)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <PixelIcon name="paint-bucket" size={16} />
                  Browse Themes
                </button>
                <span className="text-xs text-gray-600">
                  Start from a pre-designed theme, then make it yours.
                </span>
              </div>

              {/* Site styles: on or off */}
              <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <label htmlFor="site-styles" className="text-sm font-medium text-gray-700">Site styles:</label>
                  <select
                    id="site-styles"
                    value={cssMode}
                    onChange={(e) => setCSSMode(siteStylesCSSMode(e.target.value))}
                    className="max-w-full text-sm px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50"
                  >
                    <option value="inherit">On - Extend site styles</option>
                    <option value="disable">Off - Full control</option>
                  </select>
                </div>
                <div className={`mt-2 text-xs p-2 rounded ${
                  cssMode === 'inherit'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}>
                  {cssMode === 'inherit' && (
                    <>
                      <strong>Site styles on:</strong> Your CSS adds to ThreadStead&apos;s base styles. Site CSS will be included and your styles extend it.
                    </>
                  )}
                  {cssMode === 'disable' && (
                    <>
                      <strong>Site styles off:</strong> All ThreadStead CSS is disabled - you style everything from scratch. Only your CSS applies.
                    </>
                  )}
                </div>
              </div>

              {/* A phone has no row height to fill, so the editor gets its own */}
              <div className="h-[60vh] min-h-[320px] lg:h-auto lg:min-h-0 lg:flex-1 overflow-auto">
                <CodeMirror
                  value={css}
                  onChange={(value: string) => setCSS(value)}
                  onCreateEditor={(view: EditorView) => {
                    editorViewRef.current = view;
                    cursorPlacedRef.current = false;
                    view.contentDOM.addEventListener('focus', () => { cursorPlacedRef.current = true; });
                  }}
                  extensions={[cssLang()]}
                  height="100%"
                  style={{ height: '100%', fontSize: '13px' }}
                  placeholder={`/* Add your custom CSS here */

/* Example: cozy pine-to-meadow profile header */
.ts-profile-header {
  background: linear-gradient(135deg, #2E4B3F 0%, #4FAF6D 100%) !important;
  color: #FCFAF7 !important;
}

/* Example: paper blog post cards */
.blog-post-card {
  background: #FCFAF7 !important;
  border: 2px solid #A18463 !important;
  border-radius: 8px !important;
}
`}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    autocompletion: true,
                    highlightActiveLine: true,
                  }}
                />
              </div>
            </div>

            {/* Reference & Generators Sidebar */}
            {showReference && (
              <div className="w-full lg:w-[400px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col lg:h-full overflow-hidden bg-white">
                {/* Simple Tab Bar */}
                <div className="flex border-b border-gray-200" role="tablist">
                  <button
                    onClick={() => setActiveTab('generators')}
                    role="tab"
                    aria-selected={activeTab === 'generators'}
                    className="ts-tab flex-1 inline-flex items-center justify-center gap-1 text-sm"
                  >
                    <PixelIcon name="paint-bucket" size={14} /> Generators
                  </button>
                  <button
                    onClick={() => setActiveTab('reference')}
                    role="tab"
                    aria-selected={activeTab === 'reference'}
                    className="ts-tab flex-1 inline-flex items-center justify-center gap-1 text-sm"
                  >
                    <PixelIcon name="article" size={14} /> Reference
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
              <span className="flex items-center gap-1"><PixelIcon name="lightbulb" size={12} /> Use Generators to create CSS visually</span>
              <span>•</span>
              <a href="/design-css-tutorial" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                CSS Tutorial
              </a>
            </div>
          </div>
        </div>
      </Layout>

      {/* Theme Gallery Modal */}
      {showThemeGallery && (
        <TemplatePanelSelector
          currentCSS={css}
          onSelectTemplate={async (themeCSS, themeName) => {
            if (isDirty && !(await confirm({ title: `Load "${themeName}"?`, message: 'This will replace your current CSS. Any unsaved changes will be lost.', confirmText: 'Load theme' }))) {
              return;
            }
            setCSS(themeCSS);
            setShowThemeGallery(false);
            showSuccess(`${themeName} loaded — save to put it live.`);
          }}
          onClose={() => setShowThemeGallery(false)}
        />
      )}

      {/* Revision History Panel */}
      {showHistoryPanel && (
        <TemplateHistoryPanel
          username={username}
          onClose={() => setShowHistoryPanel(false)}
          onLoadRevision={async (rev: FullRevision) => {
            if (isDirty && !(await confirm({ title: 'Load this version?', message: 'Loading this version will replace your unsaved CSS.', confirmText: 'Load version' }))) {
              return;
            }
            setCSS(rev.customCSS || emptyCSS);
            setCSSMode(siteStylesCSSMode(rev.cssMode));
            setShowHistoryPanel(false);
            showSuccess('Version loaded — save to put it live.');
          }}
        />
      )}

    </>
  );
}

export const getServerSideProps: GetServerSideProps<CSSEditorPageProps> = async ({
  params,
  req
}) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || '');
  if (!username) return { notFound: true };

  const base = getInternalBaseUrl();

  try {
    // Get current user session
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
    const initialCSSMode = (profileData.profile?.cssMode as 'inherit' | 'override' | 'disable') || 'inherit';
    const templateMode = (profileData.profile?.templateMode as 'default' | 'enhanced' | 'advanced') || 'default';

    return {
      props: {
        username,
        isOwner,
        initialCSS,
        initialCSSMode,
        templateMode,
        currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return { notFound: true };
  }
};
