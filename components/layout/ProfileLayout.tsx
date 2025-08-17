import React from "react";
import Layout from "../Layout";

interface ProfileLayoutProps {
  children: React.ReactNode;
  customCSS?: string;
  sidebarContent?: React.ReactNode;
  showSidebar?: boolean;
  hideNavigation?: boolean;
}

export default function ProfileLayout({ 
  children, 
  customCSS, 
  sidebarContent,
  showSidebar = false,
  hideNavigation = false
}: ProfileLayoutProps) {
  if (hideNavigation) {
    // Render without Layout wrapper when hiding navigation
    return (
      <>
        {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
        {/* Hide nav/footer but keep responsive structure */}
        <div className="min-h-screen thread-surface flex flex-col">
          <main className="flex-1 mx-auto max-w-5xl px-6 py-8">
            <div className="ts-profile-container" data-component="profile-layout">
              <div className="ts-profile-content-wrapper">
                <div className="ts-profile-main-content">
                  {children}
                </div>
                
                <div 
                  className="ts-profile-sidebar" 
                  style={{ display: showSidebar ? 'block' : 'none' }}
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
              className="ts-profile-sidebar" 
              style={{ display: showSidebar ? 'block' : 'none' }}
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