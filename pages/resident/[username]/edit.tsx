import React, { useState } from "react";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";

// Template Editor moved to dedicated page at /resident/[username]/template-editor
import RetroCard from "@/components/layout/RetroCard";
import Layout from "@/components/Layout";
import Tabs, { TabSpec } from "@/components/navigation/Tabs";
import WebsiteManager, { Website } from "@/components/WebsiteManager";
import FriendManager, { SelectedFriend } from "@/components/FriendManager";
// CSS Editor moved to dedicated page at /resident/[username]/css-editor
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import ProfileBadgeSelector from "@/components/ProfileBadgeSelector";
import type { TemplateNode } from "@/lib/template-parser";
import { TemplateEngine } from "@/lib/template-engine";
import { featureFlags } from "@/lib/feature-flags";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ProfileEditProps {
  username: string;
  isOwner: boolean;
  existingTemplate?: string;
  customCSS?: string;
  templateEnabled?: boolean;
  hideNavigation?: boolean;
  templateMode?: 'default' | 'enhanced' | 'advanced';
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
  templateMode = 'default',
  displayName: initialDisplayName = "",
  bio: initialBio = "",
  avatarUrl: initialAvatarUrl = "",
  websites: initialWebsites = [],
  featuredFriends: initialFeaturedFriends = []
}: ProfileEditProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { user: currentUser } = useCurrentUser();
  // CSS is now edited in the dedicated CSS editor page
  const customCSSValue = customCSS || "";
  const [isTemplateEnabled, setIsTemplateEnabled] = useState(templateEnabled);
  const [isNavigationHidden, setIsNavigationHidden] = useState(hideNavigation);
  
  // Track the current layout mode
  const [layoutMode, setLayoutMode] = useState<'default' | 'custom-css' | 'template'>(() => {
    if (templateEnabled) return 'template';
    if (templateMode === 'enhanced') return 'custom-css';
    return 'default';
  });
  
  // Profile editing state
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [featuredFriends, setFeaturedFriends] = useState<SelectedFriend[]>(initialFeaturedFriends);
  
  // Template state for combined preview
  const [currentTemplateAst] = useState<TemplateNode | null>(null);
  
  // Parse existing template for preview
  const existingTemplateAst = React.useMemo(() => {
    if (!existingTemplate || !existingTemplate.trim()) return null;
    
    try {
      const validation = TemplateEngine.validate(existingTemplate);
      if (!validation.isValid) return null;
      
      const result = TemplateEngine.compile({ html: existingTemplate, mode: 'custom-tags' });
      return result.success && result.ast ? result.ast : null;
    } catch (error) {
      console.error('Failed to parse existing template:', error);
      return null;
    }
  }, [existingTemplate]);

  const _handleSaveTemplate = async (template: string, ast: TemplateNode) => {
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

  // CSS saving has been moved to the dedicated CSS editor page

  const handleSaveLayoutSettings = async () => {
    setSaving(true);
    setSaveMessage(null);

    const newTemplateEnabled = layoutMode === 'template';

    try {
      // If disabling template and navigation is hidden, also reset navigation
      const shouldResetNavigation = !newTemplateEnabled && isNavigationHidden;
      
      // First, handle template toggle
      const response = await fetch(`/api/profile/${username}/template-toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: newTemplateEnabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save layout settings"}`);
        return;
      }

      // Save the layout mode preference
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        setSaveMessage("Error: Please log in.");
        return;
      }
      const { token } = await capRes.json();

      // Convert layoutMode to templateMode for storage
      let templateModeValue: 'default' | 'enhanced' | 'advanced' = 'default';
      if (layoutMode === 'custom-css') {
        templateModeValue = 'enhanced';
      } else if (layoutMode === 'template') {
        templateModeValue = 'advanced';
      }

      const layoutResponse = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateMode: templateModeValue,
          cap: token 
        }),
      });

      if (!layoutResponse.ok) {
        const errorData = await layoutResponse.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save layout mode"}`);
        return;
      }

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
      
      let successMessage = '';
      if (layoutMode === 'default') {
        successMessage = 'Layout set to default successfully!';
      } else if (layoutMode === 'custom-css') {
        successMessage = 'Layout set to default + custom CSS successfully!';
      } else if (layoutMode === 'template') {
        successMessage = 'Layout set to advanced template successfully!';
      }
      
      setSaveMessage(
        successMessage +
        (shouldResetNavigation ? ' Navigation visibility has been reset.' : '')
      );
      setTimeout(() => setSaveMessage(null), 3000);
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
      <Layout>
        <RetroCard>
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="mb-4">You can only edit your own profile.</p>
            <button onClick={handleBackToProfile} className="px-4 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]">
              Back to Profile
            </button>
          </div>
        </RetroCard>
      </Layout>
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
                <span className="font-bold text-black">Display Name</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full max-w-md border border-black p-3 bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Your display name"
              />
            </div>
            
            <div>
              <label className="block mb-2">
                <span className="font-bold text-black">Bio</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full max-w-xl border border-black p-3 bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Tell people about yourself..."
              />
            </div>
            
            <div className="border-t border-black pt-6">
              <ProfilePhotoUpload 
                currentAvatarUrl={avatarUrl}
                onUploadSuccess={handlePhotoUploadSuccess}
                disabled={saving}
              />
            </div>
            
            <div className="border-t border-black pt-6">
              <WebsiteManager 
                websites={websites} 
                onChange={setWebsites}
                maxWebsites={10}
              />
            </div>
            
            <div className="border-t border-black pt-6">
              <FriendManager 
                selectedFriends={featuredFriends} 
                onChange={setFeaturedFriends}
                maxFriends={8}
              />
            </div>
            
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )
    },
    {
      id: "layout", 
      label: "Layout Settings",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Profile Layout Settings</h2>
            <p className="text-gray-700 mb-6">
              Choose how your profile is displayed: default layout, custom CSS styling, or advanced template.
            </p>
            
            {/* Layout Mode Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Layout Mode</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border border-black rounded-none hover:bg-gray-50 cursor-pointer transition-colors shadow-[2px_2px_0_#000]">
                  <input
                    type="radio"
                    name="layoutMode"
                    value="default"
                    checked={layoutMode === 'default'}
                    onChange={() => {
                      setLayoutMode('default');
                      setIsTemplateEnabled(false);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Default Layout</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Use the standard ThreadStead profile layout
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-4 border border-black rounded-none hover:bg-gray-50 cursor-pointer transition-colors shadow-[2px_2px_0_#000]">
                  <input
                    type="radio"
                    name="layoutMode"
                    value="custom-css"
                    checked={layoutMode === 'custom-css'}
                    onChange={() => {
                      setLayoutMode('custom-css');
                      setIsTemplateEnabled(false);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Default Layout + Custom CSS</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Default layout styled with your custom CSS
                    </div>
                    {customCSSValue && (
                      <div className="text-xs text-green-700 mt-2">
                        ✓ {customCSSValue.length} characters of CSS
                      </div>
                    )}
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-4 border border-black rounded-none hover:bg-gray-50 cursor-pointer transition-colors shadow-[2px_2px_0_#000]">
                  <input
                    type="radio"
                    name="layoutMode"
                    value="template"
                    checked={layoutMode === 'template'}
                    onChange={() => {
                      setLayoutMode('template');
                      setIsTemplateEnabled(true);
                    }}
                    disabled={!existingTemplateAst && !currentTemplateAst}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Advanced Template</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Completely custom layout with your template
                    </div>
                    {existingTemplateAst || currentTemplateAst ? (
                      <div className="text-xs text-green-700 mt-2">
                        ✓ Template ready
                      </div>
                    ) : (
                      <div className="text-xs text-orange-600 mt-2">
                        ⚠ No template - create one first
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            
            {/* Save Layout Settings */}
            <div className="mb-6">
              <button
                onClick={handleSaveLayoutSettings}
                disabled={saving}
                className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Layout Settings"}
              </button>
            </div>
            
            {/* Navigation Toggle - Only show when template is enabled */}
            {isTemplateEnabled && (existingTemplateAst || currentTemplateAst) && (
              <div className="mb-6 p-4 bg-yellow-50 border border-black rounded-none shadow-[2px_2px_0_#000]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1">Navigation Bar & Footer</h3>
                    <p className="text-sm text-gray-600">
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
                        isNavigationHidden ? 'bg-black' : 'bg-gray-300'
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
            
            
            {/* Editor Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-black rounded-none p-6 text-center shadow-[3px_3px_0_#000]">
                <div className="mb-4">
                  <span className="text-5xl">🎨</span>
                </div>
                <h3 className="text-lg font-bold mb-2">CSS Editor</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Style your default layout with custom CSS
                </p>
                <a
                  href={`/resident/${username}/css-editor`}
                  className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] inline-block no-underline"
                >
                  Open CSS Editor →
                </a>
              </div>
              
              <div className="bg-white border border-black rounded-none p-6 text-center shadow-[3px_3px_0_#000]">
                <div className="mb-4">
                  <span className="text-5xl">📝</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Template Editor</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create advanced layouts with templates
                </p>
                <a
                  href={`/resident/${username}/template-editor`}
                  className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] inline-block no-underline"
                >
                  Open Template Editor →
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "badges",
      label: "Badge Preferences",
      content: (
        <div className="space-y-6">
          <ProfileBadgeSelector 
            onSave={(preferences) => {
              setSaveMessage("Badge preferences saved successfully!");
              setTimeout(() => setSaveMessage(null), 3000);
            }}
          />
        </div>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>{`Edit Profile - ${username} | ThreadStead`}</title>
      </Head>
      <Layout>
        <RetroCard>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Edit Profile - {username}</h1>
            <div className="flex gap-2">
              <button onClick={handleBackToProfile} className="px-4 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]">
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

          <Tabs tabs={featureFlags.threadrings(currentUser) ? editTabs : editTabs.filter(tab => tab.id !== 'badges')} initialId="profile" />
        </RetroCard>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ProfileEditProps> = async ({ 
  params, 
  req
}) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
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
    let templateMode: 'default' | 'enhanced' | 'advanced' = 'default';
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
      templateMode = profileData.profile?.templateMode || 'default';
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
        templateMode,
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