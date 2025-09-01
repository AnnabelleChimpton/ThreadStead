import React from "react";
import Layout from "../Layout";

interface ProfileLayoutProps {
  children: React.ReactNode;
  customCSS?: string;
  sidebarContent?: React.ReactNode;
  showSidebar?: boolean;
  hideNavigation?: boolean;
  includeSiteCSS?: boolean;
  templateMode?: 'default' | 'enhanced' | 'advanced';
}

export default function ProfileLayout({ 
  children, 
  customCSS, 
  sidebarContent,
  showSidebar = false,
  hideNavigation = false,
  includeSiteCSS = true,
  templateMode
}: ProfileLayoutProps) {
  if (hideNavigation) {
    // Check if site CSS is disabled - if so, render without any styling
    if (!includeSiteCSS) {
      return (
        <>
          {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
          {/* No wrapper styling when CSS is disabled */}
          {children}
        </>
      );
    }
    
    // Render without Layout wrapper when hiding navigation but keeping site CSS
    return (
      <>
        {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
        {/* Hide nav/footer but keep responsive structure */}
        {/* For advanced templates, don't apply thread-surface to allow custom backgrounds */}
        <div className={templateMode === 'advanced' 
          ? "min-h-screen flex flex-col"
          : "min-h-screen thread-surface flex flex-col"
        }>
          <main className="flex-1 mx-auto max-w-5xl px-6 py-8">
            <div className="ts-profile-container" data-component="profile-layout">
              <div className="ts-profile-content-wrapper">
                <div className="ts-profile-main-content">
                  {children}
                </div>
                
                <div 
                  className={`ts-profile-sidebar ${showSidebar ? 'profile-sidebar-visible' : 'profile-sidebar-hidden'}`}
                  data-sidebar-visible={showSidebar}
                >
                  <div className="ts-sidebar-content">
                    {sidebarContent || (
                      <>
                        <h3 className="ts-sidebar-heading">Quick Info</h3>
                        <p className="ts-sidebar-text">
                          This sidebar is available for advanced CSS customization.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
      <div className="ts-profile-container" data-component="profile-layout">
        <Layout>
          <div className="ts-profile-content-wrapper">
            <div className="ts-profile-main-content">
              {children}
            </div>
            
            <div 
              className={`ts-profile-sidebar ${showSidebar ? 'profile-sidebar-visible' : 'profile-sidebar-hidden'}`}
              data-sidebar-visible={showSidebar}
            >
              <div className="ts-sidebar-content">
                {sidebarContent || (
                  <>
                    <h3 className="ts-sidebar-heading">Quick Info</h3>
                    <p className="ts-sidebar-text">
                      This sidebar is available for advanced CSS customization.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Layout>
      </div>
    </>
  );
}