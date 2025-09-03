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

  // Create the profile tabs - same as in actual profile pages
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

  // Create fallback content for enhanced mode - same structure as live profiles
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

  // Check if we should render directly with ProfileLayout (like live profiles do)
  const templateMode = previewUser.profile?.templateMode || 'default';
  const cssMode = previewUser.profile?.cssMode || 'inherit';
  
  // For enhanced mode or inherit CSS mode, render DIRECTLY with ProfileLayout (matching live profile behavior)
  if (templateMode === 'enhanced' || (templateMode !== 'advanced' && cssMode === 'inherit')) {
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
        
        {/* Add preview indicator */}
        <div 
          className="fixed top-0 left-0 right-0 z-[10000] bg-blue-600 text-white text-center py-2 text-sm font-medium"
          style={{ zIndex: 999999 }}
        >
          🔍 TEMPLATE PREVIEW - Changes update automatically
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
  
  // Only use ProfileModeRenderer for advanced templates
  return (
    <>
      <Head>
        <title>Template Preview | ThreadStead</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      {/* Add preview indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-[10000] bg-blue-600 text-white text-center py-2 text-sm font-medium"
        style={{ zIndex: 999999 }}
      >
        🔍 TEMPLATE PREVIEW - Changes update automatically
      </div>
      
      {/* Add top padding to account for preview banner */}
      <div style={{ paddingTop: '40px' }}>
        <ResidentDataProvider data={residentData}>
          <ProfileModeRenderer
            user={previewUser}
            residentData={residentData}
            useIslands={true}
            hideNavigation={false}
            fallbackContent={profileFallbackContent}
            onModeChange={(mode) => {
              console.log('🔄 Profile mode changed to:', mode);
            }}
          />
        </ResidentDataProvider>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {}
  };
}