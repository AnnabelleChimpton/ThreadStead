import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { PixelIcon } from '@/components/ui/PixelIcon';
import ProfileModeRenderer, { ProfileUser } from '@/components/core/profile/ProfileModeRenderer';
import ProfileLayout from '@/components/ui/layout/ProfileLayout';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import NavigationPreview from '@/components/features/templates/NavigationPreview';
import { ADVANCED_NAV_SURFACE } from '@/components/core/profile/AdvancedNavFrame';
import RetroCard from '@/components/ui/layout/RetroCard';
import ProfileHeader from '@/components/core/profile/ProfileHeader';
import Tabs, { TabSpec } from '@/components/ui/navigation/Tabs';
import BlogTab from '@/components/core/profile/tabs/BlogTab';
import MediaGrid from '@/components/core/profile/tabs/MediaGrid';
import FriendsWebsitesGrid from '@/components/core/profile/tabs/FriendsWebsitesGrid';
import ProfileBadgeDisplay from '@/components/core/profile/ProfileBadgeDisplay';
import Guestbook from '@/components/shared/Guestbook';
import { cleanCss, escapeCssForStyleTag } from '@/lib/utils/sanitization/css';
import { transformAdvancedCss } from '@/lib/utils/css/css-transform';
import { documentHeadCss, extractDocument } from '@/lib/templates/compilation/document-head';
import PageMeta from "@/components/ui/layout/PageMeta";
// Removed unused imports - now using ProfileModeRenderer like production

interface PreviewData {
  user: ProfileUser;
  residentData: ResidentData;
  customCSS: string;
  useStandardLayout: boolean;
  hideNavigation?: boolean;
  template?: string; // For advanced templates
  cssMode?: string;
}

// The preview runs either as a popup (window.opener) or embedded in the
// editor as an iframe (window.parent). Same protocol either way.
function getHostWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  if (window.opener && !window.opener.closed) return window.opener;
  if (window.parent && window.parent !== window) return window.parent;
  return null;
}

