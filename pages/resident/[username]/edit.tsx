import React, { useState } from "react";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";

import TemplateEditor from "@/components/TemplateEditor";
import RetroCard from "@/components/layout/RetroCard";
import ProfileLayout from "@/components/layout/ProfileLayout";
import type { TemplateNode } from "@/lib/template-parser";

interface ProfileEditProps {
  username: string;
  isOwner: boolean;
  existingTemplate?: string;
  customCSS?: string;
  templateEnabled?: boolean;
  hideNavigation?: boolean;
}

export default function ProfileEditPage({
  username,
  isOwner,
  existingTemplate,
  customCSS,
  templateEnabled = false,
  hideNavigation = false
}: ProfileEditProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [customCSSValue, setCustomCSSValue] = useState(customCSS || "");
  const [isTemplateEnabled, setIsTemplateEnabled] = useState(templateEnabled);
  const [isNavigationHidden, setIsNavigationHidden] = useState(hideNavigation);

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

    try {
      const response = await fetch(`/api/profile/${username}/template-toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: !isTemplateEnabled
        }),
      });

      if (response.ok) {
        setIsTemplateEnabled(!isTemplateEnabled);
        setSaveMessage(`Template ${!isTemplateEnabled ? 'enabled' : 'disabled'} successfully!`);
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

  return (
    <>
      <Head>
        <title>Edit Profile - {username} | ThreadStead</title>
      </Head>
      <ProfileLayout customCSS={customCSS}>
        <RetroCard>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Edit Profile - {username}</h1>
            <div className="flex gap-2">
              <button onClick={handleBackToProfile} className="thread-button-secondary">
                Back to Profile
              </button>
              <button onClick={() => router.push(`/settings/profile`)} className="thread-button-secondary">
                Profile Settings
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

          <div className="space-y-6">
            {/* Template Editor Section */}
            <div>
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

              {/* Navigation Toggle */}
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
              
              <TemplateEditor
                initialTemplate={existingTemplate}
                username={username}
                customCSS={customCSSValue}
                onSave={handleSaveTemplate}
              />
            </div>

            {/* Custom CSS Section */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Custom CSS</h2>
              <p className="text-thread-sage mb-4">
                Add your own CSS to customize the appearance of your profile.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2">
                    <span className="thread-label">Custom CSS</span>
                  </label>
                  <textarea
                    value={customCSSValue}
                    onChange={(e) => setCustomCSSValue(e.target.value)}
                    className="w-full h-64 border border-thread-sage p-3 bg-thread-paper rounded font-mono text-sm resize-none focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                    placeholder="/* Add your custom CSS here */&#10;.my-custom-class {&#10;  color: #333;&#10;  font-size: 16px;&#10;}"
                  />
                </div>
                <button
                  onClick={handleSaveCSS}
                  disabled={saving}
                  className="thread-button"
                >
                  {saving ? "Saving..." : "Save CSS"}
                </button>
              </div>
            </div>
          </div>
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
    }

    return {
      props: {
        username,
        isOwner,
        existingTemplate,
        customCSS,
        templateEnabled,
        hideNavigation,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return { notFound: true };
  }
};