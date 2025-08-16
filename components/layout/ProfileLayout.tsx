import React from "react";
import Layout from "../Layout";

interface ProfileLayoutProps {
  children: React.ReactNode;
  customCSS?: string;
  sidebarContent?: React.ReactNode;
  showSidebar?: boolean;
}

export default function ProfileLayout({ 
  children, 
  customCSS, 
  sidebarContent,
  showSidebar = false 
}: ProfileLayoutProps) {
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