export default function PreviewTemp() {
  const router = useRouter();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);
  // Embedded in the editor's preview pane: the editor chrome already labels
  // and saves things, so the banner would just be noise.
  const isEmbedded = router.query.embed === '1';
  
  // This effect must arm exactly ONCE. Its old deps ([isReady, previewData])
  // re-ran it on every received message, and the unconditional PREVIEW_READY
  // it posts turned the handshake into an infinite READY -> DATA -> READY
  // ping-pong with the host — a full preview re-render per cycle, pegging a
  // CPU core for as long as the editor stayed open. The retry reads state
  // through a ref instead of the closure so it never needs deps.
  const hasDataRef = useRef(false);
  useEffect(() => {
    // Listen for preview data from parent window
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'PREVIEW_DATA') {
        hasDataRef.current = true;
        setPreviewData(event.data.payload);
        setIsReady(true);
      }

      if (event.data.type === 'CSS_UPDATE') {
        setPreviewData(prev => prev ? {
          ...prev,
          customCSS: event.data.customCSS
        } : null);
      }
    };

    window.addEventListener('message', handleMessage);

    // Signal to the host (popup opener or iframe parent) that we're ready
    const requestData = () => {
      const host = getHostWindow();
      if (host) {
        host.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
      }
    };

    // Initial request
    requestData();

    // Retry every 2 seconds until the first data arrives
    const retryInterval = setInterval(() => {
      const host = getHostWindow();
      if (hasDataRef.current || !host) {
        clearInterval(retryInterval);
        return;
      }
      requestData();
    }, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(retryInterval);
    };
  }, []);

  // Sanitize custom CSS to prevent XSS attacks (must be before early return)
  const sanitizedCSS = useMemo(() => {
    if (!previewData?.customCSS) return '';
    // Sanitized like a save, then escaped for the <style> tags below
    return escapeCssForStyleTag(cleanCss(previewData.customCSS));
  }, [previewData?.customCSS]);

  // Your own HTML page: exactly what the live page injects (pages/_app.tsx),
  // with a pasted page's Google Fonts links, <body bgcolor…> and theme options as CSS
  const documentCss = useMemo(() => {
    const { head } = extractDocument(previewData?.template || '');
    return { fontImports: head.fontImports, bodyCss: documentHeadCss(head) };
  }, [previewData?.template]);
  const advancedCSS = useMemo(() => {
    const css = previewData?.customCSS ? cleanCss(previewData.customCSS) : '';
    if (!css && documentCss.fontImports.length === 0 && !documentCss.bodyCss) return '';
    return transformAdvancedCss(css, documentCss);
  }, [previewData?.customCSS, documentCss]);

  if (!isReady || !previewData) {
    return (
      <>
        <PageMeta title="Preview" noIndex />
        <div className="min-h-screen flex items-center justify-center bg-thread-cream">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-thread-pine mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-thread-pine">Loading Preview...</h1>
            <p className="text-thread-sage mt-2">Waiting for template data...</p>
          </div>
        </div>
      </>
    );
  }

  const { user, residentData, customCSS, hideNavigation = false, template, cssMode } = previewData;
  const showNavigation = !hideNavigation;

  // Ensure cssMode is properly typed
  const typedCSSMode: 'inherit' | 'override' | 'disable' = (cssMode as 'inherit' | 'override' | 'disable') || 'inherit';

  // Save function - communicates with the host window to trigger save
  const handleSave = async () => {
    const host = getHostWindow();
    if (!host) {
      setSaveMessage({ text: "Can't save. The editor window is closed.", ok: false });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Send save request to the host window
      host.postMessage({
        type: 'SAVE_REQUEST',
        data: {
          template: template || '',
          customCSS: customCSS || '',
          cssMode: typedCSSMode,
          hideNavigation,
          useStandardLayout: previewData.useStandardLayout
        }
      }, window.location.origin);

      // Show success message
      setSaveMessage({ text: 'Save request sent', ok: true });
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ text: "Couldn't save", ok: false });
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Create user object with updated CSS for ProfileModeRenderer
  const previewUser: ProfileUser = {
    ...user,
    profile: {
      ...user.profile,
      customCSS: customCSS
    }
  };


  // Create the profile tabs - needed for standard layout preview
  const baseTabs: TabSpec[] = [
    { 
      id: "blog", 
      label: "Blog", 
      content: <BlogTab username={user.handle.split('@')[0]} ownerUserId={user.id} /> 
    },
    {
      id: "media",
      label: "Media",
      content: <MediaGrid username={user.handle.split('@')[0]} isOwner={true} />,
    },
    {
      id: "friends",
      label: "Friends / Websites",
      content: <FriendsWebsitesGrid friends={[]} websites={[]} />,
    },
    {
      id: "badges",
      label: "Badges",
      content: (
        <div className="profile-tab-content p-4">
          <ProfileBadgeDisplay 
            username={user.handle.split('@')[0]} 
            showTitle={false}
            layout="grid"
            className="max-w-2xl"
          />
        </div>
      ),
    },
    {
      id: "guestbook",
      label: "Guestbook",
      content: (
        <div className="ts-guestbook-tab-content profile-tab-content" data-component="guestbook-tab">
          <Guestbook username={user.handle.split('@')[0]} bio={""} />
        </div>
      ),
    },
  ];

  // Removed renderCompiledTemplateWithIslands function - now using ProfileModeRenderer like production

  // Create fallback content for enhanced/standard mode
  const profileFallbackContent = (
    <>
      <RetroCard>
        <ProfileHeader
          username={user.handle.split('@')[0]}
          photoUrl=""
          bio=""
          relStatus=""
          onRelStatusChange={() => {}}
        />
      </RetroCard>

      <div className="profile-tabs-wrapper">
        <Tabs tabs={baseTabs} initialId="blog" />
      </div>
    </>
  );

  // Check template mode - CRITICAL for backwards compatibility
  const templateMode = previewUser.profile?.templateMode || 'default';
  // cssMode is already destructured from previewData above
  
  // Use the useStandardLayout flag from the editor - this is the source of truth
  // If useStandardLayout is false AND we have template content, it's advanced mode
  const hasCustomTemplate = previewUser.profile?.customTemplate && 
                           previewUser.profile.customTemplate.trim() !== '';
  const isReallyAdvancedMode = !previewData.useStandardLayout && hasCustomTemplate;
  
  
  // For standard layout (enhanced mode), always use ProfileLayout for consistency
  if (!isReallyAdvancedMode) {
    
    return (
      <>
        <PageMeta title="Preview" noIndex />
        
        {/* Add preview indicator with save button - hidden when embedded in the editor */}
        {!isEmbedded && (
          <div
            className="fixed top-0 left-0 right-0 z-[10000] bg-blue-600 text-white text-center py-2 text-sm font-medium flex items-center justify-between px-4"
            style={{ zIndex: 999999 }}
          >
            <div></div>
            <span>STANDARD LAYOUT PREVIEW - CSS updates automatically</span>
            <div>
              {saveMessage && (
                <span className="mr-3 text-xs inline-flex items-center gap-1 align-middle">
                  <PixelIcon name={saveMessage.ok ? 'check' : 'close'} size={12} />{saveMessage.text}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                style={{ fontSize: '11px' }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Add top padding to account for preview banner */}
        <div style={{ paddingTop: isEmbedded ? 0 : '40px' }}>
          <ResidentDataProvider data={residentData}>
            <ProfileLayout 
              hideNavigation={false}
              templateMode={templateMode}
              cssMode={typedCSSMode}
            >
              {profileFallbackContent}
            </ProfileLayout>
          </ResidentDataProvider>
          
          {/* EMERGENCY CSS INJECTION - Force user CSS to win no matter what */}
          {sanitizedCSS && (
            <style dangerouslySetInnerHTML={{ __html: `
              /* EMERGENCY OVERRIDE - USER CSS MUST WIN - SANITIZED INJECTION */
              ${sanitizedCSS}
            ` }} />
          )}
        </div>
      </>
    );
  }
  
  // Advanced template mode - COMPLETELY BLANK PAGE with only user content
  // NO external CSS, NO Tailwind, NO system styles - just user's template and CSS
  return (
    <>
      <PageMeta title="Preview" noIndex>
        {/* ONLY style the preview banner - nothing else */}
        <style>{`
          /* Preview banner ONLY - completely isolated from page */
          #preview-banner {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 999999 !important;
            background: #7c3aed !important;
            color: white !important;
            text-align: center !important;
            padding: 8px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            font-family: system-ui, sans-serif !important;
          }
        `}</style>
      </PageMeta>
      
      {/* Preview indicator with save button - hidden when embedded in the editor */}
      {!isEmbedded && (
      <div
        id="preview-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
      >
        <div></div>
        <span>ADVANCED TEMPLATE PREVIEW - Live CSS Updates</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveMessage && (
            <span style={{ fontSize: '11px', opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <PixelIcon name={saveMessage.ok ? 'check' : 'close'} size={12} />{saveMessage.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              backgroundColor: isSaving ? '#6b7280' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = '#047857';
            }}
            onMouseOut={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = '#059669';
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      )}

      {/* User content with optional navigation and ResidentDataProvider */}
      <div style={{ paddingTop: isEmbedded ? (showNavigation ? '80px' : 0) : (showNavigation ? '120px' : '40px') }}>
        {/* The page's own CSS, transformed exactly as on the live page */}
        {advancedCSS && (
          <style id="advanced-template-css" dangerouslySetInnerHTML={{ __html: escapeCssForStyleTag(advancedCSS) }} />
        )}

        {/* Show site navigation if toggle is enabled */}
        {showNavigation && (
          <div data-site-chrome="true" style={{ position: 'fixed', top: isEmbedded ? 0 : '40px', left: 0, right: 0, zIndex: 999998, height: '80px' }}>
            <NavigationPreview navBackgroundColor={ADVANCED_NAV_SURFACE} />
          </div>
        )}
        
        {/* Use the same ProfileModeRenderer as production for consistency */}
        <div 
          id="preview-container"
          style={{ 
            minHeight: 'calc(100vh - 80px)', // Account for both banners
            position: 'relative' // Ensure content flows properly
          }}
        >
          <ProfileModeRenderer
            user={previewUser}
            residentData={residentData}
            hideNavigation={true}
            fallbackContent={
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Advanced Template Mode</h2>
                <p>Your custom HTML template will render here.</p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                  Start adding HTML in the editor to see it appear.
                </p>
              </div>
            }
          />
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      // Tell _app.tsx this is an advanced template preview - no default styles
      templateMode: 'advanced',
      siteStyles: false
    }
  };
}