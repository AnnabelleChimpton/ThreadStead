import React, { useState } from "react";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";

import TemplateEditor from "@/components/TemplateEditor";
import RetroCard from "@/components/layout/RetroCard";
import ProfileLayout from "@/components/layout/ProfileLayout";
import Tabs, { TabSpec } from "@/components/navigation/Tabs";
import WebsiteManager, { Website } from "@/components/WebsiteManager";
import FriendManager, { SelectedFriend } from "@/components/FriendManager";
import CSSEditor from "@/components/CSSEditor";
import ProfilePreview from "@/components/ProfilePreview";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import type { TemplateNode } from "@/lib/template-parser";

interface ProfileEditProps {
  username: string;
  isOwner: boolean;
  existingTemplate?: string;
  customCSS?: string;
  templateEnabled?: boolean;
  hideNavigation?: boolean;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  websites?: Website[];
  featuredFriends?: SelectedFriend[];
}

export default function ProfileEditPage({
  username,
  isOwner,
  existingTemplate,
  customCSS,
  templateEnabled = false,
  hideNavigation = false,
  displayName: initialDisplayName = "",
  bio: initialBio = "",
  avatarUrl: initialAvatarUrl = "",
  websites: initialWebsites = [],
  featuredFriends: initialFeaturedFriends = []
}: ProfileEditProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [customCSSValue, setCustomCSSValue] = useState(customCSS || "");
  const [isTemplateEnabled, setIsTemplateEnabled] = useState(templateEnabled);
  const [isNavigationHidden, setIsNavigationHidden] = useState(hideNavigation);
  
  // Profile editing state
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [featuredFriends, setFeaturedFriends] = useState<SelectedFriend[]>(initialFeaturedFriends);
  
  // Template state for combined preview
  const [currentTemplateAst, setCurrentTemplateAst] = useState<TemplateNode | null>(null);
  
  // Parse existing template for preview
  const existingTemplateAst = React.useMemo(() => {
    if (!existingTemplate || !existingTemplate.trim()) return null;
    
    try {
      const { TemplateEngine } = require('@/lib/template-engine');
      const validation = TemplateEngine.validate(existingTemplate);
      if (!validation.isValid) return null;
      
      const result = TemplateEngine.compile({ html: existingTemplate, mode: 'custom-tags' });
      return result.success && result.ast ? result.ast : null;
    } catch (error) {
      console.error('Failed to parse existing template:', error);
      return null;
    }
  }, [existingTemplate]);

  const handleSaveTemplate = async (template: string, ast: TemplateNode) => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/profile/${username}/template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template,
          ast,
          customCSS: customCSSValue
        }),
      });

      if (response.ok) {
        setSaveMessage("Template saved successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save template"}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCSS = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/profile/${username}/css`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customCSS: customCSSValue
        }),
      });

      if (response.ok) {
        setSaveMessage("CSS saved successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save CSS"}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTemplate = async () => {
    setSaving(true);
    setSaveMessage(null);

    const newTemplateEnabled = !isTemplateEnabled;

    try {
      // If disabling template and navigation is hidden, also reset navigation
      const shouldResetNavigation = !newTemplateEnabled && isNavigationHidden;
      
      const response = await fetch(`/api/profile/${username}/template-toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: newTemplateEnabled
        }),
      });

      if (response.ok) {
        setIsTemplateEnabled(newTemplateEnabled);
        
        // Reset navigation if disabling template
        if (shouldResetNavigation) {
          setIsNavigationHidden(false);
          // Also save the navigation change to the server
          try {
            await fetch(`/api/profile/${username}/navigation-toggle`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ hideNavigation: false }),
            });
          } catch (navError) {
            console.error('Failed to reset navigation:', navError);
          }
        }
        
        setSaveMessage(
          `Template ${newTemplateEnabled ? 'enabled' : 'disabled'} successfully!` +
          (shouldResetNavigation ? ' Navigation visibility has been reset.' : '')
        );
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to toggle template"}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNavigation = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/profile/${username}/navigation-toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hideNavigation: !isNavigationHidden
        }),
      });

      if (response.ok) {
        setIsNavigationHidden(!isNavigationHidden);
        setSaveMessage(`Navigation ${!isNavigationHidden ? 'hidden' : 'shown'} successfully!`);
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to toggle navigation"}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackToProfile = () => {
    router.push(`/resident/${username}`);
  };

  const handlePhotoUploadSuccess = (urls: { thumbnailUrl: string; mediumUrl: string; fullUrl: string }) => {
    // Update the avatar URL to use the medium size
    setAvatarUrl(urls.mediumUrl);
    setSaveMessage("Profile photo uploaded successfully!");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        setSaveMessage("Error: Please log in.");
        setSaving(false);
        return;
      }
      const { token } = await capRes.json();

      // Convert websites back to blogroll format  
      const blogroll = websites.filter(w => w.label.trim() && w.url.trim()).map(w => ({
        id: w.id,
        label: w.label,
        url: w.url,
        blurb: w.blurb || ""
      }));

      // Convert featured friends to stored format
      const featuredFriendsData = featuredFriends.map(f => ({
        id: f.id,
        handle: f.handle,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl
      }));

      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          displayName, 
          bio, 
          avatarUrl, 
          customCSS: customCSSValue, 
          blogroll, 
          featuredFriends: featuredFriendsData,
          cap: token 
        }),
      });

      if (response.ok) {
        setSaveMessage("Profile saved successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save profile"}`);        
      }
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <ProfileLayout>
        <RetroCard>
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="mb-4">You can only edit your own profile.</p>
            <button onClick={handleBackToProfile} className="thread-button">
              Back to Profile
            </button>
          </div>
        </RetroCard>
      </ProfileLayout>
    );
  }

  // Create tabs for the unified edit experience
  const editTabs: TabSpec[] = [
    {
      id: "profile",
      label: "Profile Settings",
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block mb-2">
                <span className="thread-label">Display Name</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full max-w-md border border-thread-sage p-3 bg-thread-paper rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                placeholder="Your display name"
              />
            </div>
            
            <div>
              <label className="block mb-2">
                <span className="thread-label">Bio</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full max-w-xl border border-thread-sage p-3 bg-thread-paper rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                placeholder="Tell people about yourself..."
              />
            </div>
            
            <div className="border-t border-thread-sage pt-6">
              <ProfilePhotoUpload 
                currentAvatarUrl={avatarUrl}
                onUploadSuccess={handlePhotoUploadSuccess}
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block mb-2">
                <span className="thread-label">Avatar URL</span>
                <span className="text-xs text-thread-sage ml-2">(Alternative: Enter URL directly)</span>
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full max-w-xl border border-thread-sage p-3 bg-thread-paper rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            
            <div className="border-t border-thread-sage pt-6">
              <WebsiteManager 
                websites={websites} 
                onChange={setWebsites}
                maxWebsites={10}
              />
            </div>
            
            <div className="border-t border-thread-sage pt-6">
              <FriendManager 
                selectedFriends={featuredFriends} 
                onChange={setFeaturedFriends}
                maxFriends={8}
              />
            </div>
            
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="thread-button"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )
    },
    {
      id: "css",
      label: "Custom CSS",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Custom CSS</h2>
            <p className="text-thread-sage mb-4">
              Add your own CSS to customize the appearance of your profile.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CSS Editor */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">CSS Editor</h3>
                <CSSEditor 
                  value={customCSSValue} 
                  onChange={setCustomCSSValue}
                />
                <button
                  onClick={handleSaveCSS}
                  disabled={saving}
                  className="thread-button"
                >
                  {saving ? "Saving..." : "Save CSS"}
                </button>
              </div>
              
              {/* CSS Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Live Preview</h3>
                <p className="text-sm text-thread-sage">
                  See how your CSS changes will look on your profile:
                </p>
                <ProfilePreview
                  mode="css-only"
                  customCSS={customCSSValue}
                  username={username}
                  height="h-[500px]"
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "template",
      label: "Template Editor",
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Template Editor</h2>
              <p className="text-thread-sage">
                Design your profile layout using our template system. Toggle between your custom template and the default layout.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-thread-sage">
                {isTemplateEnabled ? "Custom template active" : "Using default layout"}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium">
                  {isTemplateEnabled ? "Disable" : "Enable"} Template
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isTemplateEnabled}
                    onChange={handleToggleTemplate}
                    disabled={saving}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full shadow-inner transition-colors duration-200 ${
                    isTemplateEnabled ? 'bg-thread-pine' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      isTemplateEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          {!isTemplateEnabled && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              <strong>Template disabled:</strong> Your profile is currently using the default layout. 
              You can continue working on your template and enable it when ready.
            </div>
          )}

          {/* Navigation Toggle - Only show when template is enabled and exists */}
          {isTemplateEnabled && (existingTemplateAst || currentTemplateAst) && (
            <div className="mb-4 p-4 bg-thread-cream/50 border border-thread-sage rounded">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium mb-1">Navigation Bar & Footer</h3>
                  <p className="text-sm text-thread-sage">
                    Hide the site navigation and footer for a full-screen template experience.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium">
                    {isNavigationHidden ? "Show" : "Hide"} Navigation
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isNavigationHidden}
                      onChange={handleToggleNavigation}
                      disabled={saving}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full shadow-inner transition-colors duration-200 ${
                      isNavigationHidden ? 'bg-thread-pine' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                        isNavigationHidden ? 'translate-x-5' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
          
          {/* Explanation when navigation toggle is not available */}
          {(!isTemplateEnabled || (!existingTemplateAst && !currentTemplateAst)) && (
            <div className="mb-4 p-4 bg-thread-cream/30 border border-thread-sage/50 rounded">
              <div className="flex items-start gap-3">
                <span className="text-thread-sage">ℹ️</span>
                <div>
                  <h3 className="font-medium mb-1 text-thread-sage">Navigation Control</h3>
                  <p className="text-sm text-thread-sage">
                    Navigation hiding is only available when using a custom template. 
                    {!existingTemplateAst && !currentTemplateAst 
                      ? "Create a template below to access this feature."
                      : "Enable your template above to access this feature."}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <TemplateEditor
            initialTemplate={existingTemplate}
            username={username}
            customCSS={customCSSValue}
            onSave={handleSaveTemplate}
            onAstChange={setCurrentTemplateAst}
          />
        </div>
      )
    },
    {
      id: "preview",
      label: "Combined Preview",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Template + CSS Preview</h2>
            <p className="text-thread-sage mb-6">
              See how your custom template and CSS work together. This preview combines both your template design and custom styling.
            </p>
            
            {/* Template Status */}
            <div className="mb-4 p-4 bg-thread-cream/50 border border-thread-sage rounded">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium mb-1">Template Status</h3>
                  <p className="text-sm text-thread-sage">
                    {isTemplateEnabled 
                      ? "Template is enabled and will be used on your profile" 
                      : "Template is disabled - your profile uses the default layout"}
                  </p>
                  {(existingTemplateAst || currentTemplateAst) && (
                    <p className="text-sm text-thread-pine mt-1">
                      ✓ Template {currentTemplateAst ? 'compiled successfully' : 'saved and ready'}
                    </p>
                  )}
                  {!existingTemplateAst && !currentTemplateAst && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠ No template found - design a template in the Template Editor tab
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-thread-sage">
                  <div>CSS: {customCSSValue ? `${customCSSValue.length} characters` : 'None'}</div>
                  {isTemplateEnabled && (existingTemplateAst || currentTemplateAst) && (
                    <div>Navigation: {isNavigationHidden ? 'Hidden' : 'Visible'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Combined Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Live Preview</h3>
              
              {(currentTemplateAst || (existingTemplateAst && isTemplateEnabled)) ? (
                <div>
                  <p className="text-sm text-thread-sage mb-4">
                    This shows exactly how your profile will look with your custom template and CSS:
                  </p>
                  <ProfilePreview
                    mode="combined"
                    customCSS={customCSSValue}
                    templateAst={currentTemplateAst || existingTemplateAst}
                    username={username}
                    height="h-[600px]"
                  />
                  {!currentTemplateAst && existingTemplate && (
                    <p className="text-xs text-thread-sage mt-2 italic">
                      Note: Showing saved template. Visit the Template Editor tab to see live changes.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-thread-sage mb-4">
                    {existingTemplate && !isTemplateEnabled 
                      ? "Template is disabled. Here's how your CSS affects the default profile layout:"
                      : "Since no template is available, here's how your CSS affects the default profile layout:"}
                  </p>
                  <ProfilePreview
                    mode="css-only"
                    customCSS={customCSSValue}
                    username={username}
                    height="h-[600px]"
                  />
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="border-t border-thread-sage pt-6">
              <h3 className="text-lg font-medium mb-3">Quick Actions</h3>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    // Switch to template tab
                    const tabButtons = document.querySelectorAll('[role="tab"]');
                    const templateTab = Array.from(tabButtons).find(tab => 
                      tab.textContent?.includes('Template Editor')
                    ) as HTMLElement;
                    templateTab?.click();
                  }}
                  className="thread-button-secondary text-sm"
                >
                  Edit Template
                </button>
                <button
                  onClick={() => {
                    // Switch to CSS tab  
                    const tabButtons = document.querySelectorAll('[role="tab"]');
                    const cssTab = Array.from(tabButtons).find(tab => 
                      tab.textContent?.includes('Custom CSS')
                    ) as HTMLElement;
                    cssTab?.click();
                  }}
                  className="thread-button-secondary text-sm"
                >
                  Edit CSS
                </button>
                <button
                  onClick={handleBackToProfile}
                  className="thread-button text-sm"
                >
                  View Live Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>Edit Profile - {username} | ThreadStead</title>
      </Head>
      <ProfileLayout>
        <RetroCard>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Edit Profile - {username}</h1>
            <div className="flex gap-2">
              <button onClick={handleBackToProfile} className="thread-button-secondary">
                Back to Profile
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className={`mb-4 p-3 rounded ${
              saveMessage.includes("Error") 
                ? "bg-red-100 text-red-700 border border-red-300" 
                : "bg-green-100 text-green-700 border border-green-300"
            }`}>
              {saveMessage}
            </div>
          )}

          <Tabs tabs={editTabs} initialId="profile" />
        </RetroCard>
      </ProfileLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ProfileEditProps> = async ({ 
  params, 
  req
}) => {
  const username = String(params?.username || "");
  if (!username) return { notFound: true };

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  try {
    // Get current user session using auth-server
    const { getSessionUser } = await import('@/lib/auth-server');
    const currentUser = await getSessionUser(req as NextApiRequest);

    if (!currentUser) {
      return {
        redirect: {
          destination: `/identity?redirect=${encodeURIComponent(`/resident/${username}/edit`)}`,
          permanent: false,
        },
      };
    }

    // Get profile data
    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(username)}`);
    if (profileRes.status === 404) return { notFound: true };
    
    if (!profileRes.ok) {
      // If profile API fails, still allow edit but with minimal data
      return {
        props: {
          username,
          isOwner: false,
        },
      };
    }

    const profileData = await profileRes.json();
    let currentUsername = null;
    if (currentUser.primaryHandle) {
      currentUsername = currentUser.primaryHandle.split("@")[0];
    }
    // Compare usernames case-insensitively, and always allow if user IDs match
    const isOwner = (
      (currentUsername && currentUsername.toLowerCase() === username.toLowerCase()) ||
      (currentUser.id && profileData.userId && currentUser.id === profileData.userId)
    );

    // Try to get existing template
    let existingTemplate = "";
    let customCSS = "";
    let templateEnabled = false;
    let hideNavigation = false;
    let displayName = "";
    let bio = "";
    let avatarUrl = "";
    let websites: Website[] = [];
    let featuredFriends: SelectedFriend[] = [];

    if (isOwner) {
      try {
        const templateRes = await fetch(`${base}/api/profile/${username}/template`, {
          headers: {
            cookie: req.headers.cookie || "",
          },
        });
        if (templateRes.ok) {
          const templateData = await templateRes.json();
          existingTemplate = templateData.template || "";
        }
      } catch (error) {
        console.error("Failed to fetch existing template:", error);
      }

      customCSS = profileData.profile?.customCSS || "";
      templateEnabled = profileData.profile?.templateEnabled || false;
      hideNavigation = profileData.profile?.hideNavigation || false;
      displayName = profileData.profile?.displayName || "";
      bio = profileData.profile?.bio || "";
      avatarUrl = profileData.profile?.avatarUrl || "";
      
      // Parse blogroll as websites
      const blogroll = profileData.profile?.blogroll;
      if (blogroll && Array.isArray(blogroll)) {
        websites = blogroll.map((item: any, index: number) => ({
          id: item.id || index.toString(),
          label: item.label || "",
          url: item.url || "",
          blurb: item.blurb || ""
        }));
      }

      // Parse featuredFriends
      const featuredFriendsData = profileData.profile?.featuredFriends;
      if (Array.isArray(featuredFriendsData) && featuredFriendsData.length > 0) {
        featuredFriends = featuredFriendsData.map((item: any, index: number) => ({
          id: item.id || index.toString(),
          handle: item.handle || "",
          displayName: item.displayName || "",
          avatarUrl: item.avatarUrl || "/assets/default-avatar.gif"
        }));
      }
    }

    return {
      props: {
        username,
        isOwner,
        existingTemplate,
        customCSS,
        templateEnabled,
        hideNavigation,
        displayName,
        bio,
        avatarUrl,
        websites,
        featuredFriends,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return { notFound: true };
  }
};