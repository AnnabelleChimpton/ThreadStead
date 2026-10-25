import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getInternalBaseUrl } from "@/lib/utils/api/internal-base-url";
import type { GetServerSideProps, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { css as cssLang } from '@codemirror/lang-css';
import { EditorView } from '@codemirror/view';

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
import { fetchPageData } from '@/lib/templates/core/template-data';
import type { PreviewPayload } from '@/lib/templates/editor/preview-payload';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { requestCapability } from '@/lib/api/client/capability';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import DraftRestoreBanner from '@/components/ui/feedback/DraftRestoreBanner';
import { useLocalDraft } from '@/hooks/useLocalDraft';
import TemplateHistoryPanel, { type FullRevision } from '@/components/features/templates/TemplateHistoryPanel';
import TemplatePanelSelector from '@/components/features/templates/TemplatePanelSelector';
import { PixelIcon } from '@/components/ui/PixelIcon';
import ShareToFeedCheckbox from '@/components/features/profile/ShareToFeedCheckbox';
import Button from '@/components/ui/Button';
import EditorWorkspace, {
  CodeSettings,
  EditorMenu,
  EditorToolbar,
  LivePreviewPane,
  MenuItem,
  PhoneCodeTools,
  PhoneOnly,
  SaveNoteText,
  SaveStatus,
  tidyCode,
  tidyNote,
  useCodeSettings,
  useEmbeddedPreview,
  type SaveNote,
  type WorkspaceTab,
} from '@/components/features/templates/editor/EditorWorkspace';
import { insertCSSIntoView, planCSSInsertion } from '@/components/features/templates/css-generators/shared/insertCSS';
import { layoutFields, layoutOf, siteStylesCSSMode, siteStylesOn, type Layout as PageLayout } from '@/lib/domain/profile/layout';
import PageMeta from "@/components/ui/layout/PageMeta";

type CSSEditorTab = 'css' | 'generators' | 'reference';

/** Your own HTML page, for the preview when that's what the CSS styles */
interface HtmlPage {
  template: string;
  compiledTemplate: unknown;
  hideNavigation: boolean;
}

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
  htmlPage?: HtmlPage | null;
}

