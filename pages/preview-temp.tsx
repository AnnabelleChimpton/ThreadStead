import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProfileModeRenderer, { ProfileUser } from '@/components/profile/ProfileModeRenderer';
import ProfileLayout from '@/components/layout/ProfileLayout';
import { ResidentDataProvider } from '@/components/template/ResidentDataProvider';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import Head from 'next/head';
import RetroCard from '@/components/layout/RetroCard';
import ProfileHeader from '@/components/profile/ProfileHeader';
import Tabs, { TabSpec } from '@/components/navigation/Tabs';
import BlogTab from '@/components/profile/tabs/BlogTab';
import MediaGrid from '@/components/profile/tabs/MediaGrid';
import FriendsWebsitesGrid from '@/components/profile/tabs/FriendsWebsitesGrid';
import ProfileBadgeDisplay from '@/components/ProfileBadgeDisplay';
import Guestbook from '@/components/Guestbook';
// Import the existing island renderer for advanced templates
import { ProductionIslandRenderer, PreviewStaticHTMLWithIslands } from '@/components/template/TemplatePreview';

interface PreviewData {
  user: ProfileUser;
  residentData: ResidentData;
  customCSS: string;
  useStandardLayout: boolean;
}

export default function PreviewTemp() {
  const router = useRouter();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listen for preview data from parent window
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'PREVIEW_DATA') {
        console.log('🎯 Pop-up preview received data:', event.data.payload);
        setPreviewData(event.data.payload);
        setIsReady(true);
      }
      
      if (event.data.type === 'CSS_UPDATE') {
        console.log('🔄 Pop-up preview CSS update:', event.data.customCSS);
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
        console.log('📡 Preview window requesting data from parent...');
        window.opener.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
      }
    };

    // Initial request
    requestData();
    
    // Retry every 2 seconds if we haven't received data yet
    const retryInterval = setInterval(() => {
      if (!isReady && !previewData && window.opener && !window.opener.closed) {
        console.log('⏳ Still waiting for data, retrying...');
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

  const { user, residentData, customCSS } = previewData;

  // Create user object with updated CSS for ProfileModeRenderer
  const previewUser: ProfileUser = {
    ...user,
    profile: {
      ...user.profile,
      customCSS: customCSS
    }
  };

  console.log('🎨 Preview CSS Debug:', {
    originalUser: user,
    previewUser,
    customCSS: customCSS,
    templateMode: previewUser.profile?.templateMode,
    cssLength: customCSS?.length || 0
  });

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

  // Use existing island rendering system - handles both static HTML and islands!
  function renderCompiledTemplateWithIslands(compiledTemplate: any, residentData: ResidentData) {
    const hasIslands = compiledTemplate.islands && compiledTemplate.islands.length > 0;
    const hasStaticHTML = compiledTemplate.staticHTML && compiledTemplate.staticHTML.trim();

    if (!hasIslands && !hasStaticHTML) {
      return <div className="p-4 text-gray-500">No content to render</div>;
    }

    // Handle mixed content (both islands and static HTML) - same as TemplatePreview
    if (hasIslands && hasStaticHTML) {
      return (
        <PreviewStaticHTMLWithIslands 
          staticHTML={compiledTemplate.staticHTML}
          islands={compiledTemplate.islands}
          residentData={residentData}
        />
      );
    }

    // If we only have islands, render them as React components
    if (hasIslands) {
      const rootIslands = compiledTemplate.islands.filter((island: any) => !island.parentId);
      
      return (
        <div className="islands-container">
          {rootIslands.map((island: any) => (
            <ProductionIslandRenderer 
              key={island.id}
              island={island}
              residentData={residentData}
            />
          ))}
        </div>
      );
    }

    // If we only have static HTML (no islands), render it directly
    if (hasStaticHTML) {
      return (
        <div 
          className="static-html-content"
          dangerouslySetInnerHTML={{ __html: compiledTemplate.staticHTML }}
        />
      );
    }

    return <div className="p-4 text-gray-500">Nothing to render</div>;
  }

  // Create fallback content for enhanced/standard mode
  const profileFallbackContent = (
    <>
      <RetroCard>
        <ProfileHeader
          username={user.handle.split('@')[0]}
          photoUrl=""
          bio=""
          relStatus={null}
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
  const cssMode = previewUser.profile?.cssMode || 'inherit';
  
  // Use the useStandardLayout flag from the editor - this is the source of truth
  // If useStandardLayout is false AND we have template content, it's advanced mode
  const hasCustomTemplate = previewUser.profile?.customTemplate && 
                           previewUser.profile.customTemplate.trim() !== '';
  const isReallyAdvancedMode = !previewData.useStandardLayout && hasCustomTemplate;
  
  console.log('🎯 Template Mode Decision:', {
    templateMode,
    useStandardLayout: previewData.useStandardLayout,
    hasCustomTemplate,
    isReallyAdvancedMode,
    templateLength: previewUser.profile?.customTemplate?.length || 0
  });
  
  // For standard layout (enhanced mode), always use ProfileLayout for consistency
  if (!isReallyAdvancedMode) {
    console.log('🚨 CRITICAL CSS DEBUG - Direct ProfileLayout Render:', {
      templateMode,
      cssMode,
      customCSSLength: customCSS?.length || 0,
      customCSSPreview: customCSS?.substring(0, 200),
      hasPixelPetals: customCSS?.includes('PIXEL PETALS'),
      hasGradient: customCSS?.includes('linear-gradient(135deg, #ffe0f0'),
      profileData: previewUser.profile
    });
    
    return (
      <>
        <Head>
          <title>Template Preview | ThreadStead</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        
        {/* Add preview indicator - show mode clearly */}
        <div 
          className="fixed top-0 left-0 right-0 z-[10000] bg-blue-600 text-white text-center py-2 text-sm font-medium"
          style={{ zIndex: 999999 }}
        >
          🔍 STANDARD LAYOUT PREVIEW - CSS updates automatically
        </div>
        
        {/* Add top padding to account for preview banner */}
        <div style={{ paddingTop: '40px' }}>
          <ResidentDataProvider data={residentData}>
            <ProfileLayout 
              customCSS={customCSS}
              hideNavigation={false}
              includeSiteCSS={true}
              templateMode={templateMode}
              cssMode={cssMode}
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
      
      {/* Preview indicator - use inline styles to avoid any class conflicts */}
      <div id="preview-banner">
        🎨 ADVANCED TEMPLATE PREVIEW - Live CSS Updates
      </div>
      
      {/* User content with ResidentDataProvider for component data access */}
      <div style={{ paddingTop: '40px' }}>
        {/* Apply user's custom CSS FIRST - this is the ONLY styling that should affect the page */}
        {customCSS && (
          <style dangerouslySetInnerHTML={{ __html: customCSS }} />
        )}
        
        {/* Wrap in ResidentDataProvider so components have access to data */}
        <ResidentDataProvider data={residentData}>
          {/* Debug: Log what we're rendering */}
          {console.log('🎨 Advanced Template Rendering:', {
            hasCompiledTemplate: !!previewUser.profile?.compiledTemplate,
            hasCustomTemplate: !!previewUser.profile?.customTemplate,
            hasResidentData: !!residentData,
            compiledHTML: previewUser.profile?.compiledTemplate?.staticHTML?.substring(0, 200)
          })}
          
          {/* Render the compiled template with ACTUAL components using existing islands system */}
          {previewUser.profile?.compiledTemplate ? (
            renderCompiledTemplateWithIslands(previewUser.profile.compiledTemplate, residentData)
          ) : previewUser.profile?.customTemplate ? (
            <div 
              dangerouslySetInnerHTML={{ 
                __html: previewUser.profile.customTemplate 
              }}
            />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Advanced Template Mode</h2>
              <p>Your custom HTML template will render here.</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                Start adding HTML in the editor to see it appear.
              </p>
            </div>
          )}
        </ResidentDataProvider>
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