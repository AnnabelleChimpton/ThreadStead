import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProfileModeRenderer, { ProfileUser } from '@/components/core/profile/ProfileModeRenderer';
import ProfileLayout from '@/components/ui/layout/ProfileLayout';
import { ResidentDataProvider } from '@/components/features/templates/ResidentDataProvider';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { useProfileIslandHydration } from '@/lib/islands';
import Head from 'next/head';
import MinimalNavBar from '@/components/ui/navigation/MinimalNavBar';
import RetroCard from '@/components/ui/layout/RetroCard';
import ProfileHeader from '@/components/core/profile/ProfileHeader';
import Tabs, { TabSpec } from '@/components/ui/navigation/Tabs';
import BlogTab from '@/components/core/profile/tabs/BlogTab';
import MediaGrid from '@/components/core/profile/tabs/MediaGrid';
import FriendsWebsitesGrid from '@/components/core/profile/tabs/FriendsWebsitesGrid';
import ProfileBadgeDisplay from '@/components/core/profile/ProfileBadgeDisplay';
import Guestbook from '@/components/shared/Guestbook';
// Removed unused imports - now using ProfileModeRenderer like production

interface PreviewData {
  user: ProfileUser;
  residentData: ResidentData;
  customCSS: string;
  useStandardLayout: boolean;
  showNavigation: boolean;
  template?: string; // For advanced templates
  cssMode?: string;
}

export default function PreviewTemp() {
  const router = useRouter();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // Island hydration for interactive components
  const { hydrateProfile, status, isSupported } = useProfileIslandHydration();

  // Hydrate islands when advanced mode template is rendered
  useEffect(() => {
    if (previewData && previewData.user && previewData.residentData) {
      // Check if this is advanced mode
      const hasCustomTemplate = previewData.user.profile?.customTemplate && 
                               previewData.user.profile.customTemplate.trim() !== '';
      const isAdvancedMode = !previewData.useStandardLayout && hasCustomTemplate;
      
      if (isAdvancedMode && isReady && previewData.user.profile?.compiledTemplate) {
        // Small delay to ensure DOM is ready after ProfileModeRenderer renders
        const timer = setTimeout(() => {
          const compiledTemplate = previewData.user.profile?.compiledTemplate;
          if (compiledTemplate && (compiledTemplate as any).islands) {
            hydrateProfile('preview-container', {
              residentData: previewData.residentData,
              profileMode: 'advanced',
              islands: (compiledTemplate as any).islands
            }).catch(error => {
              console.error('Preview hydration failed:', error);
            });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [previewData, isReady, hydrateProfile]);

  useEffect(() => {
    // Listen for preview data from parent window
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'PREVIEW_DATA') {
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
    
    // Signal to parent that we're ready to receive data - with retry mechanism
    const requestData = () => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
      }
    };

    // Initial request
    requestData();
    
    // Retry every 2 seconds if we haven't received data yet
    const retryInterval = setInterval(() => {
      if (!isReady && !previewData && window.opener && !window.opener.closed) {
        requestData();
      } else if (isReady || !window.opener || window.opener.closed) {
        clearInterval(retryInterval);
      }
    }, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(retryInterval);
    };
  }, [isReady, previewData]);

  if (!isReady || !previewData) {
    return (
      <>
        <Head>
          <title>Preview Loading... | ThreadStead</title>
        </Head>
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

  const { user, residentData, customCSS, showNavigation = false, template, cssMode } = previewData;
  
  // Ensure cssMode is properly typed
  const typedCSSMode: 'inherit' | 'override' | 'disable' = (cssMode as 'inherit' | 'override' | 'disable') || 'inherit';

  // Save function - communicates with parent window to trigger save
  const handleSave = async () => {
    if (!window.opener || window.opener.closed) {
      setSaveMessage('❌ Cannot save - parent window closed');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Send save request to parent window
      window.opener.postMessage({ 
        type: 'SAVE_REQUEST',
        data: {
          template: template || '',
          customCSS: customCSS || '',
          cssMode: typedCSSMode,
          showNavigation: showNavigation || false,
          useStandardLayout: previewData.useStandardLayout
        }
      }, window.location.origin);

      // Show success message
      setSaveMessage('✅ Save request sent!');
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('❌ Failed to save');
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
        <Head>
          <title>Template Preview | ThreadStead</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        
        {/* Add preview indicator with save button - show mode clearly */}
        <div 
          className="fixed top-0 left-0 right-0 z-[10000] bg-blue-600 text-white text-center py-2 text-sm font-medium flex items-center justify-between px-4"
          style={{ zIndex: 999999 }}
        >
          <div></div>
          <span>🔍 STANDARD LAYOUT PREVIEW - CSS updates automatically</span>
          <div>
            {saveMessage && (
              <span className="mr-3 text-xs">{saveMessage}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
              style={{ fontSize: '11px' }}
            >
              {isSaving ? 'Saving...' : '💾 Save'}
            </button>
          </div>
        </div>
        
        {/* Add top padding to account for preview banner */}
        <div style={{ paddingTop: '40px' }}>
          <ResidentDataProvider data={residentData}>
            <ProfileLayout 
              customCSS={customCSS}
              hideNavigation={false}
              includeSiteCSS={true}
              templateMode={templateMode}
              cssMode={typedCSSMode}
            >
              {profileFallbackContent}
            </ProfileLayout>
          </ResidentDataProvider>
          
          {/* EMERGENCY CSS INJECTION - Force user CSS to win no matter what */}
          {customCSS && (
            <style dangerouslySetInnerHTML={{ __html: `
              /* EMERGENCY OVERRIDE - USER CSS MUST WIN - RAW INJECTION */
              ${customCSS}
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
      <Head>
        <title>Advanced Template Preview | ThreadStead</title>
        <meta name="robots" content="noindex, nofollow" />
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
      </Head>
      
      {/* Preview indicator with save button - use inline styles to avoid any class conflicts */}
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
        <span>🎨 ADVANCED TEMPLATE PREVIEW - Live CSS Updates</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveMessage && (
            <span style={{ fontSize: '11px', opacity: 0.9 }}>{saveMessage}</span>
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
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>
      
      {/* User content with optional navigation and ResidentDataProvider */}
      <div style={{ paddingTop: showNavigation ? '120px' : '40px' }}>
        {/* Apply user's custom CSS FIRST - this is the ONLY styling that should affect the page */}
        {customCSS && (
          <style dangerouslySetInnerHTML={{ __html: customCSS }} />
        )}
        
        {/* Show site navigation if toggle is enabled */}
        {showNavigation && (
          <div style={{ position: 'fixed', top: '40px', left: 0, right: 0, zIndex: 999998, height: '80px' }}>
            <MinimalNavBar />
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
            useIslands={true}
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
      includeSiteCSS: false
    }
  };
}