export default function CSSEditorPage({
  username,
  isOwner,
  initialCSS,
  initialCSSMode = 'inherit',
  templateMode = 'default',
  currentUser,
  htmlPage = null,
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
  // "Share this update in the feed": unticked each time the editor opens
  const [shareToFeed, setShareToFeed] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveNote | null>(null);
  const [activeTab, setActiveTab] = useState<CSSEditorTab>('css');
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
        body: JSON.stringify({
          customCSS: cssToSave,
          ...layoutFields({ siteStyles: siteStylesOn(cssMode) }),
          ...(shareToFeed && { shareToFeed: true }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save CSS');
      }
      const saved = await response.json().catch(() => ({}));

      // The layout stays as it is: saved CSS shows on either layout
      setSavedSnapshot({ css: cssToSave, cssMode });
      clearDraft();

      if (shareToFeed && saved.shared) {
        setShareToFeed(false);
        setSaveMessage({ text: 'CSS saved and shared in the feed', tone: 'ok' });
      } else if (shareToFeed && saved.pageChanged === false) {
        setSaveMessage({ text: "CSS saved. Nothing changed, so there's nothing to share.", tone: 'ok' });
      } else if (shareToFeed) {
        setSaveMessage({ text: "CSS saved, but it didn't reach the feed.", tone: 'note' });
      } else {
        setSaveMessage({ text: 'CSS saved', tone: 'ok' });
      }
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ text: `Error: ${error instanceof Error ? error.message : 'Failed to save'}`, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackToProfile = () => {
    router.push(`/resident/${username}`);
  };

  // Captured via onCreateEditor: next/dynamic doesn't forward refs, so a
  // ref on the <CodeMirror> wrapper would stay null forever.
  const editorViewRef = useRef<EditorView | null>(null);
  // Wrap and text size, remembered (EditorWorkspace)
  const codeSettings = useCodeSettings();
  const cssExtensions = useMemo(
    () => [cssLang(), ...(codeSettings.wrap.css ? [EditorView.lineWrapping] : [])],
    [codeSettings.wrap.css]
  );
  const tidy = async () => {
    if (!editorViewRef.current) return;
    setSaveMessage(tidyNote(await tidyCode(editorViewRef.current, 'css')));
    setTimeout(() => setSaveMessage(null), 3000);
  };
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
      const token = await requestCapability("profile");

      const layoutResponse = await csrfFetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...layoutFields({ layout: 'standard' }),
          cap: token
        }),
      });

      if (!layoutResponse.ok) {
        throw new Error((await layoutResponse.json().catch(() => ({}))).error || "Failed to set default mode.");
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


  // The preview's data, built as the live page builds it (/api/profile/[username]/page-data)
  const [adminDefaultCss, setAdminDefaultCss] = useState('');
  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    setLoadingData(true);
    fetchPageData(username).then((data) => {
      if (!alive) return;
      // Without it the page still previews, its lists empty
      setResidentData(
        data?.residentData ?? {
          owner: { id: currentUser.id, handle: username, displayName: username, avatarUrl: '/assets/default-avatar.gif' },
          viewer: { id: currentUser.id },
          posts: [],
          guestbook: [],
        }
      );
      setAdminDefaultCss(data?.adminDefaultCss ?? '');
      setLoadingData(false);
    });
    return () => {
      alive = false;
    };
  }, [username, currentUser]);

  // Send preview data to popup window
  const sendPreviewData = useCallback((targetWindow: Window) => {
    if (!residentData || !currentUser) return;
    // On your own HTML page the CSS styles that page (as you see it), so that's what shows
    const asHtml = layout === 'html' && !!htmlPage;
    const payload: PreviewPayload = {
      ownerId: currentUser.id,
      handle: currentUser.primaryHandle || `${username}@threadstead`,
      page: asHtml ? (htmlPage.compiledTemplate as PreviewPayload['page']) : null,
      as: 'owner',
      residentData,
      customCSS: css,
      adminDefaultCss,
      cssMode,
      hideNavigation: asHtml ? htmlPage.hideNavigation : false,
      template: asHtml ? htmlPage.template : '',
    };
    targetWindow.postMessage({ type: 'PREVIEW_DATA', payload }, window.location.origin);
  }, [css, cssMode, adminDefaultCss, layout, htmlPage, residentData, currentUser, username]);

  // The preview beside the code, open wherever there's room for it
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  useEffect(() => {
    if (window.innerWidth >= 1024) setShowPreviewPane(true);
  }, []);
  const { frameRef: previewFrameRef, ready: previewFrameReady } = useEmbeddedPreview({
    enabled: showPreviewPane,
    hasData: !!residentData,
    send: sendPreviewData,
  });

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

  // Keep the popup up to date (CSS and the site styles setting)
  useEffect(() => {
    if (previewWindow && !previewWindow.closed) sendPreviewData(previewWindow);
  }, [previewWindow, sendPreviewData]);

  if (!isOwner) {
    return (
      <Layout>
        <PageMeta title="Not your page" noIndex />
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

  const cssTab: WorkspaceTab = {
    id: 'css',
    label: 'CSS',
    fill: true,
    content: (
      <>
        <div className="ts-editor-tools flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-1.5 border-b border-thread-sage/40 flex-shrink-0 text-sm text-nb-ink">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowThemeGallery(true)}
            className="inline-flex items-center gap-2"
          >
            <PixelIcon name="paint-bucket" size={14} /> Browse themes
          </Button>
          <label htmlFor="site-styles" className="inline-flex items-center gap-2">
            Site styles
            <select
              id="site-styles"
              value={cssMode}
              onChange={(e) => setCSSMode(siteStylesCSSMode(e.target.value))}
              className="text-sm px-2 py-1 border border-thread-sage rounded bg-thread-paper"
            >
              <option value="inherit">On</option>
              <option value="disable">Off</option>
            </select>
          </label>
          <CodeSettings pane="css" settings={codeSettings} />
        </div>
        <p className="m-0 px-3 py-1.5 text-xs text-nb-ink-mid border-b border-thread-sage/40 flex-shrink-0">
          {cssMode === 'inherit'
            ? "Site styles on: your CSS adds to the site's, so the nav, buttons and boxes keep their look until you change them."
            : 'Site styles off: only your CSS applies, so you style everything, buttons and nav included.'}
        </p>
        <div className="flex-1 min-h-0 overflow-hidden bg-white">
          <CodeMirror
            value={css}
            onChange={(value: string) => setCSS(value)}
            onCreateEditor={(view: EditorView) => {
              editorViewRef.current = view;
              cursorPlacedRef.current = false;
              view.contentDOM.addEventListener('focus', () => { cursorPlacedRef.current = true; });
            }}
            extensions={cssExtensions}
            height="100%"
            style={{ height: '100%', fontSize: `${codeSettings.size}px` }}
            placeholder={`/* Add your custom CSS here */

/* Example: cozy pine-to-meadow profile header */
.ts-profile-header {
  background: linear-gradient(135deg, #2E4B3F 0%, #4FAF6D 100%);
  color: #FCFAF7;
}

/* Example: paper blog post cards */
.blog-post-card {
  background: #FCFAF7;
  border: 2px solid #A18463;
  border-radius: 8px;
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
      </>
    ),
  };

  // The generators and the class list aim at the standard layout's classes,
  // which an HTML page of your own doesn't have
  const tabs: WorkspaceTab[] = pageLook === 'html' ? [cssTab] : [
    cssTab,
    {
      id: 'generators',
      label: 'Generators',
      content: (
        <div className="p-4">
          <CSSGeneratorTools onInsertCSS={insertCSSAtCursor} />
        </div>
      ),
    },
    {
      id: 'reference',
      label: 'Class names',
      content: (
        <div className="p-4">
          <CSSClassReference onClassSelect={(className) => insertCSSAtCursor(className)} />
        </div>
      ),
    },
  ];

  return (
    <>
      <Layout workspace>
        <PageMeta title="CSS for your page" noIndex />
        <EditorWorkspace
          toolbar={
            <EditorToolbar
              title="CSS for your page"
              handle={username}
              status={<SaveStatus state={saving ? 'saving' : isDirty ? 'pending' : 'saved'} />}
              message={saveMessage && <SaveNoteText note={saveMessage} />}
              share={
                <ShareToFeedCheckbox
                  checked={shareToFeed}
                  onChange={setShareToFeed}
                  disabled={saving}
                  className="text-nb-ink"
                />
              }
              laptopOnly={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHistoryPanel(true)}
                  title="Load an earlier version of your CSS"
                  className="inline-flex items-center gap-1"
                >
                  <PixelIcon name="clock" size={12} /> History
                </Button>
              }
              phoneTools={activeTab === 'css' && <PhoneCodeTools view={() => editorViewRef.current} />}
              save={
                <Button size="sm" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1">
                  {saving ? 'Saving...' : <><PixelIcon name="save" size={14} /> Save CSS</>}
                </Button>
              }
            >
              <EditorMenu>
                {(close) => (
                  <>
                    {activeTab === 'css' && (
                      <MenuItem onClick={() => { close(); void tidy(); }}>
                        <PixelIcon name="code" size={12} /> Tidy the CSS
                      </MenuItem>
                    )}
                    <PhoneOnly>
                      <MenuItem onClick={() => { close(); setShowHistoryPanel(true); }}>
                        <PixelIcon name="clock" size={12} /> History
                      </MenuItem>
                      <MenuItem href="/build/css" newTab>
                        <PixelIcon name="article" size={12} /> CSS guide
                      </MenuItem>
                      <MenuItem href="/build/what-works-here" newTab>
                        <PixelIcon name="info-box" size={12} /> What works here
                      </MenuItem>
                    </PhoneOnly>
                    <MenuItem href={`/resident/${encodeURIComponent(username)}`}>
                      <PixelIcon name="home" size={12} /> View my page
                    </MenuItem>
                    <MenuItem onClick={() => { close(); openPreview(); }}>
                      <PixelIcon name="external-link" size={12} /> Preview in its own window
                    </MenuItem>
                    <MenuItem href="/settings?tab=appearance">
                      <PixelIcon name="sliders" size={12} /> Appearance settings
                    </MenuItem>
                    {pageLook !== 'default' && (
                      <>
                        <hr className="my-1 border-thread-sage/40" />
                        <MenuItem onClick={() => { close(); confirmReset(); }}>
                          <PixelIcon name="reload" size={12} /> Reset to default
                        </MenuItem>
                      </>
                    )}
                  </>
                )}
              </EditorMenu>
            </EditorToolbar>
          }
          notices={
            <>
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
              {pageLook !== 'css' && (
                <p className="ts-editor-note m-0 px-4 py-1.5 text-sm bg-thread-cream border-b border-thread-sage text-nb-ink flex-shrink-0">
                  {pageLook === 'html' ? (
                    <>
                      This CSS styles your own HTML page.{' '}
                      <Link href={`/resident/${encodeURIComponent(username)}/template-editor`} className="underline">Edit the HTML</Link>
                    </>
                  ) : (
                    <>
                      <strong>Your page has the site&apos;s default look.</strong> Start from a theme and change it from there.
                      Want your own layout?{' '}
                      <Link href="/build/html" className="underline">Write your own HTML page</Link>.
                    </>
                  )}
                </p>
              )}
            </>
          }
          tabs={tabs}
          activeTab={tabs.some((tab) => tab.id === activeTab) ? activeTab : 'css'}
          onTabChange={(id) => setActiveTab(id as CSSEditorTab)}
          tabsEnd={
            <>
              <a href="/build/css" target="_blank" rel="noopener noreferrer" className="underline text-nb-ink">CSS guide</a>
              <a href="/build/what-works-here" target="_blank" rel="noopener noreferrer" className="underline text-nb-ink">What works here</a>
              {!showPreviewPane && (
                <button type="button" className="ts-bare hidden lg:inline underline text-nb-ink" onClick={() => setShowPreviewPane(true)}>
                  Show preview
                </button>
              )}
            </>
          }
          preview={showPreviewPane ? (
            <LivePreviewPane
              frameRef={previewFrameRef}
              status={loadingData ? 'Loading your page…' : previewFrameReady ? 'Updates as you type' : 'Warming up…'}
              onPopOut={openPreview}
              onHide={() => setShowPreviewPane(false)}
            />
          ) : null}
        />
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
            showSuccess(`${themeName} is in the editor. Save to put it on your page.`);
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
            showSuccess('That version is in the editor. Save to put it on your page.');
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

    // Your own HTML page: the preview shows the CSS on it
    let htmlPage: HtmlPage | null = null;
    if (isOwner && layoutOf(templateMode) === 'html' && profileData.profile?.compiledTemplate) {
      try {
        const templateRes = await fetch(`${base}/api/profile/${encodeURIComponent(username)}/template`, {
          headers: { cookie: req.headers.cookie || '' },
        });
        if (templateRes.ok) {
          const { template } = await templateRes.json();
          if (typeof template === 'string' && template.trim()) {
            htmlPage = {
              template,
              compiledTemplate: profileData.profile.compiledTemplate,
              hideNavigation: !!profileData.profile?.hideNavigation,
            };
          }
        }
      } catch (error) {
        console.error('Failed to fetch the page for the preview:', error);
      }
    }

    return {
      props: {
        username,
        isOwner,
        initialCSS,
        initialCSSMode,
        templateMode,
        currentUser: currentUser ? JSON.parse(JSON.stringify(currentUser)) : null,
        htmlPage,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return { notFound: true };
  }
};
